import { SymbolizedProgram, TokenizedProgram } from "./lexer-types.js";
export declare function symbolize(input: string): SymbolizedProgram;
export declare function tokenize(input: SymbolizedProgram): TokenizedProgram;
