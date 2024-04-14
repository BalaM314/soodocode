/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the lexer, which takes the raw user input and processes it;
first into a list of symbols, such as "operator.add" (+), "numeric_fragment" (123), or "quote.double" ("),
second into a list of tokens, such as "operator.add" (+), "number.decimal" (12.34), "keyword.readfile", or "string" ("amogus").
*/
import { SymbolizedProgram, TokenizedProgram } from "./lexer-types.js";
/** Converts an input string to a list of symbols. */
export declare function symbolize(input: string): SymbolizedProgram;
/** Converts a list of symbols into a list of tokens. */
export declare function tokenize(input: SymbolizedProgram): TokenizedProgram;
