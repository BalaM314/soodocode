/* @license
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/

import type { Config } from "../config/config.js";
import type { UnresolvedVariableType } from "../runtime/runtime-types.js";
import type { TextRange, TextRangeLike, TextRanged, TextRanged2 } from "./types.js";
import type { BoxPrimitive } from "./types.js";
import type { MergeTuples } from "./types.js";

//#region array utils
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
//#endregion
//#region range
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
//#endregion
//#region errors
export type ErrorMessageLine = string | Array<string | number | TextRangeLike>;
/** Used for rich error messages. May contain a button that changes the config value. */
export type ConfigSuggestion<T> = {
	/**
	 * The help text will be: `help: ${message}, ${enable/disable} the config "${config name}"`
	 * If unspecified, this message will be "To allow this"
	 * @example
	 * {
	 *   message: "To fix this",
	 *   config: configs.syntax.semicolons_as_newlines,
	 *   value: true,
	 * }
	 * `help: To fix this, enable the config "Semicolons as newlines"`
	 */
	message?: string;
	config: Config<T, boolean>;
	value: T extends number ? "increase" | "decrease" : T;
};

export type RichErrorMessage = {
	/** Short summary of the error, displayed at the top */
	summary: ErrorMessageLine;
	/** Details about what exactly caused the error, displayed after the summary */
	elaboration?: string | ErrorMessageLine[];
	/**
	 * Should be automatically filled in
	 * @example
	 * while evaluating the expression "2 + a + 2"
	 * while running the statement "OUTPUT 2 + a + 2"
	 */
	context?: string | ErrorMessageLine[];
	/**
	 * Suggests a solution to the error
	 */
	help?: string | ErrorMessageLine[] | ConfigSuggestion<any>;
};

export type ErrorMessage = string | RichErrorMessage;
function formatErrorLine(line:ErrorMessageLine, sourceCode:string):string {
	return typeof line == "string" ? line : line.map(chunk =>
		(typeof chunk == "string" || typeof chunk == "number")
			? String(chunk)
			: sourceCode.slice(...getRange(chunk))
	).join("");
}

