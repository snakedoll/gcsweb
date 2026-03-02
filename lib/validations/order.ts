import { z } from 'zod';

const ProductTypeSchema = z.union([z.literal(0), z.literal(1)]); // fund | buy now
const ReceiveMethodSchema = z.union([z.literal(0), z.literal(1)]); // delivery | pickup
const PaymentMethodSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]); // card | virtual account | easy pay

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'productId is required.'),
  quantity: z.coerce.number().int().min(1, 'quantity must be >= 1.'),
  price: z.coerce.number().int().min(0, 'price must be >= 0.'),
  optionData: z.unknown().optional(),
});

export const createOrderSchema = z
  .object({
    userId: z.string().min(1).optional().nullable(),
    productType: ProductTypeSchema,
    receiveMethod: ReceiveMethodSchema,
    receiverName: z.string().trim().optional().nullable(),
    receiverPhone: z.string().trim().optional().nullable(),
    deliveryZipCode: z.string().trim().optional().nullable(),
    deliveryAddressMain: z.string().trim().optional().nullable(),
    deliveryAddressDetail: z.string().trim().optional().nullable(),
    deliveryMessage: z.string().trim().optional().nullable(),
    ordererName: z.string().trim().min(1, 'ordererName is required.'),
    ordererPhone: z.string().trim().min(1, 'ordererPhone is required.'),
    paymentMethod: PaymentMethodSchema,
    isPolicyAgreed: z.boolean().optional(),
    paymentAmount: z.coerce.number().int().min(0, 'paymentAmount must be >= 0.').optional(),
    items: z.array(OrderItemSchema).min(1, 'at least one order item is required.'),
  })
  .superRefine((data, ctx) => {
    const isFund = data.productType === 0;
    const isDelivery = data.receiveMethod === 0;
    const requiresPolicyAgreement = data.productType === 1 || (data.productType === 0 && data.receiveMethod === 1);

    if (!isFund && isDelivery) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receiveMethod'],
        message: 'buy now supports pickup only.',
      });
    }

    if (isFund) {
      if (!data.receiverName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['receiverName'],
          message: 'receiverName is required for fund orders.',
        });
      }
      if (!data.receiverPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['receiverPhone'],
          message: 'receiverPhone is required for fund orders.',
        });
      }
    }

    if (isFund && isDelivery) {
      if (!data.deliveryZipCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryZipCode'],
          message: 'deliveryZipCode is required for fund delivery.',
        });
      }
      if (!data.deliveryAddressMain) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryAddressMain'],
          message: 'deliveryAddressMain is required for fund delivery.',
        });
      }
      if (!data.deliveryAddressDetail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryAddressDetail'],
          message: 'deliveryAddressDetail is required for fund delivery.',
        });
      }
      if (!data.deliveryMessage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryMessage'],
          message: 'deliveryMessage is required for fund delivery.',
        });
      }
    }

    if (isFund && data.paymentMethod === 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'fund orders do not support easy pay.',
      });
    }

    if (requiresPolicyAgreement && data.isPolicyAgreed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isPolicyAgreed'],
        message: 'isPolicyAgreed must be true for this order type.',
      });
    }

    if (isFund) {
      const uniqueProductIds = new Set(data.items.map((item) => item.productId));
      if (uniqueProductIds.size > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: 'fund orders can contain only one productId per order.',
        });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateOrderItemInput = z.infer<typeof OrderItemSchema>;
