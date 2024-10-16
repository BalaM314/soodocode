import { Token, TokenType } from "../lexer/index.js";
import { RangeArray } from "../utils/funcs.js";
import type { TextRange } from "../utils/types.js";
import type { TokenMatcher } from "./parser-types.js";
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
export declare function closestKeywordToken(input: string, threshold?: number): TokenType | undefined;
