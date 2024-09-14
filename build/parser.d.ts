import { Token, TokenizedProgram, TokenType } from "./lexer-types.js";
import { ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTTypeNode, ProgramAST, ProgramASTBranchNode, TokenMatcher } from "./parser-types.js";
import { UnresolvedVariableType } from "./runtime-types.js";
import { FunctionArguments, Statement } from "./statements.js";
import { TextRange } from "./types.js";
import { RangeArray } from "./utils.js";
export declare const parseFunctionArguments: (tokens: RangeArray<Token>) => FunctionArguments;
export declare const processTypeData: (typeNode: ExpressionASTTypeNode) => UnresolvedVariableType;
export declare const parseType: (tokens: RangeArray<Token>) => ExpressionASTTypeNode;
export declare function splitTokensToStatements(tokens: RangeArray<Token>): RangeArray<Token>[];
export declare function parse({ program, tokens }: TokenizedProgram): ProgramAST;
export declare function getPossibleStatements(tokens: RangeArray<Token>, context: ProgramASTBranchNode | null): [
    definitions: (typeof Statement)[],
    error: ((valid: typeof Statement) => never) | null
];
export declare const parseStatement: (tokens: RangeArray<Token>, context: ProgramASTBranchNode | null, allowRecursiveCall: boolean) => Statement;
export declare function isLiteral(type: TokenType): boolean;
export type StatementCheckTokenRange = (Token | {
    type: "expression" | "type";
    start: number;
    end: number;
});
type StatementCheckFailResult = {
    message: string;
    priority: number;
    range: TextRange | null;
};
export declare function checkStatement(statement: typeof Statement, input: RangeArray<Token>, allowRecursiveCall: boolean): StatementCheckFailResult | StatementCheckTokenRange[];
export declare function checkTokens(tokens: RangeArray<Token>, input: TokenMatcher[]): boolean;
export declare const expressionLeafNodeTypes: TokenType[];
export declare function parseExpressionLeafNode(token: Token, allowSuper?: boolean, allowNew?: boolean): ExpressionASTLeafNode;
export declare const parseExpression: (input: RangeArray<Token>, recursive?: any, allowSuper?: any, allowNew?: any) => ExpressionASTNode;
export {};
