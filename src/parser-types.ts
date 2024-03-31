import { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { Operator } from "./parser.js";
import { ArrayVariableType, EnumeratedVariableType, PointerVariableType } from "./runtime.js";
import { Statement } from "./statements.js";
import { fail, fquote, getTotalRange, isPrimitiveType } from "./utils.js";


/** Represents an expression tree. */
export type ExpressionAST = ExpressionASTNode; //TODO make this a class too, OR put a "root" property in ExpressionASTBranchNode
/** Represents a single node in an expression AST. */
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTBranchNode;
/** Represents a leaf node (node with no child nodes) in an expression AST. */
export type ExpressionASTLeafNode = Token;
/** Represents a branch node (node with child nodes) in an expression AST. */
export class ExpressionASTBranchNode implements TextRanged {
	range: TextRange;
	constructor(
		public operatorToken: Token,
		public operator: Operator | "function call" | "array access",
		public nodes: ExpressionASTNode[],
		public allTokens: Token[],
	){
		this.range = getTotalRange(allTokens);
	}
	toString(){
		return this.allTokens.join(" ");
	}
}
/** Represents a special node that represents an array type, such as `ARRAY[1:!0, 1:20] OF INTEGER` */
export class ExpressionASTArrayTypeNode implements TextRanged {
	range: TextRange;
	constructor(
		public lengthInformation: [low:Token, high:Token][],
		public elementType: Token,
		public allTokens: Token[],
	){
		this.range = getTotalRange(allTokens);
	}
	toData():ArrayVariableType {
		return new ArrayVariableType(
			this.lengthInformation.map(bounds => bounds.map(t => Number(t.text)) as [number, number]),
			isPrimitiveType(this.elementType.text) ? this.elementType.text : fail(fquote`Invalid variable type ${this.elementType.text}`)
		);
	}
}
export class ExpressionASTPointerTypeNode implements TextRanged {
	range: TextRange;
	constructor(
		public targetType: Token,
		public allTokens: Token[],
	){
		this.range = getTotalRange(allTokens);
	}
	toData(name:string):PointerVariableType {
		return new PointerVariableType(
			name,
			isPrimitiveType(this.targetType.text) ? this.targetType.text : fail(fquote`Invalid variable type ${this.targetType.text}`)
		);
	}
}
export class ExpressionASTEnumTypeNode implements TextRanged {
	range: TextRange;
	constructor(
		public values: Token[],
		public allTokens: Token[],
	){
		this.range = getTotalRange(allTokens);
	}
	toData(name:string):EnumeratedVariableType {
		return new EnumeratedVariableType(
			name,
			this.values.map(t => t.text)
		);
	}
}
/** Represents a node that represents a type, which can be either a single token or an array type node. */
export type ExpressionASTTypeNode = Token | ExpressionASTArrayTypeNode;
/** Represents an "extended" expression AST node, which may also be an array type node */
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTArrayTypeNode;

/** Matches one or more tokens when validating a statement. expr+ causes an expression to be parsed, and type+ causes a type to be parsed. Variadic matchers cannot be adjacent, because the matcher after the variadic matcher is used to determine how many tokens to match. */
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+";

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
export class ProgramASTBranchNode implements TextRanged {
	constructor(
		public type: ProgramASTBranchNodeType,
		/**
		 * Contains the control statements for this block.
		 * @example for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
		 */
		public controlStatements: Statement[],
		public nodeGroups: ProgramASTNode[][],
	){}
	range():TextRange {
		return getTotalRange((this.controlStatements as (Statement | ProgramASTNode)[]).concat(this.nodeGroups.flat()));
	}
}
/** The valid types for a branch node in a program AST. */
export type ProgramASTBranchNodeType = "if" | "for" | "while" | "dowhile" | "function" | "procedure" | "switch";
