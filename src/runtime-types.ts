/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/

import type { ProgramASTBranchNode, ProgramASTNode } from "./parser-types.js";
import type { Runtime } from "./runtime.js";
import type { DeclareStatement, FunctionStatement, ProcedureStatement, DefineStatement, ConstantStatement, ForStatement, Statement, BuiltinFunctionArguments } from "./statements.js";
import { fail, crash, fquote } from "./utils.js";

/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping<T> =
	T extends PrimitiveVariableType<infer U> ? (
		U extends "INTEGER" ? number :
		U extends "REAL" ? number :
		U extends "STRING" ? string :
		U extends "CHAR" ? string :
		U extends "BOOLEAN" ? boolean :
		U extends "DATE" ? Date :
		never
	) :
	T extends ArrayVariableType ? Array<VariableTypeMapping<ArrayElementVariableType> | null> :
	T extends RecordVariableType ? Record<string, unknown> : //replacing "unknown" with VariableTypeMapping<any> breaks ts
	T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> :
	T extends EnumeratedVariableType ? string :
	T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> :
	never
;


export type PrimitiveVariableTypeName =
	| "INTEGER"
	| "REAL"
	| "STRING"
	| "CHAR"
	| "BOOLEAN"
	| "DATE"
;
export type PrimitiveVariableType_<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> = T extends string ? PrimitiveVariableType<T> : never;
export class PrimitiveVariableType<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> { //TODO have them all extend something
	static INTEGER = new PrimitiveVariableType("INTEGER");
	static REAL = new PrimitiveVariableType("REAL");
	static STRING = new PrimitiveVariableType("STRING");
	static CHAR = new PrimitiveVariableType("CHAR");
	static BOOLEAN = new PrimitiveVariableType("BOOLEAN");
	static DATE = new PrimitiveVariableType("DATE");

