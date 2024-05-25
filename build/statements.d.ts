import { RangeArray, Token } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTFunctionCallNode, ExpressionASTTypeNode, ProgramASTBranchNode, ProgramASTBranchNodeType, TokenMatcher } from "./parser-types.js";
import { ClassVariableType, FunctionData, PrimitiveVariableType, UnresolvedVariableType, VariableType, VariableValue } from "./runtime-types.js";
import { Runtime } from "./runtime.js";
import type { IFormattable, TextRange, TextRanged } from "./types.js";
export declare const statementTypes: readonly ["declare", "define", "constant", "assignment", "output", "input", "return", "call", "type", "type.pointer", "type.enum", "type.set", "type.end", "if", "if.end", "else", "switch", "switch.end", "case", "case.range", "for", "for.step", "for.end", "while", "while.end", "dowhile", "dowhile.end", "function", "function.end", "procedure", "procedure.end", "openfile", "readfile", "writefile", "closefile", "seek", "getrecord", "putrecord", "class", "class.inherits", "class.end", "class_property", "class_procedure", "class_procedure.end", "class_function", "class_function.end", "illegal.assignment"];
export type StatementType = typeof statementTypes extends ReadonlyArray<infer T> ? T : never;
export type LegalStatementType<T extends StatementType = StatementType> = T extends `illegal.${string}` ? never : T;
export declare function StatementType(input: string): StatementType;
export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";
export declare const statements: {
    byStartKeyword: Partial<Record<"string" | "number.decimal" | "char" | "brace.open" | "brace.close" | "bracket.open" | "bracket.close" | "parentheses.open" | "parentheses.close" | "punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" | "punctuation.period" | "name" | "boolean.true" | "boolean.false" | "keyword.declare" | "keyword.define" | "keyword.constant" | "keyword.output" | "keyword.input" | "keyword.call" | "keyword.if" | "keyword.then" | "keyword.else" | "keyword.if_end" | "keyword.for" | "keyword.to" | "keyword.for_end" | "keyword.step" | "keyword.while" | "keyword.while_end" | "keyword.dowhile" | "keyword.dowhile_end" | "keyword.function" | "keyword.function_end" | "keyword.procedure" | "keyword.procedure_end" | "keyword.return" | "keyword.returns" | "keyword.pass_mode.by_reference" | "keyword.pass_mode.by_value" | "keyword.type" | "keyword.type_end" | "keyword.open_file" | "keyword.read_file" | "keyword.write_file" | "keyword.close_file" | "keyword.get_record" | "keyword.put_record" | "keyword.seek" | "keyword.file_mode.read" | "keyword.file_mode.write" | "keyword.file_mode.append" | "keyword.file_mode.random" | "keyword.case" | "keyword.of" | "keyword.case_end" | "keyword.otherwise" | "keyword.class" | "keyword.class_end" | "keyword.new" | "keyword.super" | "keyword.inherits" | "keyword.class_modifier.private" | "keyword.class_modifier.public" | "keyword.array" | "keyword.set" | "newline" | "operator.add" | "operator.minus" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment" | "operator.pointer" | "operator.string_concatenate", (typeof Statement)[]>>;
    byType: Record<"function" | "type" | "assignment" | "if" | "for" | "for.step" | "while" | "dowhile" | "procedure" | "switch" | "class" | "class.inherits" | "class_function" | "class_procedure" | "input" | "output" | "declare" | "define" | "constant" | "return" | "call" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if.end" | "else" | "switch.end" | "case" | "case.range" | "for.end" | "while.end" | "dowhile.end" | "function.end" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class.end" | "class_property" | "class_procedure.end" | "class_function.end" | "illegal.assignment", typeof Statement>;
    irregular: (typeof Statement)[];
};
export type PassMode = "value" | "reference";
export type FunctionArguments = Map<string, {
    type: UnresolvedVariableType;
    passMode: PassMode;
}>;
export type BuiltinFunctionArguments = Map<string, {
    type: VariableType[];
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
export declare class Statement implements TextRanged, IFormattable {
    tokens: RangeArray<Token | ExpressionAST | ExpressionASTArrayTypeNode>;
    type: typeof Statement;
    stype: StatementType;
    static type: StatementType;
    category: StatementCategory;
    static category: StatementCategory;
    static example: string;
    static tokens: (TokenMatcher | "#")[];
    static suppressErrors: boolean;
    static blockType: ProgramASTBranchNodeType | null;
    static allowOnly: Set<StatementType> | null;
    static invalidMessage: string | null;
    range: TextRange;
    constructor(tokens: RangeArray<Token | ExpressionAST | ExpressionASTArrayTypeNode>);
    fmtText(): string;
    fmtDebug(): string;
    static blockEndStatement<TOut extends typeof Statement | Function = typeof Statement>(): typeof Statement extends TOut ? TOut : unknown;
    example(): string;
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    static checkBlock(block: ProgramASTBranchNode): void;
    static typeName(type?: StatementType): string;
    static tokensSortScore({ tokens }?: typeof Statement): number;
    run(runtime: Runtime): void | StatementExecutionResult;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void | StatementExecutionResult;
}
export declare class TypeStatement extends Statement {
    createType(runtime: Runtime): [name: string, type: VariableType];
    createTypeBlock(runtime: Runtime, block: ProgramASTBranchNode): [name: string, type: VariableType];
}
export declare class DeclareStatement extends Statement {
    variables: [string, Token][];
    varType: UnresolvedVariableType;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class ConstantStatement extends Statement {
    name: string;
    expr: Token;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class DefineStatement extends Statement {
    name: Token;
    variableType: Token;
    values: RangeArray<Token>;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class TypePointerStatement extends TypeStatement {
    name: string;
    targetType: UnresolvedVariableType;
    constructor(tokens: RangeArray<Token>);
    createType(runtime: Runtime): [name: string, type: VariableType];
}
export declare class TypeEnumStatement extends TypeStatement {
    name: Token;
    values: RangeArray<Token>;
    constructor(tokens: RangeArray<Token>);
    createType(runtime: Runtime): [name: string, type: VariableType];
}
export declare class TypeSetStatement extends TypeStatement {
    name: Token;
    setType: PrimitiveVariableType;
    constructor(tokens: RangeArray<Token>);
    createType(runtime: Runtime): [name: string, type: VariableType];
}
export declare class TypeRecordStatement extends TypeStatement {
    name: Token;
    constructor(tokens: RangeArray<Token>);
    createTypeBlock(runtime: Runtime, node: ProgramASTBranchNode): [name: string, type: VariableType];
}
export declare class AssignmentStatement extends Statement {
    target: ExpressionAST;
    expr: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class AssignmentBadStatement extends Statement {
    static invalidMessage: string;
}
export declare class OutputStatement extends Statement {
    outMessage: (Token | ExpressionAST)[];
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class InputStatement extends Statement {
    name: string;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class ReturnStatement extends Statement {
    expr: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType<true>;
        } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType>;
    };
}
export declare class CallStatement extends Statement {
    func: ExpressionASTFunctionCallNode;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class IfStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void | {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType<true>;
        };
    };
}
export declare class ElseStatement extends Statement {
    static blockType: ProgramASTBranchNodeType | null;
}
export declare class SwitchStatement extends Statement {
    expression: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    static checkBlock({ nodeGroups, controlStatements }: ProgramASTBranchNode): void;
    runBlock(runtime: Runtime, { controlStatements, nodeGroups }: ProgramASTBranchNode): void | StatementExecutionResult;
}
export declare class CaseBranchStatement extends Statement {
    value: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
    branchMatches(switchType: VariableType, switchValue: VariableValue): boolean;
}
export declare class CaseBranchRangeStatement extends CaseBranchStatement {
    upperBound: Token;
    static blockType: ProgramASTBranchNodeType;
    static allowedTypes: ("number.decimal" | "char")[];
    constructor(tokens: RangeArray<Token>);
    branchMatches(switchType: VariableType, switchValue: VariableValue): boolean;
}
export declare class ForStatement extends Statement {
    name: string;
    lowerBound: ExpressionAST;
    upperBound: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    step(_runtime: Runtime): number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType<true>;
        };
    } | undefined;
}
export declare class ForStepStatement extends ForStatement {
    stepToken: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    step(runtime: Runtime): number;
}
export declare class ForEndStatement extends Statement {
    name: string;
    varToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
}
export declare class WhileStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType<true>;
        };
    } | undefined;
}
export declare class DoWhileStatement extends Statement {
    static maxLoops: number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType<true>;
            } | null;
        } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | {
                    [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType, null> | import("./runtime-types.js").ConstantData<VariableType> | null)[] | any | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
                } | import("./runtime-types.js").VariableData<any, null> | import("./runtime-types.js").ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType<true>;
        };
    } | undefined;
}
export declare class DoWhileEndStatement extends Statement {
    condition: ExpressionAST;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
}
export declare class FunctionStatement extends Statement {
    args: FunctionArguments;
    argsRange: TextRange;
    returnType: UnresolvedVariableType;
    returnTypeToken: ExpressionASTTypeNode;
    name: string;
    nameToken: Token;
    constructor(tokens: RangeArray<Token>);
    runBlock(runtime: Runtime, node: FunctionData): void;
}
export declare class ProcedureStatement extends Statement {
    args: FunctionArguments;
    argsRange: TextRange;
    name: string;
    constructor(tokens: RangeArray<Token>);
    runBlock(runtime: Runtime, node: FunctionData): void;
}
interface IFileStatement {
    filename: ExpressionAST;
}
export declare class OpenFileStatement extends Statement implements IFileStatement {
    mode: Token;
    filename: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class CloseFileStatement extends Statement implements IFileStatement {
    filename: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class ReadFileStatement extends Statement implements IFileStatement {
    filename: ExpressionAST;
    output: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class WriteFileStatement extends Statement implements IFileStatement {
    filename: ExpressionAST;
    data: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class SeekStatement extends Statement implements IFileStatement {
    filename: ExpressionAST;
    index: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class GetRecordStatement extends Statement implements IFileStatement {
    filename: ExpressionAST;
    variable: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class PutRecordStatement extends Statement implements IFileStatement {
    filename: ExpressionAST;
    variable: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
interface IClassMemberStatement {
    accessModifierToken: Token;
    accessModifier: "public" | "private";
}
export declare class ClassStatement extends TypeStatement {
    static allowOnly: Set<"function" | "type" | "assignment" | "if" | "for" | "for.step" | "while" | "dowhile" | "procedure" | "switch" | "class" | "class.inherits" | "class_function" | "class_procedure" | "input" | "output" | "declare" | "define" | "constant" | "return" | "call" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if.end" | "else" | "switch.end" | "case" | "case.range" | "for.end" | "while.end" | "dowhile.end" | "function.end" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class.end" | "class_property" | "class_procedure.end" | "class_function.end" | "illegal.assignment">;
    name: Token;
    constructor(tokens: RangeArray<Token>);
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
    createTypeBlock(runtime: Runtime, branchNode: ProgramASTBranchNode): [name: string, type: VariableType];
}
export declare class ClassInheritsStatement extends ClassStatement {
    superClassName: Token;
    constructor(tokens: RangeArray<Token>);
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
}
export declare class ClassPropertyStatement extends DeclareStatement implements IClassMemberStatement {
    accessModifierToken: Token;
    accessModifier: "public" | "private";
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class ClassProcedureStatement extends ProcedureStatement implements IClassMemberStatement {
    accessModifierToken: Token;
    accessModifier: "public" | "private";
    methodKeywordToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
    runBlock(): void;
}
export declare class ClassProcedureEndStatement extends Statement {
}
export declare class ClassFunctionStatement extends FunctionStatement implements IClassMemberStatement {
    accessModifierToken: Token;
    accessModifier: "public" | "private";
    methodKeywordToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
    runBlock(): void;
}
export declare class ClassFunctionEndStatement extends Statement {
}
export {};
