import { getText, type Token, type TokenType } from "./lexer.js";

export type ExpressionAST = ExpressionASTNode;
export type ExpressionASTLeafNode = Token;
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTTreeNode;
export type ExpressionASTTreeNode = {
	token: Token;
	nodes: ExpressionASTNode[];
}

export abstract class Statement {
	constructor(public tokens:Token[], public type:StatementType){}
	toString(){
		return this.tokens.map(t => t.text).join(" ");
	}
}

//@statement(["keyword.function", "name", "parentheses.open", "...", "parentheses.close", "keyword.returns", "name"])
export class FunctionStatement extends Statement {
	//FUNCTION Amogus ( amogus : type , sussy : type ) RETURNS BOOLEAN
	/** Mapping between name and type */
	args: Map<string, string>;
	returnType: string;
	constructor(tokens:Token[]){
		super(tokens, "function");
		if(
			tokens.length >= 6 &&
			//tokens[0] is the keyword function, which was used to determine the statement type
			tokens[1].type == "name" &&
			tokens[2].type == "parentheses.open" &&
			//variable number of arguments
			tokens.at(-3)!.type == "parentheses.close" &&
			tokens.at(-2)!.type == "keyword.returns" &&
			tokens.at(-1)!.type == "name"
		){
			this.args = parseFunctionArguments(tokens, 3, tokens.length - 4);
			this.returnType = tokens.at(-1)!.text.toUpperCase();
		} else throw new Error("Invalid statement");
	}
}

export type ProgramAST = ProgramASTNode[];
export type ProgramASTLeafNode = Statement;
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTTreeNode;
export type ProgramASTTreeNode = {
	startStatement: Statement;
	endStatement: Statement;
	type: ProgramASTTreeNodeType;
	nodes: ProgramASTNode[];
}
//not necessary
//export type UnfinishedProgramASTTreeNode = Partial<ProgramASTTreeNode> & Omit<ProgramASTTreeNode, "endStatement">;

export type ProgramASTTreeNodeType = "if" | "for" | "while" | "dowhile" | "function" | "procedure";
export type StatementType =
	"declaration" | "assignment" | "output" | "input" | "return" |
	"if" | "if.end" |
	"for" | "for.end" |
	"while" | "while.end" |
	"dowhile" | "dowhile.end" |
	"function" | "function.end" |
	"procedure" | "procedure.end";

/** `low` and `high` must correspond to the indexes of the lowest and highest elements in the function arguments. */
export function parseFunctionArguments(tokens:Token[], low:number, high:number):Map<string, string> {
	const size = high - low + 1;
	if(!(size != 0 || size % 4 != 3))
		throw new Error(`Invalid function arguments: incorrect number of tokens (${size}), must be 0 or 3 above a multiple of 4`);
	const numArgs = Math.ceil(size / 4);
	const args = new Map<string, string>();

	for(let i = 0; i < numArgs; i ++){
		const name = tokens[low + 4 * i + 0];
		const colon = tokens[low + 4 * i + 1];
		const type = tokens[low + 4 * i + 2];
		const comma = tokens[low + 4 * i + 3];
		if(
			name.type == "name" &&
			colon.type == "punctuation.colon" &&
			type.type == "name" &&
			(i == numArgs - 1
				? comma.type == "parentheses.close" //Last argument and the 4th token is the closing paren
				: comma.type == "punctuation.comma") //Not the last argument and the token is a comma
		) args.set(name.text, type.text.toUpperCase());
		else throw new Error("Invalid function arguments");
	}
	return args;
}

export function parse(tokens:Token[]):ProgramAST {
	const lines:Token[][] = [[]];
	for(let i = 0; i < tokens.length; i ++){
		if(tokens[i].type == "newline"){
			if(i != (tokens.length - 1) && lines.at(-1)!.length != 0)
				lines.push([]);
		} else {
			lines.at(-1)!.push(tokens[i]);
		}
	}
	const statements = lines.map(parseStatement);
	const program:ProgramAST = [];
	function getActiveBuffer(){
		if(blockStack.length == 0) return program; else return blockStack.at(-1)!.nodes;
	}
	const blockStack:ProgramASTTreeNode[] = [];
	for(const statement of statements){
		switch(statement.type){
			case "assignment": case "declaration": case "output": case "input": case "return":
				getActiveBuffer().push(statement);
				break;
			case "if": case "for": case "while": case "dowhile": case "function": case "procedure":
				const node:ProgramASTTreeNode = {
					startStatement: statement,
					endStatement: null!, //null! goes brr
					type: statement.type,
					nodes: []
				};
				getActiveBuffer().push(node);
				blockStack.push(node);
				break;
			case "if.end": case "for.end": case "while.end": case "dowhile.end": case "function.end": case "procedure.end":
				const lastNode = blockStack.at(-1);
				if(!lastNode) throw new Error(`Invalid statement ${stringifyStatement(statement)}: no open blocks`);
				else if(lastNode.startStatement.type == statement.type.split(".")[0]){ //probably bad code
					lastNode.endStatement = statement;
					blockStack.pop();
				} else throw new Error(`Invalid statement ${stringifyStatement(statement)}: current block is of type ${lastNode.startStatement.type}`);
				break;
			default: statement.type satisfies never; break;
		}
	}
	if(blockStack.length) throw new Error(`There were unclosed blocks: ${stringifyStatement(blockStack.at(-1)!.startStatement)}`);
	return program;
}

