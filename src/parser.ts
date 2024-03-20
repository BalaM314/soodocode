/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the parser, which takes a list of tokens
and processes it into an abstract syntax tree (AST),
which is the preferred representation of the program.
*/


import { Token, TokenizedProgram, type TokenType } from "./lexer-types.js";
import {
	ArrayTypeData, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTLeafNode, ExpressionASTNode,
	ExpressionASTTypeNode, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNode
} from "./parser-types.js";
import type { VariableType } from "./runtime.js";
import {
	FunctionArgumentDataPartial, FunctionArguments, PassMode, Statement, statements
} from "./statements.js";
import {
	impossible, splitArray, fail, PartialKey, isVarType, getText, splitTokens, splitTokensOnComma,
	errorBoundary, crash, fquote
} from "./utils.js";

//TODO add a way to specify the range for an empty list of tokens

/** Parses function arguments, such as `x:INTEGER, BYREF y, z:DATE` into a Map containing their data */
export const parseFunctionArguments = errorBoundary((tokens:Token[]):FunctionArguments => {
	//special case: blank
	if(tokens.length == 0) return new Map();

	let passMode:PassMode = "value";
	let type:VariableType | null = null;
	//Split the array on commas (no paren handling necessary)
	const argumentz = splitTokens(tokens, "punctuation.comma").map<FunctionArgumentDataPartial>(section => {

		let passMode:PassMode | null;
		let type:VariableType | null;

		//Increase the offset by 1 to ignore the pass mode specifier if present
		let offset = 0;
		if(section[0]?.type == "keyword.by-reference"){
			offset = 1;
			passMode = "reference";
		} else if(section[0]?.type == "keyword.by-value"){
			offset = 1;
			passMode = "value";
		} else passMode = null;

		//There must be a name
		if(section[offset + 0]?.type != "name") fail(`Expected a name, got ${section[offset + 0] ?? "end of function arguments"}`, section[offset + 0] ?? (section[offset - 1] ?? tokens.at(-1)).rangeAfter());

		//If the name is the only thing present, then the type is specified later, leave it as null
		if(section.length == offset + 1){
			type = null;
		} else {
			//Expect a colon
			if(section[offset + 1]?.type != "punctuation.colon") fail(`Expected a colon, got ${section[offset + 1] ?? "end of function arguments"}`, section[offset + 1] ?? (section[offset + 0] ?? tokens.at(-1)).rangeAfter());
			type = processTypeData(parseType(section.slice(offset + 2)));
		}
		return [
			section[offset + 0], //pass the token through so we can use it to generate errors
			{ passMode, type }
		];
	}).map<[name:Token, {type:VariableType | null, passMode:PassMode}]>(([name, data]) => [name, {
		passMode: data.passMode ? passMode = data.passMode : passMode,
		type: data.type
	}])
	.reverse().map(([name, data]) => [name, {
		passMode: data.passMode,
		type: data.type ? type = data.type : type ?? fail(`Type not specified for function argument "${name.text}"`, name)
	}] as const);
	const argumentsMap:FunctionArguments = new Map(argumentz.map(([name, data]) => [name.text, data] as const));
	if(argumentsMap.size != argumentz.length){
		const [duplicateArgument] = argumentz.find((a, i) => argumentz.find((b, j) => a[0].text == b[0].text && i != j)) ?? crash(`Unable to find the duplicate function argument in ${argumentz.map(([name, arg]) => name)}`);
		fail(`Duplicate function argument "${duplicateArgument.text}"`, duplicateArgument);
	}
	return argumentsMap;
});

export const processTypeData = errorBoundary((ast:ExpressionASTTypeNode):VariableType => {
	if(ast instanceof Token) return isVarType(ast.text) ? ast.text : fail(fquote`Invalid variable type ${ast.text}`); //TODO remove this error and have it fail at runtime due to user defined types, also the one 4 lines below
	else return new ArrayTypeData(
		ast.lengthInformation.map(bounds => bounds.map(t => Number(t.text)) as [number, number]),
		//todo fix this insanity of "type" "text"
		isVarType(ast.type.text) ? ast.type.text : fail(fquote`Invalid variable type ${ast.type.text}`)
	);
});

