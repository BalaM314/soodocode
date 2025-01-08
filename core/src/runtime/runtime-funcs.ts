import { configs } from "../config/config.js";
import { ClassFunctionStatement } from "../statements/statements.js";
import { ConfigSuggestion, enableConfig, f, fail, plural, zip } from "../utils/funcs.js";
import { ArrayVariableType, ClassMethodStatement, ClassVariableType, IntegerRangeVariableType, PointerVariableType, SetVariableType, UnresolvedVariableType, VariableType } from "./runtime-types.js";
import type { Runtime } from "./runtime.js";


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
		(a instanceof SetVariableType && b instanceof SetVariableType && a.elementType == b.elementType)
	;
}

/**
 * Checks if "ext" is assignable to "base". Does not attempt coercion.
 * @returns true if it is, or a string error message if it isn't. Error message may be empty.
 */
export function typesAssignable(base:VariableType, ext:VariableType):true | [string, ConfigSuggestion<any>?] | false;
export function typesAssignable(base:UnresolvedVariableType, ext:UnresolvedVariableType):true | [string, ConfigSuggestion<any>?] | false;
export function typesAssignable(base:VariableType | UnresolvedVariableType, ext:VariableType | UnresolvedVariableType):true | [string, ConfigSuggestion<any>?] | false {
	if(base == ext) return true;
	if(Array.isArray(base) && Array.isArray(ext))
		return base[1] == ext[1] || false;
	if(Array.isArray(base) || Array.isArray(ext))
		return false;
	if(base instanceof ArrayVariableType && ext instanceof ArrayVariableType){
		if(base.elementType != null){
			if(ext.elementType == null) return [f.quote`Type "ANY" is not assignable to type ${base.elementType}`];
			//arrays are invariant
			if(!typesEqual(base.elementType, ext.elementType)) return [f.quote`Types ${base.elementType} and ${ext.elementType} are not equal`];
		}
		if(base.lengthInformation != null){
			if(ext.lengthInformation == null) return [`cannot assign an array with unknown length to an array requiring a specific length`];
			//Total length is different
			if(base.totalLength != ext.totalLength) return ["these array types have different lengths"];
			
			if( //Total length is same but sub-sizes are different
				!configs.coercion.arrays_same_total_size.value &&
				base.arraySizes!.toString() != ext.arraySizes!.toString()
			) return [`these array types have different lengths`, enableConfig(configs.coercion.arrays_same_total_size)];
			
			if( //Sub-sizes are same but start and end indexes are different
				!configs.coercion.arrays_same_length.value &&
				base.lengthInformation.toString() != ext.lengthInformation.toString()
			) return [`these array types have different start and end indexes`, enableConfig(configs.coercion.arrays_same_length)];
		}
		return true;
	}
	if(base instanceof PointerVariableType && ext instanceof PointerVariableType){
		return typesEqual(base.target, ext.target) || [f.quote`Types ${base.target} and ${ext.target} are not equal`];
	}
	if(base instanceof SetVariableType && ext instanceof SetVariableType){
		return base.elementType == null || (ext.elementType != null && typesEqual(base.elementType, ext.elementType) || [f.quote`Types ${base.elementType} and ${ext.elementType ?? "ANY"} are not equal`]);
	}
	if(base instanceof ClassVariableType && ext instanceof ClassVariableType){
		return ext.inherits(base) || false;
	}
	if(ext instanceof IntegerRangeVariableType){
		if(base instanceof IntegerRangeVariableType) return base.contains(ext)
			|| [f.quote`Range ${base.asNumberRange()} does not contain ${ext.asNumberRange()}`];
		if(base.is("INTEGER")) return true;
	}
	return false;
}

export function checkClassMethodsCompatible(runtime:Runtime, base:ClassMethodStatement, derived:ClassMethodStatement){
	const summary = f.quote`Derived class method ${derived.name} is not compatible with the same method in the base class`;
	if(base.accessModifier != derived.accessModifier)
		fail({
			summary,
			elaboration: f.text`Method was ${base.accessModifier} in base class, cannot override it with a ${derived.accessModifier} method`
		}, derived.accessModifierToken, derived);

	if(base.stype != derived.stype)
		fail({
			summary,
			elaboration: f.text`Method was a ${base.stype.split("_")[1]} in base class, cannot override it with a ${derived.stype.split("_")[1]}`
		}, derived.methodKeywordToken, derived);

	if(!(base.name == "NEW" && derived.name == "NEW")){
		//Skip assignability check for the constructor
		if(base.args.size != derived.args.size)
			fail({
				summary,
				elaboration: `Method should have ${plural(base.args.size, "parameter")}, but it has ${plural(derived.args.size, "parameter")}`
			}, derived.argsRange, derived);
		for(const [[aName, aType], [bName, bType]] of zip(base.args.entries(), derived.args.entries())){
			//Changing the name is fine
			let result;
			//TODO cache the resolved type, store it in the class somehow, resolve these types at 2nd pass
			if((result = typesAssignable(runtime.resolveVariableType(bType.type), runtime.resolveVariableType(aType.type))) != true) //parameter types are contravariant
				fail({
					summary,
					elaboration: [
						f.quote`argument ${bName} in derived class is not compatible with argument ${aName} in base class`,
						f.quote`type ${aType.type} is not assignable to type ${bType.type}`,
						result && result[0],
						`note: argument types are contravariant, meaning the base class's argument type needs to be assignable to the derived class's argument type`
					].filter(Boolean),
					help: result && result[1] ? result[1] : undefined
				}, derived.argsRange, derived);
			if(aType.passMode != bType.passMode)
				fail({
					summary,
					elaboration: [
						f.quote`argument ${bName} in the derived class has a pass mode of ${bType.passMode}, but in the base class, this argument has a pass mode of ${aType.passMode}`
					]
				}, derived.argsRange, derived);
		}
	}

	if(base instanceof ClassFunctionStatement && derived instanceof ClassFunctionStatement){
		let result;
		if((result = typesAssignable(runtime.resolveVariableType(base.returnType()), runtime.resolveVariableType(derived.returnType()))) != true) //return type is covariant
			fail({
				summary: f.quote`Return type ${derived.returnType()} is not assignable to ${base.returnType()}`,
				elaboration: result ? result[0] : undefined,
				help: result && result[1] ? result[1] : undefined,
			}, derived.returnTypeNode, derived);
	}
}
