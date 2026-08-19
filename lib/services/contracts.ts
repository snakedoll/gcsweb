export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface ServiceErrorShape {
  code: string;
  message: string;
}

export type AsyncService<TInput, TResult> = (input: TInput) => Promise<TResult>;
