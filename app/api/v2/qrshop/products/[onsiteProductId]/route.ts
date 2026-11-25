import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError, apiErrors, apiSuccess } from '@/lib/api-response';
import { planOptionChanges, type ExistingOption, type OptionPlan } from '@/lib/qrshop/product-options';
import { hasProductPaidSale } from '@/lib/qrshop/sales-history';
import { getSellerContext } from '@/lib/seller/store';

export const dynamic = 'force-dynamic';

const OptionInputSchema = z.object({
  /** 기존 옵션 id(상품 응답의 options[].id). 새 옵션은 비운다. 비우면 같은 이름의 기존 옵션으로 본다. */
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(18),
  surcharge: z.number().int().min(0),
  stock: z.number().int().min(0),
});

const UpdateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(20).optional(),
    price: z.number().int().min(0).optional(),
    imageUrl: z.string().trim().max(2048).nullable().optional(),
    /** null 을 보내면 카테고리를 뗀다. */
    categoryId: z.string().trim().min(1).nullable().optional(),
    hasOption: z.boolean().optional(),
    totalStock: z.number().int().min(0).optional(),
    /**
     * 보내면 이 목록이 옵션 전체가 된다(빠진 기존 옵션은 지운다).
     * 기존 옵션은 id(없으면 같은 이름)로 짝지어 고쳐서 옵션 id를 유지한다.
     */
    options: z.array(OptionInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hasOption === true && value.options && value.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '옵션을 사용하면 옵션이 하나 이상 필요합니다.',
      });
    }
    if (value.options) {
      const names = value.options.map((option) => option.name);
      if (new Set(names).size !== names.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '옵션명이 중복됩니다.' });
      }
      const ids = value.options.flatMap((option) => (option.id ? [option.id] : []));
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '옵션 아이디가 중복됩니다.' });
      }
    }
  });

const PRODUCT_SELECT = {
  productId: true,
  name: true,
  imageUrl: true,
  price: true,
  initStock: true,
  currentStock: true,
  hasOption: true,
  createdAt: true,
  category: { select: { categoryId: true, name: true } },
  options: {
    select: { optionId: true, name: true, surcharge: true, currentStock: true },
    orderBy: [{ createdAt: 'asc' }, { optionId: 'asc' }],
  },
} satisfies Prisma.OnsiteProductSelect;

type ProductRow = {
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number;
  initStock: number;
  currentStock: number;
  hasOption: boolean;
  createdAt: Date;
  category: { categoryId: string; name: string } | null;
  options: Array<{
    optionId: string;
    name: string;
    surcharge: number;
    currentStock: number;
  }>;
};

function toResponse(product: ProductRow, hasSalesHistory: boolean) {
  return {
    id: product.productId,
    name: product.name,
    imageUrl: product.imageUrl,
    category: product.category
      ? { id: product.category.categoryId, name: product.category.name }
      : null,
    price: product.price,
    totalStock: product.currentStock,
    usesOptions: product.hasOption,
    options: product.options.map((option) => ({
      id: option.optionId,
      name: option.name,
      surcharge: option.surcharge,
      stock: option.currentStock,
    })),
    /** 목록과 같은 모양을 유지한다. 빠지면 수정 직후 카드가 삭제 버튼을 잘못 띄운다. */
    hasSalesHistory,
    createdAt: product.createdAt.toISOString(),
  };
}

type RouteContext = { params: { onsiteProductId: string } };

/** 수정 대상이 내 상점 상품인지 확인한다. */
async function findOwnedProduct(storeId: string, productId: string) {
  return prisma.onsiteProduct.findFirst({
    where: { productId, storeId },
    select: { productId: true, hasOption: true, price: true },
  });
}

/** 이름 맞바꾸기 중에 잠깐 쓰는 옵션명. 이 상품의 기존·새 옵션명과 겹치지 않는다. */
function temporaryOptionName(index: number, taken: Set<string>) {
  let name = `~${index}`;
  while (taken.has(name)) name = `~${name}`;
  taken.add(name);
  return name;
}

