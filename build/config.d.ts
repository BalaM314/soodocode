export type Config<T> = {
    name: string;
    shortDescription: string;
    fullDescription: string;
    defaultValue: T;
    value: T;
    errorHelp: string;
};
export declare const configs: {
    coercion: {
        arrays_same_length: Config<boolean>;
    };
    arrays: {
        unspecified_length: Config<boolean>;
    };
    initialization: {
        normal_variables_default: Config<boolean>;
        arrays_default: Config<boolean>;
    };
    default_values: {
        INTEGER: Config<number>;
        REAL: Config<number>;
        BOOLEAN: Config<boolean>;
        STRING: Config<string>;
        CHAR: Config<string>;
        DATE: Config<Date>;
    };
    statements: {
        call_functions: Config<boolean>;
        auto_declare_classes: Config<boolean>;
    };
    misc: {};
};
