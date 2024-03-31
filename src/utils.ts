/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/

import { TextRange, TextRangeLike, TextRanged, Token, TokenType } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTFunctionCallNode, ExpressionASTNode } from "./parser-types.js";
import { PrimitiveVariableTypeName } from "./runtime.js";
import { TagFunction } from "./types.js";

export function stringifyExpressionASTArrayTypeNode(input:ExpressionASTArrayTypeNode){
	return `ARRAY[${input.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${input.elementType.text}`;
}

export function displayExpression(node:ExpressionASTNode | ExpressionASTArrayTypeNode, expand = false, html = false):string {
	if(node instanceof Token)
		return escapeHTML(node.text);
	if(node instanceof ExpressionASTArrayTypeNode)
		return escapeHTML(stringifyExpressionASTArrayTypeNode(node));
	if(node instanceof ExpressionASTFunctionCallNode){
		const text = `${escapeHTML(node.functionName.text)}(${node.args.map(n => displayExpression(n, expand, html)).join(", ")})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	}
	if(node instanceof ExpressionASTArrayAccessNode){
		const text = `${displayExpression(node.target)}[${node.indices.map(n => displayExpression(n, expand, html)).join(", ")}]`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	}
	const compressed = !expand || node.nodes.every(n => n instanceof Token);
	//TODO fix this function: needs to handle unary postfix correctly, also fix the display block code which breaks on switch statements
	if(!node.operator.type.startsWith("unary") && compressed){
		//Not a unary operator and, argument says don't expand or all child nodes are leaf nodes.
		const text = `(${displayExpression(node.nodes[0], expand, html)} ${node.operatorToken.text} ${displayExpression(node.nodes[1], expand, html)})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(node.operator.type.startsWith("unary") && compressed){
		//Is a unary operator and, argument says don't expand or all child nodes are leaf nodes.
		const text = `(${node.operatorToken.text} ${displayExpression(node.nodes[0], expand, html)})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(node.operator.type.startsWith("unary")){
		return (
`(
${node.operatorToken.text}
${displayExpression(node.nodes[0], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	} else {
		return (
`(
${displayExpression(node.nodes[0], expand).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
${displayExpression(node.nodes[1], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}

export function getText(tokens:Token[]){
	return tokens.map(t => t.text).join(" ");
}

export function splitArray<T>(arr:T[], split:[T] | ((item:T, index:number, array:T[]) => boolean)):T[][] {
	const output:T[][] = [[]];
	if(typeof split == "function"){
		for(let i = 0; i < arr.length; i ++){
			if(split(arr[i], i, arr)) output.push([]);
			else output.at(-1)!.push(arr[i]);
		}
	} else {
		for(const el of arr){
			if(el == split[0]) output.push([]);
			else output.at(-1)!.push(el);
		}
	}
	return output;
}

export function splitTokens(arr:Token[], split:TokenType){
	const output:Token[][] = [[]];
	for(const el of arr){
		if(el.type == split) output.push([]);
		else output.at(-1)!.push(el);
	}
	return output;
}

export function splitTokensWithSplitter(arr:Token[], split:TokenType){
	const output:{ group:Token[]; splitter?:Token; }[] = [{ group: [] }];
	for(const el of arr){
		if(el.type == split){
			output.at(-1)!.splitter = el;
			output.push({ group: [] });
		} else output.at(-1)!.group.push(el);
	}
	return output;
}

export function splitTokensOnComma(arr:Token[]):Token[][] {
	const output:Token[][] = [[]];
	let parenNestLevel = 0, bracketNestLevel = 0;
	for(const token of arr){
		if(token.type == "parentheses.open") parenNestLevel ++;
		else if(token.type == "parentheses.close") parenNestLevel --;
		else if(token.type == "bracket.open") bracketNestLevel ++;
		else if(token.type == "bracket.close") bracketNestLevel --;
		if(parenNestLevel == 0 && bracketNestLevel == 0 && token.type == "punctuation.comma") output.push([]);
		else output.at(-1)!.push(token);
	}
	return output;
}

export function getTotalRange(tokens:(TextRanged | TextRange)[]):TextRange {
	if(tokens.length == 0) crash(`Cannot get range from an empty list of tokens`);
	return tokens.map(t => Array.isArray(t) ? t : (typeof t.range == "function" ? t.range() : t.range)).reduce((acc, t) =>
		[Math.min(acc[0], t[0]), Math.max(acc[1], t[1])]
	, [Infinity, -Infinity]);
}
export function isRange(input:unknown):input is TextRange {
	return Array.isArray(input) && input.length == 2 && typeof input[0] == "number" && typeof input[1] == "number";
}
export function getRange(input:TextRangeLike):TextRange;
export function getRange(input?:TextRangeLike):TextRange | undefined;
export function getRange(input?:TextRangeLike | null):TextRange | undefined | null;
export function getRange(input?:TextRangeLike | null):TextRange | undefined | null {
	if(!input) return input;
	if(isRange(input)) return input;
	if(Array.isArray(input)) return getTotalRange(input);
	if(typeof input.range == "function") return input.range();
	else return input.range;
}
export function findRange(args:unknown[]):TextRange | undefined {
	for(const arg of args){
		if(typeof arg == "object" && arg != null && "range" in arg && isRange(arg.range))
			return arg.range;
		if(Array.isArray(arg) && isRange(arg[0]))
			return getTotalRange(arg)
		if(Array.isArray(arg) && arg.length > 0 && isRange(arg[0].range))
			return getTotalRange(arg)
	}
	return undefined;
}

export class SoodocodeError extends Error {
	constructor(message:string, public rangeSpecific?:TextRange | null, public rangeGeneral?:TextRange | null){
		super(message);
	}
}

export function fail(message:string, rangeSpecific?:TextRangeLike | null, rangeGeneral?:TextRangeLike | null):never {
	throw new SoodocodeError(message, getRange(rangeSpecific), getRange(rangeGeneral));
}
export function crash(message:string):never {
	throw new Error(message);
}
export function impossible():never {
	throw new Error(`this shouldn't be possible...`);
}

export function errorBoundary<T extends (...args:any[]) => unknown>(func:T, ctx?:ClassMethodDecoratorContext):T {
	return function(this:ThisParameterType<T>, ...args){
		try {
			return func.apply(this, args);
		} catch(err){
			if(err instanceof SoodocodeError){
				//Try to find the range
				if(err.rangeSpecific === undefined) err.rangeSpecific = findRange(args);
				else if(err.rangeGeneral === undefined){
					const _rangeGeneral = findRange(args);
					if( //If the general range is unspecified, and when guessede is equal to the specific range, just set it to null
						_rangeGeneral && err.rangeSpecific && (
							_rangeGeneral[0] == err.rangeSpecific[0] && _rangeGeneral[1] == err.rangeSpecific[1]
						)
					) err.rangeGeneral = null;
					else err.rangeGeneral = _rangeGeneral;
				}
			}
			throw err;
		}
	} as T;
}

export function escapeHTML(input:string):string {
	return input.replaceAll(/&(?!(amp;)|(lt;)|(gt;))/g, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

//TODO move to runtime, user defined types
export function isPrimitiveType(input:string):input is PrimitiveVariableTypeName {
	return input == "INTEGER" || input == "REAL" || input == "STRING" || input == "CHAR" || input == "BOOLEAN" || input == "DATE";
}

export function parseError(thing:unknown):string {
	if(thing instanceof Error){
		return thing.toString();
	} else if(typeof thing == "string"){
		return thing;
	} else if(thing != null && typeof thing == "object" && "toString" in thing && typeof thing.toString == "function"){
		return thing.toString();
	} else {
		console.log("[[FINDTAG]] Unable to parse the following error object");
		console.log(thing as any);
		return "Unable to parse error object";
	}
}

/** Generates a tag template processor from a function that processes one value at a time. */
export function tagProcessor<T>(
	transformer:(chunk:T, index:number, allStringChunks:readonly string[], allVarChunks:readonly T[]) => string
):TagFunction<T, string> {
	return function(stringChunks:readonly string[], ...varChunks:readonly T[]){
		return String.raw({raw: stringChunks}, ...varChunks.map((chunk, i) => transformer(chunk, i, stringChunks, varChunks)));
	}
}

export const fquote = tagProcessor((chunk:string | Object) => {
	const str = chunk.toString();
	return str.length == 0 ? "[empty]" : `"${str}"`
});

export function forceType<T>(input:unknown):asserts input is T {}
