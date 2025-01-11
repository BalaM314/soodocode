/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/


import { Config, configs } from "../config/index.js";
import type { BoxPrimitive, RangeAttached, TextRange, TextRangeLike } from "../utils/types.js";
import { ConfigSuggestion, RangeArray, SoodocodeError, biasedLevenshtein, boxPrimitive, crash, enableConfig, errorBoundary, f, fail, forceType, groupArray, impossible, min, plural, rethrow, setConfig, shallowCloneOwnProperties, tryRun, tryRunOr, unreachable, zip } from "../utils/funcs.js";
import { Token } from "../lexer/index.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTLeafNode, ExpressionASTNode, ProgramASTBranchNode, ProgramASTNodeGroup, operators } from "../parser/index.js";
import { ClassFunctionStatement, ClassProcedureStatement, ClassStatement, ConstantStatement, FunctionStatement, ProcedureStatement, Statement, TypeStatement } from "../statements/index.js";
import { getBuiltinFunctions } from "./builtin-functions.js";
import { FileSystem, LocalFileSystem } from "./files.js";
import { typesAssignable, typesEqual } from "./runtime-funcs.js";
import { ArrayVariableType, BuiltinFunctionData, ClassMethodData, ClassMethodStatement, ClassVariableType, ConstantData, EnumeratedVariableType, FileMode, FunctionData, IntegerRangeVariableType, OpenedFile, OpenedFileOfType, PointerVariableType, PrimitiveVariableType, PrimitiveVariableTypeName, RecordVariableType, SetVariableType, TypedNodeValue, TypedValue, TypedValue_, UnresolvedVariableType, UntypedNodeValue, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue, typedValue } from "./runtime-types.js";

/** A class method, wrapped together with the information needed to call it. */
export type ClassMethodCallInformation = {
	/** This is the class type that the method is linked to, NOT the class type of the instance. Used to determine what SUPER is. */
	clazz: ClassVariableType;
	instance: VariableTypeMapping<ClassVariableType>;
	method: ClassMethodData;
};

/**
 * Compares two types to see if they are suitable for equality checking.
 * Returns true if they are equal, false if they are not equal but the config to allow comparions is set,
 * and fails otherwise.
 **/
function checkTypeMatch(a:VariableType, b:VariableType, range:TextRange):boolean {
	if(typesEqual(a, b)) return true;
	if((a.is("INTEGER") && b instanceof IntegerRangeVariableType) || (a instanceof IntegerRangeVariableType && b.is("INTEGER")))
		return true;
	const errorSummary = f.quote`Cannot test for equality between types ${a} and ${b}`;
	let elaboration:string | undefined = undefined;
	if(a instanceof IntegerRangeVariableType && b instanceof IntegerRangeVariableType){
		if(a.overlaps(b)) return true;
		else if(!configs.equality_checks.allow_different_types.value)
			elaboration = `the comparison will always return FALSE because the types do not overlap`;
	}
	if((a.is("INTEGER") && b.is("REAL")) || (b.is("REAL") && a.is("INTEGER"))){
		if(configs.equality_checks.coerce_int_real.value) return true;
		else if(!configs.equality_checks.allow_different_types.value)
			fail({
				summary: errorSummary,
				help: enableConfig(configs.equality_checks.coerce_int_real),
			}, range);
	}
	if((a.is("STRING") && b.is("CHAR")) || (b.is("CHAR") && a.is("STRING"))){
		if(configs.equality_checks.coerce_string_char.value) return true;
		else if(!configs.equality_checks.allow_different_types.value)
			fail({
				summary: errorSummary,
				help: enableConfig(configs.equality_checks.coerce_string_char),
			}, range);
	}
	if(
		a instanceof ArrayVariableType && b instanceof ArrayVariableType &&
		checkTypeMatch(a.elementType!, b.elementType!, range)
	){
		if(configs.equality_checks.coerce_arrays.value) return true;
		else if(!configs.equality_checks.allow_different_types.value)
			fail({
				summary: errorSummary,
				elaboration: `these types have different lengths`,
				help: enableConfig(configs.equality_checks.coerce_arrays),
			}, range);
	}
	if(!configs.equality_checks.allow_different_types.value)
		fail({
			summary: errorSummary,
			elaboration,
			help: {
				message: `to make this comparison always return FALSE`,
				config: configs.equality_checks.allow_different_types,
				value: true
			}
		}, range);
	return false;
}

/**
 * Compares two values of the same type to see if they are equal.
 **/
function checkValueEquality<T extends VariableType>(type:T, a:VariableTypeMapping<T> | null, b:VariableTypeMapping<T> | null, aPath:string, bPath:string, range:TextRange):boolean {
	if(a === null && b === null) return true;
	if(a === null || b === null) return false;
	if(type instanceof PrimitiveVariableType || type instanceof IntegerRangeVariableType)
		return a == b;
	if(type instanceof ClassVariableType)
		return a == b;
	if(type instanceof PointerVariableType)
		return a == b;
	if(type instanceof EnumeratedVariableType)
		return a == b;
	if(type instanceof SetVariableType){
		const elementType = type.elementType
			?? crash(`Unreachable: checking equality between sets, it should not be possible that both sets have element type "ANY"`);
		forceType<VariableTypeMapping<SetVariableType>>(a);
		forceType<VariableTypeMapping<SetVariableType>>(b);
		return a.length == b.length &&
			[...zip(a.values(), b.values())].every(
				([aElement, bElement], i) => checkValueEquality(elementType, aElement, bElement, `${aPath}[${i}]`, `${bPath}[${i}]`, range)
			);
	}
	if(type instanceof ArrayVariableType){
		forceType<VariableTypeMapping<ArrayVariableType>>(a);
		forceType<VariableTypeMapping<ArrayVariableType>>(b);
		return a.length == b.length &&
			[...zip(a.values(), b.values())].every(
				([aElement, bElement], i) => checkValueEquality(type.elementType!, aElement, bElement, `${aPath}[${i}]`, `${bPath}[${i}]`, range)
			);
	}
	if(type instanceof RecordVariableType){
		forceType<VariableTypeMapping<RecordVariableType>>(a);
		forceType<VariableTypeMapping<RecordVariableType>>(b);
		return Object.entries(type.fields).every(([name, [type, range]]) =>
			checkValueEquality(type, a[name], b[name], `${aPath}.${name}`, `${bPath}.${name}`, range)
		);
	}
	return false;
}

