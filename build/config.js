export const configs = ((data) => Object.fromEntries(Object.entries(data).map(([k1, v]) => [k1, Object.fromEntries(Object.entries(v).map(([k2, v]) => [k2, {
            name: v[0],
            shortDescription: v[1] + ".",
            fullDescription: v[1] + "." + (v[2] ? "\n" + v[2] : ""),
            defaultValue: v[3],
            value: v[3],
            errorHelp: `help: ${v[1]} by enabling the config "${v[0]}"`,
        }]))])))({
    coercion: {
        arrays_same_length: [
            "Coerce arrays of same length",
            `Allow assigning array types with same length but different start and end indexes`,
            `For example, "ARRAY[1:10] OF INTEGER" can be coerced to "ARRAY[0:9] OF INTEGER".`,
            true,
        ]
    },
    arrays: {
        unspecified_length: [
            "Unspecified length arrays",
            `Allow arrays without a length in function arguments and class properties`,
            `This isn't fully variable length arrays, like in Python and Javascript: all arrays will still have a length, but functions can be more flexible.\nNot mentioned in any official pseudocode guides.`,
            true
        ]
    },
    initialization: {
        normal_variables_default: [
            "Default values",
            `Give uninitialized variables a default value`,
            `If disabled, uninitialized variables will throw an error upon being accessed.`,
            false
        ],
    },
    default_values: {
        INTEGER: [
            "Default INTEGER value",
            ``, ``,
            0
        ],
        REAL: [
            "Default REAL value",
            ``, ``,
            0
        ],
        BOOLEAN: [
            "Default BOOLEAN value",
            ``, ``,
            false,
        ],
        STRING: [
            "Default STRING value",
            ``, ``,
            ""
        ],
        CHAR: [
            "Default CHAR value",
            ``, ``,
            " "
        ],
        DATE: [
            "Default INTEGER value",
            ``, ``,
            new Date(0)
        ],
    },
    statements: {
        call_functions: [
            "CALL functions",
            `Allow using the CALL statement to call functions`,
            `Cambridge has explicitly stated that the CALL statement cannot be used to call functions, in section 8.2 of the official pseudocode guide, so this is disabled by default.`,
            false
        ]
    },
    misc: {}
});
