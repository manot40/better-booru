export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Primitive = string | number | boolean | null | undefined;
export type StringHint<T extends string> = T | (string & {});
export type MaybeArray<T> = T | T[];
export type MaybePromise<T> = T | Promise<T>;

export type WorkerEventType = 'DB_OPERATION';
export type WorkerEventPayload<T = any> = {
  op: WorkerEventType;
  payload: T;
};
