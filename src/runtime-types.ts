/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/

import type { ExpressionASTNode, ProgramASTBranchNode, ProgramASTNode } from "./parser-types.js";
import type { Runtime } from "./runtime.js";
import type { DeclareStatement, FunctionStatement, ProcedureStatement, DefineStatement, ConstantStatement, ForStatement, Statement, BuiltinFunctionArguments, ClassStatement, ClassFunctionStatement, ClassProcedureStatement, ClassPropertyStatement } from "./statements.js";
import { IFormattable } from "./types.js";
import { fail, crash, f } from "./utils.js";

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
	T extends RecordVariableType ? Record<string, unknown> : //TODO replacing "unknown" with VariableTypeMapping<any> breaks ts
	T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> :
	T extends EnumeratedVariableType ? string :
	T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> :
	T extends ClassVariableType ? {
		properties: Record<string, unknown>;
	} :
	never
;


export abstract class BaseVariableType implements IFormattable {
	abstract getInitValue(runtime:Runtime, requireInit:boolean):unknown;
	is(...type:PrimitiveVariableTypeName[]) {
		return false;
	}
	abstract fmtDebug():string;
	/** If not implemented, defaults to `"${fmtText()}"` */
	fmtQuoted(){
		return `"${this.fmtText()}"`;
	}
	abstract fmtText():string;
}

export type PrimitiveVariableTypeName =
	| "INTEGER"
	| "REAL"
	| "STRING"
	| "CHAR"
	| "BOOLEAN"
	| "DATE"
;
export type PrimitiveVariableType_<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> = T extends string ? PrimitiveVariableType<T> : never;
export class PrimitiveVariableType<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> extends BaseVariableType {
	static INTEGER = new PrimitiveVariableType("INTEGER");
	static REAL = new PrimitiveVariableType("REAL");
	static STRING = new PrimitiveVariableType("STRING");
	static CHAR = new PrimitiveVariableType("CHAR");
	static BOOLEAN = new PrimitiveVariableType("BOOLEAN");
	static DATE = new PrimitiveVariableType("DATE");

	private constructor(
		public name: T,
	){super();}
	fmtDebug(){
		return `PrimitiveVariableType ${this.name}`;
	}
	fmtText(){
		return this.name;
	}
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
export class ArrayVariableType extends BaseVariableType {
	totalLength:number;
	arraySizes:number[];
	constructor(
		public lengthInformation: [low:number, high:number][],
		public type: Exclude<UnresolvedVariableType, ArrayVariableType>,
	){
		super();
		if(this.lengthInformation.some(b => b[1] < b[0])) fail(`Invalid length information: upper bound cannot be less than lower bound`);
		if(this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n)))) fail(`Invalid length information: bound was not an integer`);
		this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
		this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
	}
	fmtText(){
		return f.text`ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
	fmtDebug(){
		return f.debug`ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):VariableTypeMapping<ArrayVariableType> {
		const type = runtime.resolveVariableType(this.type);
		if(type instanceof ArrayVariableType) crash(`Attempted to initialize array of arrays`);
		return Array.from({length: this.totalLength}, () => type.getInitValue(runtime, true) as VariableTypeMapping<ArrayElementVariableType> | null);
	}
}
export class RecordVariableType extends BaseVariableType {
	constructor(
		public name: string,
		public fields: Record<string, VariableType>,
	){super();}
	fmtText(){
		return `${this.name} (user-defined record type)`;
	}
	fmtQuoted(){
		return `"${this.name}" (user-defined record type)`;
	}
	fmtDebug(){
		return `RecordVariableType [${this.name}] (fields: ${Object.keys(this.fields).join(", ")})`;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):VariableValue | null {
		return Object.fromEntries(Object.entries(this.fields)
			.map(([k, v]) => [k, v.getInitValue(runtime, false)])
		) as VariableValue | null;
	}
}
export class PointerVariableType extends BaseVariableType {
	constructor(
		public name: string,
		public target: VariableType
	){super();}
	fmtText(){
		return f.text`${this.name} (user-defined pointer type ^${this.target})`;
	}
	fmtQuoted(){
		return f.text`"${this.name}" (user-defined pointer type ^${this.target})`;
	}
	fmtDebug(){
		return f.debug`PointerVariableType [${this.name}] to "${this.target}"`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
}
export class EnumeratedVariableType extends BaseVariableType {
	constructor(
		public name: string,
		public values: string[]
	){super();}
	fmtText(){
		return `${this.name} (user-defined enumerated type)`;
	}
	fmtQuoted(){
		return `"${this.name}" (user-defined enumerated type)`;
	}
	fmtDebug(){
		return f.debug`EnumeratedVariableType [${this.name}] (values: ${this.values.join(", ")})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
}
export class SetVariableType extends BaseVariableType {
	constructor(
		public name: string,
		public baseType: PrimitiveVariableType,
	){super();}
	fmtText(){
		return f.text`${this.name} (user-defined set type containing "${this.baseType}")`;
	}
	toQuotedString(){
		return f.text`"${this.name}" (user-defined set type containing "${this.baseType}")`;
	}
	fmtDebug(){
		return f.debug`SetVariableType [${this.name}] (contains: ${this.baseType})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`);
	}
}
export class ClassVariableType extends BaseVariableType {
	name:string = this.statement.name.text;
	constructor(
		public statement: ClassStatement,
		public properties: Record<string, ClassPropertyStatement> = {}, //TODO resolve variable types properly
		public methods: Record<string, ClassMethodData> = {},
	){super();}
	fmtText(){
		return f.text`${this.name} (user-defined class type)`;
	}
	toQuotedString(){
		return f.quote`"${this.name}" (user-defined class type)`;
	}
	fmtDebug(){
		return f.debug`ClassVariableType [${this.name}]`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
	construct(runtime:Runtime, args:ExpressionASTNode[]){
		//Initialize properties
		const data:VariableTypeMapping<ClassVariableType> = {
			properties: Object.fromEntries(Object.entries(this.properties).map(([k, v]) => [k,
				runtime.resolveVariableType(v.varType).getInitValue(runtime, false)
			])) as Record<string, unknown>
		};

		//Call constructor
		runtime.callClassMethod(
			this.methods["NEW"] ?? fail(`No constructor was defined for class ${this.name}`), this, data, args
		);
		return data;
	}
	getScope(runtime:Runtime, instance:VariableTypeMapping<ClassVariableType>):VariableScope {
		return {
			statement: this.statement,
			types: {},
			variables: Object.fromEntries(Object.entries(this.properties).map(([k, v]) => [k, {
				type: runtime.resolveVariableType(v.varType),
				get value(){return instance.properties[k];},
				set value(value){instance.properties[k] = value;},
				declaration: v,
				mutable: true,
			} as VariableData]))
		};
	}
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
	| ClassVariableType
;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType;
export type VariableValue = VariableTypeMapping<any>;

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
});
export type OpenedFileOfType<T extends FileMode> = OpenedFile & { mode: T; };

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
export type ClassMethodData = ProgramASTBranchNode & {
	nodeGroups: [body:ProgramASTNode[]];
} & ({
	type: "class_function";
	controlStatements: [start:ClassFunctionStatement, end:Statement];
} | {
	type: "class_procedure";
	controlStatements: [start:ClassProcedureStatement, end:Statement];
});


export type VariableScope = {
	statement: Statement | "global";
	variables: Record<string, VariableData | ConstantData>;
	types: Record<string, VariableType>;
};
