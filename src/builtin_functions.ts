/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions defined in the insert.
*/


import { ArrayVariableType, BuiltinFunctionData, PrimitiveVariableType, PrimitiveVariableTypeName, VariableTypeMapping, VariableValue } from "./runtime-types.js";
import type { Runtime } from "./runtime.js";
import { fail, f } from "./utils.js";

//TODO add comments
type BuiltinFunctionArgType = PrimitiveVariableTypeName | (PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"])[];
type BuiltinFunctionArg = [name:string, type:BuiltinFunctionArgType];
type FunctionArgVariableTypeMapping<T extends BuiltinFunctionArgType> =
	T extends Array<infer U extends PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"]> ?
		U extends PrimitiveVariableTypeName ?
			VariableTypeMapping<PrimitiveVariableType<U>> :
		U extends [infer S] ?
			S extends PrimitiveVariableTypeName ?
				VariableTypeMapping<PrimitiveVariableType<S>>[] :
				unknown[]
		: never :
	T extends PrimitiveVariableTypeName
		? VariableTypeMapping<PrimitiveVariableType<T>>
		: never;
type FunctionArgs<TSuppliedArgs extends BuiltinFunctionArg[]> = 
	[TSuppliedArgs & 0] extends [1] //If any
		? VariableValue[] //output this (to prevent issues with the type definition of "builtinFunctions")
		: {
			[K in keyof TSuppliedArgs]: FunctionArgVariableTypeMapping<TSuppliedArgs[K][1]>;
		};
type PreprocesssedBuiltinFunctionData<TArgs extends BuiltinFunctionArg[], TReturn extends PrimitiveVariableTypeName> = {
	args: TArgs;
	returnType: TReturn;
	impl(this:Runtime, ...args:FunctionArgs<TArgs>):VariableTypeMapping<PrimitiveVariableType<TReturn>>;
};
function fn<const T extends BuiltinFunctionArg[], const S extends PrimitiveVariableTypeName>(data:PreprocesssedBuiltinFunctionData<T, S>){
	return data as PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
}


export const builtinFunctions = (
	<T extends string>(d:Record<T, PreprocesssedBuiltinFunctionData<any, any>>):Record<T, BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>> =>
		Object.fromEntries(Object.entries(d).map(([name, data]) =>
			[name, {
				args: new Map((data.args as BuiltinFunctionArg[]).map(([name, type]) => [name, {
					passMode: "reference",
					type: (Array.isArray(type) ? type : [type]).map(t =>
						Array.isArray(t)
							? new ArrayVariableType(null, null, t[0] == "ANY" ? null : PrimitiveVariableType.get(t[0]))
							: PrimitiveVariableType.get(t)
					)
				}])),
				name,
				impl: data.impl,
				returnType: PrimitiveVariableType.get(data.returnType as PrimitiveVariableTypeName)
			}]
		))
)({
	//Source: s23 P22 insert
	LEFT: fn({
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
		],
		returnType: "STRING",
		impl(str, num){
			if(num < 0) fail(`Number ${num} is negative`);
			if(num > str.length) fail(`Number ${num} is greater than the length of the string (${str.length})`);
			return str.slice(0, num);
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
			if(num < 0) fail(`Number ${num} is negative`);
			if(num > str.length) fail(`Number ${num} is greater than the length of the string (${str.length})`);
			return str.slice(-num);
		},
	}),
	//source: spec 5.5
	MID: fn({
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
			["y", "INTEGER"],
		],
		returnType: "STRING",
		impl(str, start, length){
			if(start < 1) fail(`Start index ${start} is less than 1`);
			if(length < 1) fail(`Slice length ${length} is less than 1`);
			if(length + start - 1 > str.length) fail(`End of slice (${length} + ${start}) is greater than the length of the string (${str.length})`);
			return str.slice(start - 1, start + length - 1);
		},
	}),
	//source: spec 5.5
	LENGTH: fn({
		args: [
			["ThisString", [["ANY"], "STRING"]],
		],
		returnType: "INTEGER",
		impl(str){
			return str.length;
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
			const out = Number(str);
			if(isNaN(out) || !Number.isFinite(out)) fail(f.quote`Cannot convert ${str} to a number`);
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
			const out = Number(str);
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
			return str.charCodeAt(0);
		},
	}),
	CHR: fn({
		args: [
			["x", "INTEGER"],
		],
		returnType: "CHAR",
		impl(x){
			return String.fromCharCode(x);
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
			return new Date(y, m, d);
		}
	}),
	//Source: s23 P22 insert
	TODAY: fn({
		args: [],
		returnType: "DATE",
		impl(){
			return new Date();
		}
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
	})
});
