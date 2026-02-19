import { z } from 'zod';

const PRODUCT_NAME_MAX_LENGTH = 13;

export const newProductStep1Schema = z.object({
  teamId: z.string().min(1, '판매팀을 선택해주세요.'),
  name: z
    .string()
    .min(1, '상품명을 입력해주세요.')
    .max(PRODUCT_NAME_MAX_LENGTH, '글자수는 13자 이내로 작성해주세요'),
  description: z.string().min(1, '상품 설명을 입력해주세요.'),
  type: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  receiveMethod: z.union([z.literal(0), z.literal(1)]),
  salesStartDate: z.string().min(1, '판매 시작일을 입력해주세요.'),
  salesEndDate: z.string().min(1, '판매 종료일을 입력해주세요.'),
});

export type NewProductStep1Input = z.infer<typeof newProductStep1Schema>;

export { PRODUCT_NAME_MAX_LENGTH };
