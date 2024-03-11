import { SymbolType, Token, TokenType, symbol, token } from "../src/lexer-types.js";
import {
	ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTNodeExt, ProgramAST, ProgramASTBranchNodeType, ProgramASTNode
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
	"add": token("operator.add", "+"),
	"subtract": token("operator.subtract", "-"),
	"multiply": token("operator.multiply", "*"),
	"divide": token("operator.divide", "/"),
	"mod": token("operator.mod", "MOD"),
	"integer_divide": token("operator.integer_divide", "DIV"),
	"and": token("operator.and", "AND"),
	"or": token("operator.or", "OR"),
	"not": token("operator.not", "NOT"),
	"equal_to": token("operator.equal_to", "="),
	"not_equal_to": token("operator.not_equal_to", "<>"),
	"less_than": token("operator.less_than", "<"),
	"greater_than": token("operator.greater_than", ">"),
	"less_than_equal": token("operator.less_than_equal", "<="),
	"greater_than_equal": token("operator.greater_than_equal", ">="),
	"string_concatenate": token("operator.string_concatenate", "&"),
	"negate": token("operator.subtract", "-"),
}

export function is_ExpressionASTArrayTypeNode(input:_ExpressionAST | _ExpressionASTArrayTypeNode):input is _ExpressionASTArrayTypeNode {
	return Array.isArray(input[1]);
}

export function process_Statement(input:_Statement):Statement {
	return new input[0](input[1].map(process_ExpressionASTExt));
}

export function process_ExpressionASTArrayTypeNode(input:_ExpressionASTArrayTypeNode):ExpressionASTArrayTypeNode {
	return {
		lengthInformation: input[0].map(bounds => bounds.map(b => token("number.decimal", b.toString()))),
		type: token(input[1])
	};
}

export function process_ExpressionASTExt(input:_ExpressionASTExt):ExpressionASTNodeExt {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input);
	else return process_ExpressionAST(input);
}

export function process_ExpressionAST(input:_ExpressionAST):ExpressionAST {
	if(input.length == 2){
		return token(...input);
	} else {
		let operator:Operator | "array access" | "function call";
		let operatorToken:Token;
		if(Array.isArray(input[1]) && input[1][0] == "array access"){
			operator = input[1][0];
			operatorToken = token("name", input[1][1]);
		} else if(Array.isArray(input[1]) && input[1][0] == "function call"){
			operator = input[1][0];
			operatorToken = token("name", input[1][1]);
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

export function process_ProgramAST(input:_ProgramAST, program:string = null! /* SPECNULL */):ProgramAST {
	return {
		program,
		nodes: input.map(process_ProgramASTNode)
	};
}

export function process_ProgramASTNode(input:_ProgramASTNode):ProgramASTNode {
	return Array.isArray(input)
		? process_Statement(input)
		: {
			type: input.type,
			controlStatements: input.controlStatements.map(process_Statement),
			nodeGroups: input.nodeGroups.map(block => block.map(process_ProgramASTNode)),
		};
}
