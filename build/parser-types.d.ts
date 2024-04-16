import { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { Operator } from "./parser.js";
import { ArrayVariableType, EnumeratedVariableType, PointerVariableType } from "./runtime-types.js";
import { Statement } from "./statements.js";
/** Represents an expression tree. */
export type ExpressionAST = ExpressionASTNode;
/** Represents a single node in an expression AST. */
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTBranchNode | ExpressionASTFunctionCallNode | ExpressionASTArrayAccessNode | ExpressionASTClassInstantiationNode;
/** Represents a leaf node (node with no child nodes) in an expression AST. */
export type ExpressionASTLeafNode = Token;
/** Represents a branch node (node with child nodes) in an expression AST. */
export declare class ExpressionASTBranchNode implements TextRanged {
    operatorToken: Token;
    operator: Operator;
    nodes: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(operatorToken: Token, operator: Operator, nodes: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    getText(): string;
}
export declare class ExpressionASTFunctionCallNode implements TextRanged {
    functionName: Token;
    args: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(functionName: Token, args: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    getText(): string;
}
export declare class ExpressionASTClassInstantiationNode implements TextRanged {
    className: Token;
    args: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(className: Token, args: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    getText(): string;
}
export declare class ExpressionASTArrayAccessNode implements TextRanged {
    target: ExpressionASTNode;
    indices: ExpressionASTNode[];
    allTokens: Token[];
    range: TextRange;
    constructor(target: ExpressionASTNode, indices: ExpressionASTNode[], allTokens: Token[]);
    toString(): string;
    getText(): string;
}
/** Represents a special node that represents an array type, such as `ARRAY[1:10, 1:20] OF INTEGER` */
export declare class ExpressionASTArrayTypeNode implements TextRanged {
    lengthInformation: [low: Token, high: Token][];
    elementType: Token;
    allTokens: Token[];
    range: TextRange;
    constructor(lengthInformation: [low: Token, high: Token][], elementType: Token, allTokens: Token[]);
    toData(): ArrayVariableType;
    toString(): string;
    getText(): string;
}
export declare class ExpressionASTPointerTypeNode implements TextRanged {
    targetType: Token;
    allTokens: Token[];
    range: TextRange;
    constructor(targetType: Token, allTokens: Token[]);
    toData(name: string): PointerVariableType;
}
export declare class ExpressionASTEnumTypeNode implements TextRanged {
    values: Token[];
    allTokens: Token[];
    range: TextRange;
    constructor(values: Token[], allTokens: Token[]);
    toData(name: string): EnumeratedVariableType;
}
/** Represents a node that represents a type, which can be either a single token or an array type node. */
export type ExpressionASTTypeNode = Token | ExpressionASTArrayTypeNode;
/** Represents an "extended" expression AST node, which may also be an array type node */
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTArrayTypeNode;
/** Matches one or more tokens when validating a statement. expr+ causes an expression to be parsed, and type+ causes a type to be parsed. Variadic matchers cannot be adjacent, because the matcher after the variadic matcher is used to determine how many tokens to match. */
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+" | "file_mode";
/** Represents a fully processed program. */
export type ProgramAST = {
    program: string;
    nodes: ProgramASTNode[];
};
/** Represents a single node in a program AST. */
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
/** Represents a leaf node (node with no child nodes) in a program AST. */
export type ProgramASTLeafNode = Statement;
/** Represents a branch node (node with children) in a program AST. */
export declare class ProgramASTBranchNode implements TextRanged {
    type: ProgramASTBranchNodeType;
    /**
     * Contains the control statements for this block.
     * @example for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
     */
    controlStatements: Statement[];
    nodeGroups: ProgramASTNode[][];
    constructor(type: ProgramASTBranchNodeType, 
    /**
     * Contains the control statements for this block.
     * @example for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
     */
    controlStatements: Statement[], nodeGroups: ProgramASTNode[][]);
    range(): TextRange;
}
/** The valid types for a branch node in a program AST. */
export type ProgramASTBranchNodeType = "if" | "for" | "for.step" | "while" | "dowhile" | "function" | "procedure" | "switch" | "type";