export const parseType = errorBoundary((tokens:Token[]):ExpressionASTLeafNode | ExpressionASTArrayTypeNode => {
	if(tokens.length == 1){
		if(tokens[0].type == "name") return tokens[0];
		else fail(`Token ${tokens[0]} is not a valid type`);
	}
	
	//Array type
	if(!(
		tokens[0]?.type == "keyword.array" &&
		tokens[1]?.type == "bracket.open" &&
		tokens.at(-2)?.type == "keyword.of" &&
		tokens.at(-1)?.type == "name"
	)) fail(fquote`Cannot parse type from ${tokens.join(" ")}`); //TODO %r
	return new ExpressionASTArrayTypeNode(
		splitTokens(tokens.slice(2, -3), "punctuation.comma")
		.map(section => {
			if(section.length != 3) fail(fquote`Invalid array range specifier ${section.join(" ")}`, section.length ? section : null); //TODO somehow get this?
			if(section[0].type != "number.decimal") fail(`Expected a number, got ${section[0]}`, section[0]);
			if(section[1].type != "punctuation.colon") fail(`Expected a colon, got ${section[1]}`, section[1]);
			if(section[2].type != "number.decimal") fail(`Expected a number, got ${section[2]}`, section[1]);
			return [section[0], section[2]] as [Token, Token];
		}),
		tokens.at(-1)!,
		tokens
	);
});

export function parse({program, tokens}:TokenizedProgram):ProgramAST {
	let lines:Token[][] = splitArray(tokens, t => t.type == "newline")
		.filter(l => l.length != 0); //remove blank lines
	const statements = lines.map(parseStatement);
	const programNodes:ProgramASTNode[] = [];
	function getActiveBuffer(){
		if(blockStack.length == 0) return programNodes;
		else return blockStack.at(-1)!.nodeGroups.at(-1)!;
	}
	const blockStack:ProgramASTBranchNode[] = [];
	for(const statement of statements){
		if(statement.category == "normal"){
			getActiveBuffer().push(statement);
		} else if(statement.category == "block"){
			const node = new ProgramASTBranchNode(
				statement.stype as ProgramASTBranchNodeType,
				[statement],
				[[]]
			);
			getActiveBuffer().push(node);
			blockStack.push(node);
		} else if(statement.category == "block_end"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) fail(`Unexpected statement "${statement.toString()}": no open blocks`, statement);
			else if(lastNode.controlStatements[0].stype == statement.stype.split(".")[0]){ //probably bad code
				lastNode.controlStatements.push(statement);
				blockStack.pop();
			} else fail(`Unexpected statement "${statement.toString()}": current block is of type ${lastNode.controlStatements[0].stype}`, statement, null);
		} else if(statement.category == "block_multi_split"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) fail(`Unexpected statement "${statement.toString()}": no open blocks`, statement, null);
			if(!lastNode.controlStatements[0].type.supportsSplit(lastNode, statement)) fail(`Unexpected statement "${statement.toString()}": current block cannot be split by "${statement.toString()}"`, null);
			lastNode.controlStatements.push(statement);
			lastNode.nodeGroups.push([]);
		} else statement.category satisfies never;
	}
	if(blockStack.length) fail(`There were unclosed blocks: "${blockStack.at(-1)!.controlStatements[0].toString()}" requires a matching "${blockStack.at(-1)!.controlStatements[0].blockEndStatement().type}" statement`, blockStack.at(-1)!.controlStatements[0], null);
	return {
		program,
		nodes: programNodes
	};
}

/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export const parseStatement = errorBoundary((tokens:Token[]):Statement => {
	if(tokens.length < 1) crash("Empty statement");
	let possibleStatements:(typeof Statement)[] =
		tokens[0].type in statements.byStartKeyword
			? statements.byStartKeyword[tokens[0].type]!
			: statements.irregular;
	if(possibleStatements.length == 0) fail(`No possible statements`, tokens);
	let errors:{message:string, priority:number}[] = [];
	for(const possibleStatement of possibleStatements){
		const result = checkStatement(possibleStatement, tokens);
		if(Array.isArray(result)){
			return new possibleStatement(result.map(x => x instanceof Token ? x : (x.type == "expression" ? parseExpression : parseType)(tokens.slice(x.start, x.end + 1))));
		} else errors.push(result);
	}
	let maxError:{message:string, priority:number} = errors[0];
	for(const error of errors){
		if(error.priority > maxError.priority) maxError = error;
	}
	fail(maxError.message, tokens);
});

type StatementCheckSuccessResult = (Token | {type:"expression" | "type"; start:number; end:number})[];
/**
 * Checks if a Token[] is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 */