declare global {
	// eslint-disable-next-line no-var
	var currentConfigModificationFunc: (() => void) | undefined;
}
export class SoodocodeError extends Error {
	modified = false;
	constructor(public richMessage:ErrorMessage, public rangeSpecific?:TextRange | null, public rangeGeneral?:TextRange | null, public rangeOther?:TextRange){
		super(SoodocodeError.getString(richMessage));
	}
	formatMessage(sourceCode:string):string {
		if(typeof this.richMessage == "string"){
			return this.richMessage.replace("$rc",
				this.rangeOther ? sourceCode.slice(...this.rangeOther) : `<empty>`
			) + "\n\n" + this.showRange(sourceCode, false);
		} else {
			let output = "";
			output += formatErrorLine(this.richMessage.summary, sourceCode) + "\n";
			if(this.richMessage.elaboration){
				output += array(this.richMessage.elaboration).map(line => "\t" + formatErrorLine(line, sourceCode) + "\n").join("");
				output += "\n";
			}
			if(this.richMessage.context){
				output += array(this.richMessage.context).map(line => "\t" + formatErrorLine(line, sourceCode) + "\n").join("");
				output += "\n";
			}
			const { help } = this.richMessage;
			if(help){
				if(Array.isArray(help) || typeof help === "string"){
					//Lines or string
					output += array(help).map(line => `help: ${formatErrorLine(line, sourceCode)}`).join("\n");
				} else {
					output += `help: ${help.message ?? `To allow this`}, ${
						help.value === true ? `enable the config "${help.config.name}"` :
						help.value === false ? `disable the config "${help.config.name}"` :
						["increase", "decrease"].includes(help.value) ? `${help.value} the value of the config "${help.config.name}"` :
						`change the config "${help.config.name}" to ${String(help.value)}`
					}`;
				}
			}
			output += "\n\n" + this.showRange(sourceCode, false);
			return output;
		}
	}
	/** Must escape HTML special chars from user input. */
	formatMessageHTML(sourceCode:string):string {
		if(typeof this.richMessage == "string"){
			return span(this.richMessage.replace("$rc",
				this.rangeOther ? sourceCode.slice(...this.rangeOther) : `<empty>`
			), "error-message") + "\n\n" + this.showRange(sourceCode, true);
		} else {
			let output = "";
			output += span(formatErrorLine(this.richMessage.summary, sourceCode), "error-message") + "\n";
			if(this.richMessage.elaboration){
				output += array(this.richMessage.elaboration).map(line => "  &bull; " + span(formatErrorLine(line, sourceCode), "error-message-elaboration") + "\n").join("");
			}
			if(this.richMessage.context){
				output += array(this.richMessage.context).map(line => "\t" + span(formatErrorLine(line, sourceCode), "error-message-context") + "\n").join("");
			}
			const { help } = this.richMessage;
			if(help){
				output += "\n"; //Extra blank line before the help message
				if(Array.isArray(help) || typeof help === "string"){
					//Lines or string
					output += span(array(help).map(line => `help: ${formatErrorLine(line, sourceCode)}`).join("\n"), "error-message-help");
				} else {
					const shouldCreateButton = typeof help.value !== "string";
					//Add a button that enables it
					if(shouldCreateButton)
						globalThis.currentConfigModificationFunc = () => {
							// safety: value is not "increase" or "decrease"
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							help.config.value = help.value;
							globalThis.currentConfigModificationFunc = () => {
								document.getElementById("execute-soodocode-button")?.click();
								globalThis.currentConfigModificationFunc = undefined;
							};
						};
					const buttonAttributes = `class="error-message-help-clickable" onclick="currentConfigModificationFunc?.();this.classList.add('error-message-help-clicked');"`;
					output += (
`<span class="error-message-help">\
help: ${escapeHTML(help.message ?? `to allow this`)}, \
<span ${shouldCreateButton ? buttonAttributes : ""}>${escapeHTML(
	help.value === true ? `enable the config "${help.config.name}"` :
	help.value === false ? `disable the config "${help.config.name}"` :
	["increase", "decrease"].includes(help.value) ? `${help.value} the value of the config "${help.config.name}"` :
	`change the config "${help.config.name}" to ${String(help.value)}`
)}</span></span>`
					);
					output += "\n";
				}
			}
			output += "\n"; //Extra blank line
			output += this.showRange(sourceCode, true);
			return output;
		}
	}
	adjustRanges(text:string){
		if(this.rangeSpecific){
			if(this.rangeSpecific[0] == this.rangeSpecific[1]){
				//Expand the range forward by one if it has a size of zero
				this.rangeSpecific[1] ++;
			}
			if(this.rangeSpecific[1] - this.rangeSpecific[0] == 1){
				//Move back the range if it only contains a newline, or nothing
				const specificText = text.slice(...this.rangeSpecific);
				if(specificText == "" || specificText == "\n")
					this.rangeSpecific = this.rangeSpecific.map(n => n - 1);
			}
		}
		if(this.rangeGeneral && this.rangeSpecific){
			//If the specific range is one character after the end of the general range, expand the general range
			if(
				this.rangeSpecific[1] - this.rangeSpecific[0] == 1 &&
				this.rangeGeneral[1] == this.rangeSpecific[0]
			) this.rangeGeneral[1] ++;
		}
	}
	showRange(text:string, html:boolean):string {
		if(!this.rangeGeneral && !this.rangeSpecific) return ``; //can't show anything
		this.adjustRanges(text);

		let outerRange:TextRange;
		if(html){
			outerRange = getTotalRange([this.rangeGeneral, this.rangeSpecific].filter(Boolean));
		} else {
			//No colors, so only the inner range is used
			outerRange = this.rangeSpecific ?? this.rangeGeneral!;
		}
		const beforeText = text.slice(0, outerRange[0]);
		const rangeText = text.slice(...outerRange);
		const beforeLines = beforeText.split("\n");
		const lineNumber = beforeLines.length.toString();
		const previousLineNumber = (beforeLines.length - 1).toString().padStart(lineNumber.length, " ");
		const previousLine = beforeLines.at(-2);
		const startOfLine = beforeLines.at(-1)!;
		/** Might not be from the same line as startOfLine */
		const restOfLine = text.slice(outerRange[1]).split("\n")[0];

		const lines = html ? (() => {
			const formattedRangeText = applyRangeTransformers(rangeText, [
				this.rangeGeneral && [
					this.rangeGeneral.map(n => n - outerRange[0]), //Everything before outerRange[0] was sliced off, so subtract that
					`<span class="error-range-outer">`, "</span>",
				] as const,
				this.rangeSpecific && [
					this.rangeSpecific.map(n => n - outerRange[0]), //Everything before outerRange[0] was sliced off, so subtract that
					`<span class="error-range-inner">`, "</span>",
				] as const,
			].filter(Boolean), escapeHTML);
			const formattedPreviousLine = previousLine && `${previousLineNumber} | ${escapeHTML(previousLine)}`;
			const errorLine = `${lineNumber} | ${escapeHTML(startOfLine)}${formattedRangeText}${escapeHTML(restOfLine)}`;
			return [formattedPreviousLine, errorLine];
		})() : (() => {
			const formattedPreviousLine = previousLine && `${previousLineNumber} | ${previousLine}`;
			const errorLine = `${lineNumber} | ${startOfLine}${rangeText}${restOfLine}`;
			const underlineLine = `${" ".repeat(lineNumber.length)} | ${startOfLine.replace(/[^\t]/g, " ")}${"~".repeat(rangeText.length)}`;
			return [formattedPreviousLine, errorLine, underlineLine];
		})();
		const formattedText = lines.filter(Boolean).map(l => "\t" + l).join("\n");
		if(html) return `<span class="code-display">${formattedText}</span>`;
		else return formattedText;
	}
	/** Tries to get a string out of an error message. Should not be shown to the user. */
	static getString(message:ErrorMessage):string {
		if(typeof message == "string") return message;
		return typeof message.summary == "string" ? message.summary : message.summary.map(chunk =>
			typeof chunk == "string" ? chunk : "<...>"
		).join("");
	}
}
export function enableConfig(config:Config<boolean, boolean>):ConfigSuggestion<boolean> {
	return {
		config,
		value: true
	};
}
export function setConfig(value:"increase" | "decrease", config:Config<number, boolean>):ConfigSuggestion<number> {
	return { config, value };
}


