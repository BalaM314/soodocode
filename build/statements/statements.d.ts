import { Token } from "../lexer/index.js";
import { ExpressionAST, ExpressionASTFunctionCallNode, ExpressionASTNodeExt, ExpressionASTTypeNode, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNodeGroup } from "../parser/index.js";
import { ClassVariableType, ConstantData, FunctionData, PrimitiveVariableType, TypedNodeValue, UnresolvedVariableType, UntypedNodeValue, VariableType, VariableValue } from "../runtime/runtime-types.js";
import { Runtime } from "../runtime/runtime.js";
import { RangeArray } from "../utils/funcs.js";
import type { TextRange } from "../utils/types.js";
import { FunctionArguments, StatementExecutionResult } from "./statement-types.js";
import { Statement } from "./statement.js";
export declare abstract class TypeStatement extends Statement {
    preRun(group: ProgramASTNodeGroup, node?: ProgramASTBranchNode): void;
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
    preRun(group: ProgramASTNodeGroup, node?: ProgramASTBranchNode): void;
    run(runtime: Runtime): void;
}
export declare class DefineStatement extends Statement {
    static requiresScope: boolean;
    name: Token;
    variableTypeToken: Token;
    variableType: UnresolvedVariableType;
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
    static allowOnly: Set<"function" | "declare" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call" | "type" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if" | "if.end" | "else" | "switch" | "switch.end" | "case" | "case.range" | "for" | "for.step" | "for.end" | "while" | "while.end" | "dowhile" | "dowhile.end" | "function.end" | "procedure" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class" | "class.inherits" | "class.end" | "class_property" | "class_procedure" | "class_procedure.end" | "class_function" | "class_function.end" | "illegal.assignment" | "illegal.end" | "illegal.for.end">;
    createTypeBlock(runtime: Runtime, node: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class AssignmentStatement extends Statement {
    static requiresScope: boolean;
    target: import("../parser/parser-types.js").ExpressionASTNode;
    expression: UntypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode>;
    constructor(tokens: RangeArray<ExpressionAST>);
    run(runtime: Runtime): void;
}
export declare class AssignmentBadStatement extends Statement {
    static invalidMessage: string;
    static suppressErrors: boolean;
}
export declare class OutputStatement extends Statement {
    outMessage: UntypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode>[];
    run(runtime: Runtime): void;
}
export declare class InputStatement extends Statement {
    name: string;
    run(runtime: Runtime): void;
}
export declare class ReturnStatement extends Statement {
    static interruptsControlFlow: boolean;
    expression: UntypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode>;
    run(runtime: Runtime): {
        type: "function_return";
        value: string | number | boolean | Date | (string | number | boolean | Date | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("../runtime/runtime-types.js").VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | {
                properties: {
                    [index: string]: import("../runtime/runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null)[] | Int32Array | Float64Array | any | import("../runtime/runtime-types.js").VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: import("../runtime/runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null;
        } | import("../runtime/runtime-types.js").VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | {
            properties: {
                [index: string]: import("../runtime/runtime-types.js").VariableTypeMapping<any> | null;
            };
            propertyTypes: Record<string, VariableType>;
            type: ClassVariableType;
        } | null)[] | Int32Array | Float64Array | {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | import("../runtime/runtime-types.js").VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | {
                properties: {
                    [index: string]: import("../runtime/runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null)[] | Int32Array | Float64Array | any | import("../runtime/runtime-types.js").VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
                properties: {
                    [index: string]: import("../runtime/runtime-types.js").VariableTypeMapping<any> | null;
                };
                propertyTypes: Record<string, VariableType>;
                type: ClassVariableType;
            } | null;
        } | import("../runtime/runtime-types.js").VariableData<VariableType<true>, null> | ConstantData<VariableType<true>> | (string | number | boolean | Date)[] | {
            properties: {
                [index: string]: import("../runtime/runtime-types.js").VariableTypeMapping<any> | null;
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
    condition: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "BOOLEAN", PrimitiveVariableType<"BOOLEAN">>;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"if">): void | {
        type: "function_return";
        value: VariableValue;
    };
}
export declare class ElseStatement extends Statement {
    static blockType: ProgramASTBranchNodeType | null;
}
export declare class SwitchStatement extends Statement {
    expression: UntypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode>;
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
    from: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    to: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    empty?: boolean;
    preRun(group: ProgramASTNodeGroup, node: ProgramASTBranchNode<"for">): void;
    getStep(runtime: Runtime): number;
    runBlock(runtime: Runtime, node: ProgramASTBranchNode<"for">): {
        type: "function_return";
        value: VariableValue;
    } | undefined;
}
export declare class ForStepStatement extends ForStatement {
    step: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
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
    condition: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "BOOLEAN", PrimitiveVariableType<"BOOLEAN">>;
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
    condition: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "BOOLEAN", PrimitiveVariableType<"BOOLEAN">>;
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
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    run(runtime: Runtime): void;
}
export declare class CloseFileStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    run(runtime: Runtime): void;
}
export declare class ReadFileStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    output: import("../parser/parser-types.js").ExpressionASTNode;
    run(runtime: Runtime): void;
}
export declare class WriteFileStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    data: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    run(runtime: Runtime): void;
}
export declare class SeekStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    index: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "INTEGER", PrimitiveVariableType<"INTEGER">>;
    run(runtime: Runtime): void;
}
export declare class GetRecordStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    variable: import("../parser/parser-types.js").ExpressionASTNode;
    run(runtime: Runtime): void;
}
export declare class PutRecordStatement extends Statement implements IFileStatement {
    filename: TypedNodeValue<import("../parser/parser-types.js").ExpressionASTNode, "STRING", PrimitiveVariableType<"STRING">>;
    variable: import("../parser/parser-types.js").ExpressionASTNode;
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
    static allowOnly: Set<"function" | "declare" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call" | "type" | "type.pointer" | "type.enum" | "type.set" | "type.end" | "if" | "if.end" | "else" | "switch" | "switch.end" | "case" | "case.range" | "for" | "for.step" | "for.end" | "while" | "while.end" | "dowhile" | "dowhile.end" | "function.end" | "procedure" | "procedure.end" | "openfile" | "readfile" | "writefile" | "closefile" | "seek" | "getrecord" | "putrecord" | "class" | "class.inherits" | "class.end" | "class_property" | "class_procedure" | "class_procedure.end" | "class_function" | "class_function.end" | "illegal.assignment" | "illegal.end" | "illegal.for.end">;
    static propagatesControlFlowInterruptions: boolean;
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
    createTypeBlock(runtime: Runtime, branchNode: ProgramASTBranchNode): [name: string, type: VariableType<false>];
}
export declare class ClassInheritsStatement extends ClassStatement {
    superClassName: Token;
    initializeClass(runtime: Runtime, branchNode: ProgramASTBranchNode): ClassVariableType<false>;
}
declare const ClassPropertyStatement_base: import("../utils/funcs.js").MixClasses<typeof DeclareStatement, typeof ClassMemberStatement>;
export declare class ClassPropertyStatement extends ClassPropertyStatement_base {
    static blockType: ProgramASTBranchNodeType;
}
declare const ClassProcedureStatement_base: import("../utils/funcs.js").MixClasses<typeof ProcedureStatement, typeof ClassMemberStatement>;
export declare class ClassProcedureStatement extends ClassProcedureStatement_base {
    methodKeywordToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
    preRun(group: ProgramASTNodeGroup, node: ProgramASTBranchNode<"class_procedure">): void;
}
export declare class ClassProcedureEndStatement extends Statement {
}
declare const ClassFunctionStatement_base: import("../utils/funcs.js").MixClasses<typeof FunctionStatement, typeof ClassMemberStatement>;
export declare class ClassFunctionStatement extends ClassFunctionStatement_base {
    methodKeywordToken: Token;
    static blockType: ProgramASTBranchNodeType;
    constructor(tokens: RangeArray<Token>);
}
export declare class ClassFunctionEndStatement extends Statement {
}
export {};
