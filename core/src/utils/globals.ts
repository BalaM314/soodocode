/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains global type definitions and overrides to builtin types.
*/

export {};
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
