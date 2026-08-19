export type MockScenario<T> =
  | { kind: 'success'; data: T; delayMs?: number }
  | { kind: 'empty'; data: T; delayMs?: number }
  | { kind: 'error'; message?: string; delayMs?: number };

export class MockServiceError extends Error {
  readonly code = 'MOCK_SERVICE_ERROR';

  constructor(message = 'Mock Service에서 오류가 발생했습니다.') {
    super(message);
    this.name = 'MockServiceError';
  }
}

export async function resolveMockScenario<T>(scenario: MockScenario<T>): Promise<T> {
  const delayMs = Math.max(0, scenario.delayMs ?? 0);

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  if (scenario.kind === 'error') {
    throw new MockServiceError(scenario.message);
  }

  return scenario.data;
}
