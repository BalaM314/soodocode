import { Token, TokenizedProgram, TokenType } from "../lexer/index.js";
import { UnresolvedVariableType } from "../runtime/runtime-types.js";
import { FunctionArguments, Statement } from "../statements/index.js";
import { ErrorMessage, RangeArray } from "../utils/funcs.js";
import { TextRange, TextRangeLike } from "../utils/types.js";
import { ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTTypeNode, ProgramAST, ProgramASTBranchNode, TokenMatcher } from "./parser-types.js";
export declare const parseFunctionArguments: (tokens: RangeArray<Token>) => FunctionArguments;
export declare const processTypeData: (typeNode: ExpressionASTTypeNode) => UnresolvedVariableType;
export declare function parseType(tokens: RangeArray<Token>, gRange: TextRangeLike): ExpressionASTTypeNode;
export declare function splitTokensToStatements(tokens: RangeArray<Token>): RangeArray<Token>[];
export declare function parse({ program, tokens }: TokenizedProgram): ProgramAST;
export declare function getPossibleStatements(tokens: RangeArray<Token>, context: ProgramASTBranchNode | null | "any"): [
    definitions: (typeof Statement)[],
    error: ((valid: typeof Statement) => never) | null
];
export declare const parseStatement: (tokens: RangeArray<Token>, context: ProgramASTBranchNode | null | "any", allowRecursiveCall: boolean) => Statement;
export declare function isLiteral(type: TokenType): boolean;
export type StatementCheckTokenRange = (Token | {
    type: "expression" | "type";
    start: number;
    end: number;
});
type StatementCheckFailResult = {
    message: ErrorMessage;
    priority: number;
    range: TextRange | null;
};
export declare function checkStatement(statement: typeof Statement, input: RangeArray<Token>, allowRecursiveCall: boolean): StatementCheckFailResult | StatementCheckTokenRange[];
export declare function checkTokens(tokens: RangeArray<Token>, input: TokenMatcher[]): boolean;
export declare const expressionLeafNodeTypes: TokenType[];
export declare const literalTypes: TokenType[];
export declare function parseExpressionLeafNode(token: Token, allowSuper?: boolean, allowNew?: boolean): ExpressionASTLeafNode;
export declare const parseExpression: (input: RangeArray<Token>, recursive?: boolean, allowSuper?: boolean, allowNew?: boolean) => ExpressionASTNode;
export {};