/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export function parseStatement(tokens:Token[]):Statement {
	if(tokens.length == 0) throw new Error(`Invalid statement: empty`);
	switch(tokens[0].type){
		//TODO bad implementation, take stuff from MLOGX
		case "keyword.declare": return { type: "declaration", tokens };
		case "keyword.output": return { type: "output", tokens };
		case "keyword.input": return { type: "input", tokens };
		case "name":
			if(tokens.length >= 3 && tokens[1].type == "operator.assignment")
				return { type: "assignment", tokens };
			else throw new Error(`Invalid statement`);
		case "keyword.return": if(tokens.length >= 2) return { type: "return", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.if":
			if(tokens.length >= 3 && tokens.at(-1)!.type == "keyword.then") return { type: "if", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.for":
			if(
				tokens.length >= 6 &&
				tokens[1].type == "name" &&
				tokens[2].type == "operator.assignment" &&
				(tokens[3].type == "name" || tokens[3].type == "number.decimal") &&
				tokens[4].type == "keyword.to" &&
				(tokens[5].type == "name" || tokens[5].type == "number.decimal")
			) return { type: "for", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.while":
			if(tokens.length >= 2) return { type: "while", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.dowhile":
			if(tokens.length == 1) return { type: "if", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.function":
			if(
				tokens.length >= 6 &&
				tokens[1].type == "name" &&
				tokens[2].type == "parentheses.open" &&
				//arguments inside, difficult to parse
				tokens.at(-3)!.type == "parentheses.close" &&
				tokens.at(-2)!.type == "keyword.returns" &&
				tokens.at(-1)!.type == "name"
			) return { type: "function", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.procedure":
			if(
				tokens.length >= 4 &&
				tokens[1].type == "name" &&
				tokens[2].type == "parentheses.open" &&
				//arguments inside, difficult to parse
				tokens.at(-1)!.type == "parentheses.close"
			) return { type: "procedure", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.if_end": if(tokens.length == 1) return { type: "if.end", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.for_end":
			if(
				tokens.length == 2 && tokens[1].type == "name"
			) return { type: "for.end", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.while_end": if(tokens.length == 1) return { type: "while.end", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.dowhile_end": if(tokens.length >= 2) return { type: "dowhile.end", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.function_end": if(tokens.length == 1) return { type: "function.end", tokens }; else throw new Error(`Invalid statement`);
		case "keyword.procedure_end": if(tokens.length == 1) return { type: "procedure.end", tokens }; else throw new Error(`Invalid statement`);
		default: throw new Error(`Invalid statement`);
	}
}

export function stringifyStatement(statement:Statement):string {
	return statement.tokens.map(t => t.text).join(" ");
}

const out:ExpressionASTTreeNode = {
	token: {text: "+", type: "operator.add"},
	nodes: [
		{
			token: {text: "-", type: "operator.subtract"},
			nodes: [
				{text: "5", type: "number.decimal"},
				{text: "6", type: "number.decimal"},
			]
		},
		{
			token: {text: "*", type: "operator.multiply"},
			nodes: [
				{text: "1", type: "number.decimal"},
				{
					token: {text: "/", type: "operator.divide"},
					nodes: [
						{text: "2", type: "number.decimal"},
						{text: "3", type: "number.decimal"},
					]
				},
			]
		}
	]
};

const operators = [["multiply", "divide"], ["add", "subtract"]].reverse();

export function parseExpression(input:Token[]):ExpressionASTNode {
	//If there is only one token
	if(input.length == 1){
		if(input[0].type == "number.decimal") //and it's a number
			return input[0]; //nothing to parse, just return the number
		else
			throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: not a number`);
	}
	//If the whole expression is surrounded by parentheses, parse the inner expression
	if(input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
		return parseExpression(input.slice(1, -1));

	//Go through P E M-D A-S in reverse order to find the operator with the lowest priority
	for(const operatorsOfPriority of operators){
		let parenNestLevel = 0;
		//Find the index of the last (lowest priority) operator of the current priority
		//Iterate through string backwards
		for(let i = input.length - 1; i >= 0; i --){
			//Handle parentheses
			//The string is being iterated through backwards, so ) means go up a level and ( means go down a level
			if(input[i].type == "parentheses.close") parenNestLevel ++;
			else if(input[i].type == "parentheses.open") parenNestLevel --;
			if(parenNestLevel < 0)
				//nest level going below 0 means too many (, so unclosed parens
				throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed parentheses`);

			if(
				parenNestLevel == 0 && //the operator is not inside parentheses and
				operatorsOfPriority.map(o => `operator.${o}`).includes(input[i].type) //it is currently being searched for
			){
				//this is the lowest priority operator in the expression and should become the root node
				const left = input.slice(0, i);
				const right = input.slice(i + 1);
				//Make sure there is something on left and right of the operator
				if(left.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[i].text}`);
				if(right.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
				return {
					token: input[i],
					nodes: [parseExpression(left), parseExpression(right)]
				};
			}
		}
		//Nest level being above zero at the end of the string means too many )
		if(parenNestLevel != 0)
			throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no parentheses group to close`);

		//No operators of the current priority found, look for operator with the next level higher priority
	}

	//No operators found at all, something went wrong
	throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found`);
}

// const x:ProgramAST = {nodes: [
// 	{nodes: ["DECLARE" , "Count", ":", "INTEGER"]},

// 	Count <- 1
// 	REPEAT
// 		OUTPUT Count
// 		OUTPUT "Sussy Baka"
// 		Count <- Count + 1
// 	UNTIL Count < 200
// ]};