/** 옵션 계획의 삭제·수정을 반영한다. 새 옵션은 상품 수정에서 함께 만든다. */
async function applyOptionPlan(
  tx: Prisma.TransactionClient,
  productId: string,
  existing: ExistingOption[],
  plan: OptionPlan,
) {
  if (plan.deletes.length > 0) {
    await tx.onsiteProductOption.deleteMany({ where: { productId, optionId: { in: plan.deletes } } });
  }
  // 같은 상품 안 옵션명은 unique 라, 이름을 맞바꾸거나 이어서 바꿀 때 부딪히지 않게 먼저 임시 이름으로 옮긴다.
  const taken = new Set([
    ...existing.map((option) => option.name),
    ...plan.updates.map((update) => update.name),
    ...plan.creates.map((create) => create.name),
  ]);
  const renamed = plan.updates.filter((update) => update.renamed);
  for (const [index, update] of renamed.entries()) {
    await tx.onsiteProductOption.update({
      where: { optionId: update.optionId },
      data: { name: temporaryOptionName(index, taken) },
    });
  }
  for (const update of plan.updates) {
    await tx.onsiteProductOption.update({
      where: { optionId: update.optionId },
      data: {
        name: update.name,
        surcharge: update.surcharge,
        initStock: update.stock,
        currentStock: update.stock,
      },
    });
  }
}

type PatchOutcome =
  | { kind: 'updated'; product: ProductRow }
  | { kind: 'optionNotFound' }
  | { kind: 'priceLocked' }
  | { kind: 'optionDeleteLocked' };

