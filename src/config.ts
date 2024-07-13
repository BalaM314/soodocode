
export type Config<T> = {
	name:string;
	description:string;
	defaultValue:T;
	value:T;
}

export const configs = (<T extends Record<string, Record<string, [name:string, description:string, defaultValue:unknown]>>>(data:T) =>
	Object.fromEntries(Object.entries(data).map(([k1, v]) =>
		[k1, Object.fromEntries(Object.entries(v).map(([k2, v]) =>
			[k2, {
				name: v[0], description: v[1], defaultValue: v[2], value: v[2],
			}]
		))]
	)) as {
		[K1 in keyof T]: {
			[K2 in keyof T[K1]]: Config<T[K1][K2][2]>;
		}
	}
)({
	coercion: {
		arrays_same_length: [
			"Coerce arrays of same length",
			`Whether or not arrays with the same length, but different starting and end indexes, can be coerced to each other.\nFor example, "ARRAY[1:10] OF INTEGER" can be coerced to "ARRAY[0:9] OF INTEGER".`,
			true,
		]
	},
	arrays: {
		unspecified_length: [
			"Unspecified length arrays",
			"Allow arrays without a length in function arguments and class properties.\nThis isn't fully variable length arrays, like in Python and Javascript: the array will still have a length, but this is determined by the caller.\nNot mentioned in any official pseudocode guides.",
			true
		]
	},
	initialization: {
		normal_variables_default: [
			"Use default values for uninitialized normal variables",
			`Whether or not uninitialized variables will be given a default value\nIf disabled, uninitialized variables will throw an error upon being accessed.`,
			false
		],
	},
	default_values: {
		INTEGER: [
			"Default INTEGER value",
			``,
			0
		],
		REAL: [
			"Default REAL value",
			``,
			0
		],
		BOOLEAN: [
			"Default BOOLEAN value",
			``,
			false,
		],
		STRING: [
			"Default STRING value",
			``,
			""
		],
		CHAR: [
			"Default CHAR value",
			``,
			" "
		],
		DATE: [
			"Default INTEGER value",
			``,
			new Date(0)
		],
	},
	statements: {
		call_functions: [
			"Allow using the CALL statement to call functions",
			`Cambridge has explicitly stated that the CALL statement cannot be used to call functions, in section 8.2 of the official pseudocode guide, so this is disabled by default.`,
			false
		]
	},
	misc: {

	}
});
