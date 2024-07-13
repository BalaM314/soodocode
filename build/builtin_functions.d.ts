import { BuiltinFunctionData, PrimitiveVariableTypeName, VariableValue } from "./runtime-types.js";
import type { Runtime } from "./runtime.js";
import type { RangeAttached } from "./types.js";
type BuiltinFunctionArgType = PrimitiveVariableTypeName | (PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"])[];
type BuiltinFunctionArg = [name: string, type: BuiltinFunctionArgType];
type PrimitiveVariableTypeMapping<T> = T extends "INTEGER" ? number : T extends "REAL" ? number : T extends "STRING" ? string : T extends "CHAR" ? string : T extends "BOOLEAN" ? boolean : T extends "DATE" ? Date : never;
type FunctionArgVariableTypeMapping<T extends BuiltinFunctionArgType> = T extends Array<infer U extends PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"]> ? U extends PrimitiveVariableTypeName ? RangeAttached<PrimitiveVariableTypeMapping<U>> : U extends [infer S] ? S extends PrimitiveVariableTypeName ? RangeAttached<PrimitiveVariableTypeMapping<U>> : RangeAttached<unknown[]> : never : T extends PrimitiveVariableTypeName ? RangeAttached<PrimitiveVariableTypeMapping<T>> : never;
type FunctionArgs<TSuppliedArgs extends BuiltinFunctionArg[]> = [
    TSuppliedArgs & 0
] extends [1] ? RangeAttached<VariableValue>[] : {
    [K in keyof TSuppliedArgs]: FunctionArgVariableTypeMapping<TSuppliedArgs[K][1]>;
};
type PreprocesssedBuiltinFunctionData<TArgs extends BuiltinFunctionArg[], TReturn extends PrimitiveVariableTypeName> = {
    args: TArgs;
    returnType: TReturn;
    impl(this: Runtime, ...args: FunctionArgs<TArgs>): PrimitiveVariableTypeMapping<TReturn>;
};
export declare const getBuiltinFunctions: () => Record<keyof typeof preprocessedBuiltinFunctions, BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
export declare const preprocessedBuiltinFunctions: {
    LEFT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    RIGHT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    MID: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    LENGTH: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    TO_UPPER: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    TO_LOWER: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    UCASE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    LCASE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    NUM_TO_STR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    STR_TO_NUM: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    IS_NUM: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    ASC: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    CHR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    INT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    RAND: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    DAY: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    MONTH: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    YEAR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    DAYINDEX: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    SETDATE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    TODAY: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
    EOF: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], PrimitiveVariableTypeName>;
};
export {};
