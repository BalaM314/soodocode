/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/

import { configs } from "../config/index.js";
import type { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTNode, ExpressionASTRangeTypeNode, ExpressionASTTypeLeafNode, ProgramASTBranchNode, ProgramASTNodeGroup } from "../parser/index.js";
import { processTypeData } from "../parser/parser.js";
import type { AssignmentStatement, BuiltinFunctionArguments, ClassFunctionStatement, ClassProcedureStatement, ClassPropertyStatement, ClassStatement, ConstantStatement, DeclareStatement, DefineStatement, ForStatement, FunctionStatement, ProcedureStatement, Statement } from "../statements/index.js";
import { crash, enableConfig, escapeHTML, f, fail, getTotalRange, IFormattable, impossible, match, RangeArray, setConfig, unreachable } from "../utils/funcs.js";
import type { BoxPrimitive, RangeAttached, TextRange, TextRangeLike } from "../utils/types.js";
import { checkClassMethodsCompatible } from "./runtime-funcs.js";
import { Runtime } from "./runtime.js";

/** Maps a pseudocode VariableType to the type used to represent it in TS. */
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
	T extends ArrayVariableType ? (
		| Array<VariableTypeMapping<ArrayElementVariableType> | null>
		| Int32Array
		| Float64Array
	) :
	T extends IntegerRangeVariableType ? number :
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

/** Stores all primitive type names. */
export const primitiveVariableTypeNames = [
	"INTEGER",
	"REAL",
	"STRING",
	"CHAR",
	"BOOLEAN",
	"DATE",
] as const;
/** The name of a primitive variable type, like INTEGER, STRING, or DATE. */
export type PrimitiveVariableTypeName = typeof primitiveVariableTypeNames extends ReadonlyArray<infer T> ? T : never;
/** Maps the name of a primitive variable type to the TS type used to store its data. */
export type PrimitiveVariableTypeMapping<T extends PrimitiveVariableTypeName> =
	T extends "INTEGER" ? number :
	T extends "REAL" ? number :
	T extends "STRING" ? string :
	T extends "CHAR" ? string :
	T extends "BOOLEAN" ? boolean :
	T extends "DATE" ? Date :
	never;

/** A type and value wrapped together, as an expanded union. */
export type TypedValue<T extends VariableType = VariableType> =
	//Trigger DCT
	T extends unknown ? TypedValue_<T> : never;
