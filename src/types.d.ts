/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains global type definitions.
*/

interface ObjectConstructor {
	/**
	 * Returns an array of key/values of the enumerable properties of an object
	 * @param o Object that contains the properties and methods. This can be an object that you created or an existing Document Object Model (DOM) object.
	 */
	entries<const K extends PropertyKey, T>(o: Record<K, T>): [K, T][];
	fromEntries<const K extends PropertyKey, T>(entries: Iterable<readonly [K, T]>): Record<K, T>;
}
