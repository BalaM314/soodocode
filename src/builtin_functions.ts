import type { BuiltinFunctionData, VariableType, VariableValueType } from "./runtime.js";



type PreprocesssedBuiltinFunctionData = {
	args: [name:string, type:VariableType][];
	returnType: VariableType;
	impl(...args:VariableValueType[]):VariableValueType;
};
export const builtinFunctions = (
	<T extends string>(d:Record<T, PreprocesssedBuiltinFunctionData>):Record<T, BuiltinFunctionData> =>
		Object.fromEntries(Object.entries(d).map(([name, data]) => 
			[name, {
				args: new Map(data.args.map(a => [a[0], {passMode: "reference", type: a[1]}])),
				name,
				impl: data.impl,
				returnType: data.returnType
			}]
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
});