/** Coerces a value of one type to another type. Fails if the conversion is not possible. */
function coerceValue<T extends VariableType, S extends VariableType>(value:VariableTypeMapping<T>, from:T, to:S, range?:TextRangeLike):VariableTypeMapping<S> {
	//typescript really hates this function, beware

	let assignabilityError;
	let helpMessage:string | ConfigSuggestion<any> | null | undefined = null;
	const result = typesAssignable(to, from);
	if(result === true) return value as never;
	if(result) [assignabilityError, helpMessage] = result;
	let configToEnable:Config<unknown, true> | null = null;
	if(from.isInteger() && to.is("REAL", "INTEGER")) return value as never;
	if(from.is("REAL") && to.is("INTEGER")){
		forceType<VariableTypeMapping<PrimitiveVariableType<"REAL">>>(value);
		if(configs.coercion.real_to_int.value){
			if(Number.isInteger(value)) return value as never;
			else if(configs.coercion.truncate_real_to_int.value) return Math.trunc(value) as never;
			else {
				assignabilityError = `the number ${value} is not an integer`;
				// Don't tell the user about this one
				// disabledConfig = configs.coercion.truncate_real_to_int;
			}
		} else configToEnable = configs.coercion.real_to_int;
	}
	if(from.is("STRING") && to.is("CHAR")){
		if(configs.coercion.string_to_char.value){
			const v = (value as VariableTypeMapping<PrimitiveVariableType<"STRING" | "CHAR">>);
			if(v.length == 1) return v as never;
			else assignabilityError = f.quote`the length of the string ${v} is not 1`;
		} else configToEnable = configs.coercion.string_to_char;
	}
	if(to.is("STRING")){
		if(from.is("BOOLEAN")){
			if(configs.coercion.booleans_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"BOOLEAN">>).toString().toUpperCase() as never;
			else configToEnable = configs.coercion.booleans_to_string;
		} else if(from.isInteger() || from.is("REAL")){
			if(configs.coercion.numbers_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"INTEGER" | "REAL"> | IntegerRangeVariableType>).toString() as never;
			else configToEnable = configs.coercion.numbers_to_string;
		} else if(from.is("CHAR")){
			if(configs.coercion.char_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"CHAR">>).toString() as never;
			else configToEnable = configs.coercion.char_to_string;
		} else if(from.is("DATE")){
			if(configs.coercion.numbers_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"INTEGER" | "REAL">>).toString() as never;
			else configToEnable = configs.coercion.numbers_to_string;
		} else if(from instanceof ArrayVariableType){
			if(configs.coercion.arrays_to_string.value){
				if(from.elementType instanceof PrimitiveVariableType || from.elementType instanceof EnumeratedVariableType){
					(null! as VariableTypeMapping<EnumeratedVariableType>) satisfies string;
					return `[${(value as VariableTypeMapping<ArrayVariableType>).join(",")}]` as never;
				} else assignabilityError = `the type of the elements in the array does not support coercion to string`;
			} else configToEnable = configs.coercion.arrays_to_string;
		} else if(from instanceof EnumeratedVariableType){
			if(configs.coercion.enums_to_string.value) return value as VariableTypeMapping<EnumeratedVariableType> satisfies string as never;
			else configToEnable = configs.coercion.enums_to_string;
		}
	}
	if((from.isInteger() || from.is("REAL")) && to.is("BOOLEAN"))
		helpMessage = `to check if this number is non-zero, add "\xA0<>\xA00" after this expression`;
	if(from instanceof EnumeratedVariableType && (to.is("INTEGER") || to.is("REAL"))){
		if(configs.coercion.enums_to_integer.value) return from.values.indexOf(value as VariableTypeMapping<EnumeratedVariableType>) as never;
		else configToEnable = configs.coercion.enums_to_integer;
	}
	if(to instanceof IntegerRangeVariableType && from.is("INTEGER", "REAL")){
		const v = value as VariableTypeMapping<PrimitiveVariableType<"INTEGER" | "REAL">>;
		if(Number.isInteger(v)){
			if(to.low <= v && v <= to.high) return v as never;
			else assignabilityError = f.quote`Value ${v} is not in range ${to}`;
		} else assignabilityError = f.quote`Value ${v} is not an integer`;
	}
	if(to instanceof ClassVariableType && from instanceof ClassVariableType && to.inherits(from)){
		const v = value as VariableTypeMapping<ClassVariableType>;
		if(v.type == to || v.type.inherits(to)) return v as never;
		else assignabilityError = f.quote`the data in the variable is of type ${v.type}`;
	}
	fail({
		summary: f.quote`Cannot coerce value of type ${from} to ${to}`,
		elaboration: assignabilityError,
		help: configToEnable ? {
			config: configToEnable,
			value: true
		} : (helpMessage ?? undefined)
	}, range);
}

/** Finishes evaluating an expression or function call by ensuring the evaluation result is of the specified type. Also handles specifying generic array types. */
function finishEvaluation(value:VariableValue, from:VariableType, to:VariableType | undefined):TypedValue {
	if(to && to instanceof ArrayVariableType && (!to.lengthInformation || !to.elementType)){
		if(from instanceof ArrayVariableType && (!from.lengthInformation || !from.elementType)){
			//from is a varlength array, to is also a varlength array
			crash(`Attempting to finish evaluation of an array without length, passing it to another array without length`);
		} else {
			//from has a length, so just keep its length
			return typedValue(from, coerceValue(value, from, to)); //don't have a varlength array as the output type
		}
	}	else if(to) return typedValue(to, coerceValue(value, from, to));
	else return typedValue(from, value);
}

