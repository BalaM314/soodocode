import type { TextRange } from "./lexer-types.js";
import { BuiltinFunctionData } from "./runtime-types.js";
export type RangeAttached<T> = T & {
    range: TextRange;
};
export declare const builtinFunctions: Record<"LEFT" | "RIGHT" | "MID" | "LENGTH" | "TO_UPPER" | "TO_LOWER" | "UCASE" | "LCASE" | "NUM_TO_STR" | "STR_TO_NUM" | "IS_NUM" | "ASC" | "CHR" | "INT" | "RAND" | "DAY" | "MONTH" | "YEAR" | "DAYINDEX" | "SETDATE" | "TODAY" | "EOF", BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
