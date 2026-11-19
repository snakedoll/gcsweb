// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { planOptionChanges, type ExistingOption } from './product-options';

const EXISTING: ExistingOption[] = [
  { optionId: 'o1', name: '빨강', surcharge: 500 },
  { optionId: 'o2', name: '파랑', surcharge: 0 },
];

describe('planOptionChanges', () => {
  it('id가 있으면 그 옵션을 고친다(이름 변경, 추가금 그대로)', () => {
    const plan = planOptionChanges(EXISTING, [
      { id: 'o1', name: '주홍', surcharge: 500, stock: 3 },
      { id: 'o2', name: '파랑', surcharge: 0, stock: 2 },
    ]);
    expect(plan).toEqual({
      updates: [
        { optionId: 'o1', name: '주홍', surcharge: 500, stock: 3, renamed: true, surchargeChanged: false },
        { optionId: 'o2', name: '파랑', surcharge: 0, stock: 2, renamed: false, surchargeChanged: false },
      ],
      creates: [],
      deletes: [],
      unknownIds: [],
    });
  });

  it('id가 없으면 같은 이름의 기존 옵션으로 본다(지금 프론트처럼 id 없이 보내도 옵션 id 유지)', () => {
    const plan = planOptionChanges(EXISTING, [
      { name: '빨강', surcharge: 500, stock: 9 },
      { name: '파랑', surcharge: 0, stock: 1 },
    ]);
    expect(plan.updates.map((u) => u.optionId)).toEqual(['o1', 'o2']);
    expect(plan.creates).toEqual([]);
    expect(plan.deletes).toEqual([]);
  });

  it('짝이 없는 입력은 새 옵션, 짝이 없는 기존 옵션은 삭제 대상', () => {
    const plan = planOptionChanges(EXISTING, [
      { name: '빨강', surcharge: 500, stock: 1 },
      { name: '초록', surcharge: 300, stock: 4 },
    ]);
    expect(plan.creates).toEqual([{ name: '초록', surcharge: 300, stock: 4 }]);
    expect(plan.deletes).toEqual(['o2']);
  });

  it('추가금이 바뀌면 surchargeChanged', () => {
    const plan = planOptionChanges(EXISTING, [
      { id: 'o1', name: '빨강', surcharge: 700, stock: 1 },
      { name: '파랑', surcharge: 0, stock: 1 },
    ]);
    expect(plan.updates.map((u) => u.surchargeChanged)).toEqual([true, false]);
  });

  it('id 없이 이름만 바꾸면 기존 옵션 삭제 + 새 옵션으로 보인다(이름 변경은 id가 필요)', () => {
    const plan = planOptionChanges(EXISTING, [
      { name: '주홍', surcharge: 500, stock: 1 },
      { name: '파랑', surcharge: 0, stock: 1 },
    ]);
    expect(plan.creates.map((c) => c.name)).toEqual(['주홍']);
    expect(plan.deletes).toEqual(['o1']);
  });

  it('두 옵션의 이름을 맞바꿔도 id로 짝짓는다', () => {
    const plan = planOptionChanges(EXISTING, [
      { id: 'o1', name: '파랑', surcharge: 500, stock: 1 },
      { id: 'o2', name: '빨강', surcharge: 0, stock: 1 },
    ]);
    expect(plan.updates.map((u) => [u.optionId, u.name, u.renamed])).toEqual([
      ['o1', '파랑', true],
      ['o2', '빨강', true],
    ]);
    expect(plan.deletes).toEqual([]);
  });

  it('이 상품 옵션이 아닌 id는 unknownIds', () => {
    const plan = planOptionChanges(EXISTING, [{ id: 'zz', name: '빨강', surcharge: 500, stock: 1 }]);
    expect(plan.unknownIds).toEqual(['zz']);
    expect(plan.updates).toEqual([]);
  });

  it('옵션을 모두 빼면(옵션 사용 해제 포함) 전부 삭제 대상', () => {
    expect(planOptionChanges(EXISTING, []).deletes).toEqual(['o1', 'o2']);
  });
});
