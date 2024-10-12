import { Token, TokenType } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTFunctionCallNode, ExpressionASTNodeExt, ExpressionASTTypeNode, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNodeGroup, TokenMatcher } from "./parser-types.js";
import { StatementCheckTokenRange } from "./parser.js";
import { ClassVariableType, FunctionData, TypedNodeValue, PrimitiveVariableType, PrimitiveVariableTypeName, UnresolvedVariableType, VariableType, VariableValue, UntypedNodeValue, VariableData, ConstantData } from "./runtime-types.js";
import { Runtime } from "./runtime.js";
import type { IFormattable, TextRange, TextRanged } from "./types.js";
import { RangeArray } from "./utils.js";
export declare const statementTypes: readonly ["declare", "define", "constant", "assignment", "output", "input", "return", "call", "type", "type.pointer", "type.enum", "type.set", "type.end", "if", "if.end", "else", "switch", "switch.end", "case", "case.range", "for", "for.step", "for.end", "while", "while.end", "dowhile", "dowhile.end", "function", "function.end", "procedure", "procedure.end", "openfile", "readfile", "writefile", "closefile", "seek", "getrecord", "putrecord", "class", "class.inherits", "class.end", "class_property", "class_procedure", "class_procedure.end", "class_function", "class_function.end", "illegal.assignment", "illegal.end", "illegal.for.end"];
export type StatementType = typeof statementTypes extends ReadonlyArray<infer T> ? T : never;
export type LegalStatementType<T extends StatementType = StatementType> = T extends `illegal.${string}` ? never : T;
export declare function StatementType(input: string): StatementType;
export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";
export declare const statements: {
    byStartKeyword: Partial<Record<TokenType, (typeof Statement)[]>>;
    byType: Record<StatementType, typeof Statement>;
    irregular: (typeof Statement)[];
};
export type FunctionArgumentPassMode = "value" | "reference";
export type FunctionArguments = Map<string, {
    type: UnresolvedVariableType;
    passMode: FunctionArgumentPassMode;
}>;
export type BuiltinFunctionArguments = Map<string, {
    type: VariableType[];
    passMode: FunctionArgumentPassMode;
}>;
export type FunctionArgumentData = [name: string, {
    type: UnresolvedVariableType;
    passMode: FunctionArgumentPassMode;
}];
export type FunctionArgumentDataPartial = [nameToken: Token, {
    type: UnresolvedVariableType | null;
    passMode: FunctionArgumentPassMode | null;
}];
export type StatementExecutionResult = {
    type: "function_return";
    value: VariableValue;
};
export declare class Statement implements TextRanged, IFormattable {
    nodes: RangeArray<ExpressionASTNodeExt>;
    type: typeof Statement;
    stype: StatementType;
    category: StatementCategory;
    range: TextRange;
    preRunDone: boolean;
    static type: StatementType;
    static category: StatementCategory;
    static example: string;
    static tokens: (TokenMatcher | "#")[];
    static evaluatableFields: string[];
    static suppressErrors: boolean;
    static blockType: ProgramASTBranchNodeType | null;
    static allowOnly: Set<StatementType> | null;
    static invalidMessage: string | null | ((parseOutput: StatementCheckTokenRange[], context: ProgramASTBranchNode | null) => [message: string, range?: TextRange]);
    constructor(nodes: RangeArray<ExpressionASTNodeExt>);
    token(ind: number): Token;
    tokens(from: number, to: number): RangeArray<Token>;
    tokenT<InputType extends PrimitiveVariableTypeName | VariableType>(ind: number, type: InputType): TypedNodeValue<Token, InputType>;
    expr(ind: number): ExpressionAST;
    expr(ind: number, allowed: "expr", error?: string): ExpressionAST;
    expr(ind: number, allowed: "type", error?: string): ExpressionASTTypeNode;
    expr<Type extends new (...args: any[]) => {}>(ind: number, allowed: Type[], error?: string): InstanceType<Type>;
    exprT(ind: number): UntypedNodeValue<ExpressionAST>;
    exprT<InputType extends PrimitiveVariableTypeName | VariableType>(ind: number, type: InputType): TypedNodeValue<ExpressionAST, InputType>;
    fmtText(): string;
    fmtDebug(): string;
    static blockEndStatement<TOut extends typeof Statement | Function = typeof Statement>(): typeof Statement extends TOut ? TOut : unknown;
    example(): string;
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    static checkBlock(block: ProgramASTBranchNode): void;
    static typeName(type?: StatementType): string;
    static tokensSortScore({ tokens, invalidMessage }?: typeof Statement): number;
    run(runtime: Runtime): void | StatementExecutionResult;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void | StatementExecutionResult;
    static requiresScope: boolean;
    static interruptsControlFlow: boolean;
    static propagatesControlFlowInterruptions: boolean;
    preRun(group: ProgramASTNodeGroup, node?: ProgramASTBranchNode): void;
    triggerPreRun(group: ProgramASTNodeGroup, node?: ProgramASTBranchNode): void;
}
export declare abstract class TypeStatement extends Statement {
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
    createTypeBlock(runtime: Runtime, block: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class DeclareStatement extends Statement {
    static requiresScope: boolean;
    varType: UnresolvedVariableType;
    variables: [string, Token][];
    run(runtime: Runtime): void;
}
export declare class ConstantStatement extends Statement {
    static requiresScope: boolean;
    name: string;
    expression: Token;
    run(runtime: Runtime): void;
}
export declare class DefineStatement extends Statement {
    static requiresScope: boolean;
    name: Token;
    variableType: Token;
    values: RangeArray<Token>;
    run(runtime: Runtime): void;
}
export declare class TypePointerStatement extends TypeStatement {
    name: string;
    targetType: UnresolvedVariableType;
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
}
export declare class TypeEnumStatement extends TypeStatement {
    name: Token;
    values: RangeArray<Token>;
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
}
export declare class TypeSetStatement extends TypeStatement {
    name: Token;
    setType: PrimitiveVariableType<"INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE">;
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
}
export declare class TypeRecordStatement extends TypeStatement {
    name: Token;
    static propagatesControlFlowInterruptions: boolean;
    createTypeBlock(runtime: Runtime, node: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class AssignmentStatement extends Statement {
    static requiresScope: boolean;
    target: import("./parser-types.js").ExpressionASTNode;
    expression: UntypedNodeValue<import("./parser-types.js").ExpressionASTNode>;
    constructor(tokens: RangeArray<ExpressionAST>);
    run(runtime: Runtime): void;
}
export declare class AssignmentBadStatement extends Statement {
    static invalidMessage: string;
    static suppressErrors: boolean;
}
export declare class OutputStatement extends Statement {
    outMessage: UntypedNodeValue<import("./parser-types.js").ExpressionASTNode>[];
    run(runtime: Runtime): void;
}
export declare class InputStatement extends Statement {
    name: string;
    run(runtime: Runtime): void;
}
export declare class ReturnStatement extends Statement {
    static interruptsControlFlow: boolean;
    expression: UntypedNodeValue<import("./parser-types.js").ExpressionASTNode>;
    run(runtime: Runtime): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | {
                properties: {
                    [index: string]: import("./runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null)[] | Int32Array | Float64Array | any | VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: import("./runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null;
        } | VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | {
            properties: {
                [index: string]: import("./runtime-types.js").VariableTypeMapping<any> | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType;
        } | null)[] | Int32Array | Float64Array | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | {
                properties: {
                    [index: string]: import("./runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null)[] | Int32Array | Float64Array | any | VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: import("./runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null;
        } | VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: import("./runtime-types.js").VariableTypeMapping<any> | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType;
        };
    };
}
export declare class CallStatement extends Statement {
    func: ExpressionASTFunctionCallNode;
    run(runtime: Runtime): void;
}
export declare class EndBadStatement extends Statement {
    static invalidMessage: typeof Statement.invalidMessage;
}
export declare class IfStatement extends Statement {
    condition: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "BOOLEAN", PrimitiveVariableType<"BOOLEAN">>;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"if">): void | {
        type: "function_return";
        value: VariableValue;
    };
}
export declare class ElseStatement extends Statement {
    static blockType: ProgramASTBranchNodeType | null;
}
export declare class SwitchStatement extends Statement {
    expression: UntypedNodeValue<import("./parser-types.js").ExpressionASTNode>;
    static supportsSplit(block: ProgramASTBranchNode, statement: Statement): true | string;
    static checkBlock({ nodeGroups, controlStatements }: ProgramASTBranchNode): void;
    runBlock(runtime: Runtime, { controlStatements, nodeGroups }: ProgramASTBranchNode<"switch">): void | StatementExecutionResult;
}
export declare class CaseBranchStatement extends Statement {
    value: Token;
    static blockType: ProgramASTBranchNodeType;
    branchMatches(switchType: VariableType, switchValue: VariableValue): boolean;
}
export declare class CaseBranchRangeStatement extends CaseBranchStatement {
    lowerBound: Token;
    upperBound: Token;
    static blockType: ProgramASTBranchNodeType;
    static allowedTypes: ("number.decimal" | "char")[];
    constructor(tokens: RangeArray<Token>);
    branchMatches(switchType: VariableType, switchValue: VariableValue): boolean;
}
export declare class ForStatement extends Statement {
    name: string;
    from: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    to: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    empty?: boolean;
    preRun(group: ProgramASTNodeGroup, node: ProgramASTBranchNode<"for">): void;
    getStep(runtime: Runtime): number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"for">): {
        type: "function_return";
        value: VariableValue;
    } | undefined;
}
export declare class ForStepStatement extends ForStatement {
    step: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    getStep(runtime: Runtime): number;
}
export declare class ForEndStatement extends Statement {
    static blockType: ProgramASTBranchNodeType;
    name: Token;
}
export declare class ForEndBadStatement extends Statement {
    static blockType: ProgramASTBranchNodeType;
    static invalidMessage: typeof Statement.invalidMessage;
}
export declare class WhileStatement extends Statement {
    condition: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "BOOLEAN", PrimitiveVariableType<"BOOLEAN">>;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"while">): {
        type: "function_return";
        value: VariableValue;
    } | undefined;
}
export declare class DoWhileStatement extends Statement {
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"dowhile">): {
        type: "function_return";
        value: VariableValue;
    } | undefined;
}
export declare class DoWhileEndStatement extends Statement {
    condition: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "BOOLEAN", PrimitiveVariableType<"BOOLEAN">>;
    static blockType: ProgramASTBranchNodeType;
}
export declare class FunctionStatement extends Statement {
    args: FunctionArguments;
    argsRange: TextRange;
    returnType: UnresolvedVariableType;
    returnTypeToken: ExpressionASTTypeNode;
    name: string;
    nameToken: Token;
    static propagatesControlFlowInterruptions: boolean;
    constructor(tokens: RangeArray<Token>, offset?: number);
    runBlock(runtime: Runtime, node: FunctionData<"function">): void;
}
export declare class ProcedureStatement extends Statement {
    args: FunctionArguments;
    argsRange: TextRange;
    name: string;
    nameToken: Token;
    static propagatesControlFlowInterruptions: boolean;
    constructor(tokens: RangeArray<Token>, offset?: number);
    runBlock(runtime: Runtime, node: FunctionData<"procedure">): void;
}
interface IFileStatement {
    filename: TypedNodeValue<ExpressionAST, "STRING">;
}
export declare class OpenFileStatement extends Statement implements IFileStatement {
    mode: Token;
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    run(runtime: Runtime): void;
}
export declare class CloseFileStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    run(runtime: Runtime): void;
}
export declare class ReadFileStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    output: import("./parser-types.js").ExpressionASTNode;
    run(runtime: Runtime): void;
}
export declare class WriteFileStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    data: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    run(runtime: Runtime): void;
}
export declare class SeekStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    index: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    run(runtime: Runtime): void;
}
export declare class GetRecordStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    variable: import("./parser-types.js").ExpressionASTNode;
    run(runtime: Runtime): void;
}
export declare class PutRecordStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("./parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    variable: import("./parser-types.js").ExpressionASTNode;
    run(runtime: Runtime): void;
}
declare class ClassMemberStatement {
    accessModifierToken: Token;
    accessModifier: "public" | "private";
    constructor(tokens: RangeArray<ExpressionASTNodeExt>);
    run(): void;
    runBlock(): void;
}
export declare class ClassStatement extends TypeStatement {
    name: Token;
    static allowOnly: Set<"function" | "type" | "if" | "for" | "for.step" | "while" | "dowhile" | "procedure" | "switch" | "class" | "class.inherits" | "class_function" | "class_procedure" | "declare" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if.end" | "else" | "switch.end" | "case" | "case.range" | "for.end" | "while.end" | "dowhile.end" | "function.end" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class.end" | "class_property" | "class_procedure.end" | "class_function.end" | "illegal.assignment" | "illegal.end" | "illegal.for.end">;
    static propagatesControlFlowInterruptions: boolean;
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
    createTypeBlock(runtime: Runtime, branchNode: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class ClassInheritsStatement extends ClassStatement {
    superClassName: Token;
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
}
declare const ClassPropertyStatement_base: import("./utils.js").MixClasses<typeof DeclareStatement, typeof ClassMemberStatement>;
export declare class ClassPropertyStatement extends ClassPropertyStatement_base {
    static blockType: ProgramASTBranchNodeType;
}
declare const ClassProcedureStatement_base: import("./utils.js").MixClasses<typeof ProcedureStatement, typeof ClassMemberStatement>;
export declare class ClassProcedureStatement extends ClassProcedureStatement_base {
    methodKeywordToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
    preRun(group: ProgramASTNodeGroup, node: ProgramASTBranchNode<"class_procedure">): void;
}
export declare class ClassProcedureEndStatement extends Statement {
}
declare const ClassFunctionStatement_base: import("./utils.js").MixClasses<typeof FunctionStatement, typeof ClassMemberStatement>;
export declare class ClassFunctionStatement extends ClassFunctionStatement_base {
    methodKeywordToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
}
export declare class ClassFunctionEndStatement extends Statement {
}
export {};
