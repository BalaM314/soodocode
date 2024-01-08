import type { BuiltinFunctionData, VariableType, VariableValueType } from "./runtime.js";
import type { FunctionArguments } from "./statements.js";



type PreprocesssedBuiltinFunctionData = {
	args: [name:string, type:VariableType][];
	returnType: VariableType;
	impl(...args:VariableValueType[]):VariableValueType;
};
export const builtinFunctions = (
	<T extends PropertyKey>(d:Record<T, PreprocesssedBuiltinFunctionData>):Record<T, BuiltinFunctionData> =>
		Object.fromEntries(Object.entries<PreprocesssedBuiltinFunctionData>(d).map(([name, data]) => 
			[name, {
				args: new Map(data.args.map(a => [a[0], {passMode: "reference", type: a[1]}])) satisfies FunctionArguments,
				impl: data.impl,//todo
				name,
				returnType: data.returnType
			} satisfies BuiltinFunctionData]
		))
)({
	LEFT: {
		args: [
			["ThisString", "STRING"],
			["x", "INTEGER"],
		],
		returnType: "STRING",
		impl(str:string, x:number){
			return "";
		},
	}
}) satisfies ;
