/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions defined in the insert.
*/


import { ArrayVariableType, BuiltinFunctionData, PrimitiveVariableType, PrimitiveVariableTypeName, VariableTypeMapping, VariableValue } from "./runtime-types.js";
import type { Runtime } from "./runtime.js";
import { fail, f } from "./utils.js";


type PreprocesssedBuiltinFunctionData = {
	args: [name:string, type:PrimitiveVariableTypeName | (PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"])[]][];
	returnType: PrimitiveVariableTypeName;
	impl(this:Runtime, ...args:VariableValue[]):VariableValue;
};
export const builtinFunctions = (
	<T extends string>(d:Record<T, PreprocesssedBuiltinFunctionData>):Record<T, BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>> =>
		Object.fromEntries(Object.entries(d).map(([name, data]) =>
			[name, {
				args: new Map(data.args.map(([name, type]) => [name, {
					passMode: "reference",
					type: (Array.isArray(type) ? type : [type]).map(t =>
						Array.isArray(t)
							? new ArrayVariableType(null, null, t[0] == "ANY" ? null : PrimitiveVariableType.get(t[0]))
							: PrimitiveVariableType.get(t)
					)
				}])),
				name,
				impl: data.impl,
				returnType: PrimitiveVariableType.get(data.returnType)
			}]
		))
)({
	//Source: s23 P22 insert
	LEFT: {
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
		],
		returnType: "STRING",
		impl(str:string, num:number){
			if(num < 0) fail(`Number ${num} is negative`);
			if(num > str.length) fail(`Number ${num} is greater than the length of the string (${str.length})`);
			return str.slice(0, num);
		},
	},
	//source: spec 5.5
	RIGHT: {
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
		],
		returnType: "STRING",
		impl(str:string, num:number){
			if(num < 0) fail(`Number ${num} is negative`);
			if(num > str.length) fail(`Number ${num} is greater than the length of the string (${str.length})`);
			return str.slice(-num);
		},
	},
	//source: spec 5.5
	MID: {
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
			["y", "INTEGER"],
		],
		returnType: "STRING",
		impl(str:string, start:number, length:number){
			if(start < 1) fail(`Start index ${start} is less than 1`);
			if(length < 1) fail(`Slice length ${length} is less than 1`);
			if(length + start - 1 > str.length) fail(`End of slice (${length} + ${start}) is greater than the length of the string (${str.length})`);
			return str.slice(start - 1, start + length - 1);
		},
	},
	//source: spec 5.5
	LENGTH: {
		args: [
			["ThisString", [["ANY"], "STRING"]],
		],
		returnType: "INTEGER",
		impl(str:string | VariableTypeMapping<ArrayVariableType>){
			return str.length;
		},
	},
	//Source: s23 P22 insert
	TO_UPPER: {
		args: [
			["x", ["STRING", "CHAR"]],
		],
		returnType: "STRING", //string or char
		impl(str:string){
			return str.toUpperCase();
		},
	},
	//Source: s23 P22 insert
	TO_LOWER: {
		args: [
			["x", ["STRING", "CHAR"]],
		],
		returnType: "STRING", //string or char
		impl(str:string){
			return str.toLowerCase();
		},
	},
	//source: spec 5.5
	UCASE: {
		args: [
			["x", "CHAR"],
		],
		returnType: "CHAR",
		impl(str:string){
			return str.toUpperCase();
		},
	},
	//source: spec 5.5
	LCASE: {
		args: [
			["x", "CHAR"],
		],
		returnType: "CHAR",
		impl(str:string){
			return str.toLowerCase();
		},
	},
	//Source: s23 P22 insert
	NUM_TO_STR: {
		args: [
			["x", "REAL"], //real or integer, but ints coerce to reals
		],
		returnType: "STRING", //string or char, overflow handled automatically by coercion
		impl(num:number){
			return num.toString();
		},
	},
	//Source: s23 P22 insert
	STR_TO_NUM: {
		args: [
			["x", ["STRING", "CHAR"]],
		],
		returnType: "REAL", //real or integer, but ints coerce to reals
		impl(str:string){
			const out = Number(str);
			if(isNaN(out) || !Number.isFinite(out)) fail(f.quote`Cannot convert ${str} to a number`);
			return out;
		},
	},
	//Source: s23 P22 insert
	IS_NUM: {
		args: [
			["ThisString", ["STRING", "CHAR"]],
		],
		returnType: "BOOLEAN",
		impl(str:string){
			const out = Number(str);
			return !isNaN(out) && Number.isFinite(out);
		},
	},
	//Source: s23 P22 insert
	ASC: {
		args: [
			["ThisChar", "CHAR"],
		],
		returnType: "INTEGER",
		impl(str:string){
			return str.charCodeAt(0);
		},
	},
	CHR: {
		args: [
			["x", "INTEGER"],
		],
		returnType: "CHAR",
		impl(x:number){
			return String.fromCharCode(x);
		},
	},
	//source: spec 5.6
	INT: {
		args: [
			["x", "REAL"],
		],
		returnType: "INTEGER",
		impl(x:number){
			return Math.trunc(x);
		},
	},
	//source: spec 5.6
	RAND: {
		args: [
			["x", "INTEGER"],
		],
		returnType: "REAL",
		impl(x:number){
			return Math.random() * x;
		},
	},

	//Source: s23 P22 insert
	DAY: {
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x:Date){
			return x.getDate();
		}
	},
	//Source: s23 P22 insert
	MONTH: {
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x:Date){
			return x.getMonth();
		}
	},
	//Source: s23 P22 insert
	YEAR: {
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x:Date){
			return x.getFullYear();
		}
	},
	//Source: s23 P22 insert
	DAYINDEX: {
		args: [
			["ThisDate", "DATE"],
		],
		returnType: "INTEGER",
		impl(x:Date){
			return x.getDay() + 1;
		}
	},
	//Source: s23 P22 insert
	SETDATE: {
		args: [
			["Day", "INTEGER"],
			["Month", "INTEGER"],
			["Year", "INTEGER"],
		],
		returnType: "DATE",
		impl(d:number, m:number, y:number){
			return new Date(y, m, d);
		}
	},
	//Source: s23 P22 insert
	TODAY: {
		args: [],
		returnType: "DATE",
		impl(){
			return new Date();
		}
	},
	EOF: {
		args: [
			["Filename", "STRING"]
		],
		returnType: "BOOLEAN",
		impl(filename:string){
			const file = this.getOpenFile(filename, ["READ"], `EOF function`);
			return file.lineNumber >= file.lines.length;
		}
	}
});
