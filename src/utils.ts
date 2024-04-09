/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/

import { TextRange, TextRangeLike, TextRanged, Token, TokenType } from "./lexer-types.js";
import { PrimitiveVariableTypeName } from "./runtime.js";
import { TagFunction } from "./types.js";


export function getText(tokens:Token[]){
	return tokens.map(t => t.text).join(" ");
}


/** Ranges must telescope inwards */
export function applyRangeTransformers(text:string, ranges:[range:TextRange, start:string, end:string, transformer?:(rangeText:string) => string][]){
	let offset = 0;
	for(const [range, start, end, transformer_] of ranges){
		let transformer = transformer_ ?? (x => x);
		let newRange = range.map(n => n + offset);
		text = text.slice(0, newRange[0]) + start + transformer(text.slice(...newRange)) + end + text.slice(newRange[1]);
		offset += start.length;
	}
	return text;
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
export function getUniqueNamesFromCommaSeparatedTokenList(tokens:Token[], nextToken?:Token, validNames:TokenType[] = ["name"]):Token[] {
	const names:Token[] = [];

	let expected:"name" | "commaOrColon" = "name";
	for(const token of tokens){
		if(expected == "name"){
			if(validNames.includes(token.type)){
				names.push(token);
				expected = "commaOrColon";
			} else fail(fquote`Expected a name, got ${token.text}`, token);
		} else {
			if(token.type == "punctuation.comma"){
				expected = "name";
			} else fail(fquote`Expected a comma, got ${token.text}`, token);
		}
	}
	if(expected == "name") fail(`Expected a name, found ${nextToken?.text ?? "end of input"}`, nextToken);
	if(new Set(names.map(t => t.text)).size !== names.length){
		//duplicate value
		const duplicateToken = names.find((a, i) => names.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate name in ${names.join(" ")}`);
		fail(fquote`Duplicate name ${duplicateToken.text} in list`, duplicateToken, tokens);
	}
	return names;
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
	modified = false;
	constructor(message:string, public rangeSpecific?:TextRange | null, public rangeGeneral?:TextRange | null){
		super(message);
	}
	formatMessage(text:string){
		return this.message.replace("$r",
			this.rangeSpecific ? (text.slice(...this.rangeSpecific) || "<empty>") :
			this.rangeGeneral ? (text.slice(...this.rangeGeneral) || "<empty>") :
			`(Internal compiler error, cannot format placeholder in error message because no ranges were set)`
		);
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

/**
 * Decorator to apply an error boundary to functions.
 * @param predicate Only sets the general range if this returns true.
 */
export function errorBoundary({predicate = (() => true), message}:Partial<{
	predicate(...args:any[]): boolean;
	message(...args:any[]): string;
}> = {}){
	return function decorator<T extends (...args:any[]) => unknown>(func:T, ctx?:ClassMethodDecoratorContext):T {
		return function replacedFunction(this:ThisParameterType<T>, ...args:Parameters<T>){
			try {
				return func.apply(this, args);
			} catch(err){
				if(err instanceof SoodocodeError){
					if(message && !err.modified) err.message = message(...args) + err.message;
					//Try to find the range
					if(err.rangeSpecific === undefined) err.rangeSpecific = findRange(args);
					else if(err.rangeGeneral === undefined && predicate(...args)){
						const _rangeGeneral = findRange(args);
						if( //If the general range is unspecified, and when guessed is equal to the specific range, just set it to null
							_rangeGeneral && err.rangeSpecific && (
								_rangeGeneral[0] == err.rangeSpecific[0] && _rangeGeneral[1] == err.rangeSpecific[1]
							)
						) err.rangeGeneral = null;
						else err.rangeGeneral = _rangeGeneral;
					}
					err.modified = true;
				}
				throw err;
			}
		} as T;
	}
}

export function escapeHTML(input?:string):string {
	if(input == undefined) return "";
	return input.replaceAll(/&(?!(amp;)|(lt;)|(gt;))/g, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

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
	const str = Array.isArray(chunk) && chunk[0] && chunk[0] instanceof Token ? chunk.map(c => c.getText()).join(" ") :
		chunk instanceof Token ? chunk.getText() :
		chunk.toString();
	return str.length == 0 ? "[empty]" : `"${str}"`
});

export function forceType<T>(input:unknown):asserts input is T {}
