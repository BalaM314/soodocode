import { Token } from "../lexer/index.js";
import { UnresolvedVariableType, VariableType, VariableValue } from "../runtime/index.js";
import { crash } from "../utils/funcs.js";


//TODO snake case
export const statementTypes = [
	"declare", "define", "constant", "assignment", "output", "input", "return", "call",
	"type", "type.pointer", "type.enum", "type.set", "type.end",
	"if", "if.end", "else",
	"switch", "switch.end", "case", "case.range",
	"for", "for.step", "for.end",
	"while", "while.end",
	"dowhile", "dowhile.end",
	"function", "function.end",
	"procedure", "procedure.end",
	"openfile", "readfile", "writefile", "closefile",
	"seek", "getrecord", "putrecord",
	"class", "class.inherits", "class.end",
	"class_property",
	"class_procedure", "class_procedure.end",
	"class_function", "class_function.end",
	"illegal.assignment", "illegal.end", "illegal.for.end"
] as const;
export type StatementType = typeof statementTypes extends ReadonlyArray<infer T> ? T : never;
/** Statement types that don't start with "illegal." */
export type LegalStatementType<T extends StatementType = StatementType> = T extends `illegal.${string}` ? never : T;
export function StatementType(input:string):StatementType {
	if(statementTypes.includes(input)) return input;
	crash(`"${input}" is not a valid statement type`);
}

export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";


export type FunctionArgumentPassMode = "value" | "reference";
export type FunctionArguments = Map<string, {type:UnresolvedVariableType, passMode:FunctionArgumentPassMode}>;
export type BuiltinFunctionArguments = Map<string, {type:VariableType[], passMode:FunctionArgumentPassMode}>;
export type FunctionArgumentData = [name:string, {type:UnresolvedVariableType, passMode:FunctionArgumentPassMode}];
export type FunctionArgumentDataPartial = [nameToken:Token, {type:UnresolvedVariableType | null, passMode:FunctionArgumentPassMode | null}];

export type StatementExecutionResult = {
	type: "function_return";
	value: VariableValue;
};
