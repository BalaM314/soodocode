/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/

import { Token, TokenType } from "./lexer-types.js";
import { tokenNameTypeData, tokenTextMapping } from "./lexer.js";
import type { TokenMatcher } from "./parser-types.js";
import type { UnresolvedVariableType } from "./runtime-types.js";
import type { BoxPrimitive, IFormattable, MergeTuples, TagFunction, TextRange, TextRangeLike, TextRanged, TextRanged2 } from "./types.js";


export function getText(tokens:RangeArray<Token>){
	return tokens.map(t => t.text).join(" ");
}

/**
 * Helper function for handling checks for paren and bracket nest level.
 * Call update() once per iter, and done() after finishing iteration.
 */
export function manageNestLevel(reversed = false, validate = true){
	let paren = 0;
	let bracket = 0;
	const sign = reversed ? -1 : +1;
	return {
		update(token:Token){
			if(token.type == "parentheses.open") paren += sign;
			else if(token.type == "parentheses.close") paren -= sign;
			else if(token.type == "bracket.open") bracket += sign;
			else if(token.type == "bracket.close") bracket -= sign;
			if(validate){
				if(paren < 0) fail(reversed ? `Unclosed parenthesis group` : `No parenthesis group to close`, token);
				if(bracket < 0) fail(reversed ? `Unclosed square bracket group` : `No square bracket group to close`, token);
			}
		},
		/** Whether the iteration is NOT inside a paren or bracket pair. */
		out(){
			return paren == 0 && bracket == 0;
		},
		/** Whether the iteration is currently inside a paren or bracket pair. */
		in(){
			return paren != 0 || bracket != 0;
		},
		/** Pass input in left-to-right order, even if the previous iteration was right to left. */
		done(input:Token[] | TextRange){
			if(isRange(input)){
				//No more detailed information, just fail
				if(paren != 0) fail(reversed ? `No square bracket group to close` : `Unclosed square bracket group`, input);
				if(bracket != 0) fail(reversed ? `No parenthesis group to close` : `Unclosed parenthesis group`, input);
			} else {
				if(paren != 0 || bracket != 0){
					//Iterate through the tokens in the other order to find the unmatched paren
					const reverse = !reversed;
					const reverseIter = manageNestLevel(reverse, true);
					for(const token of (reverse ? input.slice().reverse() : input))
						reverseIter.update(token);
					impossible();
				}
			}
		}
	};
}

export function displayTokenMatcher(input:TokenMatcher):string {
	if(isKey(tokenTextMapping, input)){
		return `the ${
			input.startsWith("keyword.") ? "keyword" :
			input.startsWith("operator.") ? "operator" :
			"character"
		} "${tokenTextMapping[input]}"`;
	} else return {
		".": "one token",
		".*": "anything",
		".+": "something",
		"class_modifier": `"PRIVATE" or "PUBLIC"`,
		"expr+": "an expression",
		"file_mode": `"READ", "WRITE", "APPEND", or "RANDOM"`,
		"literal": "a literal",
		"literal|otherwise": `a literal or "OTHERWISE"`,
		"type+": "a type",
		"char": "a character literal",
		"string": "a string literal",
		"number.decimal": "a number",
		"name": "an identifier"
	}[input];
}

/**
 * Applies range transformers to some text.
 * @param transformer Called on each character (Unicode scalar value)
 * @returns the text, with the start and end values specified in `ranges`.
 */