export const checkStatement = errorBoundary((statement:typeof Statement, input:Token[]):{message:string; priority:number} | StatementCheckSuccessResult => {
	//TODO error ranges
	//warning: despite writing it, I do not fully understand this code
	//but it works

	const output:StatementCheckSuccessResult = [];
	let i, j;
	for(i = (statement.tokens[0] == "#") ? 1 : 0, j = 0; i < statement.tokens.length; i ++){
		if(statement.tokens[i] == ".+" || statement.tokens[i] == ".*" || statement.tokens[i] == "expr+" || statement.tokens[i] == "type+"){
			const allowEmpty = statement.tokens[i] == ".*";
			const start = j;
			if(j >= input.length){
				if(allowEmpty) continue; //Consumed all tokens
				else return {message: `Unexpected end of line`, priority: 4};
			}
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
				output.push({type: "expression", start, end});
			else if(statement.tokens[i] == "type+")
				output.push({type: "type", start, end});
			else
				output.push(...input.slice(start, end + 1));
		} else {
			if(j >= input.length) return {message: `Expected ${statement.tokens[i]}, found end of line`, priority: 4};
			if(statement.tokens[i] == "#") impossible();
			else if(statement.tokens[i] == "." || statement.tokens[i] == input[j].type){
				output.push(input[j]);
				j++; //Token matches, move to next one
			} else return {message: `Expected a ${statement.tokens[i]}, got "${input[j].text}" (${input[j].type})`, priority: 5};
		}
	}
	if(j != input.length) return {message: `Expected end of line, found ${input[j].type}`, priority: 7};
	return output;
});

export type OperatorType<T = TokenType> = T extends `operator.${infer N}` ? N extends "minus" ? never : (N | "negate" | "subtract") : never;
export type Operator = {
	token: TokenType;
	name: string;
	unary: boolean;
	overloadedUnary: boolean;
	category: "arithmetic" | "logical" | "string";
}
/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export const operatorsByPriority = ((input:(PartialKey<Operator, "unary" | "name" | "overloadedUnary">)[][]):Operator[][] =>
	input.map(row => row.map(o =>
		({
			...o,
			unary: o.unary ?? false,
			name: o.name ?? o.token,
			overloadedUnary: o.overloadedUnary ?? false,
		})
	))
)([
	[
		{
			token: "operator.or",
			category: "logical"
		}
	],[
		{
			token: "operator.and",
			category: "logical"
		}
	],[
		{
			token: "operator.equal_to",
			category: "logical"
		},{
			token: "operator.not_equal_to",
			category: "logical"
		}
	],[
		{
			token: "operator.less_than",
			category: "logical"
		},{
			token: "operator.less_than_equal",
			category: "logical"
		},{
			token: "operator.greater_than",
			category: "logical"
		},{
			token: "operator.greater_than_equal",
			category: "logical"
		}
	],[
		{
			token: "operator.add",
			category: "arithmetic"
		},{
			name: "operator.subtract",
			token: "operator.minus",
			category: "arithmetic",
			overloadedUnary: true,
		},{
			token: "operator.string_concatenate",
			category: "string"
		}
	],[
		{
			token: "operator.multiply",
			category: "arithmetic"
		},{
			token: "operator.divide",
			category: "arithmetic"
		},{
			token: "operator.integer_divide",
			category: "arithmetic"
		},{
			token: "operator.mod",
			category: "arithmetic"
		}
	],
	//no exponentiation operator?
	[
		{
			token: "operator.not",
			category: "logical",
			unary: true,
		},
		{
			token: "operator.minus",
			name: "operator.negate",
			category: "arithmetic",
			unary: true,
		}
	],
	//(function call)
	//(array access)
]);
/** Indexed by OperatorType */
export const operators = Object.fromEntries(
	operatorsByPriority.flat()
	.map(o => [
		o.name.startsWith("operator.") ? o.name.split("operator.")[1] : o.name
	, o] as const)
) as Omit<Record<OperatorType, Operator>, "assignment" | "pointer">;

function cannotEndExpression(token:Token){
	//TODO is this the best way?
	return token.type.startsWith("operator.") || token.type == "parentheses.open" || token.type == "bracket.open";
}
function canBeUnaryOperator(token:Token){
	return Object.values(operators).find(o => o.unary && o.token == token.type);
}

export const parseExpressionLeafNode = errorBoundary((input:Token):ExpressionASTLeafNode => {
	//Number, string, char, boolean, and variables can be parsed as-is
	if(input.type.startsWith("number.") || input.type == "name" || input.type == "string" || input.type == "char" || input.type.startsWith("boolean."))
		return input;
	else
		fail(`Invalid expression leaf node`);
});

