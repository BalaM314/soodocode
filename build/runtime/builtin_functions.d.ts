import { BuiltinFunctionData, PrimitiveVariableTypeMapping, PrimitiveVariableTypeName, VariableValue } from "../runtime/runtime-types.js";
import type { Runtime } from "../runtime/runtime.js";
import type { RangeAttached } from "../utils/types.js";
type BuiltinFunctionArgType = PrimitiveVariableTypeName | (PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"])[];
type BuiltinFunctionArg = [name: string, type: BuiltinFunctionArgType];
type FunctionArgVariableTypeMapping<T extends BuiltinFunctionArgType> = T extends Array<infer U extends PrimitiveVariableTypeName | [PrimitiveVariableTypeName | "ANY"]> ? U extends PrimitiveVariableTypeName ? RangeAttached<PrimitiveVariableTypeMapping<U>> : U extends [infer S] ? S extends PrimitiveVariableTypeName ? RangeAttached<PrimitiveVariableTypeMapping<S>> : RangeAttached<unknown[]> : never : T extends PrimitiveVariableTypeName ? RangeAttached<PrimitiveVariableTypeMapping<T>> : never;
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
    LEFT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    RIGHT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    MID: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    LENGTH: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    TO_UPPER: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    TO_LOWER: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    UCASE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    LCASE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    NUM_TO_STR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    STR_TO_NUM: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    IS_NUM: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    ASC: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    CHR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    INT: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    RAND: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    DAY: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    MONTH: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    YEAR: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    DAYINDEX: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    SETDATE: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    TODAY: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    EOF: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    ROUND: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    POW: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    EXP: PreprocesssedBuiltinFunctionData<BuiltinFunctionArg[], "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
};
export {};
