export type Config<T, Help extends boolean> = {
    name: string;
    description: string | null;
    value: T;
    defaultValue: T;
} & (Help extends true ? {
    errorHelp: string;
} : {});
export declare const configs: {
    coercion: {
        arrays_same_length: Config<boolean, true>;
        arrays_same_total_size: Config<boolean, true>;
        enums_to_integer: Config<boolean, true>;
        string_to_char: Config<boolean, true>;
        numbers_to_string: Config<boolean, true>;
        enums_to_string: Config<boolean, true>;
        booleans_to_string: Config<boolean, true>;
        char_to_string: Config<boolean, true>;
        date_to_string: Config<boolean, true>;
        arrays_to_string: Config<boolean, true>;
    };
    arrays: {
        unspecified_length: Config<boolean, true>;
    };
    initialization: {
        normal_variables_default: Config<boolean, true>;
        arrays_default: Config<boolean, true>;
    };
    default_values: {
        INTEGER: {
            name: string;
            description: string | null;
            value: number;
            defaultValue: number;
        };
        REAL: {
            name: string;
            description: string | null;
            value: number;
            defaultValue: number;
        };
        BOOLEAN: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
        };
        STRING: {
            name: string;
            description: string | null;
            value: string;
            defaultValue: string;
        };
        CHAR: {
            name: string;
            description: string | null;
            value: string;
            defaultValue: string;
        };
        DATE: {
            name: string;
            description: string | null;
            value: Date;
            defaultValue: Date;
        };
    };
    statements: {
        call_functions: Config<boolean, true>;
        auto_declare_classes: Config<boolean, true>;
    };
    classes: {
        delegate_access_privileges: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
        };
    };
    pointers: {
        implicit_variable_creation: Config<boolean, true>;
    };
};
