export type ClassProperties<T extends object, K extends keyof T = keyof T, NonFunctionKeys extends keyof T = K extends unknown ? T[K] extends (...args: any[]) => unknown ? never : K : never> = Pick<T, NonFunctionKeys>;
export interface TagFunction<Tin = string, Tout = string> {
    (stringChunks: readonly string[], ...varChunks: readonly Tin[]): Tout;
}
export type BoxPrimitive<T> = T extends number ? Number : T extends string ? String : T extends boolean ? Boolean : T;
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
export interface IFormattable {
    fmtDebug(): string;
    fmtQuoted?: () => string;
    fmtText(): string;
}
export type PartialKey<T, O extends keyof T> = Partial<T> & Omit<T, O>;
declare global {
    interface ObjectConstructor {
        entries<const K extends PropertyKey, T>(o: Record<K, T>): [K, T][];
        fromEntries<const K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>): Record<K, T>;
    }
    interface Array<T> {
        map<TThis extends Array<T>, U>(this: TThis, fn: (v: T, i: number, a: TThis) => U): number extends TThis["length"] ? U[] : {
            [K in keyof TThis]: U;
        };
        reverse<TThis extends Array<T>, U>(this: TThis): TThis extends [infer A, infer B] ? [B, A] : T[];
        slice<TThis extends Array<T>>(this: TThis): TThis;
        includes(searchElement: unknown, searchIndex?: number): searchElement is T;
    }
    interface ReadonlyArray<T> {
        map<TThis extends Array<T>, U>(this: TThis, fn: (v: T, i: number, a: TThis) => U): number extends TThis["length"] ? readonly U[] : {
            [K in keyof TThis]: U;
        };
        slice<TThis extends Array<T>>(this: TThis): TThis;
        includes(searchElement: unknown, searchIndex?: number): searchElement is T;
    }
    interface ArrayConstructor {
        isArray(arg: any): arg is unknown[];
    }
}
