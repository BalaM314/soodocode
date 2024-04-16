/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions defined in the insert.
*/
import { type BuiltinFunctionData } from "./runtime.js";
export declare const builtinFunctions: Record<"LEFT" | "RIGHT" | "MID" | "LENGTH" | "TO_UPPER" | "TO_LOWER" | "UCASE" | "LCASE" | "NUM_TO_STR" | "STR_TO_NUM" | "IS_NUM" | "ASC" | "CHR" | "INT" | "RAND" | "DAY" | "MONTH" | "YEAR" | "DAYINDEX" | "SETDATE" | "TODAY", BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
