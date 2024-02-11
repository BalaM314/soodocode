import { Token, TokenType } from "./lexer-types.js";
import { Operator } from "./parser.js";
import { StringVariableType } from "./runtime.js";
import { Statement } from "./statements.js";
import { fail } from "./utils.js";


/** Represents an expression tree. */
export type ExpressionAST = ExpressionASTNode;
/** Represents a single node in an expression AST. */
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTBranchNode;
/** Represents a leaf node (node with no child nodes) in an expression AST. */
export type ExpressionASTLeafNode = Token;
/** Represents a branch node (node with child nodes) in an expression AST. */
export type ExpressionASTBranchNode = {
	operatorToken: Token;
	operator: Operator | "function call" | "array access";
	nodes: ExpressionASTNode[];
}
/** Represents a special node that represents an array type, such as `ARRAY[1:!0, 1:20] OF INTEGER` */
export type ExpressionASTArrayTypeNode = {
	lengthInformation: [low:Token, high:Token][];
	type: Token;
}
/** Represents a node that represents a type, which can be either a single token or an array type node. */
export type ExpressionASTTypeNode = Token | ExpressionASTArrayTypeNode;
/** Represents an "extended" expression AST node, which may also be an array type node */
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTArrayTypeNode;

/** Matches one or more tokens when validating a statement. expr+ causes an expression to be parsed, and type+ causes a type to be parsed. Variadic matchers cannot be adjacent, because the matcher after the variadic matcher is used to determine how many tokens to match. */
export type TokenMatcher = TokenType | ".*" | ".+" | "expr+" | "type+";

/** Represents a fully processed program. */
export type ProgramAST = ProgramASTNode[];
/** Represents a single node in a program AST. */
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
/** Represents a leaf node (node with no child nodes) in a program AST. */
export type ProgramASTLeafNode = Statement;
/** Represents a branch node (node with children) in a program AST. */
export type ProgramASTBranchNode = {
	type: ProgramASTBranchNodeType;
	/**
	 * Contains the control statements for this block.
	 * @example for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
	 */
	controlStatements: Statement[];
	nodeGroups: ProgramASTNode[][];
}
/** The valid types for a branch node in a program AST. */
export type ProgramASTBranchNodeType = "if" | "for" | "while" | "dowhile" | "function" | "procedure";

/** Contains data about an array type. Processed from an ExpressionAStArrayTypeNode. */
export class ArrayTypeData {
	totalLength:number;
	lengthInformation_:number[];
	constructor(
		public lengthInformation: [low:number, high:number][],
		public type: StringVariableType,
	){
		if(this.lengthInformation.some(b => b[1] < b[0])) fail(`Invalid length information: upper bound cannot be less than lower bound`);
		if(this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n)))) fail(`Invalid length information: bound was not an integer`);
		this.lengthInformation_ = this.lengthInformation.map(b => b[1] - b[0] + 1);
		this.totalLength = this.lengthInformation_.reduce((a, b) => a * b, 1);
	}
	toString(){
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
}