export function applyRangeTransformers<T>(
	text:string,
	ranges:Array<readonly [
		range:TextRange,
		start:string, end:string
	]>,
	transformer:(char:string) => string = (x => x)
):string{
	/*
		Motivating example: the text

		"aa" & 2 & "bb"
		01234567890123

		Here, the range [5, 6) needs to have a span tag placed around it.
		However, the &s also need to be escaped with escapeHTML.
		Replacing them with &amp; will cause [5, 6) to point to some other text.

		Solution: split the text on characters, and individually escape each character. Then, the range will still be valid.
	*/
	const chars = [...text].map(transformer);
	for(const [[range, start, end], remaining] of withRemaining(ranges)){
		chars.splice(range[1], 0, end);
		chars.splice(range[0], 0, start);
		remaining.forEach(([next]) => {
			/*
				0123456789qwertyuiop9876543210
				[3, 5]
				012(34)56789qwertyuiop9876543210
				<= 2: no change
				> 2: + start
				>= 4: + start + end
			*/
			next[0] =
				next[0] >= range[1] ? next[0] + 2 : //Increase by start + end
				next[0] > range[0] ? next[0] + 1 : //Increase by start
				(next[0] >= range[0] && next[1] <= range[1]) ? next[0] + 1 : //Increase by start
				next[0]; //Don't increase
			next[1] =
				next[1] > range[1] ? next[1] + 2 : //Increase by start + end
				(next[1] >= range[1] && next[0] < range[0]) ? next[1] + 2 : //Increase by start + end
				next[1] > range[0] ? next[1] + 1 : //Increase by start
				next[1]; //Don't increase
		});
	}
	return chars.join("");
}

export function separateArray<T, S extends T>(arr:T[], predicate:(item:T) => item is S):[true: S[], false: T[]];
export function separateArray<T>(arr:T[], predicate:(item:T) => boolean):[true: T[], false: T[]];
export function separateArray<T>(arr:T[], predicate:(item:T) => boolean):[true: T[], false: T[]] {
	const a:T[] = [];
	const b:T[] = [];
	for(const el of arr){
		(predicate(el) ? a : b).push(el);
	}
	return [a, b];
}
export function groupArray<T, const S extends PropertyKey>(arr:T[], predicate:(item:T) => S):Partial<Record<S, T[]>>;
export function groupArray<T, const S extends PropertyKey>(arr:T[], predicate:(item:T) => S, keys:S[]):Record<S, T[]>;
export function groupArray<T, const S extends PropertyKey>(arr:T[], predicate:(item:T) => S, keys?:S[]):Partial<Record<S, T[]>> {
	const out:Partial<Record<S, T[]>> = keys ? Object.fromEntries(keys.map(k => [k, []])) : {};
	for(const el of arr){
		(out[predicate(el)] ??= []).push(el);
	}
	return out;
}

export function splitArray<T>(arr:T[], split:[T] | ((item:T, index:number, array:T[]) => boolean)):T[][] {
	const output:T[][] = [[]];
	if(typeof split == "function"){
		for(let i = 0; i < arr.length; i ++){
			if(split(arr[i], i, arr)) output.push([]);
			else output.at(-1)!.push(arr[i]);
		}
	} else {
		let lastBoundary = 0;
		for(let i = 0; i <= arr.length; i ++){
			if(i == arr.length || arr[i] == split[0]){
				output.push(arr.slice(lastBoundary, i));
				lastBoundary = i + 1;
			}
		}
	}
	return output;
}

export function splitTokens(arr:RangeArray<Token>, split:TokenType):RangeArray<Token>[] {
	const output:RangeArray<Token>[] = [];
	let lastBoundary = 0;
	for(let i = 0; i <= arr.length; i ++){
		if(i == arr.length || arr[i].type == split){
			output.push(arr.slice(lastBoundary, i));
			lastBoundary = i + 1;
		}
	}
	return output;
}

export function splitTokensWithSplitter(arr:RangeArray<Token>, split:TokenType):{ group:RangeArray<Token>; splitter?:Token; }[]{
	const output:{ group:RangeArray<Token>; splitter?:Token; }[] = [];
	let lastBoundary = 0;
	for(let i = 0; i <= arr.length; i ++){
		if(i == arr.length || arr[i].type == split){
			output.push({
				group: arr.slice(lastBoundary, i),
				splitter: arr[i]
			});
			lastBoundary = i + 1;
		}
	}
	return output;
}

