
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
		},
		enums_to_integer: {
			name: "Coerce enum values to INTEGER",
			shortDescription: `Allow implicitly converting an enum value to an INTEGER.`,
			fullDescription: `If this is disabled, adding and subtracting from enum values will still work.`,
			value: false,
		},
		string_to_char: {
			name: "Coerce STRING to CHAR",
			description: `Allow implicitly converting a STRING to a CHAR, if the string has a length of 1.`,
			errorHelp: `Allow implicitly converting a STRING to a CHAR`,
			value: true,
		},
		numbers_to_string: {
			name: "Coerce numbers to STRING",
			description: `Allow implicitly converting an INTEGER or a REAL to a STRING without using the NUM_TO_STR function.\nFor example, LEFT(1234, 2) returns "12". If this is disabled, the OUTPUT statement will still be able to print numbers.`,
			errorHelp: `Allow implicitly converting numbers to strings`,
			value: false,
		},
		enums_to_string: {
			name: "Coerce enum values to STRING",
			shortDescription: `Allow implicitly converting an enum value to a STRING.`,
			fullDescription: `If this is disabled, the OUTPUT statement will still be able to print numbers.`,
			value: false,
		},
		booleans_to_string: {
			name: "Coerce BOOLEAN to STRING",
			shortDescription: `Allow implicitly converting a boolean to a STRING.`,
			fullDescription: `If this is disabled, the OUTPUT statement will still be able to print booleans.`,
			value: false,
		},
		char_to_string: {
			name: "Coerce CHAR to STRING",
			shortDescription: `Allow implicitly converting a CHAR to a STRING.`,
			fullDescription: `If this is disabled, the OUTPUT statement will still be able to print CHARs.`,
			value: true,
		},
		date_to_string: {
			name: "Coerce DATE to STRING",
			shortDescription: `Allow implicitly converting a DATE to a STRING.`,
			fullDescription: `If this is disabled, the OUTPUT statement will still be able to print dates.`,
			value: false,
		},
		arrays_to_string: {
			name: "Coerce arrays to STRING",
			shortDescription: `Allow implicitly converting an array to a STRING.`,
			fullDescription: `If this is disabled, the OUTPUT statement will still be able to print arrays.`,
			value: false,
		},
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