/** Handles all the state necessary to run a parsed program. */
export class Runtime {
	/**
	 * Stores the current list of scopes.
	 * If this is manually modified, Runtime.variableCache needs to be handled.
	 **/
	scopes: VariableScope[] = [];
	/** Stores all declared functions. Functions definitions are global. */
	functions: Record<string, FunctionData> = Object.create(null);
	/**
	 * Stores opened files.
	 * Once a file is closed, the property value is set to `undefined`.
	 * After program execution is complete, the properties are deleted,
	 * and a check is made to ensure that all files have been closed.
	 */
	openFiles: Record<string, OpenedFile | undefined> = Object.create(null);
	/** While a class method is executing, this variable is set to data about the class method. */
	classData: {
		/**
		 * This is the class type that the method is linked to, NOT the class type of the instance.
		 * Used to determine what SUPER is.
		 */
		clazz:ClassVariableType;
		instance:VariableTypeMapping<ClassVariableType>;
		method:ClassMethodData;
	} | null = null;
	/** While a type is being resolved, this variable is set to the name of the type. */
	currentlyResolvingTypeName: string | null = null;
	/** While a pointer type is being resolved, this variable is set to the name of the type. */
	currentlyResolvingPointerTypeName: string | null = null;
	builtinFunctions = getBuiltinFunctions();
	/** Stores the total number of statements executed. Used for the statement limits check. */
	statementsExecuted = 0;
	constructor(
		/**
		 * Note: this method is synchronous for performance reasons.
		 * If it was asynchronous, basically every runtime function would need to be asynchronous,
		 * which has an unacceptable performance overhead.
		 */
		public _input: (message:string, type:VariableType) => string, //TODO change signature
		/**
		 * Note: this method is synchronous for performance reasons.
		 * If it was asynchronous, basically every runtime function would need to be asynchronous,
		 * which has an unacceptable performance overhead.
		 */
		public _output: (values:TypedValue[]) => void,
		/**
		 * Uses dependency injection.
		 * Defaults to a browser file system, but can also be set to a nodejs runtime.
		 * Writes are buffered: the file system's update method is only called when closing a file,
		 * so blocking the thread on writing a file is fine.
		 */
		public fs:FileSystem = new LocalFileSystem(false),
	){}
	/** Processes an array access expression, optionally specifying the type. */
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType?:VariableType):TypedValue;
	/** Processes an array access expression, evaluating it as a variable. */
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType:"variable"):VariableData;
	/** Loose overload */
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType?:VariableType | "variable"):TypedValue | VariableData;
	@errorBoundary()
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType?:VariableType | "variable"):TypedValue | VariableData | void {

		//Make sure the variable exists and is an array
		const _target = this.evaluateExpr(expr.target, "variable");
		if(!(_target.type instanceof ArrayVariableType))
			fail({
				summary: f.quoteRange`Variable ${expr.target} is not an array`,
				elaboration: f.quote`Indexing notation can only be used on arrays, but the variable is of type ${_target.type}`
			}, expr.target);
		const target = _target as VariableData<ArrayVariableType, never>;
		const targetType = target.type;
		if(!targetType.lengthInformation) crash(`Cannot access elements in an array of unknown length`);
		if(!targetType.elementType) crash(`Cannot access elements in an array of unknown type`);

		//TODO is there any way of getting a 1D array out of a 2D array?
		//Forbids getting any arrays from arrays
		if(outType instanceof ArrayVariableType)
			fail({
				summary: `Type mismatch`,
				elaboration: [
					f.quote`Expected this expression to have type ${outType},`,
					f.quote`but this array access produces a result of type ${targetType.elementType}`
				]
			}, expr.target);


		if(expr.indices.length != targetType.lengthInformation.length)
			fail({
				summary: `Incorrect number of indices`,
				elaboration: [
					f.range`"${expr.target}" is a ${targetType.lengthInformation.length}-dimensional array,`,
					`so it needs ${targetType.lengthInformation.length} indices, not ${expr.indices.length}`
				],
			}, expr.indices);
		const indexes:[ExpressionASTNode, number][] = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER).value]);
		let invalidIndexIndex;
		if(
			(invalidIndexIndex = indexes.findIndex(([_expr, value], index) =>
				value > targetType.lengthInformation![index][1] ||
				value < targetType.lengthInformation![index][0])
			) != -1
		){
			const invalidIndex = indexes[invalidIndexIndex];
			fail({
				summary: `Array index out of bounds`,
				elaboration: [
					`the array's length is ${targetType.lengthInformation[invalidIndexIndex].join(" to ")}`,
					(invalidIndex[0] instanceof Token && invalidIndex[0].type === "number.decimal")
						? f.quote`value ${invalidIndex[1]} is not in range`
						: f.quoteRange`${invalidIndex[0]} evaluated to ${invalidIndex[1]}, which is not in range`
				]
			}, invalidIndex[0]);
		}
		const index = indexes.reduce((acc, [_expr, value], index) =>
			(acc + value - targetType.lengthInformation![index][0]) * (index == indexes.length - 1 ? 1 : targetType.arraySizes![index + 1]),
		0);
		if(index >= target.value.length) crash(`Array index bounds check failed: ${indexes.map(v => v[1]).join(", ")}; ${index} > ${target.value.length}`);
		if(outType == "variable"){
			return {
				type: targetType.elementType,
				name: `${target.name}[${indexes.map(([, value], i) => value).join(", ")}]`,
				declaration: target.declaration,
				mutable: true,
				get value(){ return target.value[index]; },
				set value(val){ target.value[index] = val; }
			};
		}
		const output = target.value[index];
		if(output == null) fail({
			summary: f.text`Variable "${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]" has not been initialized`,
			elaboration: `Variables cannot be accessed unless they have been initialized first`,
			help: {
				config: configs.initialization.arrays_default,
				value: true,
				message: "to automatically initialize all slots of arrays"
			}
		}, expr.indices);
		return finishEvaluation(output, targetType.elementType, outType);
	}
	/* Processes a property access expression, optionally specifying type */
	processRecordAccess(expr:ExpressionASTBranchNode, outType?:VariableType):TypedValue;
	/* Processes a property access expression, evaluating it as a variable (so it can be written to) */
	processRecordAccess(expr:ExpressionASTBranchNode, outType:"variable"):VariableData | ConstantData;
	/* Processes a property access expression, evaluating it as a function */
	processRecordAccess(expr:ExpressionASTBranchNode, outType:"function"):ClassMethodCallInformation;
	/* loose overload */
	processRecordAccess(expr:ExpressionASTBranchNode, outType?:VariableType | "variable" | "function"):TypedValue | VariableData | ConstantData | ClassMethodCallInformation;
	@errorBoundary()
	processRecordAccess(expr:ExpressionASTBranchNode, outType?:VariableType | "variable" | "function"):TypedValue | VariableData | ConstantData | ClassMethodCallInformation {
		//this code is dubious
		//note to self:
		//do not use typescript overloads like this
		//the extra code DRYness is not worth it
		if(!(expr.nodes[1] instanceof Token)) crash(`Second node in record access expression was not a token`);
		const property = expr.nodes[1].text;

		//Special case: super method call
		if(expr.nodes[0] instanceof Token && expr.nodes[0].type == "keyword.super"){
			if(!this.classData) fail(`Keyword "SUPER" is only allowed in classes`, expr.nodes[0]);
			const baseType = this.classData.clazz.baseClass ?? fail({
				summary: f.quote`SUPER does not exist for class ${this.classData.clazz.fmtPlain()}`,
				elaboration: [
					`"SUPER" is a keyword that refers to the base class, which is the other class that this class inherits from`,
					`but the class "${this.classData.clazz.fmtShort()}" does not inherit from any other class`
				]
			}, expr.nodes[0]);
			if(!(outType == "function")) fail({
				summary: "Type mismatch",
				elaboration: [
					`Expected this expression to evaluate to a value,`,
					`but it is a member access on SUPER, which can only return methods`
				]
			}, expr);
			const [clazz, method] = baseType.allMethods[property] ?? fail(f.quote`Method ${property} does not exist on SUPER (class ${baseType.fmtPlain()})`, expr.nodes[1]);
			return {
				clazz, method, instance: this.classData.instance
			} satisfies ClassMethodCallInformation;
		}

		let target:VariableData | ConstantData | undefined = undefined;
		let targetType:VariableType;
		let targetValue:VariableValue | null;
		if(outType == "variable"){
			target = this.evaluateExpr(expr.nodes[0], "variable");
			({ type:targetType, value:targetValue } = target);
		} else {
			({ type:targetType, value:targetValue } = this.evaluateExpr(expr.nodes[0]));
		}
		if(targetType instanceof RecordVariableType){
			if(targetValue == null) fail(f.quote`Variable ${expr.nodes[0]} has not been initialized`, expr.nodes[0]);
			forceType<VariableTypeMapping<RecordVariableType>>(targetValue);
			const outputType = targetType.fields[property]?.[0] ?? fail(f.quote`Property ${property} does not exist on type ${targetType}`, expr.nodes[1]);
			if(outType == "variable"){
				//i see nothing wrong with this bodged variable data
				return {
					type: outputType,
					name: `(record).${property}`,
					declaration: (target! satisfies VariableData | ConstantData).declaration as never,
					mutable: true, //Even if the record is immutable, the property is mutable
					get value(){ return targetValue[property]; },
					set value(val){ targetValue[property] = val; }
				} satisfies (VariableData | ConstantData);
			}	else if(outType == "function"){
				fail(f.quote`Expected this expression to evaluate to a function, but found a property access on a variable of type ${targetType}, which cannot have functions as properties`, expr);
			} else {
				const value = targetValue[property];
				if(value === null) fail(f.text`Variable "${expr.nodes[0]}.${property}" has not been initialized`, expr.nodes[1]);
				return finishEvaluation(value, outputType, outType);
			}
		} else if(targetType instanceof ClassVariableType){
			const classInstance = targetValue as VariableTypeMapping<ClassVariableType> | null;
			if(classInstance == null) fail(f.quote`Variable ${expr.nodes[0]} has not been initialized`, expr.nodes[0]);
			const instanceType = classInstance.type; //Use the instance's type (Dog, not the variable type Animal) only when searching for methods
			if(outType == "function"){
				const [clazz, method] = targetType.allMethods[property]
					? (instanceType.allMethods[property] ?? crash(`Inherited method not present`)) //If the method is present on the variable type, use the instance's type to get the method implementation
					: instanceType.allMethods[property] //Method not present on the variable type
						//If it doesn't exist on the variable type but does exist on the instance type,
						//long error message
						? fail({
							summary: f.quote`Method ${property} does not exist on type ${targetType}`,
							elaboration: [
								f.quoteRange`The data in the variable ${expr.nodes[0]} is of type ${instanceType.fmtPlain()}, which has the method,`,
								f.quote`but the type of the variable is ${targetType.fmtPlain()}.`
							],
							help: f.quote`change the type of the variable to ${instanceType.fmtPlain()}`,
						}, expr.nodes[1])
						: fail(f.quote`Method ${property} does not exist on type ${targetType}`, expr.nodes[1]);
				if(method.controlStatements[0].accessModifier == "private" && !this.canAccessClass(targetType))
					fail(f.quote`Method ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
				return { method, instance: classInstance, clazz };
			} else {
				//Use the variable type, properties cannot be overriden
				const propertyStatement = targetType.properties[property]?.[1] ?? (
					instanceType.properties[property]
						? fail({
							summary: f.quote`Property ${property} does not exist on type ${targetType}`,
							elaboration: [
								f.quoteRange`The data in the variable ${expr.nodes[0]} is of type ${instanceType.fmtPlain()}, which has the property,`,
								f.quote`but the type of the variable is ${targetType.fmtPlain()}.`
							],
							help: f.quote`change the type of the variable to ${instanceType.fmtPlain()}`,
						}, expr.nodes[1])
						: fail(f.quote`Property ${property} does not exist on type ${targetType}`, expr.nodes[1])
				);
				if(propertyStatement.accessModifier == "private" && !this.canAccessClass(targetType)) fail(f.quote`Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
				if(outType == "variable"){
					const assignabilityType = targetType.properties[property][0];
					return {
						get type(){ return targetType.getPropertyType(property, classInstance); },
						name: `${target ? target.name : `(instance of ${targetType.name})`}.${property}`,
						assignabilityType,
						updateType: assignabilityType instanceof ArrayVariableType && !assignabilityType.lengthInformation ? (type) => {
							classInstance.propertyTypes[property] = type;
						} : undefined,
						declaration: targetType.properties[property][1] as never,
						mutable: true, //Even if the class instance variable is immutable, the property is mutable
						get value(){ return classInstance.properties[property]; },
						set value(val){
							classInstance.properties[property] = val;
						}
					} satisfies (VariableData | ConstantData);
				}	else {
					const outputType = targetType.getPropertyType(property, classInstance);
					const value = classInstance.properties[property];
					if(value === null) fail(f.text`Variable "${expr.nodes[0]}.${property}" has not been initialized`, expr.nodes[1]);
					return finishEvaluation(value, outputType, outType);
				}
			}
		} else fail(f.quote`Cannot access property ${property} on variable of type ${targetType} because it is not a record or class type and cannot have proprties`, expr.nodes[0]);
	}
	assignExpr(target:ExpressionAST, src:UntypedNodeValue){
		const variable = this.evaluateExpr(target, "variable");
		if(!variable.mutable){
			if(variable.declaration == "enum") fail(f.quote`Cannot assign to enum value ${target}`, target);
			fail(f.quote`Cannot assign to constant ${target}`, target);
		}
		const {type, value} = this.evaluateUntyped(src, variable.assignabilityType ?? variable.type);
		variable.value = value;
		variable.updateType?.(type);
	}
	/** Evaluates an expression. */
	evaluateExpr(expr:ExpressionAST):TypedValue;
	evaluateExpr(expr:ExpressionAST, undefined:undefined, recursive:boolean):TypedValue;
	/** Evaluates an expression, expecting it to be a (writable) variable. */
	evaluateExpr(expr:ExpressionAST, type:"variable", recursive?:boolean):VariableData | ConstantData;
	/** Evaluates an expression, expecting it to be a function. */
	evaluateExpr(expr:ExpressionAST, type:"function", recursive?:boolean):FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
	/** Evaluates an expression, expecting it to be of a specified type. */
	evaluateExpr<T extends VariableType | undefined>(expr:ExpressionAST, type:T, recursive?:boolean):TypedValue<T extends undefined ? VariableType : T & {}>
	/** Evaluates an expression, loose overload */
	evaluateExpr<T extends VariableType | undefined | "variable">(expr:ExpressionAST, type:T, recursive?:boolean):VariableData | ConstantData | TypedValue<T extends (undefined | "variable") ? VariableType : T & {}>
	@errorBoundary({
		predicate: (_expr, _type, recursive) => !recursive,
		message: () => `Cannot evaluate expression "$rc": `
	})
	/** Main expression evaluation function. Uses recursion to evaluate the expression AST. */
	evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable" | "function", recursive = false):TypedValue | VariableData | ConstantData | FunctionData | BuiltinFunctionData | ClassMethodCallInformation {
		if(expr == undefined) crash(`expr was ${expr as null | undefined}`);

		if(expr instanceof Token)
			return this.evaluateExprLeaf(expr, type as never);

		//Branch node

		//Special cases where the operator isn't a normal operator
		if(expr instanceof ExpressionASTArrayAccessNode){
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found an array access, which cannot return a function.`, expr);
			return this.processArrayAccess(expr, type);
		}
		if(expr instanceof ExpressionASTFunctionCallNode){
			if(type == "variable") fail(`Expected this expression to evaluate to a variable, but found a function call, which cannot return a variable.`, expr);
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found a function call, which cannot return a function.`, expr);
			const func = this.evaluateExpr(expr.functionName, "function");
			if("clazz" in func){
				if(func.method.type == "class_procedure") fail(f.quote`Expected this expression to return a value, but the function ${expr.functionName} is a procedure which does not return a value`, expr.functionName);
				//Class method
				const output = this.callClassMethod(func.method, func.clazz, func.instance, expr.args, true);
				return finishEvaluation(output.value, output.type, type);
			} else if("name" in func){
				const output = this.callBuiltinFunction(func, expr.args, { value: true });
				return finishEvaluation(output.value, output.type, type);
			} else {
				if(func.type == "procedure") fail(f.quote`Procedure ${expr.functionName} does not return a value.`, expr.functionName);
				const statement = func.controlStatements[0];
				const output = this.callFunction(func, expr.args, true);
				return finishEvaluation(output.value, output.type, type);
			}
		}
		if(expr instanceof ExpressionASTClassInstantiationNode){
			if(type == "variable" || type == "function") fail(`Expected this expression to evaluate to a ${type}, but found a class instantiation expression, which can only return a class instance, not a ${type}.`, expr);
			const clazz = this.getClass(expr.className.text, expr.className.range, expr) as ClassVariableType<true>;
			const output = clazz.construct(this, expr.args);
			return finishEvaluation(output, clazz, type);
		}

		//TODO refactor the below code: probably contains a soundness hole and has many duplicated error messages

		//Operator that returns a result of unknown type
		if(expr.operator.category == "special"){
			switch(expr.operator){
				case operators.access:
					return this.processRecordAccess(expr, type);
				case operators.pointer_reference: {
					if(type == "variable" || type == "function") fail(`Expected this expression to evaluate to a ${type}, but found a referencing expression, which returns a pointer`, expr);
					if(type && !(type instanceof PointerVariableType)) fail(f.quote`Expected result to be of type ${type}, but the reference operator will return a pointer`, expr);
					const [variable, err] = tryRun(() => this.evaluateExpr(expr.nodes[0], "variable", true));
					if(err){
						//If the thing we're referencing couldn't be evaluated to a variable
						//create a fake variable
						const target = this.evaluateExpr(expr.nodes[0], type?.target, true);
						//Guess the type
						if(!configs.pointers.implicit_variable_creation.value)
							rethrow(err, m =>
								typeof m == "string" ? `\n${configs.pointers.implicit_variable_creation.errorHelp}` :
								{
									...m,
									help: m.help ?? enableConfig(configs.pointers.implicit_variable_creation)
								}
							);
						if(
							target.type instanceof ArrayVariableType && target.type.lengthInformation && target.type.elementType &&
							type && type.target instanceof ArrayVariableType && type.target.elementType && !type.target.lengthInformation &&
							typesEqual(target.type.elementType, type.target.elementType)
						){
							//This is code like the following:
							//DECLARE ptr: ^ARRAY OF INTEGER
							//ptr <- ^functionReturningVarlengthArray()
							//If ptr gets assigned to later, the type needs to be updated
							let dynVarType = target.type;
							return typedValue(type, {
								get type(){ return dynVarType; },
								assignabilityType: type.target, //Arrays of other lengths can be assigned here
								updateType(type){
									if(type instanceof ArrayVariableType) dynVarType = type;
								},
								name: `(dynamic variable)`,
								declaration: "dynamic",
								mutable: true,
								value: target.value
							});
						}
						const pointerType = this.getPointerTypeFor(target.type) ?? fail(f.quote`Cannot find a pointer type for ${target.type}`, expr.operatorToken, expr);
						return finishEvaluation({
							type: target.type,
							name: `(dynamic variable)`,
							declaration: "dynamic",
							mutable: true,
							value: target.value
						}, pointerType, type);
					}
					const pointerType = this.getPointerTypeFor((variable as VariableData).assignabilityType ?? variable.type) ?? fail(f.quote`Cannot find a pointer type for ${variable.type}`, expr.operatorToken, expr);
					return finishEvaluation(variable, pointerType, type);
				}
				case operators.pointer_dereference: {
					if(type == "function") fail({
						summary: "Type mismatch",
						elaboration: [
							`Expected this expression to evaluate to a function`,
							`this is a dereferencing expression, which cannot return a function`
						]
					}, expr);
					const pointerVariable = this.evaluateExpr(expr.nodes[0], undefined, true);
					if(pointerVariable.value == null) fail(`Cannot dereference uninitialized pointer`, expr.nodes[0]);
					if(!(pointerVariable.typeIs(PointerVariableType))) fail(f.quote`Cannot dereference value of type ${pointerVariable.type} because it is not a pointer`, expr.nodes[0]);
					if(type == "variable"){
						if(!pointerVariable.value.mutable) fail(`Cannot assign to constant`, expr);
						return pointerVariable.value;
					} else {
						if(pointerVariable.value.value == null) fail({
							summary: f.quoteRange`Cannot dereference ${expr.nodes[0]} and use the value`,
							elaboration: [f.quoteRange`${expr.nodes[0]} points to ${pointerVariable.value.name}, which has not been initialized`],
						}, expr.nodes[0]);
						return finishEvaluation(pointerVariable.value.value, pointerVariable.value.type, type);
					}
				}
				default: impossible();
			}
		}

		if(type == "variable" || type == "function") fail(`Cannot evaluate this expression as a ${type}`, expr);

		//arithmetic
		if(type?.is("REAL", "INTEGER") || expr.operator.category == "arithmetic"){
			if(type && !(type.is("REAL", "INTEGER") || type instanceof EnumeratedVariableType))
				fail(f.quote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`, expr);

			let guessedType = (type as PrimitiveVariableType<"REAL" | "INTEGER">) ?? PrimitiveVariableType.REAL; //Use this type to evaluate the expression
			let value:number;
			//if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
			if(expr.operator.fix == "unary_prefix"){
				const operand = this.evaluateExpr(expr.nodes[0], guessedType, true);
				switch(expr.operator){
					case operators.negate:
						return TypedValue.INTEGER(-operand.value);
					default: crash("impossible");
				}
			}
			let left, right;
			if(expr.operator == operators.add || expr.operator == operators.subtract){
				left = this.evaluateExpr(expr.nodes[0], undefined, true);
				right = this.evaluateExpr(expr.nodes[1], undefined, true);
			} else {
				left = this.evaluateExpr(expr.nodes[0], guessedType, true);
				right = this.evaluateExpr(expr.nodes[1], guessedType, true);
			}

			if(left.typeIs(EnumeratedVariableType)){
				if(type && !(type instanceof EnumeratedVariableType)) fail(f.quote`expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
				const other = coerceValue(right.value, right.type, PrimitiveVariableType.INTEGER);
				const value = left.type.values.indexOf(left.value);
				if(value == -1) crash(`enum fail`);
				if(expr.operator == operators.add){
					return finishEvaluation(left.type.values[value + other] ?? fail(f.text`Cannot add ${other} to enum value "${left.value}": no corresponding value in ${left.type}`, expr), left.type, type);
				} else if(expr.operator == operators.subtract){
					return finishEvaluation(left.type.values[value - other] ?? fail(f.text`Cannot subtract ${other} from enum value "${left.value}": no corresponding value in ${left.type}`, expr), left.type, type);
				} else fail(f.quote`Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[0]);
			} else if(right.typeIs(EnumeratedVariableType)){
				if(type && !(type instanceof EnumeratedVariableType)) fail(f.quote`expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
				const other = coerceValue(left.value, left.type, PrimitiveVariableType.INTEGER);
				const value = right.type.values.indexOf(right.value);
				if(value == -1) crash(`enum fail`);
				if(expr.operator == operators.add){
					return finishEvaluation(right.type.values[value + other] ?? fail(f.quote`Cannot add ${other} to ${value}: no corresponding value in ${right.type}`, expr), right.type, type);
				} else if(expr.operator == operators.subtract){
					fail(`Cannot subtract an enum value from a number`, expr);
				} else fail(f.quote`Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[1]);
			} else {
				left = coerceValue(left.value, left.type, guessedType, expr.nodes[0]);
				right = coerceValue(right.value, right.type, guessedType, expr.nodes[1]);
			}
			if(expr.operator == operators.divide || expr.operator == operators.integer_divide || expr.operator == operators.mod){
				if(right == 0) fail({
					summary: `Division by zero`,
					elaboration: expr.nodes[1] instanceof Token ? undefined : [f.quoteRange`The expression ${expr.nodes[1]} evaluated to 0`]
				}, expr.nodes[1], expr);
			}

			switch(expr.operator){
				case operators.add:
					value = left + right;
					break;
				case operators.subtract:
					value = left - right;
					break;
				case operators.multiply:
					value = left * right;
					break;
				case operators.divide:
					value = left / right;
					break;
				case operators.integer_divide:
					value = Math.trunc(left / right);
					if(!type) guessedType = PrimitiveVariableType.INTEGER;
					break;
				case operators.mod:
					value = left % right;
					break;
				default:
					fail(f.quote`Expected this expression to evaluate to a value of type ${type ?? impossible()}, but the operator ${expr.operator} produces a result of another type`, expr);
			}
			return typedValue(guessedType, value);
		}

		//logical
		if(type?.is("BOOLEAN") || expr.operator.category == "logical"){
			if(type && !type.is("BOOLEAN"))
				fail(f.quote`Expected this expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`, expr);

			if(expr.operator.fix == "unary_prefix"){
				const operand = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true);
				switch(expr.operator){
					case operators.not: {
						return TypedValue.BOOLEAN(!operand.value);
					}
					default: crash("impossible");
				}
			}
			switch(expr.operator){
				case operators.equal_to: case operators.not_equal_to: {
					//Type is unknown
					const left = this.evaluateExpr(expr.nodes[0], undefined, true);
					const right = this.evaluateExpr(expr.nodes[1], undefined, true);
					const typesMatch = checkTypeMatch(left.type, right.type, expr.operatorToken.range);
					const is_equal = typesMatch && checkValueEquality(
						left.type,
						left.value, right.value,
						expr.nodes[0].fmtText(), expr.nodes[1].fmtText(),
						expr.operatorToken.range
					);
					return TypedValue.BOOLEAN((() => {
						switch(expr.operator){
							case operators.equal_to: return is_equal;
							case operators.not_equal_to: return !is_equal;
						}
					})()!);
				}
				case operators.and: case operators.or: {
					const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true).value;
					const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true).value;
					return TypedValue.BOOLEAN((() => {
						switch(expr.operator){
							case operators.and: return left && right;
							case operators.or: return left || right;
						}
					})()!);
				}
				case operators.greater_than:
				case operators.greater_than_equal:
				case operators.less_than:
				case operators.less_than_equal: {
					const left = this.evaluateExpr(expr.nodes[0], undefined, true);
					if(!(
						left.typeIs("INTEGER", "REAL", "CHAR", "DATE") || left.typeIs(EnumeratedVariableType)
					)) fail({
						summary: f.range`Expression ${expr.nodes[0]} has an invalid type`,
						elaboration: [
							f.quoteRange`Expected this expression to evaluate to a value of type INTEGER, REAL, CHAR, DATE, or (enumerated variable type), but it has type ${left.type.fmtText()}`
						],
						help: left.typeIs("STRING") && left.value.length == 1 ? 
							expr.nodes[0] instanceof Token && expr.nodes[0].type == "string" ? [
								`use a CHAR literal by replacing the double quotes with single quotes`
							] : [
								//Because left was evaluated with undefined as the variable type, coercion to char is not attempted
								`explicitly convert this expression to a CHAR by using a temp variable`
							] : undefined
					}, expr.nodes[0]);
					const leftValue = computeOrdering(left);
					const right = this.evaluateExpr(expr.nodes[1], left.type, true);
					const rightValue = computeOrdering(right);

					return TypedValue.BOOLEAN((() => {
						switch(expr.operator){
							case operators.greater_than: return leftValue > rightValue;
							case operators.greater_than_equal: return leftValue >= rightValue;
							case operators.less_than: return leftValue < rightValue;
							case operators.less_than_equal: return leftValue <= rightValue;
						}
					})()!);
				}
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`, expr);
			}
		}

		//string
		if(type?.is("STRING") || expr.operator.category == "string"){
			if(type && !type.is("STRING"))
				fail(f.quote`Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`, expr);

			const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.STRING, true).value;
			const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.STRING, true).value;
			switch(expr.operator){
				case operators.string_concatenate:
					return TypedValue.STRING(left + right);
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`, expr);
			}
		}

		unreachable(expr.operator.category, JSON.stringify(expr.operator));
	}
	/** Evaluates an expression leaf node. */
	evaluateExprLeaf(node:ExpressionASTLeafNode):TypedValue;
	/** Evaluates an expression leaf node, expecting it to be a (writable) variable. */
	evaluateExprLeaf(node:ExpressionASTLeafNode, type:"variable"):VariableData | ConstantData;
	/** Evaluates an expression leaf node, expecting it to be a function. */
	evaluateExprLeaf(node:ExpressionASTLeafNode, type:"function"):FunctionData | BuiltinFunctionData;
	/** Evaluates an expression leaf node, expecting it to be of a specific type. */
	evaluateExprLeaf<T extends VariableType | undefined>(node:ExpressionASTLeafNode, type:T):TypedValue<T extends undefined ? VariableType : T & {}>
	evaluateExprLeaf(node:ExpressionASTLeafNode, type?:VariableType | "variable" | "function"):TypedValue | VariableData | ConstantData | FunctionData | BuiltinFunctionData | ClassMethodCallInformation {
		if(node.type == "name"){
			if(type == "function") return this.getFunction(node);

			if(type == "variable"){
				const variable = this.getVariable(node.text);
				if(variable) return variable;
				this.handleNonexistentVariable(node.text, node.range);
			} else {
				const variable = this.getVariable(node.text) ?? this.handleNonexistentVariable(node.text, node.range);
				if(variable.value == null) fail(f.quote`Variable ${node.text} has not been initialized`, node);
				return finishEvaluation(variable.value, variable.type, type);
			}
		}
		if(type == "variable" || type == "function") fail(f.quote`Cannot evaluate token ${node.text} as a ${type}`, node);
		switch(node.type){
			case "boolean.false":
				return finishEvaluation(false, PrimitiveVariableType.BOOLEAN, type);
			case "boolean.true":
				return finishEvaluation(true, PrimitiveVariableType.BOOLEAN, type);
			case "number.decimal": {
				const val = Number(node.text);
				if(Number.isNaN(val)) crash(`number was nan`);
				if(!Number.isFinite(val))
					fail(f.quote`Value ${node} cannot be converted to a number: too large`, node);
				if(type?.is("INTEGER")){
					if(!Number.isInteger(val))
						fail(f.quote`Value ${node} cannot be converted to an integer`, node);
					if(!Number.isSafeInteger(val))
						fail(f.quote`Value ${node} cannot be converted to an integer: too large`, node);
					return TypedValue.INTEGER(val);
				}
				return finishEvaluation(val, PrimitiveVariableType.REAL, type);
			}
			case "string":
				if(type?.is("CHAR")) fail({
					summary: `Cannot coerce a STRING literal to type CHAR`,
					help: `use a CHAR literal instead, by replacing the double quotes with single quotes`
				}, node);
				return finishEvaluation(node.text.slice(1, -1), PrimitiveVariableType.STRING, type); //remove the quotes
			case "char":
				return finishEvaluation(node.text.slice(1, -1), PrimitiveVariableType.CHAR, type); //remove the quotes
			default: fail(f.quote`Cannot evaluate token ${node}`, node);
		}
	}
	/** Special value used to catch errors caused by needing to access the value of "this" */
	static NotStatic = Symbol("not static");
	/**
	 * Evaluates a token statically.
	 * Fails if the evaluation needs access to data stored in a Runtime,
	 * for example, if it needs to read the value of a variable, or call a function.
	 */
	static evaluateExprLeaf(node:ExpressionASTLeafNode):TypedValue | null;
	/**
	 * Evaluates a token statically.
	 * Fails if the evaluation needs access to data stored in a Runtime,
	 * for example, if it needs to read the value of a variable, or call a function.
	 */
	static evaluateExprLeaf<T extends VariableType | undefined>(node:ExpressionASTLeafNode, type:T):TypedValue<T extends undefined ? VariableType : T & {}> | null;
	static evaluateExprLeaf(node:ExpressionASTLeafNode, type?:VariableType):TypedValue | null {
		//major shenanigans
		try {
			return this.prototype.evaluateExprLeaf.call(new Proxy({}, {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				get(){ throw Runtime.NotStatic; },
			}), node, type);
		} catch(err){
			if(err === Runtime.NotStatic) return null;
			else throw err;
		}
	}
	/**
	 * Evaluates an expression statically.
	 * Fails if the evaluation needs access to data stored in a Runtime,
	 * for example, if it needs to read the value of a variable, or call a function.
	 */
	static evaluateExpr(expr:ExpressionAST):TypedValue | null;
	/**
	 * Evaluates an expression statically.
	 * Fails if the evaluation needs access to data stored in a Runtime,
	 * for example, if it needs to read the value of a variable, or call a function.
	 */
	static evaluateExpr<T extends VariableType>(expr:ExpressionAST, type:T):TypedValue<T> | null;
	/**
	 * Evaluates an expression statically.
	 * Fails if the evaluation needs access to data stored in a Runtime,
	 * for example, if it needs to read the value of a variable, or call a function.
	 */
	static evaluateExpr<T extends VariableType | undefined>(expr:ExpressionAST, type:T):TypedValue<T extends undefined ? VariableType : T & {}> | null;
	/**
	 * Evaluates an expression statically.
	 * Fails if the evaluation needs access to data stored in a Runtime,
	 * for example, if it needs to read the value of a variable, or call a function.
	 */
	static evaluateExpr<T extends VariableType | undefined | "variable">(expr:ExpressionAST, type:T, recursive?:boolean):VariableData | ConstantData | TypedValue<T extends (undefined | "variable") ? VariableType : T & {}>
	static evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable"):VariableData | ConstantData | TypedValue | null {
		try {
			return this.prototype.evaluateExpr.call(Object.setPrototypeOf(
				shallowCloneOwnProperties(Runtime.prototype),
				new Proxy({}, {
					// eslint-disable-next-line @typescript-eslint/only-throw-error
					get(){ throw Runtime.NotStatic; },
				})
			), expr, type);
		} catch(err){
			if(err === Runtime.NotStatic) return null;
			else throw err;
		}
	}
	/** Helper function to evaluate a {@link TypedNodeValue} */
	evaluate<
		T extends ExpressionASTNode,
		InputType extends PrimitiveVariableTypeName | VariableType,
		Type extends VariableType
	>(value:TypedNodeValue<T, InputType, Type>):VariableTypeMapping<Type> {
		return value.value ?? (this.evaluateExpr(value.node, value.type) as TypedValue_<Type>).value;
	}
	/** Helper function to evaluate an {@link UntypedNodeValue} */
	evaluateUntyped(expr:UntypedNodeValue):TypedValue;
	/** Helper function to evaluate an {@link UntypedNodeValue}, with a known type. */
	evaluateUntyped<Type extends VariableType>(expr:UntypedNodeValue, type:Type):TypedValue<Type>;
	evaluateUntyped(value:UntypedNodeValue, type?:VariableType){
		if(value.value != null && type && !typesEqual(value.value.type, type)){
			//Types are not equal, evaluate it again
			const result = this.evaluateExpr(value.node, type);
			//Update the cached value
			value.value = result;
			return result;
			//this is useful when `5` gets evaluated as REAL, then assigned to an INTEGER
			//this code will change the cached value to INTEGER, improving performance
		}
		return value.value ?? this.evaluateExpr(value.node, type);
	}
	/** Resolves an {@link UnresolvedVariableType} using the currently known types. */
	resolveVariableType(type:UnresolvedVariableType):VariableType {
		if(type instanceof PrimitiveVariableType) return type;
		else if(type instanceof IntegerRangeVariableType) return type;
		else if(type instanceof ArrayVariableType){
			if(!type.initialized) type.init(this);
			return type as never as ArrayVariableType<true>;
		} else return this.getType(type[1]) ?? this.handleNonexistentType(type[1], type[2]);
	}
	/** Called when a class doesn't exist; used to check for capitalization and typos. */
	handleNonexistentClass(name:string, range:TextRangeLike, gRange:TextRangeLike):never {
		const allClasses:(readonly [string, ClassVariableType])[] =
			[...this.activeScopes()].flatMap(s =>
				Object.entries(s.types)
					.filter((x):x is [string, ClassVariableType] => x[1] instanceof ClassVariableType)
			);

		if(this.currentlyResolvingTypeName == name)
			fail(f.quote`Class ${name} does not exist yet, it is currently being initialized`, range, gRange);
		let found;
		if((found =
			min(allClasses, t => biasedLevenshtein(t[0], name) ?? Infinity, 2.5)
		) != undefined){
			fail({
				summary: f.quote`Class ${name} does not exist`,
				help: f.quote`did you mean ${found[1]}?`
			}, range, gRange);
		}
		fail(f.quote`Class ${name} does not exist`, range, gRange);
	}
	/** Called when a type doesn't exist; used to check for capitalization and typos. */
	handleNonexistentType(name:string, range:TextRangeLike):never {
		const allTypes:(readonly [string, VariableType])[] = [
			...[...this.activeScopes()].flatMap(s => Object.entries(s.types)),
			...PrimitiveVariableType.all.map(t => [t.name, t] as const)
		];
		if(PrimitiveVariableType.get(name.toUpperCase()))
			fail({
				summary: f.quote`Type ${name} does not exist`,
				help: f.quote`did you mean ${name.toUpperCase()}? (uppercase)`
			}, range);
		if(this.currentlyResolvingTypeName == name)
			fail(f.quote`Type ${name} does not exist yet, it is currently being initialized`, range);
		let found;
		if((found =
			min(allTypes, t => t[0] == this.currentlyResolvingPointerTypeName ? Infinity : biasedLevenshtein(t[0], name), 2.5)
		) != undefined){
			fail({
				summary: f.quote`Type ${name} does not exist`,
				help: f.quote`did you mean ${found[1]}?`
			}, range);
		}
		fail(f.quote`Type ${name} does not exist`, range);
	}
	/** Called when a function doesn't exist; used to check for capitalization and typos. */
	handleNonexistentFunction(name:string, range:TextRangeLike):never {
		const allFunctions:(readonly [string, FunctionData | BuiltinFunctionData])[] = [
			...Object.entries(this.functions),
			...Object.entries(this.builtinFunctions as Record<string, BuiltinFunctionData>),
		];
		if(this.builtinFunctions[name.toUpperCase()])
			fail({
				summary: f.quote`Function ${name} does not exist`,
				help: f.quote`did you mean ${name.toUpperCase()}? (uppercase)`
			}, range);
		let found;
		if((found =
			min(allFunctions, t => biasedLevenshtein(t[0], name), 3)
		) != undefined){
			fail({
				summary: f.quote`Function ${name} does not exist`,
				help: f.quote`did you mean ${found[0]}?`
			}, range);
		}
		fail(f.quote`Function ${name} does not exist`, range);
	}
	/** Called when a variable doesn't exist; used to check for capitalization and typos. */
	handleNonexistentVariable(name:string, range:TextRangeLike):never {
		const allVariables:string[] = [
			...[...this.activeScopes()].flatMap(s => Object.keys(s.variables)),
		];
		let found;
		if((found =
			min(allVariables, t => biasedLevenshtein(t, name), 2)
		) != undefined){
			fail({
				summary: f.quote`Variable ${name} does not exist`,
				help: f.quote`did you mean ${found}?`
			}, range);
		}
		fail(f.quote`Variable ${name} does not exist`, range);
	}
	*activeScopes(){
		for(let i = this.scopes.length - 1; i >= 0; i--){
			yield this.scopes[i];
			if(this.scopes[i].opaque && i > 1 && this.scopes[0].statement == "global") i = 1; //skip to the global scope
		}
		return null;
	}
	/** Returned variable may not be initialized */
	getVariable(name:string):VariableData | ConstantData | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const scope = this.scopes[i];
			if(scope.opaque && i > 1 && this.scopes[0].statement == "global") i = 1; //skip to the global scope
			if(scope.variables[name]) return scope.variables[name];
		}
		return null;
	}
	getType(name:string):VariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const scope = this.scopes[i];
			if(scope.opaque && i > 1 && this.scopes[0].statement == "global") i = 1; //skip to the global scope
			if(scope.types[name]) return scope.types[name];
		}
		return null;
	}
	getPointerTypeFor(type:VariableType):PointerVariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const scope = this.scopes[i];
			if(scope.opaque && i > 1 && this.scopes[0].statement == "global") i = 1; //skip to the global scope
			const data = Object.values(scope.types)
				.find((data):data is PointerVariableType => data instanceof PointerVariableType && typesEqual(data.target, type));
			if(data) return data;
		}
		return null;
	}
	/** Returns the current active scope. Used for defining new variables or types. */
	getCurrentScope():VariableScope {
		return this.scopes.at(-1) ?? crash(`No scope?`);
	}
	/** Checks if accessing the private members of a class is allowed based on the current scope chain. */
	canAccessClass(clazz:ClassVariableType):boolean {
		for(const { statement } of this.scopes.slice().reverse()){
			if(statement instanceof ClassStatement)
				return statement == clazz.statement;
			if((
				statement.constructor == FunctionStatement || statement.constructor == ProcedureStatement
			) && !configs.classes.delegate_access_privileges.value ) //if this setting is enabled, skip function scopes
				return false; //closest relevant statement is a function, cant access classes
			//Ignore classmethodstatement because it always has a ClassStatement just above it
		}
		return false;
	}
	defineVariable(name:string, data:VariableData | ConstantData, range:TextRangeLike){
		const currentScope = this.getCurrentScope();
		if(name in currentScope.variables){
			const existingVariable = currentScope.variables[name];
			if(existingVariable.declaration == "enum") fail(f.quote`Identifier ${name} is already in use as a variant of the enum type ${existingVariable.type}`, range);
			else fail(f.quote`Variable ${name} was already defined`, range);
		}
		currentScope.variables[name] = data;
	}
	defineFunction(name:string, data:FunctionData, range:TextRange){
		//TODO scope?
		if(name in this.functions) fail(f.quote`Function or procedure ${name} has already been defined`, range);
		else if(name in this.builtinFunctions) fail(f.quote`Function or procedure ${name} has already been defined as a builtin function`, range);
		this.functions[name] = data;
	}
	getFunction({text, range}:ExpressionASTLeafNode):FunctionData | BuiltinFunctionData | ClassMethodCallInformation {
		if(this.classData && this.classData.clazz.allMethods[text]){
			const [clazz, method] = this.classData.instance.type.allMethods[text]
				?? crash(`Function exists on the variable type, so it must exist on the instance type`);
			return { clazz, method, instance: this.classData.instance };
		} else return this.functions[text] ?? this.builtinFunctions[text] ?? this.handleNonexistentFunction(text, range);
	}
	getClass(name:string, range:TextRangeLike, gRange:TextRangeLike):ClassVariableType<boolean> {
		for(const scope of this.activeScopes()){
			const type = scope.types[name];
			if(type){
				if(type instanceof ClassVariableType) return type;
				else fail(f.quote`Type ${name} is not a class, it is ${scope.types[name]}`, range, gRange);
			}
		}
		this.handleNonexistentClass(name, range, gRange);
	}
	getCurrentFunction():FunctionData | ClassMethodStatement | null {
		const scope = this.scopes.findLast(
			(s):s is VariableScope & { statement: FunctionStatement | ProcedureStatement | ClassFunctionStatement | ClassProcedureStatement } =>
				s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement || s.statement instanceof ClassFunctionStatement || s.statement instanceof ClassProcedureStatement
		);
		if(!scope) return null;
		if(scope.statement instanceof ClassFunctionStatement || scope.statement instanceof ClassProcedureStatement)
			return scope.statement;
		else
			return this.functions[scope.statement.name] ?? crash(`Function ${scope.statement.name} does not exist`);
	}
	/** Makes a copy of a value, so that subsequent mutations will not affect the original. Used for passing arguments BYVAL. */
	cloneValue<T extends VariableType>(type:T, value:VariableTypeMapping<T> | null):VariableTypeMapping<T> | null {
		//Many casts due to TS generic return handling
		if(value == null) return value;
		//JS Primitives
		if(typeof value == "string") return value;
		if(typeof value == "number") return value;
		if(typeof value == "boolean") return value;
		//DATE
		if(value instanceof Date) return new Date(value) as VariableTypeMapping<T>;
		//ARRAY types
		if(Array.isArray(value)) return value.slice().map(v =>
			this.cloneValue((type as ArrayVariableType).elementType ?? crash(`Cannot clone value in an array of unknown type`), v)
		) as VariableTypeMapping<T>;
		if(type instanceof PointerVariableType) return value; //just pass it through, because pointer data doesn't have any mutable sub items (other than the variable itself)
		if(type instanceof RecordVariableType) return Object.fromEntries(Object.entries(value)
			.map(([k, v]) => [k, this.cloneValue(type.fields[k][0], v as VariableValue)])
		) as VariableTypeMapping<RecordVariableType> as VariableTypeMapping<T>;
		if(type instanceof ClassVariableType) return {
			properties: Object.setPrototypeOf(Object.fromEntries(Object.entries((value as VariableTypeMapping<ClassVariableType>).properties)
				.map(([k, v]) => [k, this.cloneValue(type.properties[k][0], v as VariableValue)])),
			null),
			propertyTypes: Object.setPrototypeOf(Object.fromEntries(Object.entries((value as VariableTypeMapping<ClassVariableType>).propertyTypes)), null),
			type: (value as VariableTypeMapping<ClassVariableType>).type
		} satisfies VariableTypeMapping<ClassVariableType> as VariableTypeMapping<ClassVariableType> as VariableTypeMapping<T>;
		crash(f.quote`Cannot clone value of type ${type}`);
	}
	/** Evaluates arguments and assembles the scope required for calling a function or procedure. */
	assembleScope(func:ProcedureStatement | FunctionStatement, args:RangeArray<ExpressionAST>){
		if(func.args.size != args.length) fail({
			summary: f.quote`Incorrect number of arguments for function ${func.name}`,
			elaboration: `Expected ${plural(func.args.size, "argument")}, but received ${plural(args.length, "argument")}`
		}, args);
		const scope:VariableScope = {
			statement: func,
			opaque: !(func instanceof ClassProcedureStatement || func instanceof ClassFunctionStatement),
			variables: Object.create(null),
			types: Object.create(null),
		};
		for(const [i, [name, {type, passMode}]] of [...func.args.entries()].entries()){
			const rType = this.resolveVariableType(type);
			if(passMode == "reference"){
				const varData = this.evaluateExpr(args[i], "variable");
				if(!typesEqual(varData.type, rType)){
					const assignable = typesAssignable(rType, varData.type);
					fail({
						summary: `Type mismatch`,
						elaboration: [
							f.quote`Expected the argument to be of type ${rType}, but it was of type ${varData.type}.`,
							assignable && `Arguments that are passed by reference cannot be coerced to a wider type, because the function might change their value`
						].filter(Boolean),
						help: assignable ? f.short`Assign the value to a temp variable with type "${rType}"` : undefined,
					}, args[i]);
				}
				scope.variables[name] = {
					declaration: func,
					name,
					mutable: true,
					type: rType,
					get value(){ return varData.value ?? fail(`Variable (passed by reference) has not been initialized`, args[i]); },
					set value(value){ varData.value = value; }
				};
			} else {
				const { type, value } = this.evaluateExpr(args[i], rType);
				if(type instanceof ArrayVariableType && !type.lengthInformation) crash(f.quote`evaluateExpr returned an array type of unspecified length at evaluating ${args[i]}`);
				scope.variables[name] = {
					declaration: func,
					name,
					mutable: true,
					type,
					value: this.cloneValue(rType, value)
				};
			}
		}
		return scope;
	}
	callFunction<T extends boolean>(funcNode:FunctionData, args:RangeArray<ExpressionAST>, requireReturnValue?:T):TypedValue | (T extends false ? null : never){
		const func = funcNode.controlStatements[0];
		if(func instanceof ProcedureStatement && requireReturnValue)
			fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);

		const scope = this.assembleScope(func, args);
		const output = this.runBlock(funcNode.nodeGroups[0], false, scope);
		//If there was a return, the return statement has already ensured the type matches the function return type
		if(func instanceof ProcedureStatement){
			//requireReturnValue satisfies false;
			return null as never;
		} else { //must be functionstatement
			if(!output) fail(f.quote`Function ${func.name} did not return a value`, undefined); //TODO create rangeExternal and set it to funcNode.nodeGroups[0] here
			return output.value;
		}
	}
	callClassMethod<T extends boolean>(method:ClassMethodData, clazz:ClassVariableType, instance:VariableTypeMapping<ClassVariableType>, args:RangeArray<ExpressionAST>, requireReturnValue?:T):(
		T extends false ? null :
		T extends undefined ? TypedValue | null :
		T extends true ? TypedValue :
		never
	){
		const func = method.controlStatements[0];
		if(func instanceof ClassProcedureStatement && requireReturnValue === true)
			fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);
		if(func instanceof ClassFunctionStatement && requireReturnValue === false && !configs.statements.call_functions.value)
			fail({
				summary: `CALL cannot be used on functions.`,
				elaboration: `Cambridge says so in section 8.2 of the official pseudocode guide.`,
				help: enableConfig(configs.statements.call_functions)
			}, undefined);

		const classScope = instance.type.getScope(this, instance);
		const methodScope = this.assembleScope(func, args);
		const previousClassData = this.classData;
		this.classData = {instance, method, clazz};
		const output = this.runBlock(method.nodeGroups[0], false, classScope, methodScope);
		//If there was a return, the return statement has already ensured the type matches the function return type
		this.classData = previousClassData;
		if(func instanceof ClassProcedureStatement){
			//requireReturnValue satisfies false;
			return null as never;
		} else { //must be functionstatement
			if(!output) fail(f.quote`Function ${func.name} did not return a value`, undefined);
			return output.value as never;
		}
	}
	callBuiltinFunction<T extends boolean>(fn:BuiltinFunctionData, args:RangeArray<ExpressionAST>, expected:{
		type?: VariableType;
		value: T;
	}):T extends true ? TypedValue : void
	callBuiltinFunction(fn:BuiltinFunctionData, args:RangeArray<ExpressionAST>, expected:{
		type?: VariableType;
		value: boolean;
	}):TypedValue | void {
		if(fn.args.size != args.length) fail({
			summary: f.quote`Incorrect number of arguments for function ${fn.name}`,
			elaboration: `Expected ${plural(fn.args.size, "argument")}, but received ${plural(args.length, "argument")}`
		}, args);
		if(expected.value && !fn.returnType) fail(f.quote`Builtin function ${fn.name} does not return a value`, undefined);
		const evaluatedArgs:[VariableValue, TextRange][] = [];
		let i = 0;
		nextArg:
		for(const [name, {type}] of fn.args.entries()){
			const errors:SoodocodeError[] = [];
			for(const possibleType of type){
				if(tryRunOr(() => {
					evaluatedArgs.push([this.evaluateExpr(args[i], possibleType).value, args[i].range]);
					i ++;
				}, err => errors.push(err)))
					continue nextArg;
			}
			throw errors.at(-1) ?? crash(`Builtin function ${fn.name} has an argument ${name} that does not accept any types`);
		}
		const processedArgs:RangeAttached<BoxPrimitive<VariableValue>>[] =
			evaluatedArgs.map(([value, range]) =>
				//Attach the range to the values
				Object.assign(boxPrimitive(value), {range})
			);
		if(!expected.value) fn.impl.apply(this, processedArgs);
		else {
			if(expected.type == undefined) return typedValue(fn.returnType!, fn.impl.apply(this, processedArgs));
			else return typedValue(expected.type, coerceValue(fn.impl.apply(this, processedArgs), fn.returnType!, expected.type));
		}
	}
	/**
	 * @param allScopesEmpty If true, the scopes are all empty and are therefore optional.
	 */
	runBlock(code:ProgramASTNodeGroup, allScopesEmpty:boolean, ...scopes:VariableScope[]):void | {
		type: "function_return";
		value: TypedValue;
	}{
		if(code.simple() && allScopesEmpty) return this.runBlockFast(code);
		this.scopes.push(...scopes);
		let returned:null | TypedValue = null;
		const {typeNodes, constants, others} = groupArray(code, c =>
			(c instanceof TypeStatement ||
			c instanceof ProgramASTBranchNode && c.controlStatements[0] instanceof TypeStatement) ? "typeNodes" :
			c instanceof ConstantStatement ? "constants" :
			"others"
		, ["constants", "others", "typeNodes"]) as {
			typeNodes: (TypeStatement | (ProgramASTBranchNode & {controlStatements: [TypeStatement]}))[],
			constants: ConstantStatement[],
			others: ProgramASTNodeGroup
		};
		//First pass: run constants
		for(const node of constants){
			node.run(this);
		}
		//Second pass: create types
		const types: [name:string, type:VariableType<boolean>][] = [];
		const currentScopeTypes = this.getCurrentScope().types;
		for(const node of typeNodes){
			let name, type;
			if(node instanceof Statement){
				[name, type] = node.createType(this);
			} else {
				[name, type] = node.controlStatements[0].createTypeBlock(this, node);
			}
			if(currentScopeTypes[name]) fail(f.quote`Type ${name} was defined twice`, node);
			currentScopeTypes[name] = type as VariableType<any>; //it will get initialized later
			types.push([name, type]);
		}
		//Third pass: initialize (finish resolving) types
		for(const [name, type] of types){
			this.currentlyResolvingTypeName = name;
			if(type instanceof PointerVariableType) this.currentlyResolvingPointerTypeName = name;
			type.init(this);
			this.currentlyResolvingPointerTypeName = null;
		}
		this.currentlyResolvingTypeName = null;
		//Fourth pass: validate types
		for(const [name, type] of types){
			type.validate(this);
		}
		//Fifth pass: everything else
		for(const node of others){
			this.statementExecuted(node);
			let result;
			if(node instanceof Statement){
				result = node.run(this);
			} else {
				result = (node.controlStatements[0] as Statement).runBlock(this, node); //correspondence
			}
			if(result){
				if(result.type == "function_return"){
					returned = result.value;
					break;
				}
			}
		}
		if(scopes.length > 0 && this.scopes.splice(-scopes.length).length != scopes.length) crash(`Scope somehow disappeared`);
		if(returned !== null){
			return {
				type: "function_return",
				value: returned
			};
		}
	}
	/** Optimized version of runBlock for blocks with no declarations, types, or return statements. */
	runBlockFast(code:ProgramASTNodeGroup & { requiresScope: false; hasTypesOrConstants: false; hasReturn: false; }){
		this.statementExecuted(code, code.length);
		for(const node of code){
			if(node instanceof Statement){
				node.run(this);
			} else {
				(node.controlStatements[0] as Statement).runBlock(this, node); //correspondence
			}
		}
	}
	/** Updates the count for number of statements executed, and fails if it is over the limit. */
	statementExecuted(range:TextRangeLike, increment = 1){
		if((this.statementsExecuted += increment) > configs.statements.max_statements.value){
			fail({
				summary: `Statement execution limit reached (${configs.statements.max_statements.value})`,
				help: setConfig("increase", configs.statements.max_statements)
			}, range);
		}
	}
	/** Runs a block as the main program. Creates a global scope, and checks for unclosed files. */
	runProgram(code:ProgramASTNodeGroup){
		code.preRun();
		this.runBlock(code, false, {
			statement: "global",
			opaque: true,
			variables: Object.create(null),
			types: Object.create(null),
		});

		for(const [name, file] of Object.entries(this.openFiles)){
			if(file == undefined) delete this.openFiles[name];
			else fail(f.quote`File ${name} was not closed`, file.openRange);
		}
	}
	/** Gets an opened file, failing if it has not been opened. */
	getOpenFile(filename:string):OpenedFile;
	/** Gets an opened file, failing if it was not opened with one of the expected modes. */
	getOpenFile<T extends FileMode>(filename:string, modes:T[], operationDescription:string):OpenedFileOfType<T>;
	getOpenFile(filename:string, modes?:FileMode[], operationDescription?:string):OpenedFile {
		const data = (this.openFiles[filename] ?? fail(f.quote`File ${filename} has not been opened.`, undefined));
		if(modes && operationDescription && !modes.includes(data.mode))
			fail(f.quote`${operationDescription} requires the file to have been opened with mode ${modes.map(m => `"${m}"`).join(" or ")}, but the mode is ${data.mode}`, undefined);
		return data;
	}
}
function computeOrdering(x:TypedValue<PrimitiveVariableType<"INTEGER" | "REAL" | "CHAR" | "DATE"> | EnumeratedVariableType>):number {
	return (
		x.typeIs(EnumeratedVariableType) ? x.type.values.indexOf(x.value) :
		x.typeIs("INTEGER", "REAL") ? x.value :
		x.typeIs("CHAR") ? x.value.codePointAt(0)! :
		x.typeIs("DATE") ? x.value.getTime() :
		impossible()
	);
}

