/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/
import { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTFunctionCallNode, ExpressionASTTypeNode, ProgramASTBranchNode, TokenMatcher } from "./parser-types.js";
import { FunctionData, PrimitiveVariableType, Runtime, UnresolvedVariableType, VariableType, VariableValue } from "./runtime.js";
export type StatementType = "declare" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call" | "type" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if" | "if.end" | "else" | "switch" | "switch.end" | "case" | "case.range" | "for" | "for.step" | "for.end" | "while" | "while.end" | "dowhile" | "dowhile.end" | "function" | "function.end" | "procedure" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class" | "class.inherits" | "class.end";
export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";
export declare const statements: {
    byStartKeyword: Partial<Record<"string" | "number.decimal" | "char" | "brace.open" | "brace.close" | "bracket.open" | "bracket.close" | "parentheses.open" | "parentheses.close" | "punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" | "punctuation.period" | "comment" | "name" | "boolean.true" | "boolean.false" | "keyword.declare" | "keyword.define" | "keyword.constant" | "keyword.output" | "keyword.input" | "keyword.call" | "keyword.if" | "keyword.then" | "keyword.else" | "keyword.if_end" | "keyword.for" | "keyword.to" | "keyword.for_end" | "keyword.step" | "keyword.while" | "keyword.while_end" | "keyword.dowhile" | "keyword.dowhile_end" | "keyword.function" | "keyword.function_end" | "keyword.procedure" | "keyword.procedure_end" | "keyword.return" | "keyword.returns" | "keyword.pass_mode.by_reference" | "keyword.pass_mode.by_value" | "keyword.type" | "keyword.type_end" | "keyword.open_file" | "keyword.read_file" | "keyword.write_file" | "keyword.close_file" | "keyword.get_record" | "keyword.put_record" | "keyword.seek" | "keyword.file_mode.read" | "keyword.file_mode.write" | "keyword.file_mode.append" | "keyword.file_mode.random" | "keyword.case" | "keyword.of" | "keyword.case_end" | "keyword.otherwise" | "keyword.class" | "keyword.class_end" | "keyword.new" | "keyword.super" | "keyword.inherits" | "keyword.class_modifier.private" | "keyword.class_modifier.public" | "keyword.array" | "keyword.set" | "newline" | "operator.add" | "operator.minus" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment" | "operator.pointer" | "operator.string_concatenate", (typeof Statement)[]>>;
    byType: Record<StatementType, typeof Statement>;
    irregular: (typeof Statement)[];
};
export type PassMode = "value" | "reference";
export type FunctionArguments = Map<string, {
    type: UnresolvedVariableType;
    passMode: PassMode;
}>;
export type BuiltinFunctionArguments = Map<string, {
    type: PrimitiveVariableType[];
    passMode: PassMode;
}>;
export type FunctionArgumentData = [name: string, {
    type: UnresolvedVariableType;
    passMode: PassMode;
}];
export type FunctionArgumentDataPartial = [nameToken: Token, {
    type: UnresolvedVariableType | null;
    passMode: PassMode | null;
}];
export type StatementExecutionResult = {
    type: "function_return";
    value: VariableValue;
};
export declare class Statement implements TextRanged {
    tokens: (Token | ExpressionAST | ExpressionASTArrayTypeNode)[];
    type: typeof Statement;
    stype: StatementType;
    static type: StatementType;
    category: StatementCategory;
    static category: StatementCategory;
    static example: string;
    static tokens: (TokenMatcher | "#")[];
    static suppressErrors: boolean;
    range: TextRange;
    constructor(tokens: (Token | ExpressionAST | ExpressionASTArrayTypeNode)[]);
    toString(): string;
    getText(): string;
    static blockEndStatement<
    /** use Function to prevent narrowing, leave blank otherwise */
    TOut extends typeof Statement | Function = typeof Statement>(): typeof Statement extends TOut ? TOut : unknown;
    example(): string;
    /** Warning: block will not include the usual end statement. */
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    static checkBlock(block: ProgramASTBranchNode): void;
    run(runtime: Runtime): void | StatementExecutionResult;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void | StatementExecutionResult;
}
export declare class DeclareStatement extends Statement {
    variables: string[];
    varType: UnresolvedVariableType;
    constructor(tokens: [Token, ...names: Token[], Token, ExpressionASTTypeNode]);
    run(runtime: Runtime): void;
}
export declare class ConstantStatement extends Statement {
    name: string;
    expr: Token;
    constructor(tokens: [Token, Token, Token, Token]);
    run(runtime: Runtime): void;
}
export declare class DefineStatement extends Statement {
    name: Token;
    variableType: Token;
    values: Token[];
    constructor(tokens: [Token, Token, Token, ...Token[], Token, Token, Token]);
    run(runtime: Runtime): void;
}
export declare class TypePointerStatement extends Statement {
    name: string;
    targetType: UnresolvedVariableType;
    constructor(tokens: [Token, Token, Token, Token, ExpressionASTTypeNode]);
    run(runtime: Runtime): void;
}
export declare class TypeEnumStatement extends Statement {
    name: Token;
    values: Token[];
    constructor(tokens: [Token, Token, Token, Token, ...Token[], Token]);
    run(runtime: Runtime): void;
}
export declare class TypeSetStatement extends Statement {
    name: Token;
    setType: PrimitiveVariableType;
    constructor(tokens: [Token, Token, Token, Token, Token, Token]);
    run(runtime: Runtime): void;
}
export declare class TypeRecordStatement extends Statement {
    name: Token;
    constructor(tokens: [Token, Token]);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void;
}
export declare class AssignmentStatement extends Statement {
    /** Can be a normal variable name, like [name x], or an array access expression */
    target: ExpressionAST;
    expr: ExpressionAST;
    constructor(tokens: [ExpressionAST, Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class OutputStatement extends Statement {
    outMessage: (Token | ExpressionAST)[];
    constructor(tokens: [Token, ...Token[]]);
    run(runtime: Runtime): void;
}
export declare class InputStatement extends Statement {
    name: string;
    constructor(tokens: [Token, Token]);
    run(runtime: Runtime): void;
}
export declare class ReturnStatement extends Statement {
    expr: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST]);
    run(runtime: Runtime): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | Record<string, unknown> | import("./runtime.js").VariableData<VariableType, null> | import("./runtime.js").ConstantData<VariableType> | null)[] | Record<string, unknown> | (string | number | boolean | Date)[] | import("./runtime.js").VariableData<VariableType, null> | import("./runtime.js").ConstantData<VariableType>;
    };
}
export declare class CallStatement extends Statement {
    func: ExpressionASTFunctionCallNode;
    constructor(tokens: [Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class IfStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token]);
    /** Warning: block will not include the usual end statement. */
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void | {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | Record<string, unknown> | import("./runtime.js").VariableData<VariableType, null> | import("./runtime.js").ConstantData<VariableType> | null)[] | Record<string, unknown> | import("./runtime.js").VariableData<any, null> | import("./runtime.js").ConstantData<any> | (string | number | boolean | Date)[];
    };
}
export declare class ElseStatement extends Statement {
}
export declare class SwitchStatement extends Statement {
    expression: ExpressionAST;
    constructor(tokens: [Token, Token, ExpressionAST]);
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    static checkBlock({ nodeGroups }: ProgramASTBranchNode): void;
    runBlock(runtime: Runtime, { controlStatements, nodeGroups }: ProgramASTBranchNode): void | StatementExecutionResult;
}
export declare class CaseBranchStatement extends Statement {
    value: Token;
    static suppressErrors: boolean;
    constructor(tokens: [Token, Token]);
    branchMatches(switchType: VariableType, switchValue: VariableValue): boolean;
}
export declare class CaseBranchRangeStatement extends CaseBranchStatement {
    upperBound: Token;
    static allowedTypes: TokenType[];
    constructor(tokens: [Token, Token, Token, Token]);
    branchMatches(switchType: VariableType, switchValue: VariableValue): boolean;
}
export declare class ForStatement extends Statement {
    name: string;
    lowerBound: ExpressionAST;
    upperBound: ExpressionAST;
    constructor(tokens: [Token, Token, Token, ExpressionAST, Token, ExpressionAST]);
    step(runtime: Runtime): number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | Record<string, unknown> | import("./runtime.js").VariableData<VariableType, null> | import("./runtime.js").ConstantData<VariableType> | null)[] | Record<string, unknown> | import("./runtime.js").VariableData<any, null> | import("./runtime.js").ConstantData<any> | (string | number | boolean | Date)[];
    } | undefined;
}
export declare class ForStepStatement extends ForStatement {
    stepToken: ExpressionAST;
    constructor(tokens: [Token, Token, Token, ExpressionAST, Token, ExpressionAST, Token, ExpressionAST]);
    step(runtime: Runtime): number;
}
export declare class ForEndStatement extends Statement {
    name: string;
    constructor(tokens: [Token, Token]);
}
export declare class WhileStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST]);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | Record<string, unknown> | import("./runtime.js").VariableData<VariableType, null> | import("./runtime.js").ConstantData<VariableType> | null)[] | Record<string, unknown> | import("./runtime.js").VariableData<any, null> | import("./runtime.js").ConstantData<any> | (string | number | boolean | Date)[];
    } | undefined;
}
export declare class DoWhileStatement extends Statement {
    static maxLoops: number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | Record<string, unknown> | import("./runtime.js").VariableData<VariableType, null> | import("./runtime.js").ConstantData<VariableType> | null)[] | Record<string, unknown> | import("./runtime.js").VariableData<any, null> | import("./runtime.js").ConstantData<any> | (string | number | boolean | Date)[];
    } | undefined;
}
export declare class DoWhileEndStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST]);
}
export declare class FunctionStatement extends Statement {
    /** Mapping between name and type */
    args: FunctionArguments;
    returnType: UnresolvedVariableType;
    name: string;
    constructor(tokens: Token[]);
    runBlock(runtime: Runtime, node: FunctionData): void;
}
export declare class ProcedureStatement extends Statement {
    /** Mapping between name and type */
    args: FunctionArguments;
    name: string;
    constructor(tokens: Token[]);
    runBlock(runtime: Runtime, node: FunctionData): void;
}
export declare class OpenFileStatement extends Statement {
    mode: Token;
    filename: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token, Token]);
    run(runtime: Runtime): void;
}
export declare class CloseFileStatement extends Statement {
    filename: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class ReadFileStatement extends Statement {
    filename: ExpressionAST;
    output: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class WriteFileStatement extends Statement {
    filename: ExpressionAST;
    data: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class SeekStatement extends Statement {
    filename: ExpressionAST;
    index: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class GetRecordStatement extends Statement {
    filename: ExpressionAST;
    variable: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class PutRecordStatement extends Statement {
    filename: ExpressionAST;
    variable: ExpressionAST;
    constructor(tokens: [Token, ExpressionAST, Token, ExpressionAST]);
    run(runtime: Runtime): void;
}
export declare class ClassStatement extends Statement {
    constructor(tokens: [Token, Token] | [Token, Token, Token, Token]);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void;
}
export declare class ClassInheritsStatement extends ClassStatement {
    constructor(tokens: [Token, Token, Token, Token]);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void;
}
