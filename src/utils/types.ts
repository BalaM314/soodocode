

/**
Converts an object like
```
{
  "0": "zero",
  "1": "one",
}
```
to a tuple like `["zero", "one"]`
*/

export type Tuplify<
	TupleLike extends Record<string, unknown>,
	/** Used to count upwards, as there is no addition operator */
	Counter extends 0[] = [0],
	/** The current key that is being added to the tuple */
	CurrentKey = "0",

	NextCounter extends 0[] = [...Counter, 0],
	NextKey = Exclude<keyof NextCounter, keyof Counter>
> = CurrentKey extends keyof TupleLike ? [TupleLike[CurrentKey], ...Tuplify<TupleLike, NextCounter, NextKey>] : [];
export type MergeTuples<T extends unknown[]> = Tuplify<
	U2I<T extends unknown ? Omit<T, keyof any[]> : never>
>;
/*
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains global type definitions.
*/

export type ClassProperties<
	T extends object,
	K extends keyof T = keyof T,
	NonFunctionKeys extends keyof T = K extends unknown ? T[K] extends (...args: any[]) => unknown ? never : K : never
> = Pick<T, NonFunctionKeys>;

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export type BoxPrimitive<T> = T extends number ? Number : T extends string ? String : T extends boolean ? Boolean : T;
export type U2I<U> = (U extends U ? (u: U) => 0 : never) extends (i: infer I) => 0 ? Extract<I, U> : never;
/** Makes the property K of T optional. */

export type PartialKey<T, K extends keyof T> = Partial<T> & Omit<T, K>;
export type TextRange = [start: number, end: number]; //TODO convert to class
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

