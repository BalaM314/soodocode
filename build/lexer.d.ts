import { SymbolType, SymbolizedProgram, TokenType, TokenizedProgram } from "./lexer-types.js";
export declare const symbolTypeData: [
    identifier: string | [SymbolSpecifierFuncName] | RegExp,
    symbol: SymbolType
][];
export declare const tokenNameTypeData: Record<string, TokenType>;
export declare const tokenTextMapping: Record<Exclude<TokenType, "string" | "number.decimal" | "char" | "name">, string>;
type SymbolSpecifierFuncName = "isAlphanumeric" | "isNumber";
export declare function symbolize(input: string): SymbolizedProgram;
export declare function tokenize(input: SymbolizedProgram): TokenizedProgram;
export {};
