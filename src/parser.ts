import { getText, type Token, type TokenType } from "./lexer.js";

export type ExpressionAST = ExpressionASTNode;
export type ExpressionASTLeafNode = Token;
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTTreeNode;
export type ExpressionASTTreeNode = {
	token: Token;
	nodes: ExpressionASTNode[];
}

const statements = {
	startKeyword: {} as Record<string, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};


function statement<TClass extends typeof Statement>(type:StatementType, ...tokens: (TokenType | "...")[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, irregular:"#", ...tokens: (TokenType | "...")[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, category:"block", ...tokens:(TokenType | "...")[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, category:"block", endType:"auto", ...tokens:(TokenType | "...")[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;

function statement<TClass extends typeof Statement>(type:StatementType, ...args:string[]){
	return function (input:TClass):TClass {
		input.type = type;
		if(args[0] == "block"){
			args.unshift();
			input.category = "block";
		} else {
			input.category = "normal";
		}
		if(args[0] == "auto" && input.category == "block"){
			args.unshift();
			statement(type + ".end" as StatementType, args[0] + "_end" as TokenType)( //REFACTOR CHECK
				class __endStatement extends Statement {}
			);
		}
		if(args.length < 1) throw new Error(`All statements must contain at least one token`);
		if(args[0] == "#"){
			statements.irregular.push(input);
		} else {
			if(statements.startKeyword[args[0]]) throw new Error(`Statement starting with ${args[0]} already registered`); //TODO overloads, eg FOR STEP
			statements.startKeyword[args[0]] = input;
		}
		return input;
	}
}

export class Statement {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category: StatementCategory;
	static category: StatementCategory;
	static tokens:(string | "#" | "...")[] = null!;
	static check(input:Token[]):[message:string, priority:number] | true {
		for(let i = this.tokens[0] == "#" ? 1 : 0, j = 0; i < this.tokens.length; i ++){
			if(this.tokens[i] == "..."){
				if(i == this.tokens.length - 1) return true; //Last token is a wildcard
				else throw new Error("todo");
			} else if(this.tokens[i] == "#") throw new Error(`absurd`);
			else if(this.tokens[i] == input[j].type) j++; //Token matches, move to next one
			else return [`Expected a ${this.tokens[i]}, got "${input[j].text}" (${input[j].type})`, 5];
		}
		return true;
	}
	constructor(public tokens:Token[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
	}
	toString(){
		return this.tokens.map(t => t.text).join(" ");
	}
}

@statement("assignment", "#", "name", "operator.assignment", "...")
export class AssignmentStatement extends Statement {}
@statement("output", "keyword.output", "...")
export class OutputStatement extends Statement {}
@statement("input", "keyword.input", "name")
export class InputStatement extends Statement {}
@statement("return", "keyword.return")
export class ReturnStatement extends Statement {}


@statement("if", "block", "auto", "keyword.if", "...", "keyword.then")
export class IfStatement extends Statement {}
@statement("for", "block", "auto", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal")
export class ForStatement extends Statement {} //TODO fix endfor: should be `NEXT i`, not `NEXT`
@statement("while", "block", "auto", "keyword.while", "...")
export class WhileStatement extends Statement {}
@statement("dowhile", "block", "auto", "keyword.dowhile")
export class DoWhileStatement extends Statement {}

@statement("function", "block", "auto", "keyword.function", "name", "parentheses.open", "...", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	//FUNCTION Amogus ( amogus : type , sussy : type ) RETURNS BOOLEAN
	/** Mapping between name and type */
	args: Map<string, string>;
	returnType: string;
	constructor(tokens:Token[]){
		super(tokens);
		this.args = parseFunctionArguments(tokens, 3, tokens.length - 4);
		this.returnType = tokens.at(-1)!.text.toUpperCase();
	}
}

@statement("procedure", "block", "auto", "keyword.procedure", "name", "parentheses.open", "...", "parentheses.close")
export class ProcedueStatement extends Statement {
	//PROCEDURE Amogus ( amogus : type , sussy : type )
	/** Mapping between name and type */
	args: Map<string, string>;
	constructor(tokens:Token[]){
		super(tokens);
		this.args = parseFunctionArguments(tokens, 3, tokens.length - 2);
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
export type StatementCategory = "normal" | "block" | "block_end";

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
		if(statement.category == "normal"){
			getActiveBuffer().push(statement);
		} else if(statement.category == "block"){
			const node:ProgramASTTreeNode = {
				startStatement: statement,
				endStatement: null!, //null! goes brr
				type: statement.stype as ProgramASTTreeNodeType,
				nodes: []
			};
			getActiveBuffer().push(node);
			blockStack.push(node);
		} else if(statement.category == "block_end"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) throw new Error(`Invalid statement ${stringifyStatement(statement)}: no open blocks`);
			else if(lastNode.startStatement.stype == statement.stype.split(".")[0]){ //probably bad code
				lastNode.endStatement = statement;
				blockStack.pop();
			} else throw new Error(`Invalid statement ${stringifyStatement(statement)}: current block is of type ${lastNode.startStatement.type}`);
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
	const statement = getStatement(tokens);
	if(typeof statement == "string") throw new Error(`Invalid line ${tokens.map(t => t.type).join(" ")}: ${statement}`);
	return new statement(tokens);
}
export function getStatement(tokens:Token[]):typeof Statement | string {
	if(tokens.length < 1) return "Empty statement";
	let possibleStatements:(typeof Statement)[];
	if(tokens[0].type in statements.startKeyword) possibleStatements = [statements.startKeyword[tokens[0].type]];
	else possibleStatements = statements.irregular;
	if(possibleStatements.length == 0) return `No possible statements`;
	let errors:[message:string, priority:number][] = [];
	for(const possibleStatement of possibleStatements){
		const result = possibleStatement.check(tokens);
		if(Array.isArray(result)) errors.push(result);
		else return possibleStatement;
	}
	let maxError:[message:string, priority:number] = errors[0];
	for(const error of errors){
		if(error[1] > maxError[1]) maxError = error;
	}
	return maxError[0];
}

export function stringifyStatement(statement:Statement):string {
	return statement.tokens.map(t => t.text).join(" ");
}



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
