export {};
declare global {
    interface ObjectConstructor {
        entries<const K extends PropertyKey, T>(o: Record<K, T>): [K, T][];
        fromEntries<const K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>): Record<K, T>;
        create(o: object | null): {};
        create(o: object | null, properties: PropertyDescriptorMap & ThisType<any>): {};
        setPrototypeOf<T extends object>(o: T, proto: null): T;
    }
    interface Array<T> {
        map<TThis extends Array<T>, U>(this: TThis, fn: (v: T, i: number, a: TThis) => U): number extends TThis["length"] ? U[] : {
            [K in keyof TThis]: U;
        };
        reverse<TThis extends Array<T>, U>(this: TThis): TThis extends [infer A, infer B] ? [B, A] : T[];
        slice<TThis extends Array<T>>(this: TThis): TThis;
        includes(searchElement: unknown, searchIndex?: number): searchElement is T;
        filter(boolean: BooleanConstructor): Array<T extends (false | null | undefined) ? never : T>;
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
    interface Function {
        displayName?: string;
    }
    interface SymbolConstructor {
        readonly metadata: unique symbol;
    }
}
