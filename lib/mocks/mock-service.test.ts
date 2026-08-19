import { describe, expect, it } from 'vitest';
import { MockServiceError, resolveMockScenario } from './mock-service';

describe('resolveMockScenario', () => {
  it('정상 데이터를 Promise로 돌려준다', async () => {
    await expect(
      resolveMockScenario({ kind: 'success', data: { id: 'product-1' } }),
    ).resolves.toEqual({ id: 'product-1' });
  });

  it('빈 상태에 사용할 데이터도 같은 계약으로 돌려준다', async () => {
    await expect(
      resolveMockScenario({ kind: 'empty', data: [] as string[] }),
    ).resolves.toEqual([]);
  });

  it('오류 시 일관된 Mock Service 오류를 던진다', async () => {
    await expect(
      resolveMockScenario({ kind: 'error', message: '연습용 오류' }),
    ).rejects.toEqual(expect.objectContaining<Partial<MockServiceError>>({
      code: 'MOCK_SERVICE_ERROR',
      message: '연습용 오류',
    }));
  });
});