//TOOD allow specifying adding a call stack message to errorBoundary(), should add "cannot parse expression" to all of these
export const parseExpression = errorBoundary((input:Token[]):ExpressionASTNode => {
	if(!Array.isArray(input)) crash(`parseExpression(): expected array of tokens, got ${input}`);
	//If there is only one token
	if(input.length == 1) return parseExpressionLeafNode(input[0]);

	//Go through P E M-D A-S in reverse order to find the operator with the lowest priority
	//TODO O(mn) unnecessarily, optimize
	toNextOperator:
	for(const operatorsOfCurrentPriority of operatorsByPriority){
		let parenNestLevel = 0, bracketNestLevel = 0;
		//Find the index of the last (lowest priority) operator of the current priority
		//Iterate through token list backwards
		for(let i = input.length - 1; i >= 0; i --){
			//Handle parentheses
			//The token list is being iterated through backwards, so ) means go up a level and ( means go down a level
			if(input[i].type == "parentheses.close") parenNestLevel ++;
			else if(input[i].type == "parentheses.open") parenNestLevel --;
			else if(input[i].type == "bracket.close") bracketNestLevel ++;
			else if(input[i].type == "bracket.open") bracketNestLevel --;
			if(parenNestLevel < 0)
				//nest level going below 0 means too many (
				fail(`Unclosed parentheses`);
			if(bracketNestLevel < 0)
				//nest level going below 0 means too many [
				fail(`Unclosed square bracket`);

			let operator!:Operator; //assignment assertion goes brrrrr
			if(
				parenNestLevel == 0 && bracketNestLevel == 0 && //the operator is not inside parentheses and
				operatorsOfCurrentPriority.find(o => (operator = o).token == input[i].type) //it is currently being searched for
			){
				//this is the lowest priority operator in the expression and should become the root node
				if(operator.unary){
					//Make sure there is only something on right side of the operator
					const right = input.slice(i + 1);
					if(i != 0){
						//Binary operators
						//  1 / 2 / 3
						// (1 / 2)/ 3
						// ^
						// lowest priority is rightmost
						//Unary operators
						// - - 2
						// -(- 2)
						// ^
						// lowest priority is leftmost
						if(canBeUnaryOperator(input[i - 1])) continue; //Operator priority assumption is wrong, try again!
						fail(`Unexpected expression on left side of operator "${input[i].text}"`, input[i]);
					}
					if(right.length == 0) fail(`Mo expression on right side of operator ${input[i].text}`, input[i].rangeAfter());
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						[parseExpression(right)],
						input
					);
				} else {
					//Make sure there is something on left and right of the operator
					const left = input.slice(0, i);
					const right = input.slice(i + 1);
					if(left.length == 0){
						if(operator.overloadedUnary) continue; //this is the unary operator, try again
						else fail(`No expression on left side of operator ${input[i].text}`, input[i].rangeBefore());
					}
					if(right.length == 0) fail(`No expression on right side of operator ${input[i].text}`, input[i].rangeAfter());
					if(operator.overloadedUnary){
						if(cannotEndExpression(input[i - 1])) continue; //Binary operator can't fit here, this must be the unary operator
					}
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						[parseExpression(left), parseExpression(right)],
						input
					);
				}
			}
		}
		//Nest level being above zero at the beginning of the string means too many )
		if(parenNestLevel != 0)
			fail(`No parentheses group to close`, null); //TODO find the correct token
		if(bracketNestLevel != 0)
			fail(`No bracket group to close`, null); //TODO find the correct token

		//No operators of the current priority found, look for operator with the next level higher priority
	}

	//If the whole expression is surrounded by parentheses, parse the inner expression
	//Must be after the main loop to avoid triggering on ( 2)+(2 )
	//Possible optimization: allow this to run before the loop if token length is <= 4
	if(input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
		return parseExpression(input.slice(1, -1));

	//Special case: function call
	if(input[0]?.type == "name" && input[1]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close"){
		return new ExpressionASTBranchNode(
			input[0],
			"function call",
			input.length == 3
				? [] //If there are no arguments, don't generate a blank argument group
				: splitTokensOnComma(input.slice(2, -1)).map(parseExpression),
			input
		);
	}
	
	//Special case: array access
	if(input[0]?.type == "name" && input[1]?.type == "bracket.open" && input.at(-1)?.type == "bracket.close" && input.length > 3){
		return new ExpressionASTBranchNode(
			input[0],
			"array access",
			splitTokensOnComma(input.slice(2, -1)).map(parseExpression),
			input
		);
	}

	//No operators found at all, something went wrong
	fail(`No operators found`);
});