export function fail(message:ErrorMessage, rangeSpecific:TextRangeLike | null | undefined, rangeGeneral?:TextRangeLike | null, rangeOther?:TextRangeLike):never {
	throw new SoodocodeError(message, getRange(rangeSpecific), getRange(rangeGeneral), getRange(rangeOther));
}
export function rethrow(error:SoodocodeError, msg:(old:ErrorMessage) => ErrorMessage){
	error.richMessage = msg(error.richMessage);
	throw error;
}
export function crash(message:string, ...extra:unknown[]):never {
	if(extra.length > 0 && typeof console != "undefined") console.error(...extra);
	throw new Error(message);
}
export function impossible():never {
	throw new Error(`this shouldn't be possible...`);
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
//#endregion
//#region decorators
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
						const _rangeGeneral = findRange(args.concat(this));
						if(!( //If the general range is unspecified, and when guessed is equal to the specific range, just set it to null
							_rangeGeneral && err.rangeSpecific && (
								_rangeGeneral[0] == err.rangeSpecific[0] && _rangeGeneral[1] == err.rangeSpecific[1]
							)
						)) err.rangeGeneral = _rangeGeneral;
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

export function Abstract<TClass extends new (...args:any[]) => {}>(input:TClass, context:ClassDecoratorContext<TClass>):TClass {
	return class __temp extends input {
		constructor(...args:any[]){
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			super(...args);
			if(new.target === __temp) throw new Error(`Cannot construct abstract class ${input.name}`);
		}
	};
}
//#endregion
//#region misc utils
export function array<T>(input:T | T[]):T[] {
	if(Array.isArray(input)) return input;
	else return [input];
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
/**
 * Applies range transformers to some text.
 * @param transformer Called on each character (Unicode scalar value)
 * @returns the text, with the start and end values specified in `ranges`.
 */
export function applyRangeTransformers(
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
const fakeObjectTrap = new Proxy({}, {
	get(target, property){ crash(`Attempted to access property ${String(property)} on fake object`); },
});
export function fakeObject<T>(input:Partial<T>):T {
	Object.setPrototypeOf(input, fakeObjectTrap);
	return input as never;
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
		} catch {
			return false;
		}
	})();
}

