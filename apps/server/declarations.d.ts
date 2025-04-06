declare type Nullable<T> = T | null;
declare type Optional<T> = T | undefined;
declare type Primitive = string | number | boolean | null | undefined;
declare type StringHint<T extends string> = T | (string & {});
declare type MaybeArray<T> = T | T[];

declare type WorkerEventType = 'QueryPosts' | 'QueryExpensiveTags';
declare type WorkerEventPayload<T = any> = {
  type: WorkerEventType;
  payload: T;
};