	private constructor(
		public name: T,
	){}
	is<T extends PrimitiveVariableTypeName>(...type:T[]):this is PrimitiveVariableType<T> {
		return (type as PrimitiveVariableTypeName[]).includes(this.name);
	}
	static valid(input:string):input is PrimitiveVariableTypeName {
		return input == "INTEGER" || input == "REAL" || input == "STRING" || input == "CHAR" || input == "BOOLEAN" || input == "DATE";
	}
	static get(type:PrimitiveVariableTypeName):PrimitiveVariableType;
	static get(type:string):PrimitiveVariableType | undefined;
	static get(type:string):PrimitiveVariableType | undefined{
		return this.valid(type) ? this[type] : undefined;
	}
	static resolve(type:string):Exclude<UnresolvedVariableType, ArrayVariableType> {
		return this.get(type) ?? ["unresolved", type];
	}
	getInitValue(runtime:Runtime, requireInit:boolean):number | string | boolean | Date | null {
		if(requireInit) return {
			INTEGER: 0,
			REAL: 0,
			STRING: "",
			CHAR: '',
			BOOLEAN: false,
			DATE: new Date()
		}[this.name];
		else return null;
	}
}
/** Contains data about an array type. Processed from an ExpressionASTArrayTypeNode. */
export class ArrayVariableType {
	totalLength:number;
	arraySizes:number[];
	constructor(
		public lengthInformation: [low:number, high:number][],
		public type: Exclude<UnresolvedVariableType, ArrayVariableType>,
	){
		if(this.lengthInformation.some(b => b[1] < b[0])) fail(`Invalid length information: upper bound cannot be less than lower bound`);
		if(this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n)))) fail(`Invalid length information: bound was not an integer`);
		this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
		this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
	}
	toString(){
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
	toQuotedString(){
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):VariableTypeMapping<ArrayVariableType> {
		const type = runtime.resolveVariableType(this.type);
		if(type instanceof ArrayVariableType) crash(`Attempted to initialize array of arrays`);
		return Array.from({length: this.totalLength}, () => type.getInitValue(runtime, true) as VariableTypeMapping<ArrayElementVariableType> | null);
	}
	is(...type:PrimitiveVariableTypeName[]){ return false; }
}
export class RecordVariableType {
	constructor(
		public name: string,
		public fields: Record<string, VariableType>,
	){}
	toString(){
		return `${this.name} (user-defined record type)`;
	}
	toQuotedString(){
		return fquote`${this.name} (user-defined record type)`;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):VariableValue | null {
		return Object.fromEntries(Object.entries(this.fields).map(([k, v]) => [k, v]).map(([k, v]) => [k,
			typeof v == "string" ? null : v.getInitValue(runtime, false)
		]));
	}
	is(...type:PrimitiveVariableTypeName[]){ return false; }
}
export class PointerVariableType {
	constructor(
		public name: string,
		public target: VariableType
	){}
	toString():string {
		return `${this.name} (user-defined pointer type ^${this.target})`;
	}
	toQuotedString():string {
		return fquote`${this.name} (user-defined pointer type ^${this.target})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
	is(...type:PrimitiveVariableTypeName[]){ return false; }
}
export class EnumeratedVariableType {
	constructor(
		public name: string,
		public values: string[]
	){}
	toString(){
		return `${this.name} (user-defined enumerated type)`;
	}
	toQuotedString(){
		return fquote`${this.name} (user-defined enumerated type)`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
	is(...type:PrimitiveVariableTypeName[]){ return false; }
}
export class SetVariableType {
	constructor(
		public name: string,
		public baseType: PrimitiveVariableType,
	){}
	toString(){
		return `${this.name} (user-defined set type containing ${this.baseType})`;
	}
	toQuotedString(){
		return fquote`${this.name} (user-defined set type containing ${this.baseType})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`);
	}
	is(...type:PrimitiveVariableTypeName[]){ return false; }
}

export function typesEqual(a:VariableType, b:VariableType):boolean {
	return a == b ||
		(a instanceof ArrayVariableType && b instanceof ArrayVariableType && a.arraySizes.toString() == b.arraySizes.toString() && (
			a.type == b.type ||
			Array.isArray(a.type) && Array.isArray(b.type) && a.type[1] == b.type[1]
		)) ||
		(a instanceof PointerVariableType && b instanceof PointerVariableType && typesEqual(a.target, b.target)) ||
		(a instanceof SetVariableType && b instanceof SetVariableType && a.baseType == b.baseType)
	;
}

export type UnresolvedVariableType =
	| PrimitiveVariableType
	| ArrayVariableType
	| ["unresolved", name:string]
;
export type VariableType =
	| PrimitiveVariableType<"INTEGER">
	| PrimitiveVariableType<"REAL">
	| PrimitiveVariableType<"STRING">
	| PrimitiveVariableType<"CHAR">
	| PrimitiveVariableType<"BOOLEAN">
	| PrimitiveVariableType<"DATE">
	| PrimitiveVariableType
	| ArrayVariableType
	| RecordVariableType
	| PointerVariableType
	| EnumeratedVariableType
	| SetVariableType
;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType;
export type VariableValue = VariableTypeMapping<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type FileMode = "READ" | "WRITE" | "APPEND" | "RANDOM";
export type File = {
	name: string;
	text: string;
}
export type OpenedFile = {
	file: File;
	mode: FileMode;
} & ({
	mode: "READ";
	lines: string[];
	lineNumber: number;
} | {
	mode: "WRITE" | "APPEND";
} | {
	mode: "RANDOM";
	data: string[];
	currentPointer: number;
})

export type VariableData<T extends VariableType = VariableType, /** Set this to never for initialized */ Uninitialized = null> = {
	type: T;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping<T> | Uninitialized;
	declaration: DeclareStatement | FunctionStatement | ProcedureStatement | DefineStatement | "dynamic";
	mutable: true;
}
export type ConstantData<T extends VariableType = VariableType> = {
	type: T;
	/** Cannot be null */
	value: VariableTypeMapping<T>;
	declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement;
	mutable: false;
}
/** Either a function or a procedure */
export type FunctionData = ProgramASTBranchNode & {
	nodeGroups: [body:ProgramASTNode[]];
} & ({
	type: "function";
	controlStatements: [start:FunctionStatement, end:Statement];
} | {
	type: "procedure";
	controlStatements: [start:ProcedureStatement, end:Statement];
});
export type BuiltinFunctionData = {
	args:BuiltinFunctionArguments;
	returnType:VariableType | null;
	name:string;
	impl: (this:Runtime, ...args:VariableValue[]) => VariableValue;
};


export type VariableScope = {
	statement: Statement | "global";
	variables: Record<string, VariableData | ConstantData>;
	types: Record<string, VariableType>;
};
