/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the parser, which takes a list of tokens
and processes it into an abstract syntax tree (AST),
which is the preferred representation of the program.
*/
import { TextRange, Token, TokenizedProgram, type TokenType } from "./lexer-types.js";
import { ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTTypeNode, ProgramAST } from "./parser-types.js";
import { type UnresolvedVariableType } from "./runtime.js";
import { FunctionArguments, Statement } from "./statements.js";
/** Parses function arguments, such as `x:INTEGER, BYREF y, z:DATE` into a Map containing their data */
export declare const parseFunctionArguments: (tokens: Token[]) => FunctionArguments;
export declare const processTypeData: (typeNode: ExpressionASTTypeNode) => UnresolvedVariableType;
export declare const parseType: (tokens: Token[]) => ExpressionASTTypeNode;
export declare function splitTokensToStatements(tokens: Token[]): Token[][];
export declare function parse({ program, tokens }: TokenizedProgram): ProgramAST;
/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export declare const parseStatement: (tokens: Token[]) => Statement;
export declare function isLiteral(type: TokenType): boolean;
/** start and end are inclusive */
type StatementCheckTokenRange = (Token | {
    type: "expression" | "type";
    start: number;
    end: number;
});
type StatementCheckFailResult = {
    message: string;
    priority: number;
    range: TextRange | null;
};
/**
 * Checks if a Token[] is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 * `input` must not be empty.
 */
export declare const checkStatement: (statement: typeof Statement, input: Token[]) => StatementCheckFailResult | StatementCheckTokenRange[];
export type OperatorType<T = TokenType> = T extends `operator.${infer N}` ? N extends "minus" ? never : (N | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference") : never;
export type Operator = {
    token: TokenType;
    name: string;
    type: "binary" | "binary_o_unary_prefix" | "unary_prefix" | "unary_prefix_o_postfix" | "unary_postfix_o_prefix";
    category: "arithmetic" | "logical" | "string" | "special";
};
/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export declare const operatorsByPriority: Operator[][];
/** Indexed by OperatorType */
export declare const operators: Omit<Record<"add" | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference" | "multiply" | "divide" | "mod" | "integer_divide" | "and" | "or" | "not" | "equal_to" | "not_equal_to" | "less_than" | "greater_than" | "less_than_equal" | "greater_than_equal" | "assignment" | "pointer" | "string_concatenate", Operator>, "assignment" | "pointer">;
export declare const expressionLeafNodeTypes: TokenType[];
export declare const parseExpressionLeafNode: (token: Token) => ExpressionASTLeafNode;
export declare const parseExpression: (input: Token[], recursive?: any) => ExpressionASTNode;
export {};
