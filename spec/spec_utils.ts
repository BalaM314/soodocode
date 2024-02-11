import { SymbolType, Token, TokenType, symbol, token } from "../src/lexer-types.js";
import {
	ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTNodeExt, ProgramAST, ProgramASTBranchNodeType
} from "../src/parser-types.js";
import { Operator, operators, OperatorType } from "../src/parser.js";
import { Statement } from "../src/statements.js";


//Types prefixed with a underscore indicate simplified versions that contain the data required to construct the normal type with minimal boilerplate.

export type _Symbol = [type:SymbolType, text:string];
export type _Token = [type:TokenType, text:string];

export type _ExpressionAST = _ExpressionASTNode;
export type _ExpressionASTLeafNode = _Token;
export type _ExpressionASTNode = _ExpressionASTLeafNode | _ExpressionASTBranchNode;
export type _ExpressionASTBranchNode = [
	"tree",
	operator: _Operator | [type: "function call", name:string] | [type: "array access", name:string],
	nodes: _ExpressionASTNode[],
];
export type _ExpressionASTArrayTypeNode = [lengthInformation:[low:number, high:number][], type:_Token];
export type _ExpressionASTExt = _ExpressionAST | _ExpressionASTArrayTypeNode;

export type _Operator = Exclude<OperatorType, "assignment" | "pointer">;

export type _Statement = [constructor:typeof Statement, input:(_Token | _ExpressionAST | _ExpressionASTArrayTypeNode)[]];
export type _ProgramAST = _ProgramASTNode[];
export type _ProgramASTLeafNode = _Statement;
export type _ProgramASTNode = _ProgramASTLeafNode | _ProgramASTBranchNode;
export type _ProgramASTBranchNode = {
	type: ProgramASTBranchNodeType;
	controlStatements: _Statement[];
	nodeGroups: _ProgramASTNode[][];
}



export const operatorTokens: Record<Exclude<OperatorType, "assignment" | "pointer">, Token> = {
	"add": new Token("operator.add", "+"),
	"subtract": new Token("operator.subtract", "-"),
	"multiply": new Token("operator.multiply", "*"),
	"divide": new Token("operator.divide", "/"),
	"mod": new Token("operator.mod", "MOD"),
	"integer_divide": new Token("operator.integer_divide", "DIV"),
	"and": new Token("operator.and", "AND"),
	"or": new Token("operator.or", "OR"),
	"not": new Token("operator.not", "NOT"),
	"equal_to": new Token("operator.equal_to", "="),
	"not_equal_to": new Token("operator.not_equal_to", "<>"),
	"less_than": new Token("operator.less_than", "<"),
	"greater_than": new Token("operator.greater_than", ">"),
	"less_than_equal": new Token("operator.less_than_equal", "<="),
	"greater_than_equal": new Token("operator.greater_than_equal", ">="),
	"string_concatenate": new Token("operator.string_concatenate", "&"),
	"negate": new Token("operator.subtract", "-"),
}

export function is_ExpressionASTArrayTypeNode(input:_ExpressionAST | _ExpressionASTArrayTypeNode):input is _ExpressionASTArrayTypeNode {
	return Array.isArray(input[1]);
}

export function process_Statement(input:_Statement):Statement {
	return new input[0](input[1].map(process_ExpressionASTExt));
}

export function process_ExpressionASTArrayTypeNode(input:_ExpressionASTArrayTypeNode):ExpressionASTArrayTypeNode {
	return {
		lengthInformation: input[0].map(bounds => bounds.map(b => new Token("number.decimal", b.toString()))),
		type: token(input[1])
	};
}

export function process_ExpressionASTExt(input:_ExpressionASTExt):ExpressionASTNodeExt {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input);
	else return process_ExpressionAST(input);
}

export function process_ExpressionAST(input:_ExpressionAST):ExpressionAST {
	if(input.length == 2){
		return new Token(...input);
	} else {
		let operator:Operator | "array access" | "function call";
		let operatorToken:Token;
		if(Array.isArray(input[1]) && input[1][0] == "array access"){
			operator = input[1][0];
			operatorToken = new Token("name", input[1][1]);
		} else if(Array.isArray(input[1]) && input[1][0] == "function call"){
			operator = input[1][0];
			operatorToken = new Token("name", input[1][1]);
		} else {
			operator = operators[input[1]];
			operatorToken = operatorTokens[input[1]];
		}
		return {
			nodes: input[2].map(process_ExpressionAST),
			operator, operatorToken
		} satisfies ExpressionASTBranchNode;
	}
}

export function process_ProgramAST(output:_ProgramAST):ProgramAST {
	return output.map(n => Array.isArray(n)
		? process_Statement(n)
		: {
			type: n.type,
			controlStatements: n.controlStatements.map(process_Statement),
			nodeGroups: n.nodeGroups.map(process_ProgramAST),
		}
	)
}
