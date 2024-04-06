/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions defined in the insert.
*/


import type { BuiltinFunctionData, PrimitiveVariableType, VariableValue } from "./runtime.js";
import { fail } from "./utils.js";


type PreprocesssedBuiltinFunctionData = {
	args: [name:string, type:PrimitiveVariableType][];
	returnType: PrimitiveVariableType;
	impl(...args:VariableValue[]):VariableValue;
};
export const builtinFunctions = (
	<T extends string>(d:Record<T, PreprocesssedBuiltinFunctionData>):Record<T, BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>> =>
		Object.fromEntries(Object.entries(d).map(([name, data]) =>
			[name, {
				args: new Map(data.args.map(a => [a[0], {passMode: "reference", type: a[1]}])),
				name,
				impl: data.impl,
				returnType: data.returnType
			}]
		))
)({
	//TODO commit fish-commands type shenanigans and obtain the type of impl's arguments from args
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
			["ThisString", "STRING"],
		],
		returnType: "INTEGER",
		impl(str:string){
			return str.length;
		},
	},
	//Source: s23 P22 insert
	TO_UPPER: {
		args: [
			["x", "STRING"], //TODO string or char
		],
		returnType: "STRING", //string or char
		impl(str:string){
			return str.toUpperCase();
		},
	},
	//Source: s23 P22 insert
	TO_LOWER: {
		args: [
			["x", "STRING"], //TODO string or char
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
			["x", "REAL"], //TODO real or integer
		],
		returnType: "STRING", //string or char
		impl(num:number){
			return num.toString();
		},
	},
	//Source: s23 P22 insert
	STR_TO_NUM: {
		args: [
			["x", "STRING"], //TODO string or char
		],
		returnType: "REAL", //real or integer
		impl(str:string){
			const out = Number(str);
			if(isNaN(out) || !Number.isSafeInteger(out)) fail(`Cannot convert "${out}" to a number`);
			return out;
		},
	},
	//Source: s23 P22 insert
	IS_NUM: {
		args: [
			["ThisString", "STRING"], //TODO proper generics: string or char
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
	//TODO:files EOF()
});