/**
 * 상품 수정.
 *
 * 판매 이력이 있는 상품(결제완료 주문에 팔린 상품, 목록의 hasSalesHistory=true)은
 * - 가격(price)과 옵션 추가금을 바꿀 수 없다(409 PRODUCT_PRICE_LOCKED).
 *   마감 직전 할인은 상품 가격 수정이 아니라 현장 포스 할인으로 한다(1106 기획회의 결정).
 * - 옵션을 지울 수 없다(409 PRODUCT_OPTION_DELETE_LOCKED). 옵션 사용 해제도 옵션 삭제다.
 * - 옵션 추가, 옵션 이름 변경(id를 보내야 한다), 재고 수정은 된다(#57 기획 답).
 * 같은 가격·추가금을 다시 보내는 것은 변경이 아니라 통과시킨다.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await getSellerContext();
    if (!context.ok) return apiErrors.unauthorized();
    if (!context.store) return apiErrors.notFound('상품을 찾을 수 없습니다.');
    const storeId = context.store.storeId;

    const existing = await findOwnedProduct(storeId, params.onsiteProductId);
    if (!existing) return apiErrors.notFound('상품을 찾을 수 없습니다.');

    const parsed = UpdateProductSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiErrors.invalidInput(parsed.error.issues[0]?.message);
    }
    const input = parsed.data;

    if (input.categoryId) {
      const owned = await prisma.onsiteProductCategory.findFirst({
        where: { categoryId: input.categoryId, storeId },
        select: { categoryId: true },
      });
      if (!owned) return apiErrors.notFound('카테고리를 찾을 수 없습니다.');
    }

    const hasOption = input.hasOption ?? existing.hasOption;
    // 옵션을 쓰면 재고는 옵션 합계, 아니면 보내준 총재고. 둘 다 없으면 기존 값을 둔다.
    const stock = hasOption
      ? input.options?.reduce((sum, option) => sum + option.stock, 0)
      : input.totalStock;

    const priceChanged = input.price !== undefined && input.price !== existing.price;
    // 옵션 목록이 오면 그것이 옵션 전체다. 옵션을 쓰지 않으면 옵션은 없어야 한다.
    const desiredOptions = input.options !== undefined ? (hasOption ? input.options : []) : undefined;

    const outcome = await prisma.$transaction(async (tx): Promise<PatchOutcome> => {
      const currentOptions =
        desiredOptions === undefined
          ? []
          : await tx.onsiteProductOption.findMany({
              where: { productId: params.onsiteProductId },
              select: { optionId: true, name: true, surcharge: true },
              orderBy: [{ createdAt: 'asc' }, { optionId: 'asc' }],
            });
      const plan = desiredOptions === undefined ? null : planOptionChanges(currentOptions, desiredOptions);
      if (plan && plan.unknownIds.length > 0) return { kind: 'optionNotFound' };

      // 판매이력 확인과 수정을 한 트랜잭션에 둬서 그 사이에 결제가 끼어드는 틈을 줄인다(삭제와 같은 방식).
      const touchesPrice = priceChanged || (plan?.updates.some((update) => update.surchargeChanged) ?? false);
      const deletesOptions = (plan?.deletes.length ?? 0) > 0;
      if ((touchesPrice || deletesOptions) && (await hasProductPaidSale(params.onsiteProductId, tx))) {
        return { kind: touchesPrice ? 'priceLocked' : 'optionDeleteLocked' };
      }

      if (plan) await applyOptionPlan(tx, params.onsiteProductId, currentOptions, plan);

      const product = await tx.onsiteProduct.update({
        where: { productId: params.onsiteProductId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.hasOption !== undefined ? { hasOption: input.hasOption } : {}),
          ...(stock !== undefined ? { initStock: stock, currentStock: stock } : {}),
          ...(plan && plan.creates.length > 0
            ? {
                options: {
                  create: plan.creates.map((option) => ({
                    name: option.name,
                    surcharge: option.surcharge,
                    initStock: option.stock,
                    currentStock: option.stock,
                  })),
                },
              }
            : {}),
        },
        select: PRODUCT_SELECT,
      });
      return { kind: 'updated', product };
    });

    switch (outcome.kind) {
      case 'optionNotFound':
        return apiErrors.notFound('옵션을 찾을 수 없습니다.');
      case 'priceLocked':
        return apiError(409, 'PRODUCT_PRICE_LOCKED', '판매 이력이 있는 상품의 가격 변경 불가');
      case 'optionDeleteLocked':
        return apiError(409, 'PRODUCT_OPTION_DELETE_LOCKED', '판매 이력이 있는 상품의 옵션 삭제 불가');
      case 'updated':
        return apiSuccess({
          product: toResponse(outcome.product, await hasProductPaidSale(params.onsiteProductId)),
        });
    }
  } catch (error) {
    console.error('[qrshop/products/:id] PATCH error:', error);
    return apiErrors.serverError();
  }
}

/**
 * 상품 삭제.
 *
 * 하드 삭제다(디자인 문구: "삭제된 상품은 다시 복구할 수 없습니다").
 * 결제완료 주문에 팔린 상품(목록의 hasSalesHistory=true)은 삭제 버튼이 감춰지는 상품이라,
 * 직접 호출해도 409 PRODUCT_HAS_SALES 로 거부한다.
 * 미결제 주문뿐인 상품은 지워지고, 그 OrderItem 은 onDelete: SetNull 이라 남되 상품 참조만 끊긴다.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const context = await getSellerContext();
    if (!context.ok) return apiErrors.unauthorized();
    if (!context.store) return apiErrors.notFound('상품을 찾을 수 없습니다.');

    const existing = await findOwnedProduct(context.store.storeId, params.onsiteProductId);
    if (!existing) return apiErrors.notFound('상품을 찾을 수 없습니다.');

    // 판매이력 확인과 삭제를 한 트랜잭션에 둬서 그 사이에 결제가 끼어드는 틈을 줄인다.
    const blocked = await prisma.$transaction(async (tx) => {
      if (await hasProductPaidSale(params.onsiteProductId, tx)) return true;
      await tx.onsiteProduct.delete({ where: { productId: params.onsiteProductId } });
      return false;
    });
    if (blocked) return apiError(409, 'PRODUCT_HAS_SALES', '판매 이력이 있는 상품');

    return apiSuccess({ productId: params.onsiteProductId });
  } catch (error) {
    console.error('[qrshop/products/:id] DELETE error:', error);
    return apiErrors.serverError();
  }
}
