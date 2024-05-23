/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/

import { RangeArray, Token } from "./lexer-types.js";
import type { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTNode, ProgramASTBranchNode, ProgramASTNode } from "./parser-types.js";
import type { Runtime } from "./runtime.js";
import type { BuiltinFunctionArguments, ClassPropertyStatement, ClassStatement, ConstantStatement, DeclareStatement, DefineStatement, ForStatement, FunctionStatement, ProcedureStatement, Statement } from "./statements.js";
import { ClassFunctionStatement, ClassProcedureStatement } from "./statements.js";
import type { BoxPrimitive, IFormattable, RangeAttached, TextRange } from "./types.js";
import { crash, f, fail, getTotalRange, impossible } from "./utils.js";

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
	T extends RecordVariableType ? {
		[index:string]: VariableTypeMapping<any> | null;
	} :
	T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> :
	T extends EnumeratedVariableType ? string :
	T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> :
	T extends ClassVariableType ? {
		properties: {
			[index:string]: VariableTypeMapping<any> | null;
		};
		/** Used to store the real type for varlength array properties */
		propertyTypes: Record<string, VariableType>;
		/** Necessary for polymorphism */
		type: ClassVariableType;
	} :
	never
;


export abstract class BaseVariableType implements IFormattable {
	abstract getInitValue(runtime:Runtime, requireInit:boolean):unknown;
	abstract init(runtime:Runtime):void;
	checkSize(){}
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
	static all:PrimitiveVariableType[] = [];

	static INTEGER = new PrimitiveVariableType("INTEGER");
	static REAL = new PrimitiveVariableType("REAL");
	static STRING = new PrimitiveVariableType("STRING");
	static CHAR = new PrimitiveVariableType("CHAR");
	static BOOLEAN = new PrimitiveVariableType("BOOLEAN");
	static DATE = new PrimitiveVariableType("DATE");

