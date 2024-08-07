/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/

import { configs } from "./config.js";
import { RangeArray, Token } from "./lexer-types.js";
import type { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTNode, ProgramASTBranchNode, ProgramASTNode } from "./parser-types.js";
import type { Runtime } from "./runtime.js";
import type { AssignmentStatement, BuiltinFunctionArguments, ClassPropertyStatement, ClassStatement, ConstantStatement, DeclareStatement, DefineStatement, ForStatement, FunctionStatement, ProcedureStatement, Statement } from "./statements.js";
import { ClassFunctionStatement, ClassProcedureStatement } from "./statements.js";
import type { BoxPrimitive, IFormattable, RangeAttached, TextRange } from "./types.js";
import { crash, errorBoundary, escapeHTML, f, fail, getTotalRange, impossible, zip } from "./utils.js";

/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping<T> = //ONCHANGE: update ArrayElementVariableValue
	T extends PrimitiveVariableType<infer U> ? (
		U extends "INTEGER" ? number :
		U extends "REAL" ? number :
		U extends "STRING" ? string :
		U extends "CHAR" ? string :
		U extends "BOOLEAN" ? boolean :
		U extends "DATE" ? Date :
		never
	) :
	T extends ArrayVariableType ? Array<(
		| number | string | boolean | Date
		| {
			[index:string]: VariableTypeMapping<any> | null;
		}
		| VariableData | ConstantData
		| string
		| (number | string | boolean | Date)[]
		| {
			properties: {
				[index:string]: VariableTypeMapping<any> | null;
			};
			propertyTypes: Record<string, VariableType>;
			type: ClassVariableType;
		}
	) | null> :
	T extends RecordVariableType ? {
		[index:string]: VariableTypeMapping<any> | null;
	} :
	T extends PointerVariableType ? VariableData<VariableType> | ConstantData<VariableType> :
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

export type TypedValue =
	//Trigger DCT
	VariableType extends infer T extends VariableType ? T extends unknown ?
		TypedValue_<T>
	: never : never;
export class TypedValue_<T extends VariableType> {
	constructor(
		public type:T,
		public value:VariableTypeMapping<T>,
	){}
	typeIs<Type extends
		| typeof ArrayVariableType
		| typeof RecordVariableType
		| typeof PointerVariableType
		| typeof EnumeratedVariableType
		| typeof SetVariableType
		| typeof ClassVariableType
	>(clazz:Type):
		this is TypedValue_<Type["prototype"]>;
	typeIs<Type extends PrimitiveVariableTypeName>(type:Type):
		this is TypedValue_<PrimitiveVariableType<Type>>;
	typeIs(type:unknown){
		if(type instanceof Function && type.prototype instanceof BaseVariableType)
			return this.type instanceof type;
		if(typeof type == "string")
			return this.type == PrimitiveVariableType.get(type);
		impossible();
	}
	asHTML(recursive:boolean):string {
		if(this.type instanceof PrimitiveVariableType){
			if(this.typeIs("INTEGER"))
				return `<span class="sth-number">${this.value}</span>`;
			if(this.typeIs("REAL"))
				return `<span class="sth-number">${Number.isInteger(this.value) ? `${this.value}.0` : this.value}</span>`;
			if(this.typeIs("CHAR"))
				if(recursive) return `<span class="sth-char">${escapeHTML(`'${this.value}'`)}</span>`;
				else return escapeHTML(this.value as VariableTypeMapping<PrimitiveVariableType<"CHAR">>);
			if(this.typeIs("STRING"))
				if(recursive) return `<span class="sth-string">${escapeHTML(`"${this.value}"`)}</span>`;
				else return escapeHTML(this.value as VariableTypeMapping<PrimitiveVariableType<"STRING">>);
			if(this.typeIs("BOOLEAN"))
				return `<span class="sth-boolean">${this.value.toString().toUpperCase()}</span>`;
			if(this.typeIs("DATE"))
				return `<span class="sth-date">${escapeHTML(this.value.toLocaleDateString("en-GB"))}</span>`;
			impossible();
		}
		return this.type.asHTML(this.value as never, recursive); //corr
	}
	asString():string {
		if(this.type instanceof PrimitiveVariableType){
			if(this.typeIs("INTEGER"))
				return this.value.toString();
			if(this.typeIs("REAL"))
				return Number.isInteger(this.value) ? this.value.toFixed(1) : this.value.toString();
			if(this.typeIs("CHAR"))
				return this.value;
			if(this.typeIs("STRING"))
				return this.value;
			if(this.typeIs("BOOLEAN"))
				return this.value.toString().toUpperCase();
			if(this.typeIs("DATE"))
				return this.value.toLocaleDateString("en-GB");
			impossible();
		}
		return this.type.asString(this.value as never); //corr
	}
}
export function typedValue<T extends VariableType>(type:T, value:VariableTypeMapping<T>):TypedValue {
	if(type == null || value == null) impossible();
	return new TypedValue_(type, value) as TypedValue;
}

