import { getText, type Token, type TokenType } from "./lexer.js";
import { Statement, statements } from "./statements.js";
import { splitArray } from "./utils.js";

export type ExpressionAST = ExpressionASTNode;
export type ExpressionASTLeafNode = Token;
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTTreeNode;
export type ExpressionASTTreeNode = {
	operatorToken: Token;
	operator: Operator | "function call";
	nodes: ExpressionASTNode[];
}

export type TokenMatcher = (TokenType | ".*" | ".+" | "expr+");

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

/** `low` and `high` must correspond to the indexes of the lowest and highest elements in the function arguments. */
export function parseFunctionArguments(tokens:Token[], low:number, high:number):Map<string, string> | string {
	const size = high - low + 1;
	if(!(size != 0 || size % 4 != 3))
		return `Incorrect number of tokens (${size}), must be 0 or 3 above a multiple of 4`;
	const numArgs = Math.ceil(size / 4);
	const args = new Map<string, string>();

	for(let i = 0; i < numArgs; i ++){
		const name = tokens[low + 4 * i + 0];
		const colon = tokens[low + 4 * i + 1];
		const type = tokens[low + 4 * i + 2];
		const comma = tokens[low + 4 * i + 3];
		if(!name) return `Missing name`;
		if(name.type != "name") return `Expected a name, got "${name.text}" (${name.type})`;
		if(!colon) return `Missing colon`;
		if(colon.type != "punctuation.colon") return `Expected a colon, got "${colon.text}" (${colon.type})`;
		if(!type) return `Missing type`;
		if(type.type != "name") return `Expected a type, got "${type.text}" (${type.type})`;
		if(!comma) return `Missing comma`;
		if(i == numArgs - 1 && comma.type != "parentheses.close") //Last argument and the 4th token is the closing paren
			return `Expected closing parentheses, got "${comma.text}" (${comma.type})`;
		if(i != numArgs - 1 && comma.type != "punctuation.comma") //Not the last argument and the token is a comma
			return `Expected a comma, got "${comma.text}" (${comma.type})`;
		args.set(name.text, type.text.toUpperCase());
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
			if(!lastNode) throw new Error(`Invalid statement "${statement.toString()}": no open blocks`);
			else if(lastNode.startStatement.stype == statement.stype.split(".")[0]){ //probably bad code
				lastNode.endStatement = statement;
				blockStack.pop();
			} else throw new Error(`Invalid statement "${statement.toString()}": current block is of type ${lastNode.startStatement.stype}`);
		} else throw new Error("impossible");
	}
	if(blockStack.length) throw new Error(`There were unclosed blocks: "${blockStack.at(-1)!.startStatement.toString()}" requires a matching "${blockStack.at(-1)!.startStatement.blockEndStatement().type}" statement`);
	return program;
}

/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export function parseStatement(tokens:Token[]):Statement {
	if(tokens.length < 1) throw new Error("Empty statement");
	let possibleStatements:(typeof Statement)[];
	if(tokens[0].type in statements.startKeyword) possibleStatements = [statements.startKeyword[tokens[0].type]!];
	else possibleStatements = statements.irregular;
	if(possibleStatements.length == 0) throw new Error(`No possible statements`);
	let errors:{message:string, priority:number}[] = [];
	for(const possibleStatement of possibleStatements){
		const result = checkStatement(possibleStatement, tokens);
		if(Array.isArray(result)){
			return new possibleStatement(result.map(x => "start" in x ? parseExpression(tokens.slice(x.start, x.end + 1)) : x));
		} else errors.push(result);
	}
	let maxError:{message:string, priority:number} = errors[0];
	for(const error of errors){
		if(error.priority > maxError.priority) maxError = error;
	}
	throw new Error(maxError.message);
}
/**
 * Checks if a Token[] is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 * @returns 
 */
