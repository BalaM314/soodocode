import { Config } from "./config.js";
import { Token, TokenType } from "./lexer-types.js";
import type { TokenMatcher } from "./parser-types.js";
import type { UnresolvedVariableType } from "./runtime-types.js";
import type { BoxPrimitive, IFormattable, MergeTuples, TagFunction, TextRange, TextRangeLike, TextRanged, TextRanged2 } from "./types.js";
export declare function separateArray<T, S extends T>(arr: T[], predicate: (item: T) => item is S): [true: S[], false: T[]];
export declare function separateArray<T>(arr: T[], predicate: (item: T) => boolean): [true: T[], false: T[]];
export declare function groupArray<T, const S extends PropertyKey>(arr: T[], predicate: (item: T) => S): Partial<Record<S, T[]>>;
export declare function groupArray<T, const S extends PropertyKey>(arr: T[], predicate: (item: T) => S, keys: S[]): Record<S, T[]>;
export declare function min<T>(input: T[], predicate: (arg: T) => number, threshold?: number): T | null;
export declare function max<T>(input: T[], predicate: (arg: T) => number, threshold?: number): T | null;
export declare function splitArray<T>(arr: T[], split: [T] | ((item: T, index: number, array: T[]) => boolean)): T[][];
export declare function manageNestLevel(reversed?: boolean, validate?: boolean): {
    update(token: Token): void;
    out(): boolean;
    in(): boolean;
    done(input: Token[] | TextRange): void;
};
export declare function displayTokenMatcher(input: TokenMatcher): string;
export declare function splitTokens(arr: RangeArray<Token>, split: TokenType): RangeArray<Token>[];
export declare function splitTokensOnComma(arr: RangeArray<Token>): RangeArray<Token>[];
export declare function findLastNotInGroup(arr: RangeArray<Token>, target: TokenType): number | null;
export declare function getUniqueNamesFromCommaSeparatedTokenList(tokens: RangeArray<Token>, nextToken?: Token, validNames?: TokenType[]): RangeArray<Token>;
export declare class RangeArray<T extends TextRanged2> extends Array<T> implements TextRanged {
    range: TextRange;
    constructor(tokens: T[], range?: TextRange);
    slice(start?: number, end?: number): RangeArray<T>;
    map<U>(fn: (v: T, i: number, a: T[]) => U): U[];
    select(fn: (v: T, i: number, a: T[]) => boolean, range?: TextRange): RangeArray<T>;
}
export declare function getTotalRange(things: (TextRanged | TextRange)[]): TextRange;
export declare function isRange(input: unknown): input is TextRange;
export declare function getRange(input: TextRangeLike): TextRange;
export declare function getRange(input?: TextRangeLike): TextRange | undefined;
export declare function getRange(input?: TextRangeLike | null): TextRange | undefined | null;
export declare function findRange(args: unknown[]): TextRange | undefined;
export type ErrorMessageLine = string | Array<string | number | TextRangeLike>;
export type ConfigSuggestion<T> = {
    message?: string;
    config: Config<T, boolean>;
    value: T extends number ? "increase" | "decrease" : T;
};
export type RichErrorMessage = {
    summary: ErrorMessageLine;
    elaboration?: string | ErrorMessageLine[];
    context?: string | ErrorMessageLine[];
    help?: string | ErrorMessageLine[] | ConfigSuggestion<any>;
};
export type ErrorMessage = string | RichErrorMessage;
declare global {
    var currentConfigModificationFunc: (() => void) | undefined;
}
export declare class SoodocodeError extends Error {
    richMessage: ErrorMessage;
    rangeSpecific?: (TextRange | null) | undefined;
    rangeGeneral?: (TextRange | null) | undefined;
    rangeOther?: TextRange | undefined;
    modified: boolean;
    constructor(richMessage: ErrorMessage, rangeSpecific?: (TextRange | null) | undefined, rangeGeneral?: (TextRange | null) | undefined, rangeOther?: TextRange | undefined);
    formatMessage(sourceCode: string): string;
    formatMessageHTML(sourceCode: string): string;
    adjustRanges(text: string): void;
    showRange(text: string, html: boolean): string;
    static getString(message: ErrorMessage): string;
}
export declare function enableConfig(config: Config<boolean, boolean>): ConfigSuggestion<boolean>;
export declare function setConfig(value: "increase" | "decrease", config: Config<number, boolean>): ConfigSuggestion<number>;
export declare function fail(message: ErrorMessage, rangeSpecific: TextRangeLike | null | undefined, rangeGeneral?: TextRangeLike | null, rangeOther?: TextRangeLike): never;
export declare function rethrow(error: SoodocodeError, msg: (old: ErrorMessage) => ErrorMessage): void;
export declare function crash(message: string, ...extra: unknown[]): never;
export declare function impossible(): never;
export declare function tryRun<T>(callback: () => T): [T, null] | [null, SoodocodeError];
export declare function tryRunOr<T>(callback: () => T, errorHandler: (err: SoodocodeError) => unknown): boolean;
export declare function errorBoundary({ predicate, message }?: Partial<{
    predicate(...args: any[]): boolean;
    message(...args: any[]): string;
}>): <T extends (...args: any[]) => unknown>(func: T, _ctx?: ClassMethodDecoratorContext) => T;
export declare function Abstract<TClass extends new (...args: any[]) => {}>(input: TClass, context: ClassDecoratorContext<TClass>): TClass;
export declare function array<T>(input: T | T[]): T[];
export declare function parseError(thing: unknown): string;
export declare function applyRangeTransformers(text: string, ranges: Array<readonly [
    range: TextRange,
    start: string,
    end: string
]>, transformer?: (char: string) => string): string;
export declare function fakeObject<T>(input: Partial<T>): T;
export declare function boxPrimitive<T>(input: T): BoxPrimitive<T>;
export declare function unicodeSetsSupported(): boolean;
export declare function shallowCloneOwnProperties<T extends {}>(input: T): T;
export declare function getAllPropertyDescriptors(object: Record<PropertyKey, unknown>): PropertyDescriptorMap;
export declare function match<K extends PropertyKey, O extends Record<K, unknown>>(value: K, clauses: O): O[K];
export declare function match<K extends PropertyKey, O extends Partial<Record<K, unknown>>, D>(value: K, clauses: O, defaultValue: D): O[K] | D;
type Iterators<T extends unknown[]> = {
    [P in keyof T]: Iterator<T[P]>;
};
export declare function zip<T extends unknown[]>(...iters: Iterators<T>): IterableIterator<T>;
export declare function weave<T>(...arrays: ReadonlyArray<ReadonlyArray<T>>): T[];
export declare function withRemaining<T>(items: T[]): IterableIterator<[T, T[]]>;
export declare function escapeHTML(input?: string): string;
export declare function span<const T extends string>(input: string, className: T): string extends T ? {
    _err: "Style must be a string literal";
} : string;
export declare function plural(count: number, word: string, plural?: string): string;
export declare function capitalizeWord(word: string): string;
export declare function capitalizeText(input: string): string;
export declare function tagProcessor<T>(transformer: (chunk: T, index: number, allStringChunks: readonly string[], allVarChunks: readonly T[]) => string): TagFunction<T, string>;
export type Formattable = IFormattable | IFormattable[] | string | Exclude<UnresolvedVariableType, IFormattable> | String | Number | Boolean | number | boolean;
export declare function quote(input: Formattable | null | undefined): string | null | undefined;
export declare const f: {
    text: TagFunction<Formattable, string>;
    short: TagFunction<Formattable, string>;
    quote: TagFunction<Formattable, string>;
    debug: TagFunction<Formattable, string>;
    quoteRange(stringChunks: readonly string[], ...varChunks: readonly (string | number | TextRangeLike)[]): (string | number | TextRangeLike)[];
    range(stringChunks: readonly string[], ...varChunks: readonly (string | number | TextRangeLike)[]): (string | number | TextRangeLike)[];
};
export declare function forceType<T>(input: unknown): asserts input is T;
export declare function isKey<T extends Record<PropertyKey, unknown>>(record: T, key: PropertyKey): key is keyof T;
export declare function access<TVal, TNull>(record: Record<PropertyKey, TVal>, key: PropertyKey, fallback: TNull): TVal | TNull;
export declare function biasedLevenshtein(a: string, b: string, maxLengthProduct?: number): number;
export declare function closestKeywordToken(input: string, threshold?: number): TokenType | undefined;
export type Class = (new (...args: any[]) => unknown) & Record<PropertyKey, unknown>;
export type MergeInstances<A, B> = A & B extends never ? Omit<A, keyof B> & B : A & B;
export type MergeClassConstructors<Ctors extends new (...args: any[]) => unknown, Instance> = new (...args: MergeTuples<Ctors extends unknown ? ConstructorParameters<Ctors> : never>) => Instance;
export type MixClasses<A extends new (...args: any[]) => unknown, B extends new (...args: any[]) => unknown> = {
    [K in Exclude<keyof A, keyof B | "prototype">]: A[K];
} & {
    [K in Exclude<keyof B, "prototype">]: B[K];
} & MergeClassConstructors<A | B, MergeInstances<InstanceType<A>, InstanceType<B>>>;
export type MixClassesTuple<Classes extends (new (...args: any[]) => unknown)[]> = Classes["length"] extends 1 ? Classes[0] : Classes extends [
    ...left: (infer Left extends (new (...args: any[]) => unknown)[]),
    right: infer Last extends (new (...args: any[]) => unknown)
] ? MixClasses<MixClassesTuple<Left>, Last> : never;
export declare function combineClasses<const Classes extends (new (...args: any[]) => unknown)[]>(...classes: Classes): MixClassesTuple<Classes>;
export {};
