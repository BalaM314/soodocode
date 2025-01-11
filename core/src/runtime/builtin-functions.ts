/* @license
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions. Some defined in the insert, others were made up.
*/
/* eslint-disable @typescript-eslint/no-unsafe-unary-minus */


import { ArrayVariableType, BuiltinFunctionData, PrimitiveVariableType, PrimitiveVariableTypeMapping, PrimitiveVariableTypeName, SetVariableType, VariableTypeMapping, VariableValue } from "../runtime/runtime-types.js";
import { Runtime } from "../runtime/runtime.js";
import { f, fail, fakeObject, unreachable } from "../utils/funcs.js";
import type { BoxPrimitive, RangeAttached } from "../utils/types.js";


//Warning: this file contains extremely sane code
//Function implementations have the parameter arg types determined by the following generics
//The functions sometimes need to fail() and set the range to the range of an argument
//Passing {value: T, range: TextRange} as the arguments is the most reasonable solution, but this is slightly annoying to use
//Instead, Number & {range: TextRange} is used
//so that the arguments can be passed directly to fail() which will read the range,
//and they can also be used in operations and computations without issue
//Typescript refuses to allow operations on boxed number types
//this is probably because new Number(5) == 5 but new Number(5) != new Number(5)
//for this reason, use .valueOf() before comparing two arguments with ==
//To get around this, the preprocessed function data has its type definitions set to accept range tagged primitives
//(which are impossible but typescript accepts them)
//and the impl is unsoundly casted to the version that accepts range tagged boxed primitives

/**
 * Represents the object used for specifying the type of a builtin function argument.
 * "STRING" -> string
 * ["STRING"] -> string
 * ["STRING", "NUMBER"] -> string
 * ["STRING", ["NUMBER"]] -> string | number[]
 * ["STRING", { set: "NUMBER" }] -> string | Set<number>
 * [["ANY"]] -> unknown[]
**/
type BuiltinFunctionArgType = PrimitiveVariableTypeName | ComplexBuiltinFunctionArgType[];
type ComplexBuiltinFunctionArgType = PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"] | {
	set: PrimitiveVariableTypeName | "ANY";
};
type BuiltinFunctionArg = [name:string, type:BuiltinFunctionArgType];

/** Maps BuiltinFunctionArgTypes to the JS type */
type FunctionArgVariableTypeMapping<T extends BuiltinFunctionArgType> =
	T extends Array<infer U extends ComplexBuiltinFunctionArgType> ?
		U extends PrimitiveVariableTypeName ?
			RangeAttached<PrimitiveVariableTypeMapping<U>> : //this is actually a RangeAttached<BoxPrimitive<...>> but that causes Typescript to complain
		U extends [infer S] ?
			S extends PrimitiveVariableTypeName ?
				RangeAttached<PrimitiveVariableTypeMapping<S>[] | (
					S extends "INTEGER" ? Int32Array :
					S extends "REAL" ? Float64Array :
					never
				)> :
				RangeAttached<unknown[]> :
		U extends { set: infer S extends PrimitiveVariableTypeName | "ANY" } ?
			RangeAttached<VariableTypeMapping<SetVariableType> & Array<PrimitiveVariableTypeMapping<S extends "ANY" ? PrimitiveVariableTypeName : S>>>
		: never :
	T extends PrimitiveVariableTypeName
		? RangeAttached<PrimitiveVariableTypeMapping<T>> //this is actually a RangeAttached<BoxPrimitive<...>> but that causes Typescript to complain
		: never;
/** Returns the type of the arguments of a builtin function impl given the (const) type of the specified args. */
type FunctionArgs<TSuppliedArgs extends BuiltinFunctionArg[]> =
	[TSuppliedArgs & 0] extends [1] //If any
		? RangeAttached<VariableValue>[] //output this
		: {
			[K in keyof TSuppliedArgs]: FunctionArgVariableTypeMapping<TSuppliedArgs[K][1]>; //discard the name, use the other generic to get the corresponding type
		};