export type { TypedValue_ };
/** A type and value wrapped together. */
class TypedValue_<T extends VariableType> {
	constructor(
		public type:T,
		public value:VariableTypeMapping<T>,
	){}
	typeIs<Type extends
		| typeof PrimitiveVariableType
		| typeof ArrayVariableType
		| typeof RecordVariableType
		| typeof PointerVariableType
		| typeof EnumeratedVariableType
		| typeof SetVariableType
		| typeof ClassVariableType
	>(clazz:Type):
		this is TypedValue_<Type["prototype"]>;
	typeIs<Type extends PrimitiveVariableTypeName>(...type:Type[]):
		this is TypedValue_<PrimitiveVariableType<Type>>;
	typeIs(...type:PrimitiveVariableTypeName[] | [BaseVariableType]){
		if(type[0] instanceof Function && type[0].prototype instanceof BaseVariableType)
			return this.type instanceof type[0];
		if(typeof type[0] == "string")
			return this.type.is(...(type as PrimitiveVariableTypeName[]));
		impossible();
	}
	/**
	 * Displays the value as formatted HTML.
	 * Must escape HTML special chars from user input.
	 */
	asHTML(recursive:boolean):string {
		if(this.type instanceof PrimitiveVariableType){
			if(this.typeIs("INTEGER"))
				return `<span class="sth-number">${this.value}</span>`;
			if(this.typeIs("REAL"))
				return `<span class="sth-number">${Number.isInteger(this.value) ? `${this.value}.0` : this.value}</span>`;
			if(this.typeIs("CHAR"))
				if(recursive) return `<span class="sth-char">${escapeHTML(`'${this.value}'`)}</span>`;
				else return escapeHTML(this.value);
			if(this.typeIs("STRING"))
				if(recursive) return `<span class="sth-string">${escapeHTML(`"${this.value}"`)}</span>`;
				else return escapeHTML(this.value);
			if(this.typeIs("BOOLEAN"))
				return `<span class="sth-boolean">${this.value.toString().toUpperCase()}</span>`;
			if(this.typeIs("DATE"))
				return `<span class="sth-date">${escapeHTML(this.value.toLocaleDateString("en-GB"))}</span>`;
			impossible();
		}
		return this.type.asHTML(this.value as never, recursive); //corr
	}
	/** Displays the value as a plain-text string. */
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
/** A collection of utility functions that generate a TypedValue of a particular type. */
export const TypedValue = Object.fromEntries(primitiveVariableTypeNames.map(n =>
	[n, function(value:VariableTypeMapping<PrimitiveVariableType>){
		if(value == undefined){
			unreachable(value, `nullish values are not allowed here`);
		}
		return new TypedValue_(PrimitiveVariableType.get(n), value);
	}] as const
)) as {
	[N in PrimitiveVariableTypeName]: (value:VariableTypeMapping<PrimitiveVariableType<N>>) => TypedValue_<PrimitiveVariableType<N>>;
};
/** Utility function to create a TypedValue. */
export function typedValue<T extends VariableType>(type:T, value:VariableTypeMapping<T>):TypedValue {
	if(type == null || value == null) impossible();
	if(!(type instanceof BaseVariableType)){
		unreachable(type, `Type was not a valid type`);
	}
	if(type instanceof ArrayVariableType && !type.lengthInformation)
		crash(`Attempted to construct a TypedValue with an array type without a known length`);
	return new TypedValue_(type, value) as TypedValue;
}

/** An {@link ExpressionASTNode} wrapped with its evaluation result, and a function to evaluate it. */
export interface NodeValue {
	node: ExpressionASTNode;
	/**
	 * Set to undefined if pre-evaluation has not been attempted yet.
	 * Set to null if pre-evaluation has been attempted but failed.
	 */
	value: VariableValue | TypedValue | null | undefined;
	init():void;
}
/** An {@link ExpressionASTNode} of known expected type wrapped with its evaluation result, and a function to evaluate it. */
export class TypedNodeValue<
	T extends ExpressionASTNode = ExpressionASTNode,
	InputType extends PrimitiveVariableTypeName | VariableType = VariableType,
	Type extends VariableType = InputType extends PrimitiveVariableTypeName ? PrimitiveVariableType<InputType> : InputType
> implements NodeValue {
	type: Type;
	range = this.node.range;
	constructor(
		public node: T,
		inputType: InputType,
		/**
		 * Set to undefined if pre-evaluation has not been attempted yet.
		 * Set to null if pre-evaluation has been attempted but failed.
		 */
		public value: VariableTypeMapping<Type> | null | undefined = undefined
	){
		this.type = ((typeof inputType == "string") ? PrimitiveVariableType.get(inputType) : inputType) as Type;
	}
	init(){
		this.value = (Runtime.evaluateExpr(this.node, this.type) as TypedValue_<Type> | null)?.value ?? null;
	}
}
/** An {@link ExpressionASTNode} of unknown type wrapped with its evaluation result, and a function to evaluate it. */
export class UntypedNodeValue<T extends ExpressionAST = ExpressionAST> implements NodeValue {
	constructor(
		public node: T
	){}
	range = this.node.range;
	/**
	 * Set to undefined if pre-evaluation has not been attempted yet.
	 * Set to null if pre-evaluation has been attempted but failed.
	 */
	value: TypedValue | null | undefined;
	init(){
		this.value = Runtime.evaluateExpr(this.node);
	}
}

/** Base class for variable types. */
export abstract class BaseVariableType implements IFormattable {
	abstract getInitValue(runtime:Runtime, requireInit:boolean):unknown;
	abstract init(runtime:Runtime):void;
	validate(runtime:Runtime){}
	is(...type:PrimitiveVariableTypeName[]){
		return false;
	}
	isInteger(){
		return false;
	}
	abstract fmtDebug():string;
	/** If not implemented, defaults to `"${fmtText()}"` */
	fmtQuoted(){
		return `"${this.fmtText()}"`;
	}
	abstract fmtText():string;
}

/** Discriminated union for {@link PrimitiveVariableType} */
export type PrimitiveVariableType_<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> = T extends string ? PrimitiveVariableType<T> : never;
/** A primitive variable type, like INTEGER, STRING, and DATE. */
export class PrimitiveVariableType<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> extends BaseVariableType {
	static all:PrimitiveVariableType[] = [];

