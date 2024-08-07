import { Token, TokenType } from "./lexer-types.js";
import type { TokenMatcher } from "./parser-types.js";
import type { UnresolvedVariableType } from "./runtime-types.js";
import type { BoxPrimitive, IFormattable, TagFunction, TextRange, TextRangeLike, TextRanged, TextRanged2 } from "./types.js";
export declare function getText(tokens: RangeArray<Token>): string;
export declare function displayTokenMatcher(input: TokenMatcher): string;
export declare function applyRangeTransformers(text: string, ranges: [range: TextRange, start: string, end: string, transformer?: (rangeText: string) => string][]): string;
export declare function separateArray<T, S extends T>(arr: T[], predicate: (item: T) => item is S): [true: S[], false: T[]];
export declare function separateArray<T>(arr: T[], predicate: (item: T) => boolean): [true: T[], false: T[]];
export declare function groupArray<T, const S extends PropertyKey>(arr: T[], predicate: (item: T) => S): Partial<Record<S, T[]>>;
export declare function groupArray<T, const S extends PropertyKey>(arr: T[], predicate: (item: T) => S, keys: S[]): Record<S, T[]>;
export declare function splitArray<T>(arr: T[], split: [T] | ((item: T, index: number, array: T[]) => boolean)): T[][];
export declare function splitTokens(arr: RangeArray<Token>, split: TokenType): RangeArray<Token>[];
export declare function splitTokensWithSplitter(arr: RangeArray<Token>, split: TokenType): {
    group: RangeArray<Token>;
    splitter?: Token;
}[];
export declare function splitTokensOnComma(arr: RangeArray<Token>): RangeArray<Token>[];
export declare function findLastNotInGroup(arr: RangeArray<Token>, target: TokenType): number | null;
export declare function getUniqueNamesFromCommaSeparatedTokenList(tokens: RangeArray<Token>, nextToken?: Token, validNames?: TokenType[]): RangeArray<Token>;
export declare function getTotalRange(tokens: (TextRanged | TextRange)[]): TextRange;
export declare function isRange(input: unknown): input is TextRange;
export declare function getRange(input: TextRangeLike): TextRange;
export declare function getRange(input?: TextRangeLike): TextRange | undefined;
export declare function getRange(input?: TextRangeLike | null): TextRange | undefined | null;
export declare function findRange(args: unknown[]): TextRange | undefined;
export declare class SoodocodeError extends Error {
    rangeSpecific?: TextRange | null | undefined;
    rangeGeneral?: TextRange | null | undefined;
    rangeOther?: TextRange | undefined;
    modified: boolean;
    constructor(message: string, rangeSpecific?: TextRange | null | undefined, rangeGeneral?: TextRange | null | undefined, rangeOther?: TextRange | undefined);
    formatMessage(text: string): string;
}
export declare function fail(message: string, rangeSpecific: TextRangeLike | null | undefined, rangeGeneral?: TextRangeLike | null, rangeOther?: TextRangeLike): never;
export declare function rethrow(error: SoodocodeError, msg: (old: string) => string): void;
export declare function crash(message: string): never;
export declare function impossible(): never;
export declare function Abstract<TClass extends new (...args: any[]) => {}>(input: TClass, context: ClassDecoratorContext<TClass>): TClass;
export declare function errorBoundary({ predicate, message }?: Partial<{
    predicate(...args: any[]): boolean;
    message(...args: any[]): string;
}>): <T extends (...args: any[]) => unknown>(func: T, _ctx?: ClassMethodDecoratorContext) => T;
export declare function escapeHTML(input?: string): string;
export declare function parseError(thing: unknown): string;
type Iterators<T extends unknown[]> = {
    [P in keyof T]: Iterator<T[P]>;
};
export declare function zip<T extends unknown[]>(...iters: Iterators<T>): IterableIterator<T>;
export declare function tagProcessor<T>(transformer: (chunk: T, index: number, allStringChunks: readonly string[], allVarChunks: readonly T[]) => string): TagFunction<T, string>;
export type Formattable = IFormattable | IFormattable[] | string | UnresolvedVariableType | String | Number | Boolean | number | boolean;
export declare const f: {
    text: TagFunction<Formattable, string>;
    short: TagFunction<Formattable, string>;
    quote: TagFunction<Formattable, string>;
    debug: TagFunction<Formattable, string>;
};
export declare function forceType<T>(input: unknown): asserts input is T;
export declare function isKey<T extends Record<PropertyKey, unknown>>(record: T, key: PropertyKey): key is keyof T;
export declare function access<TVal, TNull>(record: Record<PropertyKey, TVal>, key: PropertyKey, fallback: TNull): TVal | TNull;
export declare function min<T>(input: T[], predicate: (arg: T) => number, threshold?: number): T | null;
export declare function biasedLevenshtein(a: string, b: string, maxLengthProduct?: number): number | null;
export declare function closestKeywordToken(input: string, threshold?: number): TokenType | undefined;
export declare function fakeObject<T>(input: Partial<T>): T;
export declare function tryRun<T>(callback: () => T): [T, null] | [null, SoodocodeError];
export declare function tryRunOr<T>(callback: () => T, errorHandler: (err: SoodocodeError) => unknown): boolean;
export declare function boxPrimitive<T>(input: T): BoxPrimitive<T>;
export declare function unicodeSetsSupported(): boolean;
export declare class RangeArray<T extends TextRanged2> extends Array<T> implements TextRanged {
    range: TextRange;
    constructor(tokens: T[], range?: TextRange);
    slice(start?: number, end?: number): RangeArray<T>;
    map<U>(fn: (v: T, i: number, a: T[]) => U): U[];
}
export {};
