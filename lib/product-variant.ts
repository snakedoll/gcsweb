import type { Prisma } from '@prisma/client';

export type VariantOptionInput = {
  name: string;
  values: Array<{ value: string; additionalPrice: number }>;
};

type VariantCombination = {
  signature: string;
  name: string | null;
  additionalPrice: number;
};

function encodePart(value: string) {
  return encodeURIComponent(value);
}

function buildCombinations(options: VariantOptionInput[]): VariantCombination[] {
  if (options.length === 0) {
    return [{ signature: '__default__', name: null, additionalPrice: 0 }];
  }

  const result: VariantCombination[] = [];

  const dfs = (
    index: number,
    signatureParts: string[],
    nameParts: string[],
    additionalPriceSum: number
  ) => {
    if (index === options.length) {
      result.push({
        signature: signatureParts.join('|'),
        name: nameParts.join(' / '),
        additionalPrice: additionalPriceSum,
      });
      return;
    }

    const option = options[index];
    for (const valueRow of option.values) {
      const optionName = encodePart(option.name);
      const optionValue = encodePart(valueRow.value);
      dfs(
        index + 1,
        [...signatureParts, `${optionName}=${optionValue}`],
        [...nameParts, valueRow.value],
        additionalPriceSum + valueRow.additionalPrice
      );
    }
  };

  dfs(0, [], [], 0);
  return result;
}

export async function syncProductVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  unitBasePrice: number,
  options: VariantOptionInput[]
) {
  const combinations = buildCombinations(options);

  await tx.productVariant.deleteMany({ where: { productId } });

  if (combinations.length === 0) return;

  await tx.productVariant.createMany({
    data: combinations.map((combo) => ({
      productId,
      variantName: combo.name,
      optionSignature: combo.signature,
      unitPrice: unitBasePrice + combo.additionalPrice,
      isSoldOut: false,
    })),
  });
}
