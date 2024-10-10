import { isKey } from "./utils.js";
export const configs = ((data) => Object.fromEntries(Object.entries(data).map(([k1, v]) => [k1, Object.fromEntries(Object.entries(v).map(([k2, v]) => [k2, {
            name: v.name,
            description: "description" in v ? v.description : "shortDescription" in v ? v.shortDescription + (v.fullDescription ? "\n" + v.fullDescription : "") : null,
            defaultValue: v.value,
            value: v.value,
            errorHelp: typeof v.value == "boolean" ? ("errorHelp" in v ? `help: ${v.errorHelp} by enabling the config "${v.name}"` : "shortDescription" in v ? `help: ${v.shortDescription.replace(/\.$/, "")} by enabling the config "${v.name}"` : null) : ("errorHelp" in v ? `help: ${v.errorHelp}` : null),
            range: v.range,
            stringLength: v.stringLength
        }]))])))({
    syntax: {
        semicolons_as_newlines: {
            name: `Treat semicolons as newlines`,
            description: `This allows you to write code like \`a <- 5; b <- 5\` on the same line.`,
            errorHelp: `Treat semicolons as newlines`,
            value: true,
        }
    },
    coercion: {
        arrays_same_length: {
            name: "Coerce arrays of same length",
            shortDescription: `Allow assigning array types with same lengths but different start and end indexes.`,
            fullDescription: `For example, "ARRAY[1:10] OF INTEGER" can be coerced to "ARRAY[0:9] OF INTEGER".`,
            value: true,
        },
        arrays_same_total_size: {
            name: "Coerce arrays of same total length",
            shortDescription: `Allow assigning multi-dimensional array types with same total lengths but different lengths for each dimension`,
            fullDescription: `For example, "ARRAY[1:10, 1:10] OF INTEGER" can be coerced to "ARRAY[1:5, 1:20] OF INTEGER".`,
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
        real_to_int: {
            name: "Coerce REAL to INTEGER",
            description: `Allow implicitly converting a valid REAL to an INTEGER. Example: allows converting a variable of type REAL with value 5 to INTEGER. If this is disabled, you can explicitly convert a REAL to INTEGER by using the integer division operator, like this: real DIV 1`,
            errorHelp: `Allow implicitly converting a REAL to an INTEGER`,
            value: true,
        },
        truncate_real_to_int: {
            name: "Truncate REAL to INTEGER",
            description: `Allow converting REALs to INTEGERs, even if truncating is necessary. Example: converts 5.9 to 5.`,
            value: false,
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
            fullDescription: `If this is disabled, the OUTPUT statement will still be able to print DATEs.`,
            value: false,
        },
        arrays_to_string: {
            name: "Coerce arrays to STRING",
            shortDescription: `Allow implicitly converting an array to a STRING.`,
            fullDescription: `If this is disabled, the OUTPUT statement will still be able to print ARRAYs.`,
            value: false,
        },
    },
    equality_checks: {
        coerce_string_char: {
            name: "Allow testing equality between CHAR and STRING",
            description: `If this is enabled, 'a' = "a" will return TRUE.`,
            value: true,
        },
        coerce_int_real: {
            name: "Allow testing equality between INTEGER and REAL",
            description: `If this is enabled, comparisons between INTs and REALs with the same value will return TRUE.`,
            value: true,
        },
        coerce_arrays: {
            name: "Allow testing equality between array types",
            description: `If this is enabled, testing for equality between array types will be allowed if their lengths are different`,
            errorHelp: `Make this comparison always return FALSE`,
            value: true,
        },
        allow_different_types: {
            name: "Allow testing equality between different types",
            description: `If this is disabled, testing for equality between two different types will throw an error instead of returning FALSE.`,
            errorHelp: `Make this comparison always return FALSE`,
            value: false,
        },
    },
    arrays: {
        unspecified_length: {
            name: "Unspecified length arrays",
            shortDescription: `Allow arrays without a length in function arguments and class properties.`,
            fullDescription: `This isn't fully variable length arrays, like in Python and Javascript: all arrays will still have a length, but functions can be more flexible.\nNot mentioned in any official pseudocode guides.`,
            value: true
        },
        max_size_bytes: {
            name: "Max size (primitives)",
            description: `Maximum size in bytes allowed for arrays of integers and reals. This is separate from arrays of other types because we can use a native array, which is more memory efficient.`,
            errorHelp: `Increase the limit by increasing the config "Arrays: Max size (primitives)"`,
            value: 256000100,
            range: [0, Number.MAX_SAFE_INTEGER],
        },
        max_size_composite: {
            name: "Max size (composite)",
            description: `Maximum size allowed for arrays of non-primitive values.`,
            errorHelp: `Increase the limit by increasing the config "Arrays: Max size (composite)"`,
            value: 1000100,
            range: [0, Number.MAX_SAFE_INTEGER],
        },
        use_32bit_integers: {
            name: "Use 32-bit integers",
            description: `Use 32-bit integers to store large "ARRAY OF INTEGER"s. Improves performance.`,
            value: true,
        },
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
            range: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
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
            stringLength: 1,
        },
        DATE: {
            name: "Default DATE value",
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
        max_statements: {
            name: "Maximum statement count",
            description: `Maximum number of statements that can be executed by the runtime. If this is exceeded, the program terminates. Useful to prevent infinite loops.`,
            errorHelp: `Increase the statement limit by changing the config "Maximum statement count"`,
            value: 100100,
            range: [0, Infinity]
        }
    },
    classes: {
        delegate_access_privileges: {
            name: "Delegate access privileges",
            description: `Allows class methods to delegate their permission to access private class members to functions that they call. For example, if an external function tries to access a private property on a class instance, calling it normally will result in an error, but calling it from a method of the class will work.`,
            value: false
        },
    },
    pointers: {
        implicit_variable_creation: {
            name: "Implicit variable creation",
            description: `Enabling this config allows using the pointer reference operator on expressions. This implicitly creates a variable, sets its value to the expression's result, and returns a pointer to the new variable.`,
            errorHelp: `Allow implicit variable creation`,
            value: true
        },
        infinite_pointer_types: {
            name: "Infinite pointer types",
            description: `Enabling this config allows creating a pointer that points to itself infinitely. This is useless, but fun.`,
            errorHelp: `Allow infinite pointer types`,
            value: true
        },
    },
    runtime: {
        display_output_immediately: {
            name: "Display output immediately",
            description: `Display output as each output statement is executed, rather than all at once after the program terminates. May cause lag.`,
            value: false,
        }
    }
});
const configsKey = "soodocode:configs";
export function saveConfigs() {
    const data = JSON.stringify(Object.fromEntries(Object.entries(configs).map(([category, items]) => [category, Object.fromEntries(Object.entries(items).map(([key, config]) => [key, config.value]))])));
    localStorage.setItem(configsKey, data);
}
export function loadConfigs() {
    const dataString = localStorage.getItem(configsKey);
    if (!dataString)
        return;
    try {
        const data = JSON.parse(dataString);
        for (const [category, items] of Object.entries(data)) {
            if (isKey(configs, category) && typeof items == "object" && items != null) {
                for (const [key, value] of Object.entries(items)) {
                    if (isKey(configs[category], key)) {
                        if (typeof configs[category][key].value == typeof value) {
                            configs[category][key].value = value;
                        }
                    }
                }
            }
        }
    }
    catch { }
}
export function resetToDefaults() {
    for (const config of Object.values(configs).map(c => Object.values(c)).flat()) {
        config.value = config.defaultValue;
    }
}
