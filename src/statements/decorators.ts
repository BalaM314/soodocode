/* @license
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains decorators used for the statement definitions.
*/

import { tokenTextMapping, TokenType } from "../lexer/index.js";
import { ProgramASTBranchNodeType, TokenMatcher } from "../parser/index.js";
import { NodeValue } from "../runtime/runtime-types.js";
import { crash, errorBoundary, forceType } from "../utils/funcs.js";
import { StatementType } from "./statement-types.js";
import { Statement } from "./statement.js";
import { statements } from "./registry.js";

//Enable decorator metadata
if(!Symbol.metadata)
	Object.defineProperty(Symbol, "metadata", {
		writable: false,
		enumerable: false,
		configurable: false,
		value: Symbol("Symbol.metadata")
	});

type StatementDecoratorMetadata = {
	evaluatableFields?: (typeof Statement)["evaluatableFields"];
	done?: boolean;
};

/** Decorator that registers a statement type. */
export function statement<TClass extends typeof Statement>(type:StatementType, example:string, ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a statement type with matchers that do not need a keyword as the first matcher. */
export function statement<TClass extends typeof Statement>(type:StatementType, example:string, irregular:"#", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a block or block_end or block_multi_split statement type. */
export function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a block or block_end or block_multi_split statement type with matchers that do not need a keyword as the first matcher. */
export function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", irregular:"#", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a block statement type, and automatically creates a corresponding end statement type. */
export function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block", endType:"auto", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;

export function statement<TClass extends typeof Statement>(type:StatementType, example:string, ...args:string[]){
	return function (input:TClass, context:ClassDecoratorContext<TClass>):TClass {
		input.type = type;
		input.example = example;

		forceType<StatementDecoratorMetadata>(context.metadata);
		input.evaluatableFields = (context.metadata.evaluatableFields ?? []);
		context.metadata.done = true;

		if(args[0] == "block" || args[0] == "block_end" || args[0] == "block_multi_split"){
			input.category = args[0];
			args.shift();
		} else {
			input.category = "normal";
		}
		if(args[0] == "auto" && input.category == "block"){
			args.shift();
			//REFACTOR CHECK
			@statement(
				StatementType(type + ".end"),
				tokenTextMapping[TokenType(args[0] + "_end") as keyof typeof tokenTextMapping] ?? "[unknown]",
				"block_end",
				TokenType(args[0] + "_end")
			)
			class __endStatement extends Statement {
				static blockType = ProgramASTBranchNodeType(type);
			}
		}
		//validate args
		if(args.length < 1) crash(`Invalid statement definitions! All statements must contain at least one token`);
		if(args.find((v, i, args) =>
			(v == "expr+" || v == ".+" || v == ".*") &&
			(args[i+1] == "expr+" || args[i+1] == ".+" || args[i+1] == ".*" || args[i+1] == "type+")
		)) crash(`Invalid statement definitions! Variadic fragment specifiers cannot be adjacent.`);
		if(args[0] == "#"){
			statements.irregular.push(input);
		} else {
			const firstToken = args[0] as Exclude<TokenMatcher, "#">;
			switch(firstToken){
				case ".": case ".*": case ".+": case "expr+": case "type+": case "literal": case "literal|otherwise":
					crash(`Invalid statement definitions! Statements starting with matcher ${firstToken} must be irregular`);
					break;
				//Register these on the different token types
				case "class_modifier":
					(statements.byStartKeyword["keyword.class_modifier.private"] ??= []).push(input);
					(statements.byStartKeyword["keyword.class_modifier.public"] ??= []).push(input);
					break;
				case "file_mode":
					(statements.byStartKeyword["keyword.file_mode.read"] ??= []).push(input);
					(statements.byStartKeyword["keyword.file_mode.write"] ??= []).push(input);
					(statements.byStartKeyword["keyword.file_mode.append"] ??= []).push(input);
					(statements.byStartKeyword["keyword.file_mode.random"] ??= []).push(input);
					break;
				default:
					(statements.byStartKeyword[firstToken] ??= []).push(input);
			}
		}
		input.tokens = args as TokenMatcher[];

		// eslint-disable-next-line @typescript-eslint/unbound-method
		const { run, runBlock } = input.prototype;
		input.prototype.run = errorBoundary()(run);
		input.prototype.runBlock = errorBoundary()(runBlock);

		if(statements.byType[type]) crash(`Invalid statement definitions! Statement for type ${type} already registered`);
		statements.byType[type] = input;
		return input;
	};
}
/** Called after all statement types have been defined and registered. May be called multiple times if necessary. */
export function finishStatements(){
	statements.irregular.sort((a, b) => a.tokensSortScore() - b.tokensSortScore());
}

/**
 * Decorator that marks a NodeValue field as possibly evaluatable during pre-run.
 * Example: `@evaluate condition = this.exprT(1, "BOOLEAN")`
 * During prerun, an attempt will be made to evaluate the condition statically.
 * If the condition requires a variable or can change at runtime, nothing will happen,
 * but if it can be evaluated statically (for example, if the condition is `5 < 6`),
 * its value will be cached and will not be recomputed at runtime.
 **/
export function evaluate<This extends Statement & {[_ in K]: NodeValue}, K extends string, Value>(
	_:undefined, context:ClassFieldDecoratorContext<This, Value> & { name: K; static: false; }
){
	forceType<StatementDecoratorMetadata>(context.metadata);
	if(context.metadata.done){
		//The metadata object is prototype linked to the superclass's metadata object
		//Copy over the array and unlink it
		const evaluatableFields = context.metadata.evaluatableFields ?? [];
		Object.setPrototypeOf(context.metadata, null);
		context.metadata.evaluatableFields = evaluatableFields.slice();
	}
	(context.metadata.evaluatableFields ??= []).push(context.name);
}