type PreprocesssedBuiltinFunctionData<TArgs extends BuiltinFunctionArg[], TReturn extends PrimitiveVariableTypeName | null> = {
	/** The names and types of the arguments required by this function. */
	args: TArgs;
	returnType: TReturn;
	/** The implementation of this function. */
	impl(this:Runtime, ...args:FunctionArgs<TArgs>):TReturn extends PrimitiveVariableTypeName ? PrimitiveVariableTypeMapping<TReturn> : void;
	/**
	 * List of aliases. The function can also be called by any of these names.
	 *
	 * Example:
	 * ```
	 * FOO: {
	 * 	args: [],
	 * 	returnType: "INTEGER",
	 * 	impl(){}
	 * 	aliases: ["BAR", "BAZ"]
	 * }
	 * ```
	 * The function `FOO()` can also be called with `BAR()` or `BAZ()`.
	 **/
	aliases?: string[];
};
/** Wrapper function used to get the correct type definitions for a preprocessed builtin function data. */
function fn<const T extends BuiltinFunctionArg[], const S extends PrimitiveVariableTypeName | null>(data:PreprocesssedBuiltinFunctionData<T, S>){
	return data as PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
}

function initializeArray(x:ArrayVariableType<false>):ArrayVariableType<true> {
	x.init(fakeObject<Runtime>({}));
	return x as never as ArrayVariableType<true>;
}