	/** An integer value. Currently, only integers from -9007199254740991 to 9007199254740991 are supported. */
	static INTEGER = new PrimitiveVariableType("INTEGER");
	/** A real number, more commonly known as a float or double. Uses a 64-bit float. */
	static REAL = new PrimitiveVariableType("REAL");
	/** A string of UTF-8 characters. */
	static STRING = new PrimitiveVariableType("STRING");
	/** A single Unicode Scalar Value, between U+0000 and U+10FFFF. */
	static CHAR = new PrimitiveVariableType("CHAR");
	/** A boolean value, TRUE or FALSE. */
	static BOOLEAN = new PrimitiveVariableType("BOOLEAN");
	/** A date. Stores the year, month, and day. */
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
		return type.includes(this.name);
	}
	isInteger(){
		return this.name == "INTEGER";
	}
	static valid(input:string):input is PrimitiveVariableTypeName {
		return input == "INTEGER" || input == "REAL" || input == "STRING" || input == "CHAR" || input == "BOOLEAN" || input == "DATE";
	}
	static get(type:PrimitiveVariableTypeName):PrimitiveVariableType;
	static get(type:string):PrimitiveVariableType | undefined;
	static get(type:string):PrimitiveVariableType | undefined{
		return this.valid(type) ? this[type] : undefined;
	}
	static resolve(token:ExpressionASTTypeLeafNode):Exclude<UnresolvedVariableType, ArrayVariableType> {
		return this.get(token.text) ?? ["unresolved", token.text, token.range];
	}
	getInitValue(runtime:Runtime, requireInit:boolean):number | string | boolean | Date | null {
		if(requireInit) return match(this.name, {
			INTEGER: configs.default_values.INTEGER.value,
			REAL: configs.default_values.REAL.value,
			STRING: configs.default_values.STRING.value,
			CHAR: configs.default_values.CHAR.value,
			BOOLEAN: configs.default_values.BOOLEAN.value,
			DATE: new Date(configs.default_values.DATE.value), //one impostor among us
		});
		else return null;
	}
}
export class IntegerRangeVariableType extends BaseVariableType {
	constructor(
		public low:number, public high:number,
		public range:TextRange
	){super();}
	init(runtime:Runtime){ impossible(); }
	possible(){
		return this.high >= this.low;
	}
	getInitValue(runtime:Runtime, requireInit:boolean):number | null {
		if(requireInit){
			if(!this.possible()) fail(f.quote`Cannot initialize variable of type ${this}`, this.range);
			return this.low;
		} else return null;
	}
	isInteger(){
		return true;
	}
	fmtText(){
		return `${this.low}..${this.high}`;
	}
	asNumberRange(){
		return `${this.low} to ${this.high}`;
	}
	fmtDebug(){
		return `IntegerRangeVariableType { ${this.low} .. ${this.high} }`;
	}
	asString(value:VariableTypeMapping<this>){
		return `${value satisfies number}`;
	}
	asHTML(value:VariableTypeMapping<this>){
		return `<span class="sth-number" title="Type: ${this.fmtText()}">${value satisfies number}</span>`;
	}
	overlaps(other:IntegerRangeVariableType){
		return this.high >= other.low;
	}
	contains(other:IntegerRangeVariableType){
		return this.low <= other.low && this.high >= other.high;
	}
	static from(node:ExpressionASTRangeTypeNode){
		return new this(Number(node.low.text), Number(node.high.text), node.range);
	}
}
//TODO! refactor variable types
//Stop mutating them to initialize, create a different class
/** Contains data about an array type. Processed from an {@link ExpressionASTArrayTypeNode}. */
export class ArrayVariableType<Init extends boolean = true> extends BaseVariableType {
	totalLength:number | null = null;
	arraySizes:number[] | null = null;
	lengthInformation: [low:number, high:number][] | null = null;
	initialized = false;
	static maxLength = 10_000_000;
	constructor(
		public lengthInformationExprs: [low:ExpressionAST, high:ExpressionAST][] | null,
		public lengthInformationRange: TextRange | null,
		public elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null,
		public range: TextRange,
	){super();}
	init(runtime:Runtime){
		if(this.initialized) crash(`Attempted to initialize already initialized type`);
		this.initialized = true;
		if(Array.isArray(this.elementType))
			this.elementType = runtime.resolveVariableType(this.elementType);
		if(this.lengthInformationExprs){
			this.lengthInformation = new Array(this.lengthInformationExprs.length);
			for(const [i, [low_, high_]] of this.lengthInformationExprs.entries()){
				const low = runtime.evaluateExpr(low_, PrimitiveVariableType.INTEGER).value;
				const high = runtime.evaluateExpr(high_, PrimitiveVariableType.INTEGER).value;
				if(high < low)
					fail(`Invalid length information: upper bound cannot be less than lower bound`, high_);
				this.lengthInformation[i] = [low, high];
			}
			this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
			this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
		} else if(!configs.arrays.unspecified_length.value) fail({
			summary: `Please specify the length of the array`,
			help: enableConfig(configs.arrays.unspecified_length)
		}, this.range);
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
		if(!this.lengthInformation) fail({
			summary: f.quote`${this} is not a valid variable type: length must be specified here`,
			help: `specify the length by adding "[1:10]" after the keyword ARRAY`
		}, this.range);
		if(!this.elementType) fail(f.quote`${this} is not a valid variable type: element type must be specified here`, this.range);
		const type = (this as ArrayVariableType<true>).elementType!;
		if(type instanceof ArrayVariableType) crash(`Attempted to initialize array of arrays`);
		if(type.is("REAL")){
			if(this.totalLength! * 8 > configs.arrays.max_size_bytes.value)
				fail({
					summary: `Array of total length "${this.totalLength}" is too large`,
					help: setConfig("increase", configs.arrays.max_size_bytes)
				}, this.range);
		} else if(type.is("INTEGER") && configs.arrays.use_32bit_integers.value){
			if(this.totalLength! * 4 > configs.arrays.max_size_bytes.value)
				fail({
					summary: `Array of total length "${this.totalLength}" is too large`,
					help: setConfig("increase", configs.arrays.max_size_bytes)
				}, this.range);
		} else {
			if(this.totalLength! > configs.arrays.max_size_composite.value)
				fail({
					summary: `Array of total length "${this.totalLength}" is too large`,
					help: setConfig("increase", configs.arrays.max_size_composite)
				}, this.range);
		}
		if(type.is("INTEGER") && configs.arrays.use_32bit_integers.value && this.totalLength! > 1000)
			return new Int32Array(this.totalLength!).fill(configs.default_values.INTEGER.value);
		else if(type.is("REAL"))
			return new Float64Array(this.totalLength!).fill(configs.default_values.REAL.value);
		else
			return Array.from({length: this.totalLength!},
				() => type.getInitValue(runtime, configs.initialization.arrays_default.value) as
					VariableTypeMapping<ArrayElementVariableType> | null
			);
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
		if(Array.isArray(value)) return value.map(v =>
			callback(v != null ? typedValue((this as ArrayVariableType<true>).elementType!, v) : null)
		);
		else return Array.from(value, (v) =>
			callback(typedValue((this as ArrayVariableType<true>).elementType!, v))
		);
	}
	asHTML(value:VariableTypeMapping<ArrayVariableType>, recursive:boolean):string {
		return `<span class="sth-bracket">[</span>${
			this.mapValues(value, tval => tval?.asHTML(true) ?? `<span class="sth-invalid">(uninitialized)</span>`).join(", ")
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
		if(this.initialized) crash(`Attempted to initialize already initialized type`);
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
		const self = this as RecordVariableType<true>;
		for(const [name, [type, range]] of Object.entries(self.fields)){
			if(type == this) fail({
				summary: f.text`Recursive type "${this.name}" has infinite size`,
				elaboration: [
					`field "${name}" immediately references the parent type,`,
					`so initializing it would require creating an infinitely large object`
				],
				help: `change the field's type to be "pointer to ${this.name}"`,
			}, range);
			if(type instanceof ArrayVariableType && type.elementType == this) fail({
				summary: f.text`Recursive type "${this.name}" has infinite size`,
				elaboration: [
					`field "${name}" immediately references the parent type,`,
					`so initializing it would require creating an infinitely large object`
				],
				help: `change the field's type to be "array of pointer to ${this.name}"`,
			}, range);
			if(type instanceof RecordVariableType && type.directDependencies.has(self)) fail({
				summary: f.quote`Recursive type ${this.name} has infinite size`,
				elaboration: [
					`initializing field ${name} indirectly requires initializing the parent type,`,
					`which requires initializing the field again`
				],
				help: `change the field's type to be a pointer`,
			}, range);
			if(type instanceof ArrayVariableType && !type.lengthInformation) fail({
				summary: f.quote`Type ${this.name} cannot be initialized`,
				elaboration: [
					f.quote`When a variable of type ${this.name} is declared, all its fields are immediately initialized`,
					f.quote`this includes the field ${name}, which does not have a known length and cannot be initialized`
				],
				help: [
					`specify the length of the array type`,
					f.quoteRange`if the length changes at runtime, change the field's type to be a pointer to ${type}`,
					f.quoteRange`alternatively, convert this record type to a class, and assign to this field in the constructor so it does not need to be initialized`
				],
			}, range);
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
		) satisfies VariableTypeMapping<RecordVariableType>;
	}
	iterate<T>(value:VariableTypeMapping<RecordVariableType>, callback:(tval:TypedValue | null, name:string, range:TextRange) => T):T[] {
		return Object.entries((this as RecordVariableType<true>).fields).map(([name, [type, range]]) =>
			callback(value[name] != null ? typedValue(type, value[name]) : null, name, range)
		);
	}
	asHTML(value:VariableTypeMapping<RecordVariableType>):string {
		return `<span class="sth-type">${escapeHTML(this.name)}</span> <span class="sth-brace">{</span>\n${
			this.iterate(value, (tval, name) =>
				`\t${escapeHTML(name)}: ${tval != null ? tval.asHTML(true) : '<span class="sth-invalid">(uninitialized)</span>'},`.replaceAll("\n", "\n\t") + "\n"
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
		public target: (Init extends true ? never : UnresolvedVariableType) | VariableType,
		public range: TextRange
	){super();}
	init(runtime:Runtime){
		if(this.initialized) crash(`Attempted to initialize already initialized type`);
		if(Array.isArray(this.target)) this.target = runtime.resolveVariableType(this.target);
		(this as PointerVariableType<true>).initialized = true;
	}
	validate(){
		if(!configs.pointers.infinite_pointer_types.value){
			if(PointerVariableType.isInfinite(this as PointerVariableType<true>))
				fail({
					summary: f.quote`Pointer type ${this.name} references itself infinitely`,
					help: enableConfig(configs.pointers.infinite_pointer_types)
				}, this);
		}
	}
	static isInfinite(type:PointerVariableType, seen = new Set<PointerVariableType>()):boolean {
		if(seen.has(type)) return true;
		if(!(type.target instanceof PointerVariableType)) return false;
		seen.add(type);
		return PointerVariableType.isInfinite(type.target, seen);
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
		const v = value as VariableTypeMapping<PointerVariableType>;
		return `<span class="sth-type">(pointer to</span> ${v.name}<span class="sth-type">)</span>`;
	}
	asString(value:VariableValue):string {
		const v = value as VariableTypeMapping<PointerVariableType>;
		return `(pointer to ${v.name})`;
	}
}
export class EnumeratedVariableType extends BaseVariableType {
	constructor(
		public name: string,
		public values: string[]
	){super();}
	init(runtime:Runtime){
		for(const name of this.values){
			runtime.getCurrentScope().variables[name] = {
				declaration: "enum",
				mutable: false,
				name,
				value: name,
				type: this
			};
		}
	}
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
	asHTML(value:VariableTypeMapping<EnumeratedVariableType>):string {
		return escapeHTML(value satisfies string);
	}
	asString(value:VariableTypeMapping<EnumeratedVariableType>):string {
		return value;
	}
}
export class SetVariableType<Init extends boolean = true> extends BaseVariableType {
	constructor(
		public initialized: Init,
		public name: string,
		public elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null,
	){super();}
	init(runtime:Runtime){
		if(Array.isArray(this.elementType)) this.elementType = runtime.resolveVariableType(this.elementType);
		(this as SetVariableType<true>).initialized = true;
	}
	fmtText():string {
		return f.text`${this.name} (user-defined set type containing "${this.elementType ?? "ANY"}")`;
	}
	fmtShort():string {
		return this.name;
	}
	toQuotedString():string {
		return f.text`"${this.name}" (user-defined set type containing "${this.elementType ?? "ANY"}")`;
	}
	fmtDebug():string {
		return f.debug`SetVariableType [${this.name}] (contains: ${this.elementType ?? "ANY"})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		crash(`Cannot initialize a variable of type SET`);
	}
	mapValues<T>(value:VariableTypeMapping<SetVariableType>, callback:(tval:TypedValue) => T):T[] {
		const elementType = (this as SetVariableType<true>).elementType
			?? crash(`Attempted to display a set with no element type`);
		return value.map(v =>
			callback(typedValue(elementType, v))
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
	baseClass:ClassVariableType<Init extends true ? true : boolean> | null = null;
	constructor(
		public initialized: Init,
		public statement: ClassStatement,
		/** Stores regular and inherited properties. */
		public properties: Record<string, [(Init extends true ? never : UnresolvedVariableType) | VariableType, ClassPropertyStatement, TextRangeLike]> = Object.create(null) as never,
		/** Does not store inherited methods. */
		public ownMethods: Record<string, ClassMethodData> = Object.create(null) as never,
		public allMethods: Record<string, [source:ClassVariableType<Init extends true ? true : boolean>, data:ClassMethodData]> = Object.create(null) as never,
		public propertyStatements: ClassPropertyStatement[] = []
	){super();}
	init(runtime:Runtime){
		if(this.initialized) crash(`Attempted to initialize already initialized type`);
		for(const statement of this.propertyStatements){
			const type = runtime.resolveVariableType(processTypeData(statement.varType));
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
		//Behold, the power of javascript!

		//CLASS Foo
		//	PUBLIC arr: ARRAY OF INTEGER
		//	PUBLIC PROCEDURE NEW(Length: INTEGER)
		//		DECLARE temp: ARRAY[1:Length] OF INTEGER
		//		arr <- temp
		//	ENDPROCEDURE
		//ENDCLASS
		//
		//Here, the property "arr" cannot be initialized, as it does not have a known length
		//However, it does not need to be initialized, as it is assigned in the constructor

		//Use an object (called propertiesInitializer) with getter functions to lazily initialize the instance
		//Create another object to hold the initialized values and prototype link it to the initializer
		//If anything tries to access the value of the variable, and it hasn't been initialized,
		//the access will get delegated to the initializer object, which will initialize the property on the values object
		//If nothing tries to access the value before setting it, it doesn't get uselessly initialized
		//After calling the constructor, make sure all fields have been initialized, then unlink the initializer object

		const This = this as ClassVariableType<true>;

		const propertiesInitializer = Object.defineProperties(
			Object.create(null),
			Object.fromEntries(Object.entries(This.properties).map(([k, v]) => [k, {
				get(){
					const value = v[0].getInitValue(runtime, false);
					//Use defineProperty to make sure we're setting it on the values object, not the initializer object
					Object.defineProperty(propertiesObj, k, {
						configurable: true,
						enumerable: true,
						writable: true,
						value,
					});
					return value;
				},
				set(val:VariableValue){
					//Use defineProperty to make sure we're setting it on the values object, not the initializer object
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
		const data:VariableTypeMapping<ClassVariableType> = {
			properties: propertiesObj,
			propertyTypes: Object.create(null),
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
			types: Object.create(null),
			variables: Object.fromEntries(Object.entries((this as ClassVariableType<true>).properties).map(([k, v]) => [k, {
				get type(){ return instance.propertyTypes[k] ?? v[0]; },
				assignabilityType: v[0],
				updateType: v[0] instanceof ArrayVariableType && !v[0].lengthInformation ? (type) => {
					instance.propertyTypes[k] = type;
				} : undefined,
				get value(){return instance.properties[k];},
				set value(value){instance.properties[k] = value;},
				declaration: v[1],
				mutable: true,
				name: k,
			} satisfies VariableData]))
		};
	}
	iterateProperties<T>(value:VariableTypeMapping<ClassVariableType>, callback:(tval:TypedValue | null, name:string, statement:ClassPropertyStatement) => T):T[] {
		return Object.entries((this as ClassVariableType<true>).properties).map(([name, [type, statement]]) =>
			callback(value.properties[name] != null ? typedValue(type, value.properties[name]) : null, name, statement)
		);
	}
	asHTML(value:VariableTypeMapping<ClassVariableType>):string {
		return `<span class="sth-type">${escapeHTML(this.name)}</span> <span class="sth-brace">{</span>\n${
			this.iterateProperties(value, (tval, name) => {
				return `\t${escapeHTML(name)}: ${tval != null ? tval.asHTML(true) : '<span class="sth-invalid">(uninitialized)</span>'},`.replaceAll("\n", "\n\t") + "\n";
			}).join("")
		}<span class="sth-brace">}</span>`;
	}
	asString(value:VariableTypeMapping<ClassVariableType>):string {
		return `${escapeHTML(this.name)} {\n${
			this.iterateProperties(value, (tval, name) => {
				return `\t${escapeHTML(name)}: ${tval != null ? tval.asHTML(true) : '<span class="sth-invalid">(uninitialized)</span>'},`.replaceAll("\n", "\n\t") + "\n";
			}).join("")
		}}`;
	}
}

export type UnresolvedVariableType =
	| PrimitiveVariableType
	| IntegerRangeVariableType
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
	| IntegerRangeVariableType
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
/** Asserts that the input is a valid file mode, and returns it. */
export function FileMode(input:string):FileMode {
	if(fileModes.includes(input)) return input;
	crash(`Assertion failed: ${input} is not a valid file mode`);
}
export type File = {
	readonly name: string;
	readonly text: string;
}
export type OpenedFile = {
	readonly name: string;
	readonly mode: FileMode;
	readonly openRange: TextRange;
	text: string;
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
	/** Name for the variable, used for error messages */
	name: string;
	mutable: true;
}
export type ConstantData<T extends VariableType = VariableType> = {
	type: T;
	/** Cannot be null */
	value: VariableTypeMapping<T>;
	declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement | "enum";
	name: string;
	mutable: false;
}
/** Either a function or a procedure */
export type FunctionData<T extends "function" | "procedure" = "function" | "procedure"> =
	(T extends unknown ? ProgramASTBranchNode<T> : never) & {
		nodeGroups: [body:ProgramASTNodeGroup];
	};
export type BuiltinFunctionData = {
	args:BuiltinFunctionArguments;
	returnType:VariableType | null;
	name:string;
	impl: (this:Runtime, ...args:(RangeAttached<BoxPrimitive<VariableValue>>)[]) => VariableValue;
	aliases: string[];
};
export type ClassMethodStatement = ClassFunctionStatement | ClassProcedureStatement;
export type ClassMethodData = ProgramASTBranchNode & {
	nodeGroups: [body:ProgramASTNodeGroup];
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