export abstract class BaseVariableType implements IFormattable {
	abstract getInitValue(runtime:Runtime, requireInit:boolean):unknown;
	abstract init(runtime:Runtime):void;
	validate(runtime:Runtime){}
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
			INTEGER: configs.default_values.INTEGER.value,
			REAL: configs.default_values.REAL.value,
			STRING: configs.default_values.STRING.value,
			CHAR: configs.default_values.CHAR.value,
			BOOLEAN: configs.default_values.BOOLEAN.value,
			DATE: new Date(configs.default_values.DATE.value),
		}[this.name];
		else return null;
	}
}
/** Contains data about an array type. Processed from an ExpressionASTArrayTypeNode. */
export class ArrayVariableType<Init extends boolean = true> extends BaseVariableType {
	totalLength:number | null = null;
	arraySizes:number[] | null = null;
	lengthInformation: [low:number, high:number][] | null = null;
	static maxLength = 10_000_000;
	constructor(
		public lengthInformationExprs: [low:ExpressionAST, high:ExpressionAST][] | null,
		public lengthInformationRange: TextRange | null,
		public elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null,
		public range: TextRange,
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
		} else if(!configs.arrays.unspecified_length.value) fail(`Please specify the length of the array\n${configs.arrays.unspecified_length.errorHelp}`, this.range);
	}
	validate(runtime:Runtime){
		if(this.totalLength && this.totalLength > ArrayVariableType.maxLength)
			fail(`Length ${this.totalLength} too large for array variable type`, this.range);
	}
	clone():ArrayVariableType<Init> {
		const type = new ArrayVariableType<Init>(this.lengthInformationExprs, this.lengthInformationRange, this.elementType, this.range);
		type.lengthInformation = this.lengthInformation;
		type.arraySizes = this.arraySizes;
		type.totalLength = this.totalLength;
		return type;
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
		return Array.from({length: this.totalLength!}, () => type.getInitValue(runtime, configs.initialization.arrays_default.value) as VariableTypeMapping<ArrayElementVariableType> | null);
	}
	static from(node:ExpressionASTArrayTypeNode){
		return new ArrayVariableType<false>(
			node.lengthInformation,
			node.lengthInformation ? getTotalRange(node.lengthInformation.flat()) : null,
			PrimitiveVariableType.resolve(node.elementType),
			node.range
		);
	}
	mapValues<T>(value:VariableTypeMapping<ArrayVariableType>, callback:(tval:TypedValue | null) => T):T[] {
		return value.map(v =>
			callback(v != null ? typedValue((this as ArrayVariableType<true>).elementType!, v) : null)
		);
	}
	asHTML(value:VariableTypeMapping<ArrayVariableType>, recursive:boolean):string {
		return `<span class="sth-bracket">[</span>${
			this.mapValues(value, tval => tval?.asHTML(true) ?? `<span class="sth-invalid">(uninitialized)<span>`).join(", ")
		}<span class="sth-bracket">]</span>`;
	}
	asString(value:VariableTypeMapping<ArrayVariableType>):string {
		return `[${
			this.mapValues(value, tval => tval?.asString() ?? `(uninitialized)`).join(", ")
		}]`;
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
	validate(){
		for(const [name, [type, range]] of Object.entries((this as RecordVariableType<true>).fields)){
			if(type == this) fail(f.text
`Recursive type "${this.name}" has infinite size: \
field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object
help: change the field's type to be "pointer to ${this.name}"`,
			range);
			if(type instanceof ArrayVariableType && type.elementType == this) fail(f.text
`Recursive type "${this.name}" has infinite size: \
field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object
help: change the field's type to be "array of pointer to ${this.name}"`,
			range);
			if(type instanceof RecordVariableType && type.directDependencies.has(this as RecordVariableType<true>)) fail(f.quote
`Recursive type ${this.name} has infinite size: \
initializing field ${name} indirectly requires initializing the parent type, which requires initializing the field again
help: change the field's type to be a pointer`,
			range);
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
	iterate<T>(value:VariableTypeMapping<RecordVariableType>, callback:(tval:TypedValue | null, name:string, range:TextRange) => T):T[] {
		return Object.entries((this as RecordVariableType<true>).fields).map(([name, [type, range]]) =>
			callback(value[name] != null ? typedValue(type, value[name]!) : null, name, range)
		);
	}
	asHTML(value:VariableTypeMapping<RecordVariableType>):string {
		return `<span class="sth-type">${escapeHTML(this.name)}</span> <span class="sth-brace">{</span>\n${
			this.iterate(value, (tval, name) =>
				`\t${escapeHTML(name)}: ${tval != null ? tval.asHTML(true) : '<span class="sth-invalid">(uninitialized)<span>'},`.replaceAll("\n", "\n\t") + "\n"
			).join("")
		}<span class="sth-brace">}</span>`;
	}
	asString(value:VariableTypeMapping<RecordVariableType>):string {
		return `${this.name} {\n${
			this.iterate(value, (tval, name) =>
				`\t${name}: ${tval != null ? tval.asString() : '(uninitialized)'},`.replaceAll("\n", "\n\t") + "\n"
			).join("")
		}}`;
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
	asHTML(value:VariableValue):string {
		return "(pointer)";
	}
	asString(value:VariableValue):string {
		return "(pointer)";
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
	asHTML(value:VariableValue):string {
		return escapeHTML(value as VariableTypeMapping<EnumeratedVariableType>);
	}
	asString(value:VariableValue):string {
		return value as VariableTypeMapping<EnumeratedVariableType>;
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
	mapValues<T>(value:VariableTypeMapping<SetVariableType>, callback:(tval:TypedValue) => T):T[] {
		return value.map(v =>
			callback(typedValue((this as SetVariableType<true>).baseType, v))
		);
	}
	asHTML(value:VariableTypeMapping<SetVariableType>):string {
		return `Set <span style="sth-bracket">[</span>${this.mapValues(value, tval => tval.asHTML(true)).join(", ")}<span style="sth-bracket">]</span>`;
	}
	asString(value:VariableTypeMapping<SetVariableType>):string {
		return `Set [${this.mapValues(value, tval => tval.asString()).join(", ")}]`;
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
	validate(runtime:Runtime){
		if(this.baseClass){
			for(const name of Object.keys(this.baseClass.allMethods)){
				if(this.ownMethods[name]){
					checkClassMethodsCompatible(
						runtime,
						this.baseClass.allMethods[name][1].controlStatements[0],
						this.ownMethods[name].controlStatements[0],
					);
				}
			}
		}
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
	iterateProperties<T>(value:VariableTypeMapping<ClassVariableType>, callback:(tval:TypedValue | null, name:string, statement:ClassPropertyStatement) => T):T[] {
		return Object.entries((this as ClassVariableType<true>).properties).map(([name, [type, statement]]) =>
			callback(value.properties[name] != null ? typedValue(type, value.properties[name]!) : null, name, statement)
		);
	}
	asHTML(value:VariableTypeMapping<ClassVariableType>):string {
		return `<span class="sth-type">${escapeHTML(this.name)}</span> <span class="sth-brace">{</span>\n${
			this.iterateProperties(value, (tval, name) => {
				return `\t${escapeHTML(name)}: ${tval != null ? tval.asHTML(true) : '<span class="sth-invalid">(uninitialized)<span>'},`.replaceAll("\n", "\n\t") + "\n";
			}).join("")
		}<span class="sth-brace">}</span>`;
	}
	asString(value:VariableTypeMapping<ClassVariableType>):string {
		return `${escapeHTML(this.name)} {\n${
			this.iterateProperties(value, (tval, name) => {
				return `\t${escapeHTML(name)}: ${tval != null ? tval.asHTML(true) : '<span class="sth-invalid">(uninitialized)<span>'},`.replaceAll("\n", "\n\t") + "\n";
			}).join("")
		}}`;
	}
}

export function typesEqual(a:VariableType | UnresolvedVariableType, b:VariableType | UnresolvedVariableType, types = new Array<[VariableType, VariableType]>()):boolean {
	return a == b ||
		(Array.isArray(a) && Array.isArray(b) && a[1] == b[1]) ||
		(a instanceof ArrayVariableType && b instanceof ArrayVariableType && a.arraySizes?.toString() == b.arraySizes?.toString() && (
			a.elementType == b.elementType ||
			Array.isArray(a.elementType) && Array.isArray(b.elementType) && a.elementType[1] == b.elementType[1]
		)) ||
		(a instanceof PointerVariableType && b instanceof PointerVariableType && (
			types.some(([_a, _b]) => a == _a && b == _b) || //Prevent infinite recursion on infinite pointer types
			typesEqual(a.target, b.target, types.concat([[a, b]]))
		)) ||
		(a instanceof SetVariableType && b instanceof SetVariableType && a.baseType == b.baseType)
	;
}

/**
 * Checks if "ext" is assignable to "base". Does not attempt coercion.
 * @returns true if it is, or a string error message if it isn't. Error message may be empty.
 */
export function typesAssignable(base:VariableType, ext:VariableType):true | string;
export function typesAssignable(base:UnresolvedVariableType, ext:UnresolvedVariableType):true | string;
export function typesAssignable(base:VariableType | UnresolvedVariableType, ext:VariableType | UnresolvedVariableType):true | string {
	if(base == ext) return true;
	if(Array.isArray(base) && Array.isArray(ext))
		return base[1] == ext[1] || "";
	if(base instanceof ArrayVariableType && ext instanceof ArrayVariableType){
		if(base.elementType != null){
			if(ext.elementType == null) return f.quote`Type "ANY" is not assignable to type ${base.elementType}`;
			//arrays are invariant
			if(!typesEqual(base.elementType, ext.elementType)) return f.quote`Types ${base.elementType} and ${ext.elementType} are not equal`;
		}
		if(base.lengthInformation != null){
			if(ext.lengthInformation == null) return `cannot assign an array with unknown length to an array requiring a specific length`;
			//Total length is different
			if(base.totalLength != ext.totalLength) return "these array types have different lengths";
			
			if( //Total length is same but sub-sizes are different
				!configs.coercion.arrays_same_total_size.value &&
				base.arraySizes!.toString() != ext.arraySizes!.toString()
			) return `these array types have different lengths\n${configs.coercion.arrays_same_total_size.errorHelp}`;
			
			if( //Sub-sizes are same but start and end indexes are different
				!configs.coercion.arrays_same_length.value &&
				base.lengthInformation.toString() != ext.lengthInformation.toString()
			) return `these array types have different start and end indexes\n${configs.coercion.arrays_same_length.errorHelp}`;
		}
		return true;
	}
	if(base instanceof PointerVariableType && ext instanceof PointerVariableType){
		return typesEqual(base.target, ext.target) || f.quote`Types ${base.target} and ${ext.target} are not equal`;
	}
	if(base instanceof SetVariableType && ext instanceof SetVariableType){
		return typesEqual(base.baseType, ext.baseType) || f.quote`Types ${base.baseType} and ${ext.baseType} are not equal`;
	}
	if(base instanceof ClassVariableType && ext instanceof ClassVariableType){
		return ext.inherits(base) || "";
	}
	return "";
}

export const checkClassMethodsCompatible = errorBoundary({
	message: (base:ClassMethodStatement, derived:ClassMethodStatement) => `Derived class method ${derived.name} is not compatible with the same method in the base class: `,
})(function _checkClassMethodsCompatible(runtime:Runtime, base:ClassMethodStatement, derived:ClassMethodStatement){

	if(base.accessModifier != derived.accessModifier)
		fail(f.text`Method was ${base.accessModifier} in base class, cannot override it with a ${derived.accessModifier} method`, derived.accessModifierToken);

	if(base.stype != derived.stype)
		fail(f.text`Method was a ${base.stype.split("_")[1]} in base class, cannot override it with a ${derived.stype.split("_")[1]}`, derived.methodKeywordToken);

	if(!(base.name == "NEW" && derived.name == "NEW")){
		//Skip assignability check for the constructor
		if(base.args.size != derived.args.size)
			fail(`Method should have ${base.args.size} parameter${base.args.size == 1 ? "" : "s"}, but it has ${derived.args.size} parameter${derived.args.size == 1 ? "" : "s"}.`, derived.argsRange);
		for(const [[aName, aType], [bName, bType]] of zip(base.args.entries(), derived.args.entries())){
			//Changing the name is fine
			let result;
			//TODO cache the resolved type, store it in the class somehow, resolve these types at 2nd pass
			if((result = typesAssignable(runtime.resolveVariableType(bType.type), runtime.resolveVariableType(aType.type))) != true) //parameter types are contravariant
				fail(f.quote`Argument ${bName} in derived class is not assignable to argument ${aName} in base class: type ${aType.type} is not assignable to type ${bType.type}` + (result ? `: ${result}.` : ""), derived.argsRange);
			if(aType.passMode != bType.passMode)
				fail(f.quote`Argument ${bName} in derived class is not assignable to argument ${aName} in base class because their pass modes are different.`, derived.argsRange);
		}
	}

	if(base instanceof ClassFunctionStatement && derived instanceof ClassFunctionStatement){
		let result;
		if((result = typesAssignable(runtime.resolveVariableType(base.returnType), runtime.resolveVariableType(derived.returnType))) != true) //return type is covariant
			fail(f.quote`Return type ${derived.returnType} is not assignable to ${base.returnType}` + (result ? `: ${result}.` : ""), derived.returnTypeToken);
	}
});

export type UnresolvedVariableType =
	| PrimitiveVariableType
	| ArrayVariableType<false>
	| ["unresolved", name:string, range:TextRange]
;
export type VariableType<Init extends boolean = true> =
	| PrimitiveVariableType<"INTEGER">
	| PrimitiveVariableType<"REAL">
	| PrimitiveVariableType<"STRING">
	| PrimitiveVariableType<"CHAR">
	| PrimitiveVariableType<"BOOLEAN">
	| PrimitiveVariableType<"DATE">
	| PrimitiveVariableType
	| ArrayVariableType<Init>
	| RecordVariableType<Init>
	| PointerVariableType<Init>
	| EnumeratedVariableType
	| SetVariableType<Init>
	| ClassVariableType<Init>
;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType | ClassVariableType;
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
	declaration: DeclareStatement | FunctionStatement | ProcedureStatement | DefineStatement | AssignmentStatement | "dynamic";
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