	private constructor(
		public name: T,
	){
		super();
		PrimitiveVariableType.all.push(this);
	}
	init(runtime:Runtime){impossible();}
	fmtDebug(){
		return `PrimitiveVariableType ${this.name}`;
	}
	fmtText(){
		return this.name;
	}
	fmtShort(){
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
	static resolve(token:Token):Exclude<UnresolvedVariableType, ArrayVariableType> {
		return this.get(token.text) ?? ["unresolved", token.text, token.range];
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
export class ArrayVariableType<Init extends boolean = true> extends BaseVariableType {
	totalLength:number | null = null;
	arraySizes:number[] | null = null;
	lengthInformation: [low:number, high:number][] | null = null;
	constructor(
		public lengthInformationExprs: [low:ExpressionAST, high:ExpressionAST][] | null,
		public lengthInformationRange: TextRange | null,
		public elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null,
	){super();}
	init(runtime:Runtime){
		if(Array.isArray(this.elementType))
			this.elementType = runtime.resolveVariableType(this.elementType);
		if(this.lengthInformationExprs){
			this.lengthInformation = new Array(this.lengthInformationExprs.length);
			for(const [i, [low_, high_]] of this.lengthInformationExprs.entries()){
				const low = runtime.evaluateExpr(low_, PrimitiveVariableType.INTEGER)[1];
				const high = runtime.evaluateExpr(high_, PrimitiveVariableType.INTEGER)[1];
				if(high < low)
					fail(`Invalid length information: upper bound cannot be less than lower bound`, high_);
				this.lengthInformation[i] = [low, high];
			}
			this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
			this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
		}
	}
	clone(){
		const type = new ArrayVariableType<false>(this.lengthInformationExprs, this.lengthInformationRange, this.elementType);
		type.lengthInformation = this.lengthInformation;
		type.arraySizes = this.arraySizes;
		type.totalLength = this.totalLength;
		return type as never as ArrayVariableType<true>;
	}
	fmtText():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
		return f.text`ARRAY${rangeText} OF ${this.elementType ?? "ANY"}`;
	}
	fmtShort():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
		return f.text`ARRAY${rangeText} OF ${this.elementType ?? "ANY"}`;
	}
	fmtDebug():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
		return f.debug`ARRAY${rangeText} OF ${this.elementType ?? "ANY"}`;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):VariableTypeMapping<ArrayVariableType> {
		if(!this.lengthInformation) fail(f.quote`${this} is not a valid variable type: length must be specified here`, undefined);
		if(!this.elementType) fail(f.quote`${this} is not a valid variable type: element type must be specified here`, undefined);
		const type = (this as ArrayVariableType<true>).elementType!;
		if(type instanceof ArrayVariableType) crash(`Attempted to initialize array of arrays`);
		return Array.from({length: this.totalLength!}, () => type.getInitValue(runtime, true) as VariableTypeMapping<ArrayElementVariableType> | null);
	}
	static from(node:ExpressionASTArrayTypeNode){
		return new ArrayVariableType<false>(
			node.lengthInformation,
			node.lengthInformation ? getTotalRange(node.lengthInformation.flat()) : null,
			PrimitiveVariableType.resolve(node.elementType)
		);
	}
}
export class RecordVariableType<Init extends boolean = true> extends BaseVariableType {
	directDependencies = new Set<VariableType>();
	constructor(
		public initialized: Init,
		public name: string,
		public fields: Record<string, [type:(Init extends true ? never : UnresolvedVariableType) | VariableType, range:TextRange]>,
	){super();}
	init(runtime:Runtime){
		for(const [name, [field, range]] of Object.entries(this.fields)){
			if(Array.isArray(field))
				this.fields[name][0] = runtime.resolveVariableType(field);
			else if(field instanceof ArrayVariableType)
				field.init(runtime);
			this.addDependencies(this.fields[name][0] as VariableType);
		}
		(this as RecordVariableType<true>).initialized = true;
	}
	addDependencies(type:VariableType){
		if(type instanceof RecordVariableType){
			this.directDependencies.add(type);
			type.directDependencies.forEach(
				d => this.directDependencies.add(d)
			);
		} else if(type instanceof ArrayVariableType && type.elementType != null){
			this.addDependencies(type.elementType);
		}
	}
	checkSize(){
		for(const [name, [type, range]] of Object.entries((this as RecordVariableType<true>).fields)){
			if(type == this) fail(f.text`Recursive type "${this.name}" has infinite size: field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object\nhelp: change the field's type to be "pointer to ${this.name}"`, range);
			if(type instanceof ArrayVariableType && type.elementType == this) fail(f.text`Recursive type "${this.name}" has infinite size: field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object\nhelp: change the field's type to be "array of pointer to ${this.name}"`, range);
			if(type instanceof RecordVariableType && type.directDependencies.has(this as never)) fail(f.quote`Recursive type ${this.name} has infinite size: initializing field ${name} indirectly requires initializing the parent type, which requires initializing the field again\nhelp: change the field's type to be a pointer`, range);
		}
	}
	fmtText(){
		return `${this.name} (user-defined record type)`;
	}
	fmtShort():string {
		return this.name;
	}
	fmtQuoted(){
		return `"${this.name}" (user-defined record type)`;
	}
	fmtDebug(){
		return `RecordVariableType [${this.name}] (fields: ${Object.keys(this.fields).join(", ")})`;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):VariableValue | null {
		if(!this.initialized) crash(`Type not initialized`);
		return Object.fromEntries(Object.entries((this as RecordVariableType<true>).fields)
			.map(([k, [v, r]]) => [k, v.getInitValue(runtime, false)])
		) as VariableValue | null;
	}
}
export class PointerVariableType<Init extends boolean = true> extends BaseVariableType {
	constructor(
		public initialized: Init,
		public name: string,
		public target: (Init extends true ? never : UnresolvedVariableType) | VariableType
	){super();}
	init(runtime:Runtime){
		if(Array.isArray(this.target)) this.target = runtime.resolveVariableType(this.target);
		(this as PointerVariableType<true>).initialized = true;
	}
	fmtText():string {
		return f.short`${this.name} (user-defined pointer type ^${this.target})`;
	}
	fmtShort():string {
		return this.name;
	}
	fmtQuoted():string {
		return f.short`"${this.name}" (user-defined pointer type ^${this.target})`;
	}
	fmtDebug():string {
		return f.short`PointerVariableType [${this.name}] to "${this.target}"`;
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
	init(){}
	fmtText(){
		return `${this.name} (user-defined enumerated type)`;
	}
	fmtShort():string {
		return this.name;
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
export class SetVariableType<Init extends boolean = true> extends BaseVariableType {
	constructor(
		public initialized: Init,
		public name: string,
		public baseType: (Init extends true ? never : UnresolvedVariableType) | VariableType,
	){super();}
	init(runtime:Runtime){
		if(Array.isArray(this.baseType)) this.baseType = runtime.resolveVariableType(this.baseType);
		(this as SetVariableType<true>).initialized = true;
	}
	fmtText():string {
		return f.text`${this.name} (user-defined set type containing "${this.baseType}")`;
	}
	fmtShort():string {
		return this.name;
	}
	toQuotedString():string {
		return f.text`"${this.name}" (user-defined set type containing "${this.baseType}")`;
	}
	fmtDebug():string {
		return f.debug`SetVariableType [${this.name}] (contains: ${this.baseType})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		crash(`Cannot initialize a variable of type SET`);
	}
}
export class ClassVariableType<Init extends boolean = true> extends BaseVariableType {
	name:string = this.statement.name.text;
	baseClass:ClassVariableType<Init> | null = null;
	constructor(
		public initialized: Init,
		public statement: ClassStatement,
		/** Stores regular and inherited properties. */
		public properties: Record<string, [(Init extends true ? never : UnresolvedVariableType) | VariableType, ClassPropertyStatement]> = {},
		/** Does not store inherited methods. */
		public ownMethods: Record<string, ClassMethodData> = {},
		public allMethods: Record<string, [source:ClassVariableType<Init>, data:ClassMethodData]> = {},
		public propertyStatements: ClassPropertyStatement[] = []
	){super();}
	init(runtime:Runtime){
		for(const statement of this.propertyStatements){
			const type = runtime.resolveVariableType(statement.varType);
			for(const [name] of statement.variables){
				this.properties[name][0] = type;
			}
		}
		(this as ClassVariableType<true>).initialized = true;
	}
	fmtText(){
		return f.text`${this.name} (user-defined class type)`;
	}
	fmtShort():string {
		return this.name;
	}
	fmtPlain(){
		return this.name;
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
	getPropertyType(property:string, x:VariableTypeMapping<ClassVariableType>):VariableType {
		if(!(this.properties[property])) crash(`Property ${property} does not exist`);
		return x.propertyTypes[property] ?? (this as ClassVariableType<true>).properties[property][0];
	}
	inherits(other:ClassVariableType):boolean {
		return this.baseClass != null && (other == this.baseClass || this.baseClass.inherits(other));
	}
	construct(runtime:Runtime, args:RangeArray<ExpressionASTNode>){
		const This = this as ClassVariableType<true>;
		const propertiesInitializer = {};
		Object.defineProperties(
			propertiesInitializer,
			Object.fromEntries(Object.entries(This.properties).map(([k, v]) => [k, {
				enumerable: true,
				configurable: true,
				get(){
					const value = v[0].getInitValue(runtime, false);
					Object.defineProperty(propertiesObj, k, {
						configurable: true,
						enumerable: true,
						writable: true,
						value,
					});
					return value;
				},
				set(val:VariableValue){
					Object.defineProperty(propertiesObj, k, {
						configurable: true,
						enumerable: true,
						writable: true,
						value: val,
					});
				},
			} satisfies PropertyDescriptor])) satisfies PropertyDescriptorMap
		);
		const propertiesObj = Object.create(propertiesInitializer) as Record<string, VariableValue | null>;
		//Lazily initialize properties
		const data:VariableTypeMapping<ClassVariableType> = {
			properties: propertiesObj,
			propertyTypes: {},
			type: This
		};

		//Call constructor
		const [clazz, method] = This.allMethods["NEW"]
			?? fail(f.quote`No constructor was defined for class ${this.name}`, this.statement);
		runtime.callClassMethod(method, clazz, data, args);
		//Access all the properties to initialize them if they havent been initialized yet
		for(const key of Object.keys(This.properties)){
			void propertiesObj[key];
		}
		//Unlink the initializer
		Object.setPrototypeOf(propertiesObj, Object.prototype);
		return data;
	}
	getScope(runtime:Runtime, instance:VariableTypeMapping<ClassVariableType>):VariableScope {
		return {
			statement: this.statement,
			opaque: true,
			types: {},
			variables: Object.fromEntries(Object.entries(this.properties).map(([k, v]) => [k, {
				type: instance.propertyTypes[k] ?? v[0],
				assignabilityType: v[0],
				updateType(type){
					if(v[0] instanceof ArrayVariableType && !v[0].lengthInformation){
						instance.propertyTypes[k] = type;
					}
				},
				get value(){return instance.properties[k];},
				set value(value){instance.properties[k] = value;},
				declaration: v[1],
				mutable: true,
			} as VariableData]))
		};
	}
}

export type UnresolvedVariableType =
	| PrimitiveVariableType
	| ArrayVariableType<false>
	| ["unresolved", name:string, range:TextRange]
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

export const fileModes = ["READ", "WRITE", "APPEND", "RANDOM"] as const;
export type FileMode = typeof fileModes extends ReadonlyArray<infer T> ? T : never;
export function FileMode(input:string):FileMode {
	if(fileModes.includes(input)) return input;
	crash(`${input} is not a valid file mode`);
}
export type File = {
	name: string;
	text: string;
}
export type OpenedFile = {
	file: File;
	mode: FileMode;
	openRange: TextRange;
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
	/** Used for varlength arrays in classes */
	assignabilityType?: T;
	/** Used for varlength arrays in classes */
	updateType?: (type:VariableType) => unknown;
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
	impl: (this:Runtime, ...args:(RangeAttached<BoxPrimitive<VariableValue>>)[]) => VariableValue;
};
export type ClassMethodStatement = ClassFunctionStatement | ClassProcedureStatement;
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
	opaque: boolean;
	variables: Record<string, VariableData | ConstantData>;
	types: Record<string, VariableType>;
};
