import type { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { ArrayVariableType } from "./runtime-types.js";
import type { Statement } from "./statements.js";
import type { ClassProperties, IFormattable } from "./types.js";
export type ExpressionAST = ExpressionASTNode;
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTBranchNode | ExpressionASTFunctionCallNode | ExpressionASTArrayAccessNode | ExpressionASTClassInstantiationNode;
export type ExpressionASTLeafNode = Token;
export declare class ExpressionASTBranchNode implements TextRanged, IFormattable {
    operatorToken: Token;
    operator: Operator;
    nodes: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(operatorToken: Token, operator: Operator, nodes: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTFunctionCallNode implements TextRanged, IFormattable {
    functionName: ExpressionASTLeafNode | ExpressionASTBranchNode;
    args: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(functionName: ExpressionASTLeafNode | ExpressionASTBranchNode, args: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTClassInstantiationNode implements TextRanged {
    className: Token;
    args: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(className: Token, args: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTArrayAccessNode implements TextRanged, IFormattable {
    target: ExpressionASTNode;
    indices: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(target: ExpressionASTNode, indices: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTArrayTypeNode implements TextRanged, IFormattable {
    lengthInformation: [low: Token, high: Token][];
    elementType: Token;
    allTokens: Token[];
    range: TextRange;
    constructor(lengthInformation: [low: Token, high: Token][], elementType: Token, allTokens: Token[]);
    toData(): ArrayVariableType;
    fmtText(): string;
    fmtDebug(): string;
}
export type ExpressionASTTypeNode = Token | ExpressionASTArrayTypeNode;
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTArrayTypeNode;
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
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+" | "file_mode" | "class_modifier";
export type ProgramAST = {
    program: string;
    nodes: ProgramASTNode[];
};
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
export type ProgramASTLeafNode = Statement;
export declare class ProgramASTBranchNode implements TextRanged {
    type: ProgramASTBranchNodeType;
    controlStatements: Statement[];
    nodeGroups: ProgramASTNode[][];
    constructor(type: ProgramASTBranchNodeType, controlStatements: Statement[], nodeGroups: ProgramASTNode[][]);
    range(): TextRange;
}
export declare const programASTBranchNodeTypes: readonly ["if", "for", "for.step", "while", "dowhile", "function", "procedure", "switch", "type", "class", "class_function", "class_procedure"];
export type ProgramASTBranchNodeType = typeof programASTBranchNodeTypes extends ReadonlyArray<infer T> ? T : never;
export declare function ProgramASTBranchNodeType(input: string): ProgramASTBranchNodeType;
