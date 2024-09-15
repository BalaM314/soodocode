/*
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains global type definitions.
*/

export type ClassProperties<
	T extends object,
	K extends keyof T = keyof T,
	NonFunctionKeys extends keyof T = K extends unknown ? T[K] extends (...args:any[]) => unknown ? never : K : never
> = Pick<T, NonFunctionKeys>;

export interface TagFunction<Tin = string, Tout = string> {
	(stringChunks: readonly string[], ...varChunks: readonly Tin[]):Tout;
}
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export type BoxPrimitive<T> = T extends number ? Number : T extends string ? String : T extends boolean ? Boolean : T;

export type TextRange = [start:number, end:number]; //TODO convert to class
export type TextRanged = {
	range: TextRange | (() => TextRange);
}
export type TextRanged2 = {
	range: TextRange;
}
export type TextRangeLike = TextRange | TextRanged | (TextRange | TextRanged)[];
export type RangeAttached<T> = T & {
	range: TextRange;
};

export type U2I<U> = (
  U extends U ? (u: U) => 0 : never
) extends (i: infer I) => 0 ? Extract<I, U> : never

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
	NextKey = Exclude<keyof NextCounter, keyof Counter>,
> =
	CurrentKey extends keyof TupleLike
		? [TupleLike[CurrentKey], ...Tuplify<TupleLike, NextCounter, NextKey>]
		// If the current key isn't in the object, done
		: [];
export type MergeTuples<T extends unknown[]> = Tuplify<
	U2I<T extends unknown ?
		Omit<T, keyof any[]>
	: never>
>;

export interface IFormattable {
	fmtDebug():string;
	/** If not implemented, defaults to `"${fmtText()}"` */
	fmtQuoted?: () => string;
	fmtText():string;
	/** If not implemented, defaults to fmtText() */
	fmtShort?: () => string;
}

/** Makes the property K of T optional. */
export type PartialKey<T, O extends keyof T> = Partial<T> & Omit<T, O>;

declare global {
	interface ObjectConstructor {
		/**
		 * Returns an array of key/values of the enumerable properties of an object
		 * @param o Object that contains the properties and methods. This can be an object that you created or an existing Document Object Model (DOM) object.
		 */
		entries<const K extends PropertyKey, T>(o: Record<K, T>): [K, T][];
		fromEntries<const K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>): Record<K, T>;
		/**
     * Creates an object that has the specified prototype or that has null prototype.
     * @param o Object to use as a prototype. May be null.
     */
    create(o: object | null): {};

    /**
     * Creates an object that has the specified prototype, and that optionally contains specified properties.
     * @param o Object to use as a prototype. May be null
     * @param properties JavaScript object that contains one or more property descriptors.
     */
    create(o: object | null, properties: PropertyDescriptorMap & ThisType<any>): {};
		setPrototypeOf<T extends object>(o: T, proto: null): T;
	}
	interface Array<T> {
		map<TThis extends Array<T>, U>(this:TThis, fn:(v:T, i:number, a:TThis) => U): number extends TThis["length"] ? U[] : { [K in keyof TThis]: U };
		reverse<TThis extends Array<T>, U>(this:TThis): TThis extends [infer A, infer B] ? [B, A] : T[];
		slice<TThis extends Array<T>>(this:TThis): TThis;
		includes(searchElement:unknown, searchIndex?:number):searchElement is T;
		filter(boolean:BooleanConstructor): Array<T extends (false | null | undefined) ? never : T>;
	}
	interface ReadonlyArray<T> {
		map<TThis extends Array<T>, U>(this:TThis, fn:(v:T, i:number, a:TThis) => U): number extends TThis["length"] ? readonly U[] : { [K in keyof TThis]: U };
		slice<TThis extends Array<T>>(this:TThis): TThis;
		includes(searchElement:unknown, searchIndex?:number):searchElement is T;
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