export function checkStatement(statement:typeof Statement, input:Token[]):{message:string; priority:number} | (Token | {start:number; end:number})[] {
	//warning: despite writing it, I do not fully understand this code
	//but it works
	//TODO understand it

	const output: (Token | {start:number; end:number})[] = [];
	for(var i = statement.tokens[0] == "#" ? 1 : 0, j = 0; i < statement.tokens.length; i ++){
		if(statement.tokens[i] == ".+" || statement.tokens[i] == ".*" || statement.tokens[i] == "expr+"){
			const allowEmpty = statement.tokens[i] == ".*";
			const start = j;
			if(j >= input.length && !allowEmpty) return {message: `Unexpected end of line`, priority: 4};
			let anyTokensSkipped = false;
			while(statement.tokens[i + 1] != input[j].type){ //Repeat until the current token in input is the next token
				anyTokensSkipped = true;
				j ++;
				if(j >= input.length){ //end reached
					if(i == statement.tokens.length - 1) break; //Consumed all tokens
					return {message: `Expected a ${statement.tokens[i + 1]}, but none were found`, priority: 4};
				}
			}
			const end = j - 1;
			if(!anyTokensSkipped && !allowEmpty) return {message: `Expected one or more tokens, but found zero`, priority: 6};
			if(statement.tokens[i] == "expr+")
				output.push({start, end});
			else
				output.push(...input.slice(start, end + 1));
		} else {
			if(j >= input.length) return {message: `Expected ${statement.tokens[i]}, found end of line`, priority: 4};
			if(statement.tokens[i] == "#") throw new Error(`absurd`);
			else if(statement.tokens[i] == input[j].type){
				output.push(input[j]);
				j++; //Token matches, move to next one
			} else return {message: `Expected a ${statement.tokens[i]}, got "${input[j].text}" (${input[j].type})`, priority: 5};
		}
	}
	if(j != input.length) return {message: `Expected end of line, found ${input[j].type}`, priority: 7};
	return output;
}
type OperatorType<T = TokenType> = T extends `operator.${infer N}` ? N : never;
type Operator = {
	type: TokenType;
	unary: boolean;
}
/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export const operatorsByPriority = ((input:(OperatorType | [type:OperatorType, "unary"] | Operator)[][]):Operator[][] =>
	input.map(row => row.map(o => 
		Array.isArray(o) ? {type: `operator.${o[0]}`, unary: true} :
		typeof o == "string" ? {type: `operator.${o}`, unary: false} :
		o
	))
)([
	["or"],
	["and"],
	["equal_to", "not_equal_to"],
	["less_than", "less_than_equal", "greater_than", "greater_than_equal"],
	["add", "subtract"],
	["multiply", "divide", "integer_divide", "mod"],
	//no exponentiation operator?
	[["not", "unary"]],
]);
/** Indexed by OperatorType */
export const operators = Object.fromEntries(
	operatorsByPriority.flat()
	.map(o => [
		o.type.startsWith("operator.") ? o.type.split("operator.")[1] : o.type
	, o] as const)
) as Record<OperatorType, Operator>;


export function parseExpression(input:Token[]):ExpressionASTNode {
	//If there is only one token
	if(input.length == 1){
		if(input[0].type == "number.decimal" || input[0].type == "name" || input[0].type == "string") //and it's a valid expression leaf node TODO genericify
			return input[0]; //nothing to parse, just return the token
		else
			throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: not a valid expression leaf node`);
	}
	//If the whole expression is surrounded by parentheses, parse the inner expression
	if(input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
		return parseExpression(input.slice(1, -1));
	//Special case: function call
	if(input[0]?.type == "name" && input[1]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
		return {
			operatorToken: input[0],
			operator: "function call",
			//Split the tokens between the parens on commas, then parse each group
			//TODO do not accept commas inside parens... time for some very cursed code
			nodes: splitArray(input.slice(2, -1), t => t.type == "punctuation.comma").map(parseExpression)
		};

	//Go through P E M-D A-S in reverse order to find the operator with the lowest priority
	//TODO O(mn) unnecessarily, optimize
	for(const operatorsOfCurrentPriority of operatorsByPriority){
		let parenNestLevel = 0;
		//Find the index of the last (lowest priority) operator of the current priority
		//Iterate through token list backwards
		for(let i = input.length - 1; i >= 0; i --){
			//Handle parentheses
			//The token list is being iterated through backwards, so ) means go up a level and ( means go down a level
			if(input[i].type == "parentheses.close") parenNestLevel ++;
			else if(input[i].type == "parentheses.open") parenNestLevel --;
			if(parenNestLevel < 0)
				//nest level going below 0 means too many (, so unclosed parens
				throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed parentheses`);

			let operator!:Operator; //assignment assertion goes brrrrr
			if(
				parenNestLevel == 0 && //the operator is not inside parentheses and
				operatorsOfCurrentPriority.find(o => (operator = o).type == input[i].type) //it is currently being searched for
			){
				//this is the lowest priority operator in the expression and should become the root node
				if(operator.unary){
					//Make sure there is only something on right side of the operator
					const right = input.slice(i + 1);
					if(i != 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unexpected expression on left side of operator ${input[i].text}`);
					if(right.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
					return {
						operatorToken: input[i],
						operator,
						nodes: [parseExpression(right)]
					};
				} else {
					//Make sure there is something on left and right of the operator
					const left = input.slice(0, i);
					const right = input.slice(i + 1);
					if(left.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[i].text}`);
					if(right.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
					return {
						operatorToken: input[i],
						operator,
						nodes: [parseExpression(left), parseExpression(right)]
					};
				}
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
