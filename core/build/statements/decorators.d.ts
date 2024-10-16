import { TokenMatcher } from "../parser/index.js";
import { NodeValue } from "../runtime/runtime-types.js";
import { StatementType } from "./statement-types.js";
import { Statement } from "./statement.js";
export declare function statement<TClass extends typeof Statement>(type: StatementType, example: string, ...tokens: TokenMatcher[]): (input: TClass, context: ClassDecoratorContext<TClass>) => TClass;
export declare function statement<TClass extends typeof Statement>(type: StatementType, example: string, irregular: "#", ...tokens: TokenMatcher[]): (input: TClass, context: ClassDecoratorContext<TClass>) => TClass;
export declare function statement<TClass extends typeof Statement>(type: StatementType, example: string, category: "block" | "block_end" | "block_multi_split", ...tokens: TokenMatcher[]): (input: TClass, context: ClassDecoratorContext<TClass>) => TClass;
export declare function statement<TClass extends typeof Statement>(type: StatementType, example: string, category: "block" | "block_end" | "block_multi_split", irregular: "#", ...tokens: TokenMatcher[]): (input: TClass, context: ClassDecoratorContext<TClass>) => TClass;
export declare function statement<TClass extends typeof Statement>(type: StatementType, example: string, category: "block", endType: "auto", ...tokens: TokenMatcher[]): (input: TClass, context: ClassDecoratorContext<TClass>) => TClass;
export declare function finishStatements(): void;
export declare function evaluate<This extends Statement & {
    [_ in K]: NodeValue;
}, K extends string, Value>(_: undefined, context: ClassFieldDecoratorContext<This, Value> & {
    name: K;
    static: false;
}): void;
