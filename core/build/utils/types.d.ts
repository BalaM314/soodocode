export type Tuplify<TupleLike extends Record<string, unknown>, Counter extends 0[] = [0], CurrentKey = "0", NextCounter extends 0[] = [...Counter, 0], NextKey = Exclude<keyof NextCounter, keyof Counter>> = CurrentKey extends keyof TupleLike ? [TupleLike[CurrentKey], ...Tuplify<TupleLike, NextCounter, NextKey>] : [];
export type MergeTuples<T extends unknown[]> = Tuplify<U2I<T extends unknown ? Omit<T, keyof any[]> : never>>;
export type ClassProperties<T extends object, K extends keyof T = keyof T, NonFunctionKeys extends keyof T = K extends unknown ? T[K] extends (...args: any[]) => unknown ? never : K : never> = Pick<T, NonFunctionKeys>;
export type BoxPrimitive<T> = T extends number ? Number : T extends string ? String : T extends boolean ? Boolean : T;
export type U2I<U> = (U extends U ? (u: U) => 0 : never) extends (i: infer I) => 0 ? Extract<I, U> : never;
export type PartialKey<T, K extends keyof T> = Partial<T> & Omit<T, K>;
export type TextRange = [start: number, end: number];
export type TextRanged = {
    range: TextRange | (() => TextRange);
};
export type TextRanged2 = {
    range: TextRange;
};
export type TextRangeLike = TextRange | TextRanged | (TextRange | TextRanged)[];
export type RangeAttached<T> = T & {
    range: TextRange;
};
