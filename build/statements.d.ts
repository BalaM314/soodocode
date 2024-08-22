import { Token, TokenType } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTFunctionCallNode, ExpressionASTNodeExt, ExpressionASTTypeNode, ProgramASTBranchNode, ProgramASTBranchNodeType, TokenMatcher } from "./parser-types.js";
import { StatementCheckTokenRange } from "./parser.js";
import { ClassVariableType, FunctionData, PrimitiveVariableType, UnresolvedVariableType, VariableType, VariableTypeMapping, VariableValue } from "./runtime-types.js";
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
    tokens: RangeArray<ExpressionASTNodeExt>;
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
    static invalidMessage: string | null | ((parseOutput: StatementCheckTokenRange[], context: ProgramASTBranchNode | null) => [message: string, range?: TextRange]);
    range: TextRange;
    constructor(tokens: RangeArray<ExpressionASTNodeExt>);
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
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
    createTypeBlock(runtime: Runtime, block: ProgramASTBranchNode): [name: string, type: VariableType<false>];
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
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
}
export declare class TypeEnumStatement extends TypeStatement {
    name: Token;
    values: RangeArray<Token>;
    constructor(tokens: RangeArray<Token>);
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
}
export declare class TypeSetStatement extends TypeStatement {
    name: Token;
    setType: PrimitiveVariableType;
    constructor(tokens: RangeArray<Token>);
    createType(runtime: Runtime): [name: string, type: VariableType<false>];
}
export declare class TypeRecordStatement extends TypeStatement {
    name: Token;
    constructor(tokens: RangeArray<Token>);
    createTypeBlock(runtime: Runtime, node: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class AssignmentStatement extends Statement {
    target: ExpressionAST;
    expr: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class AssignmentBadStatement extends Statement {
    static invalidMessage: string;
    static suppressErrors: boolean;
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
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType<true>, null> | import("./runtime-types.js").ConstantData<VariableType<true>> | {
                properties: {
                    [index: string]: VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null)[] | Int32Array | Float64Array | any | import("./runtime-types.js").VariableData<VariableType<true>, null> | import("./runtime-types.js").ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType<true>, null> | import("./runtime-types.js").ConstantData<VariableType<true>> | {
            properties: {
                [index: string]: VariableTypeMapping<any> | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType;
        } | null)[] | Int32Array | Float64Array | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("./runtime-types.js").VariableData<VariableType<true>, null> | import("./runtime-types.js").ConstantData<VariableType<true>> | {
                properties: {
                    [index: string]: VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null)[] | Int32Array | Float64Array | any | import("./runtime-types.js").VariableData<VariableType<true>, null> | import("./runtime-types.js").ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null;
        } | import("./runtime-types.js").VariableData<VariableType<true>, null> | import("./runtime-types.js").ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: VariableTypeMapping<any> | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType;
        };
    };
}
export declare class CallStatement extends Statement {
    func: ExpressionASTFunctionCallNode;
    constructor(tokens: RangeArray<Token>);
    run(runtime: Runtime): void;
}
export declare class EndBadStatement extends Statement {
    static invalidMessage: typeof Statement.invalidMessage;
}
export declare class IfStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): void | {
        type: "function_return";
        value: VariableValue;
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
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"for">): {
        type: "function_return";
        value: VariableValue;
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
export declare class ForEndBadStatement extends Statement {
    static blockType: ProgramASTBranchNodeType;
    static invalidMessage: typeof Statement.invalidMessage;
}
export declare class WhileStatement extends Statement {
    condition: ExpressionAST;
    constructor(tokens: RangeArray<Token>);
    runBlock(runtime: Runtime, node: ProgramASTBranchNode): {
        type: "function_return";
        value: VariableValue;
    } | undefined;
}
export declare class DoWhileStatement extends Statement {
    static maxLoops: number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"dowhile">): {
        type: "function_return";
        value: VariableValue;
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
    constructor(tokens: RangeArray<Token>, offset?: number);
    runBlock(runtime: Runtime, node: FunctionData): void;
}
export declare class ProcedureStatement extends Statement {
    args: FunctionArguments;
    argsRange: TextRange;
    name: string;
    constructor(tokens: RangeArray<Token>, offset?: number);
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
declare class ClassMemberStatement {
    accessModifierToken: Token;
    accessModifier: "public" | "private";
    constructor(tokens: RangeArray<Token>);
    run(): void;
    runBlock(): void;
}
export declare class ClassStatement extends TypeStatement {
    static allowOnly: Set<"function" | "if" | "for" | "for.step" | "while" | "dowhile" | "procedure" | "switch" | "type" | "class" | "class.inherits" | "class_function" | "class_procedure" | "declare" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if.end" | "else" | "switch.end" | "case" | "case.range" | "for.end" | "while.end" | "dowhile.end" | "function.end" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class.end" | "class_property" | "class_procedure.end" | "class_function.end" | "illegal.assignment" | "illegal.end" | "illegal.for.end">;
    name: Token;
    constructor(tokens: RangeArray<Token>);
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
    createTypeBlock(runtime: Runtime, branchNode: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class ClassInheritsStatement extends ClassStatement {
    superClassName: Token;
    constructor(tokens: RangeArray<Token>);
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
