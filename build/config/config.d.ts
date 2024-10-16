export type Config<T, Help extends boolean> = {
    name: string;
    description: string | null;
    value: T;
    defaultValue: T;
    range?: T extends number ? [low: number, high: number] : never;
    stringLength?: T extends string ? number : never;
} & (Help extends true ? {
    errorHelp: string;
} : {});
export declare const configs: {
    syntax: {
        semicolons_as_newlines: Config<boolean, true>;
    };
    coercion: {
        arrays_same_length: Config<boolean, true>;
        arrays_same_total_size: Config<boolean, true>;
        enums_to_integer: Config<boolean, true>;
        string_to_char: Config<boolean, true>;
        real_to_int: Config<boolean, true>;
        truncate_real_to_int: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
        numbers_to_string: Config<boolean, true>;
        enums_to_string: Config<boolean, true>;
        booleans_to_string: Config<boolean, true>;
        char_to_string: Config<boolean, true>;
        date_to_string: Config<boolean, true>;
        arrays_to_string: Config<boolean, true>;
    };
    equality_checks: {
        coerce_string_char: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
        coerce_int_real: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
        coerce_arrays: Config<boolean, true>;
        allow_different_types: Config<boolean, true>;
    };
    arrays: {
        unspecified_length: Config<boolean, true>;
        max_size_bytes: Config<number, true>;
        max_size_composite: Config<number, true>;
        use_32bit_integers: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
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
            range?: [low: number, high: number] | undefined;
            stringLength?: undefined;
        };
        REAL: {
            name: string;
            description: string | null;
            value: number;
            defaultValue: number;
            range?: [low: number, high: number] | undefined;
            stringLength?: undefined;
        };
        BOOLEAN: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
        STRING: {
            name: string;
            description: string | null;
            value: string;
            defaultValue: string;
            range?: undefined;
            stringLength?: number | undefined;
        };
        CHAR: {
            name: string;
            description: string | null;
            value: string;
            defaultValue: string;
            range?: undefined;
            stringLength?: number | undefined;
        };
        DATE: {
            name: string;
            description: string | null;
            value: Date;
            defaultValue: Date;
            range?: undefined;
            stringLength?: undefined;
        };
    };
    statements: {
        call_functions: Config<boolean, true>;
        auto_declare_classes: Config<boolean, true>;
        max_statements: Config<number, true>;
    };
    classes: {
        delegate_access_privileges: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
    };
    pointers: {
        implicit_variable_creation: Config<boolean, true>;
        infinite_pointer_types: Config<boolean, true>;
    };
    runtime: {
        display_output_immediately: {
            name: string;
            description: string | null;
            value: boolean;
            defaultValue: boolean;
            range?: undefined;
            stringLength?: undefined;
        };
    };
};
