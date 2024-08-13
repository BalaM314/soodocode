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
    aliases?: string[];
};
export declare const getBuiltinFunctions: () => Record<keyof typeof preprocessedBuiltinFunctions, BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
export declare const preprocessedBuiltinFunctions: {
    LEFT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    RIGHT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    MID: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    LENGTH: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    TO_UPPER: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    TO_LOWER: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    UCASE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    LCASE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    NUM_TO_STR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    STR_TO_NUM: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    IS_NUM: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    ASC: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    CHR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    INT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    RAND: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    DAY: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    MONTH: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    YEAR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    DAYINDEX: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    SETDATE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    TODAY: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    EOF: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
    ROUND: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "BOOLEAN" | "STRING" | "CHAR" | "DATE">;
};
export {};
