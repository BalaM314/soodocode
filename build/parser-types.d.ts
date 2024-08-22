import type { Token, TokenType } from "./lexer-types.js";
import type { DoWhileEndStatement, DoWhileStatement, ForEndStatement, ForStatement, Statement } from "./statements.js";
import type { ClassProperties, IFormattable, TextRange, TextRanged } from "./types.js";
import { RangeArray } from "./utils.js";
export type ExpressionAST = ExpressionASTNode;
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTBranchNode | ExpressionASTFunctionCallNode | ExpressionASTArrayAccessNode | ExpressionASTClassInstantiationNode;
export type ExpressionASTLeafNode = Token;
export declare class ExpressionASTBranchNode implements TextRanged, IFormattable {
    operatorToken: Token;
    operator: Operator;
    nodes: RangeArray<ExpressionAST>;
    allTokens: RangeArray<Token>;
    range: TextRange;
    constructor(operatorToken: Token, operator: Operator, nodes: RangeArray<ExpressionAST>, allTokens: RangeArray<Token>);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTFunctionCallNode implements TextRanged, IFormattable {
    functionName: ExpressionASTLeafNode | ExpressionASTBranchNode;
    args: RangeArray<ExpressionAST>;
    allTokens: RangeArray<Token>;
    range: TextRange;
    constructor(functionName: ExpressionASTLeafNode | ExpressionASTBranchNode, args: RangeArray<ExpressionAST>, allTokens: RangeArray<Token>);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTClassInstantiationNode implements TextRanged {
    className: Token;
    args: RangeArray<ExpressionAST>;
    allTokens: RangeArray<Token>;
    range: TextRange;
    constructor(className: Token, args: RangeArray<ExpressionAST>, allTokens: RangeArray<Token>);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTArrayAccessNode implements TextRanged, IFormattable {
    target: ExpressionASTNode;
    indices: RangeArray<ExpressionAST>;
    allTokens: RangeArray<Token>;
    range: TextRange;
    constructor(target: ExpressionASTNode, indices: RangeArray<ExpressionAST>, allTokens: RangeArray<Token>);
    toString(): string;
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTArrayTypeNode implements TextRanged, IFormattable {
    lengthInformation: [low: ExpressionAST, high: ExpressionAST][] | null;
    elementType: Token;
    allTokens: RangeArray<Token>;
    range: TextRange;
    constructor(lengthInformation: [low: ExpressionAST, high: ExpressionAST][] | null, elementType: Token, allTokens: RangeArray<Token>);
    fmtText(): string;
    fmtDebug(): string;
}
export declare class ExpressionASTRangeTypeNode implements TextRanged, IFormattable {
    low: Token;
    high: Token;
    allTokens: RangeArray<Token>;
    range: TextRange;
    constructor(low: Token, high: Token, allTokens: RangeArray<Token>);
    fmtText(): string;
    fmtDebug(): string;
}
export type ExpressionASTTypeNode = Token | ExpressionASTRangeTypeNode | ExpressionASTArrayTypeNode;
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTTypeNode;
export type OperatorType<T = TokenType> = T extends `operator.${infer N}` ? N extends ("minus" | "assignment" | "pointer" | "range") ? never : (N | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference") : never;
export type OperatorMode = "binary" | "binary_o_unary_prefix" | "unary_prefix" | "unary_prefix_o_postfix" | "unary_postfix_o_prefix";
export type OperatorCategory = "arithmetic" | "logical" | "string" | "special";
export type OperatorName = "operator.or" | "operator.and" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.less_than_equal" | "operator.greater_than" | "operator.greater_than_equal" | "operator.add" | "operator.subtract" | "operator.string_concatenate" | "operator.multiply" | "operator.divide" | "operator.integer_divide" | "operator.mod" | "operator.pointer_reference" | "operator.not" | "operator.negate" | "operator.pointer_dereference" | "operator.access";
export declare class Operator implements IFormattable {
    token: TokenType;
    name: OperatorName;
    type: OperatorMode;
    category: OperatorCategory;
    constructor(args: ClassProperties<Operator>);
    fmtText(): string;
    fmtDebug(): string;
}
export type PreprocessedOperator = {
    token: TokenType;
    category: OperatorCategory;
    type?: OperatorMode;
    name: OperatorName;
} | {
    token: OperatorName & TokenType;
    category: OperatorCategory;
    type?: OperatorMode;
};
export declare const operatorsByPriority: Operator[][];
export declare const operators: Record<OperatorType, Operator>;
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+" | "file_mode" | "class_modifier";
export type ProgramAST = {
    program: string;
    nodes: ProgramASTNode[];
};
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
export type ProgramASTLeafNode = Statement;
export declare class ProgramASTBranchNode<T extends ProgramASTBranchNodeType = ProgramASTBranchNodeType> implements TextRanged {
    type: T;
    controlStatements: ProgramASTBranchNodeTypeMapping<T>;
    nodeGroups: ProgramASTNode[][];
    constructor(type: T, controlStatements: ProgramASTBranchNodeTypeMapping<T>, nodeGroups: ProgramASTNode[][]);
    controlStatements_(): Statement[];
    range(): TextRange;
    static typeName(type: ProgramASTBranchNodeType): string;
    typeName(): string;
}
export declare const programASTBranchNodeTypes: readonly ["if", "for", "for.step", "while", "dowhile", "function", "procedure", "switch", "type", "class", "class.inherits", "class_function", "class_procedure"];
export type ProgramASTBranchNodeType = typeof programASTBranchNodeTypes extends ReadonlyArray<infer T> ? T : never;
export declare function ProgramASTBranchNodeType(input: string): ProgramASTBranchNodeType;
export type ProgramASTBranchNodeTypeMapping<T extends ProgramASTBranchNodeType> = T extends "for" ? [ForStatement, ForEndStatement] : T extends "dowhile" ? [DoWhileStatement, DoWhileEndStatement] : Statement[];
