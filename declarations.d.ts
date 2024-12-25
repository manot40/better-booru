declare type Nullable<T> = T | null;

declare type StringHint<T extends string> = T | (string & {});

declare type Primitive = string | number | null | undefined;

declare type KeyOfEnum<E extends object> = Exclude<keyof E, number>;
declare type ValueOfEnum<E extends object> = E[KeyOfEnum<E>];
