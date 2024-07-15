
export type Config<T, Help extends boolean> = {
	name:string;
	description:string | null;
	value:T;
	defaultValue:T;
} & (Help extends true ? {
	errorHelp: string;
} : {});
type ConfigData<T> = {
	name:string;
	value:T;
	// type: "checkbox" | "boolean" | "integer" | "number";
} & ({
	shortDescription:string;
	fullDescription?:string;
} | {
	description?:string;
	errorHelp?:string;
});

export const configs = (<T extends Record<string, Record<string, ConfigData<unknown>>>>(data:T) =>
	Object.fromEntries(Object.entries(data).map(([k1, v]) =>
		[k1, Object.fromEntries(Object.entries(v).map(([k2, v]) =>
			[k2, {
				name: v.name,
				description: "description" in v ? v.description : "shortDescription" in v ? v.shortDescription + (v.fullDescription ? "\n" + v.fullDescription : "") : null,
				defaultValue: v.value,
				value: v.value,
				errorHelp: "errorHelp" in v ? `help: ${v.errorHelp} by enabling the config "${v.name}"` : "shortDescription" in v ? `help: ${v.shortDescription.replace(/\.$/, "")} by enabling the config "${v.name}"` : null,
			}]
		))]
	)) as {
		[K1 in keyof T]: {
			[K2 in keyof T[K1]]: Config<T[K1][K2]["value"], "errorHelp" extends keyof T[K1][K2] ? true : "shortDescription" extends keyof T[K1][K2] ? true : false>;
		}
	}
)({
	coercion: {
		arrays_same_length: {
			name: "Coerce arrays of same length",
			shortDescription: `Allow assigning array types with same lengths but different start and end indexes.`,
			fullDescription: `For example, "ARRAY[1:10] OF INTEGER" can be coerced to "ARRAY[0:9] OF INTEGER".`,
			value: true,
		}
	},
	arrays: {
		unspecified_length: {
			name: "Unspecified length arrays",
			shortDescription: `Allow arrays without a length in function arguments and class properties.`,
			fullDescription: `This isn't fully variable length arrays, like in Python and Javascript: all arrays will still have a length, but functions can be more flexible.\nNot mentioned in any official pseudocode guides.`,
			value: true
		}
	},
	initialization: {
		normal_variables_default: {
			name: "Defaults for variables",
			shortDescription: `Give uninitialized variables a default value.`,
			fullDescription: `If disabled, uninitialized variables will throw an error upon being accessed.`,
			value: false,
		},
		arrays_default: {
			name: "Defaults for arrays",
			shortDescription: `Automatically initialize all slots in arrays.`,
			fullDescription: `If disabled, uninitialized slots will throw an error upon being accessed.`,
			value: true,
		}
	},
	default_values: {
		INTEGER: {
			name: "Default INTEGER value",
			value: 0,
		},
		REAL: {
			name: "Default REAL value",
			value: 0,
		},
		BOOLEAN: {
			name: "Default BOOLEAN value",
			value: false,
		},
		STRING: {
			name: "Default STRING value",
			value: "",
		},
		CHAR: {
			name: "Default CHAR value",
			value: " ",
		},
		DATE: {
			name: "Default INTEGER value",
			value: new Date(0),
		},
	},
	statements: {
		call_functions: {
			name: "CALL functions",
			shortDescription: `Allow using the CALL statement to call functions.`,
			fullDescription: `Cambridge has explicitly stated that the CALL statement cannot be used to call functions, in section 8.2 of the official pseudocode guide.`,
			value: false
		},
		auto_declare_classes: {
			name: "Automatic class declaration",
			shortDescription: `Automatically declare a variable when initializing a class in an assignment statement.`,
			fullDescription: `If a variable has already been declared, that variable is used instead.`,
			value: false
		},
	},
	misc: {

	}
});
