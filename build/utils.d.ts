/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/
import { TextRange, TextRangeLike, TextRanged, Token, TokenType } from "./lexer-types.js";
import { PrimitiveVariableTypeName } from "./runtime.js";
import { TagFunction } from "./types.js";
export declare function getText(tokens: Token[]): string;
/** Ranges must telescope inwards */
export declare function applyRangeTransformers(text: string, ranges: [range: TextRange, start: string, end: string, transformer?: (rangeText: string) => string][]): string;
export declare function splitArray<T>(arr: T[], split: [T] | ((item: T, index: number, array: T[]) => boolean)): T[][];
export declare function splitTokens(arr: Token[], split: TokenType): Token[][];
export declare function splitTokensWithSplitter(arr: Token[], split: TokenType): {
    group: Token[];
    splitter?: Token | undefined;
}[];
export declare function splitTokensOnComma(arr: Token[]): Token[][];
export declare function getUniqueNamesFromCommaSeparatedTokenList(tokens: Token[], nextToken?: Token, validNames?: TokenType[]): Token[];
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
export declare function fail(message: string, rangeSpecific?: TextRangeLike | null, rangeGeneral?: TextRangeLike | null): never;
export declare function crash(message: string): never;
export declare function impossible(): never;
/**
 * Decorator to apply an error boundary to functions.
 * @param predicate Only sets the general range if this returns true.
 */
export declare function errorBoundary({ predicate, message }?: Partial<{
    predicate(...args: any[]): boolean;
    message(...args: any[]): string;
}>): <T extends (...args: any[]) => unknown>(func: T, ctx?: ClassMethodDecoratorContext) => T;
export declare function escapeHTML(input?: string): string;
export declare function isPrimitiveType(input: string): input is PrimitiveVariableTypeName;
export declare function parseError(thing: unknown): string;
/** Generates a tag template processor from a function that processes one value at a time. */
export declare function tagProcessor<T>(transformer: (chunk: T, index: number, allStringChunks: readonly string[], allVarChunks: readonly T[]) => string): TagFunction<T, string>;
export declare const fquote: TagFunction<string | Object, string>;
export declare function forceType<T>(input: unknown): asserts input is T;