/** Cached result from calling getBuiltinFunctions() */
let builtinFunctionsCache;
/** Thunk to prevent initializing variable types at file load */
export const getBuiltinFunctions = ():Record<keyof typeof preprocessedBuiltinFunctions, BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>> => builtinFunctionsCache ??= ( // eslint-disable-line @typescript-eslint/no-unsafe-return
	<T extends string>(d:Record<T, PreprocesssedBuiltinFunctionData<any, any>>) => {
		const obj:Record<string, BuiltinFunctionData> = Object.fromEntries(Object.entries(d).map(([name, data]) =>
			[name, {
				args: new Map((data.args as BuiltinFunctionArg[]).map(([name, type]) => [name, {
					passMode: "reference",
					type: (Array.isArray(type) ? type : [type]).map(t =>
						Array.isArray(t) ?
							initializeArray(new ArrayVariableType<false>(null, null, t[0] == "ANY" ? null : PrimitiveVariableType.get(t[0]), [-1, -1]))
						: typeof t == "string" ?
							PrimitiveVariableType.get(t)
						: "set" in t ?
							new SetVariableType(true, name, t.set == "ANY" ? null : PrimitiveVariableType.get(t.set))
						: unreachable(t)
					),
				}] as const)),
				aliases: data.aliases ?? [],
				name,
				//UNSOUND
				// eslint-disable-next-line @typescript-eslint/unbound-method
				impl: data.impl as never as ((this:Runtime, ...args:RangeAttached<BoxPrimitive<VariableValue>>[]) => VariableTypeMapping<PrimitiveVariableType>),
				returnType: PrimitiveVariableType.get(data.returnType as PrimitiveVariableTypeName)
			}]
		));
		Object.values(obj).filter(v => v.aliases && v.aliases.length > 0).forEach(v => {
			v.aliases.forEach(alias => obj[alias] = v);
		});
		return obj;
	}
)(preprocessedBuiltinFunctions);
/** Contains the data used to generate the builtin functions. */
export const preprocessedBuiltinFunctions = ({
	//Source: s23 P22 insert
	LEFT: fn({
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
		],
		returnType: "STRING",
		impl(str, num){
			const chars = [...str];
			//CONFIG unicode mode
			if(num < 0) fail(`Number ${num} is negative`, num);
			if(num > chars.length) fail(`Number ${num} is greater than the length of the string (${chars.length})`, num);
			return chars.slice(0, num).join("");
		},
	}),
	//source: spec 5.5
	RIGHT: fn({
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
		],
		returnType: "STRING",
		impl(str, num){
			const chars = [...str];
			if(num < 0) fail(`Number ${num} is negative`, num);
			if(num > chars.length) fail(`Number ${num} is greater than the length of the string (${chars.length})`, num);
			return chars.slice(-num).join("");
		},
	}),
	//source: spec 5.5
	MID: fn({
		args: [
			["ThisString", "STRING"],
			["StartIndex", "INTEGER"],
			["Length", "INTEGER"],
		],
		returnType: "STRING",
		impl(str, start, length){
			const chars = [...str];
			if(start < 1) fail(`Start index ${start} is less than 1`, start);
			if(length < 1) fail(`Slice length ${length} is less than 1`, length);
			if(length + start - 1 > chars.length) fail(`End of slice (${length} + ${start}) is greater than the length of the string (${chars.length})`, str);
			return chars.slice(start - 1, start + length - 1).join("");
		},
		aliases: ["SUBSTRING"]
	}),
	//source: spec 5.5
	LENGTH: fn({
		args: [
			["ThisString", [["ANY"], "STRING", { set: "ANY" }]],
		],
		returnType: "INTEGER",
		impl(x){
			if(Array.isArray(x))
				return x.length;
			else return [...x].length;
		},
	}),
	//Source: s23 P22 insert
	TO_UPPER: fn({
		args: [
			["x", ["STRING", "CHAR"]],
		],
		returnType: "STRING", //string or char
		impl(str){
			return str.toUpperCase();
		},
	}),
	//Source: s23 P22 insert
	TO_LOWER: fn({
		args: [
			["x", ["STRING", "CHAR"]],
		],
		returnType: "STRING", //string or char
		impl(str){
			return str.toLowerCase();
		},
	}),
	//source: spec 5.5
	UCASE: fn({
		args: [
			["x", "CHAR"],
		],
		returnType: "CHAR",
		impl(str){
			return str.toUpperCase();
		},
	}),
	//source: spec 5.5
	LCASE: fn({
		args: [
			["x", "CHAR"],
		],
		returnType: "CHAR",
		impl(str){
			return str.toLowerCase();
		},
	}),
	//Source: s23 P22 insert
	NUM_TO_STR: fn({
		args: [
			["x", "REAL"], //real or integer, but ints coerce to reals
		],
		returnType: "STRING", //string or char, overflow handled automatically by coercion
		impl(num){
			return num.toString();
		},
	}),
	//Source: s23 P22 insert
	STR_TO_NUM: fn({
		args: [
			["x", ["STRING", "CHAR"]],
		],
		returnType: "REAL", //real or integer, but ints coerce to reals
		impl(str){
			const out = Number(str.valueOf());
			if(isNaN(out) || !Number.isFinite(out)) fail(f.quote`Cannot convert ${str} to a number`, str);
			return out;
		},
	}),
	//Source: s23 P22 insert
	IS_NUM: fn({
		args: [
			["ThisString", ["STRING", "CHAR"]],
		],
		returnType: "BOOLEAN",
		impl(str){
			const out = Number(str.valueOf());
			return !isNaN(out) && Number.isFinite(out);
		},
	}),
	//Source: s23 P22 insert
	ASC: fn({
		args: [
			["ThisChar", "CHAR"],
		],
		returnType: "INTEGER",
		impl(str){
			return str.codePointAt(0)!;
		},
	}),
	CHR: fn({
		args: [
			["x", "INTEGER"],
		],
		returnType: "CHAR",
		impl(x){
			return String.fromCodePoint(x);
		},
	}),
	//source: spec 5.6
	INT: fn({
		args: [
			["x", "REAL"],
		],
		returnType: "INTEGER",
		impl(x){
			return Math.trunc(x);
		},
	}),
	//source: spec 5.6
	RAND: fn({
		args: [
			["x", "INTEGER"],
		],
		returnType: "REAL",
		impl(x){
			return Math.random() * x;
		},
	}),

	//Source: s23 P22 insert
	DAY: fn({
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x){
			return x.getDate();
		}
	}),
	//Source: s23 P22 insert
	MONTH: fn({
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x){
			return x.getMonth();
		}
	}),
	//Source: s23 P22 insert
	YEAR: fn({
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x){
			return x.getFullYear();
		}
	}),
	//Source: s23 P22 insert
	DAYINDEX: fn({
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x){
			return x.getDay() + 1;
		}
	}),
	//Source: s23 P22 insert
	SETDATE: fn({
		args: [
			["Day", "INTEGER"],
			["Month", "INTEGER"],
			["Year", "INTEGER"],
		],
		returnType: "DATE",
		impl(d, m, y){
			return new Date(y, m - 1, d);
		}
	}),
	//Source: s23 P22 insert
	TODAY: fn({
		args: [],
		returnType: "DATE",
		impl(){
			return new Date();
		},
		aliases: ["NOW"]
	}),
	EOF: fn({
		args: [
			["Filename", "STRING"]
		],
		returnType: "BOOLEAN",
		impl(filename){
			const file = this.getOpenFile(filename, ["READ"], `EOF function`);
			return file.lineNumber >= file.lines.length;
		}
	}),
	ROUND: fn({
		args: [
			["Value", "REAL"],
			["Places", "INTEGER"]
		],
		returnType: "REAL", //real or integer, but int coerces to real
		impl(value, places){
			const mult = 10 ** places;
			return Math.round(value * mult) / mult;
		},
	}),
	POW: fn({
		args: [
			["Value", "REAL"],
			["Exponent", "INTEGER"],
		],
		returnType: "REAL",
		impl(value, exponent){
			return value ** exponent;
		}
	}),
	EXP: fn({
		args: [
			["Num", "REAL"]
		],
		returnType: "REAL",
		impl(value){
			return Math.exp(value);
		}
	}),
	TIME: fn({
		args: [
			["Timezone", "INTEGER"]
		],
		returnType: "INTEGER",
		impl(timezone){
			return Date.now() + timezone * 36_000;
		}
	}),
	//Extensions
	DOWNLOADIMAGE: fn({
		args: [
			["Bytes", [["INTEGER"]]],
			["Width", "INTEGER"],
			["Height", "INTEGER"],
			["Filename", "STRING"],
		],
		returnType: null,
		impl(bytes, width, height, filename){
			if(bytes.length != width * height * 4) fail(`Incorrect array length: expected width * height * 4 (${width * height * 4}), got ${bytes.length}\nhelp: bytes should contain the image data in RGBA format, 4 bytes for each pixel`, bytes);
			if(typeof ImageData == "undefined" || typeof createImageBitmap == "undefined" || typeof document == "undefined"){
				//Running in Node
				fail(`DOWNLOADIMAGE is only supported when running in a browser.`, bytes);
			} else {
				const data = new ImageData(new Uint8ClampedArray(bytes), width, height);
				void createImageBitmap(data).then(bitmap => {
					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					canvas.getContext("bitmaprenderer")!.transferFromImageBitmap(bitmap);
					const el = document.createElement("a");
					el.setAttribute("href", canvas.toDataURL());
					el.setAttribute("download", filename);
					el.style.display = "none";
					document.body.appendChild(el);
					el.click();
					document.body.removeChild(el);
				});
			}
		}
	}),
	//Included for compatibility with pseudocode.pro
	SIZE: fn({
		args: [
			["set", [{set: "ANY"}]]
		],
		returnType: "INTEGER",
		impl(set){
			return set.length;
		},
	}),
}) satisfies Record<string, PreprocesssedBuiltinFunctionData<any, any>>;