export function splitTokensOnComma(arr:RangeArray<Token>):RangeArray<Token>[] {
	const output:RangeArray<Token>[] = [];
	let lastBoundary = 0;
	const nestLevel = manageNestLevel();
	for(const [i, token] of arr.entries()){
		nestLevel.update(token);
		if(nestLevel.out() && token.type == "punctuation.comma"){
			output.push(arr.slice(lastBoundary, i));
			lastBoundary = i + 1;
		}
	}
	nestLevel.done(arr);
	output.push(arr.slice(lastBoundary));
	return output;
}

export function findLastNotInGroup(arr:RangeArray<Token>, target:TokenType):number | null {
	const nestLevel = manageNestLevel(true);
	for(const [i, token] of [...arr.entries()].reverse()){
		nestLevel.update(token);
		if(nestLevel.out() && token.type == target)
			return i;
	}
	return null;
}

export function getUniqueNamesFromCommaSeparatedTokenList(tokens:RangeArray<Token>, nextToken?:Token, validNames:TokenType[] = ["name"]):RangeArray<Token> {
	if(tokens.length == 0) return tokens;

	const names:Token[] = [];
	let expected:"name" | "comma" = "name";
	for(const token of tokens){
		if(expected == "name"){
			if(validNames.includes(token.type)){
				names.push(token);
				expected = "comma";
			} else fail(f.quote`Expected a name, got ${token}`, token);
		} else {
			if(token.type == "punctuation.comma"){
				expected = "name";
			} else fail(f.quote`Expected a comma, got ${token}`, token);
		}
	}
	if(expected == "name") fail(`Expected a name, found ${nextToken?.text ?? "end of input"}`, nextToken);
	if(new Set(names.map(t => t.text)).size !== names.length){
		//duplicate value
		const duplicateToken = names.find((a, i) => names.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate name in ${names.join(" ")}`);
		fail(f.quote`Duplicate name ${duplicateToken} in list`, duplicateToken, tokens);
	}
	return new RangeArray<Token>(names);
}

export function getTotalRange(things:(TextRanged | TextRange)[]):TextRange {
	if(things.length == 0) crash(`Cannot get range from an empty list of tokens`);
	return things.map(t => Array.isArray(t) ? t : (typeof t.range == "function" ? t.range() : t.range)).reduce((acc, t) =>
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
	if(input instanceof RangeArray) return input.range;
	if(Array.isArray(input)) return getTotalRange(input);
	if(typeof input.range == "function") return input.range();
	else return input.range;
}
export function findRange(args:unknown[]):TextRange | undefined {
	for(const arg of args){
		if(typeof arg == "object" && arg != null && "range" in arg && isRange(arg.range))
			return arg.range;
		if(Array.isArray(arg) && isRange(arg[0]))
			return getTotalRange(arg as TextRange[]);
		if(Array.isArray(arg) && arg.length > 0 && isRange((arg[0] as TextRanged).range))
			return getTotalRange(arg as TextRanged[]);
	}
	return undefined;
}

export class SoodocodeError extends Error {
	modified = false;
	constructor(message:string, public rangeSpecific?:TextRange | null, public rangeGeneral?:TextRange | null, public rangeOther?:TextRange){
		super(message);
	}
	formatMessage(text:string){
		return this.message.replace("$rc",
			this.rangeOther ? text.slice(...this.rangeOther) : `<empty>`
		).replace("$r",
			this.rangeSpecific ? (text.slice(...this.rangeSpecific) || "<empty>") :
			this.rangeGeneral ? (text.slice(...this.rangeGeneral) || "<empty>") :
			`<empty>`
		);
	}
}

export function fail(message:string, rangeSpecific:TextRangeLike | null | undefined, rangeGeneral?:TextRangeLike | null, rangeOther?:TextRangeLike):never {
	throw new SoodocodeError(message, getRange(rangeSpecific), getRange(rangeGeneral), getRange(rangeOther));
}
export function rethrow(error:SoodocodeError, msg:(old:string) => string){
	error.message = msg(error.message);
	throw error;
}
export function crash(message:string, ...extra:unknown[]):never {
	console.error(...extra);
	throw new Error(message);
}
export function impossible():never {
	throw new Error(`this shouldn't be possible...`);
}

export function Abstract<TClass extends new (...args:any[]) => {}>(input:TClass, context:ClassDecoratorContext<TClass>):TClass {
	return class __temp extends input {
		constructor(...args:any[]){
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			super(...args);
			if(new.target === __temp) throw new Error(`Cannot construct abstract class ${input.name}`);
		}
	};
}

/**
 * Decorator to apply an error boundary to functions.
 * @param predicate General range is set if this returns true.
 */
//TODO partially remove this
export function errorBoundary({predicate = (() => true), message}:Partial<{
	predicate(...args:any[]): boolean;
	message(...args:any[]): string;
}> = {}){
	return function decorator<T extends (...args:any[]) => unknown>(func:T, _ctx?:ClassMethodDecoratorContext):T {
		const name = func.name.startsWith("_") ? `wrapped${func.name}` : `wrapped_${func.name}`;
		const replacedFunction = {[name](this:ThisParameterType<T>, ...args:Parameters<T>){
			try {
				return func.apply(this, args);
			} catch(err){
				if(err instanceof SoodocodeError){
					if(message && !err.modified){
						err.message = message(...args) + err.message;
						if(err.rangeOther) impossible();
						err.rangeOther = findRange(args);
					}
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
		}}[name];
		Object.defineProperty(replacedFunction, "name", { value: name });
		replacedFunction.displayName = name;
		return replacedFunction as T;
	};
}

/** Must only be called once on input. */
export function escapeHTML(input?:string):string {
	if(input == undefined) return "";
	return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function parseError(thing:unknown):string {
	if(thing instanceof Error){
		return thing.toString();
	} else if(typeof thing == "string"){
		return thing;
	} else if(thing != null && typeof thing == "object" && "toString" in thing && typeof thing.toString == "function"){
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return thing.toString();
	} else {
		console.log("Unable to parse the following error object");
		console.log(thing);
		return "Unable to parse error object";
	}
}

type Iterators<T extends unknown[]> = {
	[P in keyof T]: Iterator<T[P]>;
};

export function* zip<T extends unknown[]>(...iters:Iterators<T>):IterableIterator<T> {
	while(true){
		const values = iters.map(i => i.next());
		if(values.some(v => v.done)) break;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		yield values.map(v => v.value) as T;
	}
}

export function* withRemaining<T>(items:T[]):IterableIterator<[T, T[]]> {
	for(let i = 0; i < items.length; i ++){
		yield [items[i], items.slice(i + 1)];
	}
}

/** Generates a tag template processor from a function that processes one value at a time. */
export function tagProcessor<T>(
	transformer:(chunk:T, index:number, allStringChunks:readonly string[], allVarChunks:readonly T[]) => string
):TagFunction<T, string> {
	return function(stringChunks:readonly string[], ...varChunks:readonly T[]){
		return String.raw({raw: stringChunks}, ...varChunks.map((chunk, i) => transformer(chunk, i, stringChunks, varChunks)));
	};
}

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export type Formattable = IFormattable | IFormattable[] | string | Exclude<UnresolvedVariableType, IFormattable> | String | Number | Boolean | number | boolean;
function formatText(input:Formattable):string {
	if(
		input instanceof String || input instanceof Number || input instanceof Boolean ||
		typeof input == "string" || typeof input == "number" || typeof input == "boolean"
	) return input.toString(); // eslint-disable-line @typescript-eslint/no-base-to-string
	if(Array.isArray(input)){
		if(input[0] == "unresolved" && typeof input[1] == "string") return input[1];
		return (input as IFormattable[]).map(formatText).join(" ");
	} else return input.fmtText();
}
function formatShort(input:Formattable):string {
	if(
		input instanceof String || input instanceof Number || input instanceof Boolean ||
		typeof input == "string" || typeof input == "number" || typeof input == "boolean"
	) return input.toString(); // eslint-disable-line @typescript-eslint/no-base-to-string
	if(Array.isArray(input)){
		if(input[0] == "unresolved" && typeof input[1] == "string") return input[1];
		return (input as IFormattable[]).map(formatShort).join(" ");
	} else return input.fmtShort?.() ?? input.fmtText();
}
function formatQuoted(input:Formattable):string {
	let str:string;
	if(
		input instanceof String || input instanceof Number || input instanceof Boolean ||
		typeof input == "string" || typeof input == "number" || typeof input == "boolean"
	) str = input.toString(); // eslint-disable-line @typescript-eslint/no-base-to-string
	else if(Array.isArray(input)){
		if(input[0] == "unresolved" && typeof input[1] == "string") str = input[1];
		else str = (input as IFormattable[]).map(formatText).join(" ");
	} else return input.fmtQuoted?.() ?? `"${input.fmtText()}"`;
	
	if(str.length == 0) str = `[empty]`;
	return `"${str}"`;
}
function formatDebug(input:Formattable):string {
	if(
		input instanceof String || input instanceof Number || input instanceof Boolean ||
		typeof input == "string" || typeof input == "number" || typeof input == "boolean"
	) return input.toString(); // eslint-disable-line @typescript-eslint/no-base-to-string
	if(Array.isArray(input)){
		if(input[0] == "unresolved" && typeof input[1] == "string") return `UnresolvedVariableType[${input[1]}]`;
		return `[${(input as IFormattable[]).map(formatDebug).join(", ")}]`;
	} else return input.fmtDebug();
}
export const f = {
	text: tagProcessor(formatText),
	short: tagProcessor(formatShort),
	quote: tagProcessor(formatQuoted),
	debug: tagProcessor(formatDebug),
};

export function forceType<T>(input:unknown):asserts input is T {}

export function isKey<T extends Record<PropertyKey, unknown>>(record:T, key:PropertyKey):key is keyof T {
	return key in record;
}
export function access<TVal, TNull>(record:Record<PropertyKey, TVal>, key:PropertyKey, fallback:TNull):TVal | TNull {
	return record[key] ?? fallback;
}

export function min<T>(input:T[], predicate:(arg:T) => number, threshold = Infinity):T | null {
	let min = threshold;
	let minItem:T | null = null;
	for(const item of input){
		const score = predicate(item);
		if(score < min){
			min = score;
			minItem = item;
		}
	}
	return minItem;
}
export function max<T>(input:T[], predicate:(arg:T) => number, threshold = -Infinity):T | null {
	let max = threshold;
	let maxItem:T | null = null;
	for(const item of input){
		const score = predicate(item);
		if(score > max){
			max = score;
			maxItem = item;
		}
	}
	return maxItem;
}

export function biasedLevenshtein(a:string, b:string, maxLengthProduct = 1000):number {
	//case insensitive
	a = a.toLowerCase();
	b = b.toLowerCase();
	if(a == b) return 0;

	const length = (a.length + 1) * (b.length + 1);
	if(length > maxLengthProduct) return NaN; //fail safe to prevent allocating a huge array due to user input
	const matrix = new Uint8Array(length);

	let ij = 0;
	for(let i = 0; i <= a.length; i ++){
		for(let j = 0; j <= b.length; j ++, ij ++){
			matrix[ij] =
				(i == 0) ? j : (j == 0) ? i : //edges of matrix simply count up in order
				Math.min(
					//Pick the lowest of the three options (add to a, add to b, substitute)
					(matrix[(i - 1) * (b.length + 1) + j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1)),
					matrix[(i - 1) * (b.length + 1) + j] + 1,
					matrix[i * (b.length + 1) + j - 1] + 1,
				);
		}
	}

	const out = matrix.at(-1)!; //bottom right corner of matrix
	//apply weighting
	if(a.length <= 1 || b.length <= 1) return out * 4;
	if(a.length <= 2 || b.length <= 2) return out * 2;
	if(b.startsWith(a) || a.startsWith(b)) return out * 0.7;
	if(b.includes(a) || a.includes(b)) return out * 0.9;
	return out;
}

export function closestKeywordToken(input:string, threshold = 1.5):TokenType | undefined {
	const keywordTokens = Object.entries(tokenNameTypeData);
	if(input.toUpperCase() in tokenNameTypeData){
		return tokenNameTypeData[input.toUpperCase() as keyof typeof tokenNameTypeData];
	}
	return min(keywordTokens, ([expected, type]) => biasedLevenshtein(expected, input), threshold)?.[1];
}

const fakeObjectTrap = new Proxy({}, {
	get(target, property){ crash(`Attempted to access property ${String(property)} on fake object`); },
});
export function fakeObject<T>(input:Partial<T>):T {
	Object.setPrototypeOf(input, fakeObjectTrap);
	return input as never;
}
export function tryRun<T>(callback:() => T):[T, null] | [null, SoodocodeError] {
	try {
		return [callback(), null];
	} catch(err){
		if(err instanceof SoodocodeError){
			return [null, err];
		} else throw err;
	}
}
export function tryRunOr<T>(callback:() => T, errorHandler:(err:SoodocodeError) => unknown):boolean {
	try {
		callback();
		return true;
	} catch(err){
		if(err instanceof SoodocodeError){
			errorHandler(err);
			return false;
		} else throw err;
	}
}

export function boxPrimitive<T>(input:T):BoxPrimitive<T> {
	if(typeof input == "boolean") return new Boolean(input) as never;
	if(typeof input == "number") return new Number(input) as never;
	if(typeof input == "string") return new String(input) as never;
	return input as never;
}

let _unicodeSetsSupported:null | boolean = null;
export function unicodeSetsSupported(){
	return _unicodeSetsSupported ??= (() => {
		try {
			void new RegExp("", "v");
			return true;
		} catch(err){
			return false;
		}
	})();
}

export function capitalizeWord(word:string):string {
	return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function capitalizeText(input:string):string {
	return input
		.split(/[^a-z0-9]+/i)
		.map((w, i) => i == 0 ? capitalizeWord(w) : w.toLowerCase())
		.join(" ");
}

export function shallowCloneOwnProperties<T extends {}>(input:T):T {
	return Object.defineProperties({}, Object.getOwnPropertyDescriptors(input)) as T;
}

export class RangeArray<T extends TextRanged2> extends Array<T> implements TextRanged {
	range:TextRange;
	// constructor(length:number);
	constructor(tokens:T[], range?:TextRange);
	/** range must be specified if the array is empty */
	constructor(arg0:number | T[], range?:TextRange){
		if(typeof arg0 == "number"){
			super(arg0);
			this.range = null!;
		} else {
			super(...arg0);
			this.range = range ?? getTotalRange(arg0);
		}
	}
	slice(start:number = 0, end:number = this.length):RangeArray<T> {
		const arr = super.slice(start, end);
		if(arr.length == 0){
			//Determine the range
			let range:TextRange;
			if(this.length == 0) range = this.range; //slicing an empty array, no other information is available so just use the same range
			else {
				//If the element before the start of the slice exists
				//Pick the end of that element's range
				//Otherwise, pick the start of the array's range
				const rangeStart = this[start - 1]?.range[1] ?? this.range[0];
				//If the element after the end of the slice exists
				//Pick the beginning of that element's range
				//Otherwise, pick the end of the array's range
				const rangeEnd = this.at(end)?.range[0] ?? this.range[1];
				range = [rangeStart, rangeEnd];
			}
			return new RangeArray<T>(arr, range);
		} else {
			return new RangeArray<T>(arr);
		}
	}
	map<U>(fn:(v:T, i:number, a:T[]) => U):U[] {
		return Array.from(this).map(fn);
	}
	/** If the resulting array is empty, but the parent array was not, range must be specified. */
	select(fn:(v:T, i:number, a:T[]) => boolean, range?:TextRange):RangeArray<T> {
		if(this.length == 0) return this.slice();
		const arr = super.filter(fn) as never as RangeArray<T>;
		arr.range = arr.length > 0 ? getTotalRange(arr) : (range ?? crash(`Cannot get range from an empty filtered list of tokens`));
		return arr;
	}
}
RangeArray.prototype.filter = () => crash(`Do not call filter() on RangeArray, use select() instead.`);


export type Class = (new (...args: any[]) => unknown) & Record<PropertyKey, unknown>;
export type MergeInstances<A, B> = A & B extends never ? 
	// Merging them with & hasn't worked because one or more of the properties are incompatible
	// Remove keyof B from A before intersecting
	Omit<A, keyof B> & B
: A & B;
export type MergeClassConstructors<Ctors extends new (...args:any[]) => unknown, Instance> =
	//what the heck?
	new (...args:MergeTuples<
		Ctors extends unknown ? ConstructorParameters<Ctors> : never
	>) => Instance;

export type MixClasses<A extends new (...args:any[]) => unknown, B extends new (...args:any[]) => unknown> =
	//Statics
	{
		[K in Exclude<keyof A, keyof B | "prototype">]: A[K];
	} & {
		[K in Exclude<keyof B, "prototype">]: B[K];
	} &
	//Constructor
	MergeClassConstructors<A | B, MergeInstances<InstanceType<A>, InstanceType<B>>>;

export type MixClassesTuple<Classes extends (new (...args:any[]) => unknown)[]> =
	Classes["length"] extends 1 ? Classes[0] :
	Classes extends [
		...left:(infer Left extends (new (...args:any[]) => unknown)[]),
		right:infer Last extends (new (...args:any[]) => unknown)
	] ? MixClasses<MixClassesTuple<Left>, Last> : never;

/** Except Object.prototype */
export function getAllPropertyDescriptors(object:Record<PropertyKey, unknown>):PropertyDescriptorMap {
	const proto = Object.getPrototypeOf(object) as Record<PropertyKey, unknown>;
	if(proto == Object.prototype || proto == null)
		return Object.getOwnPropertyDescriptors(object);
	else return {
		...getAllPropertyDescriptors(proto),
		...Object.getOwnPropertyDescriptors(object),
	};
}
export function combineClasses<const Classes extends (new (...args:any[]) => unknown)[]>(...classes:Classes):MixClassesTuple<Classes> {
	function ctor(this:any, ...args:any[]){
		if(!new.target) crash(`Cannot call class constructor without new`);
		//Copy the own properties only
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		Object.assign(this, ...classes.map(c =>
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			Reflect.construct(c, args, new.target)
		));
	}
	Object.setPrototypeOf(ctor, classes[0]);
	const statics = Object.defineProperties({}, Object.assign({},
		...classes.slice(1).map(c => getAllPropertyDescriptors(
			c as Class
		))
	) as PropertyDescriptorMap) as Record<string, unknown>;
	const ctorPrototype = Object.defineProperties(
		//Copy all properties from the prototype chain
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		Object.create(classes[0].prototype), Object.assign({},
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			...classes.slice(1).map(c => getAllPropertyDescriptors(c.prototype))
		)
	) as Record<string, unknown>;
	return Object.assign(ctor,
		statics,
		{
			prototype: ctorPrototype
		}
	) as never as MixClassesTuple<Classes>;
}
