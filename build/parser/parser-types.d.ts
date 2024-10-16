import { Token, TokenType } from "../lexer/index.js";
import type { CaseBranchStatement, ClassFunctionEndStatement, ClassFunctionStatement, ClassInheritsStatement, ClassProcedureEndStatement, ClassProcedureStatement, ClassStatement, DoWhileEndStatement, DoWhileStatement, ElseStatement, ForEndStatement, ForStatement, ForStepStatement, FunctionStatement, IfStatement, ProcedureStatement, Statement, SwitchStatement, TypeStatement, WhileStatement } from "../statements/index.js";
import { IFormattable, RangeArray } from "../utils/funcs.js";
import type { ClassProperties, TextRange, TextRanged } from "../utils/types.js";
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
export declare const ExpressionASTTypeNodes: readonly [typeof Token, typeof ExpressionASTArrayTypeNode, typeof ExpressionASTRangeTypeNode];
export declare const ExpressionASTNodes: readonly [typeof Token, typeof ExpressionASTBranchNode, typeof ExpressionASTFunctionCallNode, typeof ExpressionASTArrayAccessNode, typeof ExpressionASTClassInstantiationNode];
export type OperatorName<T = TokenType> = T extends `operator.${infer N}` ? N extends ("minus" | "assignment" | "pointer" | "range") ? never : (N | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference") : never;
export type OperatorFix = "binary" | "binary_o_unary_prefix" | "unary_prefix" | "unary_prefix_o_postfix" | "unary_postfix_o_prefix";
export type OperatorCategory = "arithmetic" | "logical" | "string" | "special";
export type OperatorType = `operator.${OperatorName}`;
export declare class Operator implements IFormattable {
    token: TokenType;
    id: OperatorType;
    fix: OperatorFix;
    category: OperatorCategory;
    constructor(args: ClassProperties<Operator>);
    fmtText(): string;
    fmtDebug(): string;
}
export type PreprocessedOperator = {
    category: OperatorCategory;
    fix?: OperatorFix;
} & ({
    id: OperatorType;
    token: TokenType;
} | {
    token: OperatorType & TokenType;
});
export declare const operatorsByPriority: Operator[][];
export declare const operators: Record<OperatorType, Operator>;
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+" | "file_mode" | "class_modifier";
export type ProgramAST = {
    program: string;
    nodes: ProgramASTNodeGroup;
};
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
export type ProgramASTLeafNode = Statement;
export declare class ProgramASTBranchNode<T extends ProgramASTBranchNodeType = ProgramASTBranchNodeType> implements TextRanged {
    type: T;
    controlStatements: ProgramASTBranchNodeTypeMapping<T>;
    nodeGroups: ProgramASTNodeGroup[];
    constructor(type: T, controlStatements: ProgramASTBranchNodeTypeMapping<T>, nodeGroups: ProgramASTNodeGroup[]);
    controlStatements_(): Statement[];
    range(): TextRange;
    static typeName(type: ProgramASTBranchNodeType): string;
    typeName(): string;
}
export declare class ProgramASTNodeGroup extends Array<ProgramASTNode> {
    requiresScope: boolean;
    hasTypesOrConstants: boolean;
    hasReturn: boolean;
    private _simple;
    preRun(parent?: ProgramASTBranchNode): void;
    simple(): this is {
        requiresScope: false;
        hasTypesOrConstants: false;
        hasReturn: false;
    };
    static from(nodes: ProgramASTNode[]): ProgramASTNodeGroup;
}
export declare const programASTBranchNodeTypes: readonly ["if", "for", "for.step", "while", "dowhile", "function", "procedure", "switch", "type", "class", "class.inherits", "class_function", "class_procedure"];
export type ProgramASTBranchNodeType = typeof programASTBranchNodeTypes extends ReadonlyArray<infer T> ? T : never;
export declare function ProgramASTBranchNodeType(input: string): ProgramASTBranchNodeType;
export type ProgramASTBranchNodeTypeMapping<T extends ProgramASTBranchNodeType> = T extends "if" ? [IfStatement, Statement] | [IfStatement, ElseStatement, Statement] : T extends "for" ? [ForStatement, ForEndStatement] : T extends "for.step" ? [ForStepStatement, ForEndStatement] : T extends "while" ? [WhileStatement, Statement] : T extends "dowhile" ? [DoWhileStatement, DoWhileEndStatement] : T extends "function" ? [FunctionStatement, Statement] : T extends "procedure" ? [ProcedureStatement, Statement] : T extends "switch" ? [SwitchStatement, ...CaseBranchStatement[], Statement] : T extends "type" ? [TypeStatement, Statement] : T extends "class" ? [ClassStatement, Statement] : T extends "class.inherits" ? [ClassInheritsStatement, Statement] : T extends "class_function" ? [ClassFunctionStatement, ClassFunctionEndStatement] : T extends "class_procedure" ? [ClassProcedureStatement, ClassProcedureEndStatement] : Statement[];