export function shallowCloneOwnProperties<T extends {}>(input:T):T {
	return Object.defineProperties({}, Object.getOwnPropertyDescriptors(input)) as T;
}
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
export function match<K extends PropertyKey, O extends Record<K, unknown>>(value:K, clauses:O):O[K];
export function match<K extends PropertyKey, O extends Partial<Record<K, unknown>>, D>(value:K, clauses:O, defaultValue:D):O[K] | D;
export function match(value:PropertyKey, clauses:Record<PropertyKey, unknown>, defaultValue?:unknown):unknown {
	return value in clauses ? clauses[value] : defaultValue;
}
//#endregion
//#region iterators
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
export function weave<T>(...arrays:ReadonlyArray<ReadonlyArray<T>>):T[] {
	const out:T[] = [];
	for(let j = 0 ;; j ++){
		for(let i = 0; i < arrays.length; i ++){
			if(j >= arrays[i].length) return out;
			out.push(arrays[i][j]);
		}
	}
}
export function* withRemaining<T>(items:T[]):IterableIterator<[T, T[]]> {
	for(let i = 0; i < items.length; i ++){
		yield [items[i], items.slice(i + 1)];
	}
}
//#endregion
//#region html
/** Must only be called once on input. */
export function escapeHTML(input?:string):string {
	if(input == undefined) return "";
	return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
/** Must escape HTML special chars from user input. */
export function span<const T extends string>(input:string, className:T):string extends T ? { _err: "Style must be a string literal" } : string {
	return `<span class="${className}">${escapeHTML(input)}</span>` as never;
}
//#endregion
//#region string processing
export function plural(count:number, word:string, plural = word + "s"){
	return `${count} ${count == 1 ? word : plural}`;
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
//#endregion
//#region formatting
export interface TagFunction<Tin = string, Tout = string> {
	(stringChunks: readonly string[], ...varChunks: readonly Tin[]):Tout;
}
/** Generates a tag template processor from a function that processes one value at a time. */
export function tagProcessor<T>(
	transformer:(chunk:T, index:number, allStringChunks:readonly string[], allVarChunks:readonly T[]) => string
):TagFunction<T, string> {
	return function(stringChunks:readonly string[], ...varChunks:readonly T[]){
		return String.raw({raw: stringChunks}, ...varChunks.map((chunk, i) => transformer(chunk, i, stringChunks, varChunks)));
	};
}
export interface IFormattable {
	fmtDebug(): string;
	/** If not implemented, defaults to `"${fmtText()}"` */
	fmtQuoted?: () => string;
	fmtText(): string;
	/** If not implemented, defaults to fmtText() */
	fmtShort?: () => string;
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
export function quote(input:Formattable | null | undefined):string | null | undefined {
	return input != null ? formatQuoted(input) : input;
}
export const f = {
	text: tagProcessor(formatText),
	short: tagProcessor(formatShort),
	quote: tagProcessor(formatQuoted),
	debug: tagProcessor(formatDebug),
	quoteRange(stringChunks: readonly string[], ...varChunks: readonly (string | number | TextRangeLike)[]):(string | number | TextRangeLike)[] {
		return weave(stringChunks.map((chunk, i) => {
			if(varChunks.length == 0) return chunk;
			if(i == 0) return chunk + `"`;
			else if(i == varChunks.length) return `"` + chunk;
			else return `"${chunk}"`;
		}), varChunks);
	},
	range(stringChunks: readonly string[], ...varChunks: readonly (string | number | TextRangeLike)[]):(string | number | TextRangeLike)[] {
		return weave(stringChunks, varChunks);
	},
};
//#endregion
//#region typeutils
export function forceType<T>(input:unknown):asserts input is T {}

export function isKey<T extends Record<PropertyKey, unknown>>(record:T, key:PropertyKey):key is keyof T {
	return Object.hasOwn(record, key);
}
export function access<TVal, TNull>(record:Record<PropertyKey, TVal>, key:PropertyKey, fallback:TNull):TVal | TNull {
	return record[key] ?? fallback;
}
//#endregion
//#region levenshtein
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
//#endregion
//#region multiple inheritance

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
//#endregion


