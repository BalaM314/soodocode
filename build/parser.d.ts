import { TextRange, Token, TokenizedProgram, TokenType } from "./lexer-types.js";
import { ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTTypeNode, ProgramAST, ProgramASTBranchNode, TokenMatcher } from "./parser-types.js";
import { UnresolvedVariableType } from "./runtime-types.js";
import { FunctionArguments, Statement } from "./statements.js";
export declare const parseFunctionArguments: (tokens: Token[]) => FunctionArguments;
export declare const processTypeData: (typeNode: ExpressionASTTypeNode) => UnresolvedVariableType;
export declare const parseType: (tokens: Token[]) => ExpressionASTTypeNode;
export declare function splitTokensToStatements(tokens: Token[]): Token[][];
export declare function parse({ program, tokens }: TokenizedProgram): ProgramAST;
export declare function getPossibleStatements(tokens: Token[], context: ProgramASTBranchNode | null): (typeof Statement)[];
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
export declare function checkTokens(tokens: Token[], input: TokenMatcher[]): boolean;
export declare const expressionLeafNodeTypes: TokenType[];
export declare const parseExpressionLeafNode: (token: Token) => ExpressionASTLeafNode;
export declare const parseExpression: (input: Token[], recursive?: any) => ExpressionASTNode;
export {};
