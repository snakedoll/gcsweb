/**
 * 상품 수정 때 보낸 옵션 목록을 기존 옵션과 짝지어 바꿀 일(수정·추가·삭제)을 정한다.
 *
 * 짝짓기: `id`가 있으면 그 기존 옵션, 없으면 아직 짝이 없는 같은 이름의 기존 옵션, 그것도 없으면 새 옵션.
 * 짝이 없는 기존 옵션은 삭제 대상이다. 기존 옵션을 고치면 옵션 id가 유지되어
 * 주문 항목·재고 복원·매출 집계가 옵션 id로 계속 이어진다(#57).
 */

export type ExistingOption = { optionId: string; name: string; surcharge: number };

export type OptionInput = { id?: string; name: string; surcharge: number; stock: number };

export type OptionUpdate = {
  optionId: string;
  name: string;
  surcharge: number;
  stock: number;
  /** 이름이 바뀌는지(같은 상품 안 이름 unique 때문에 두 번에 나눠 바꾼다) */
  renamed: boolean;
  /** 추가금이 바뀌는지(판매 이력이 있는 상품은 가격 잠금) */
  surchargeChanged: boolean;
};

export type OptionPlan = {
  updates: OptionUpdate[];
  creates: { name: string; surcharge: number; stock: number }[];
  deletes: string[];
  /** 이 상품 옵션이 아닌 id */
  unknownIds: string[];
};

export function planOptionChanges(existing: ExistingOption[], desired: OptionInput[]): OptionPlan {
  const byId = new Map(existing.map((option) => [option.optionId, option]));
  const used = new Set<string>();
  const matched = new Map<OptionInput, ExistingOption>();
  const unknownIds: string[] = [];

  for (const input of desired) {
    if (!input.id) continue;
    const option = byId.get(input.id);
    if (!option || used.has(option.optionId)) {
      unknownIds.push(input.id);
      continue;
    }
    used.add(option.optionId);
    matched.set(input, option);
  }

  for (const input of desired) {
    if (input.id) continue;
    const option = existing.find((candidate) => !used.has(candidate.optionId) && candidate.name === input.name);
    if (!option) continue;
    used.add(option.optionId);
    matched.set(input, option);
  }

  const updates: OptionUpdate[] = [];
  const creates: OptionPlan['creates'] = [];
  for (const input of desired) {
    if (input.id && !matched.has(input)) continue; // unknownIds 로 따로 알린다
    const option = matched.get(input);
    if (option) {
      updates.push({
        optionId: option.optionId,
        name: input.name,
        surcharge: input.surcharge,
        stock: input.stock,
        renamed: option.name !== input.name,
        surchargeChanged: option.surcharge !== input.surcharge,
      });
    } else {
      creates.push({ name: input.name, surcharge: input.surcharge, stock: input.stock });
    }
  }

  const deletes = existing.filter((option) => !used.has(option.optionId)).map((option) => option.optionId);
  return { updates, creates, deletes, unknownIds };
}
