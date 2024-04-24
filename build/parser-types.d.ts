import type { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { Operator } from "./parser.js";
import { ArrayVariableType } from "./runtime-types.js";
import type { Statement } from "./statements.js";
import { IFormattable } from "./types.js";
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
    functionName: ExpressionASTNode;
    args: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(functionName: ExpressionASTNode, args: ExpressionASTNode[], allTokens: Token[]);
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
export type ProgramASTBranchNodeType = "if" | "for" | "for.step" | "while" | "dowhile" | "function" | "procedure" | "switch" | "type" | "class" | "class_function" | "class_procedure";
