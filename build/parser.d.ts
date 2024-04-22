import { TextRange, Token, TokenizedProgram, TokenType } from "./lexer-types.js";
import { ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTTypeNode, ProgramAST, ProgramASTBranchNode } from "./parser-types.js";
import { UnresolvedVariableType } from "./runtime-types.js";
import { FunctionArguments, Statement } from "./statements.js";
import { ClassProperties, IFormattable } from "./types.js";
export declare const parseFunctionArguments: (tokens: Token[]) => FunctionArguments;
export declare const processTypeData: (typeNode: ExpressionASTTypeNode) => UnresolvedVariableType;
export declare const parseType: (tokens: Token[]) => ExpressionASTTypeNode;
export declare function splitTokensToStatements(tokens: Token[]): Token[][];
export declare function parse({ program, tokens }: TokenizedProgram): ProgramAST;
export declare const parseStatement: (tokens: Token[], context: ProgramASTBranchNode | null) => Statement;
export declare function isLiteral(type: TokenType): boolean;
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
export declare const checkStatement: (statement: typeof Statement, input: Token[]) => StatementCheckFailResult | StatementCheckTokenRange[];
export type OperatorType<T = TokenType> = T extends `operator.${infer N}` ? N extends "minus" ? never : (N | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference") : never;
export type OperatorMode = "binary" | "binary_o_unary_prefix" | "unary_prefix" | "unary_prefix_o_postfix" | "unary_postfix_o_prefix";
export type OperatorCategory = "arithmetic" | "logical" | "string" | "special";
export declare class Operator implements IFormattable {
    token: TokenType;
    name: string;
    type: OperatorMode;
    category: OperatorCategory;
    constructor(args: ClassProperties<Operator>);
    fmtText(): string;
    fmtDebug(): string;
}
export declare const operatorsByPriority: Operator[][];
export declare const operators: Omit<Record<"assignment" | "add" | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference" | "multiply" | "divide" | "mod" | "integer_divide" | "and" | "or" | "not" | "equal_to" | "not_equal_to" | "less_than" | "greater_than" | "less_than_equal" | "greater_than_equal" | "pointer" | "string_concatenate", Operator>, "assignment" | "pointer">;
export declare const expressionLeafNodeTypes: TokenType[];
export declare const parseExpressionLeafNode: (token: Token) => ExpressionASTLeafNode;
export declare const parseExpression: (input: Token[], recursive?: any) => ExpressionASTNode;
export {};
