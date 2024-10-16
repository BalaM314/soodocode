import { Token } from "../lexer/index.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ExpressionASTNode, ProgramASTNodeGroup } from "../parser/index.js";
import { FunctionStatement, ProcedureStatement } from "../statements/index.js";
import { RangeArray } from "../utils/funcs.js";
import type { TextRange, TextRangeLike } from "../utils/types.js";
import { FileSystem } from "./files.js";
import { BuiltinFunctionData, ClassMethodData, ClassMethodStatement, ClassVariableType, ConstantData, EnumeratedVariableType, FileMode, FunctionData, OpenedFile, OpenedFileOfType, PointerVariableType, PrimitiveVariableTypeName, TypedNodeValue, TypedValue, UnresolvedVariableType, UntypedNodeValue, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue } from "./runtime-types.js";
export type ClassMethodCallInformation = {
    clazz: ClassVariableType;
    instance: VariableTypeMapping<ClassVariableType>;
    method: ClassMethodData;
};
export declare class Runtime {
    _input: (message: string, type: VariableType) => string;
    _output: (values: TypedValue[]) => void;
    fs: FileSystem;
    scopes: VariableScope[];
    functions: Record<string, FunctionData>;
    openFiles: Record<string, OpenedFile | undefined>;
    classData: {
        clazz: ClassVariableType;
        instance: VariableTypeMapping<ClassVariableType>;
        method: ClassMethodData;
    } | null;
    currentlyResolvingTypeName: string | null;
    currentlyResolvingPointerTypeName: string | null;
    builtinFunctions: Record<"LEFT" | "RIGHT" | "MID" | "LENGTH" | "TO_UPPER" | "TO_LOWER" | "UCASE" | "LCASE" | "NUM_TO_STR" | "STR_TO_NUM" | "IS_NUM" | "ASC" | "CHR" | "INT" | "RAND" | "DAY" | "MONTH" | "YEAR" | "DAYINDEX" | "SETDATE" | "TODAY" | "EOF" | "ROUND" | "POW" | "EXP", BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
    statementsExecuted: number;
    constructor(_input: (message: string, type: VariableType) => string, _output: (values: TypedValue[]) => void, fs?: FileSystem);
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType?: VariableType): TypedValue;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType: "variable"): VariableData;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType?: VariableType | "variable"): TypedValue | VariableData;
    processRecordAccess(expr: ExpressionASTBranchNode, outType?: VariableType): TypedValue;
    processRecordAccess(expr: ExpressionASTBranchNode, outType: "variable"): VariableData | ConstantData;
    processRecordAccess(expr: ExpressionASTBranchNode, outType: "function"): ClassMethodCallInformation;
    processRecordAccess(expr: ExpressionASTBranchNode, outType?: VariableType | "variable" | "function"): TypedValue | VariableData | ConstantData | ClassMethodCallInformation;
    assignExpr(target: ExpressionAST, src: UntypedNodeValue): void;
    evaluateExpr(expr: ExpressionAST): TypedValue;
    evaluateExpr(expr: ExpressionAST, undefined: undefined, recursive: boolean): TypedValue;
    evaluateExpr(expr: ExpressionAST, type: "variable", recursive?: boolean): VariableData | ConstantData;
    evaluateExpr(expr: ExpressionAST, type: "function", recursive?: boolean): FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
    evaluateExpr<T extends VariableType | undefined>(expr: ExpressionAST, type: T, recursive?: boolean): TypedValue<T extends undefined ? VariableType : T & {}>;
    evaluateExpr<T extends VariableType | undefined | "variable">(expr: ExpressionAST, type: T, recursive?: boolean): VariableData | ConstantData | TypedValue<T extends (undefined | "variable") ? VariableType : T & {}>;
    evaluateToken(token: Token): TypedValue;
    evaluateToken(token: Token, type: "variable"): VariableData | ConstantData;
    evaluateToken(token: Token, type: "function"): FunctionData | BuiltinFunctionData;
    evaluateToken<T extends VariableType | undefined>(token: Token, type: T): TypedValue<T extends undefined ? VariableType : T & {}>;
    static NotStatic: symbol;
    static evaluateToken(token: Token): TypedValue | null;
    static evaluateToken<T extends VariableType | undefined>(token: Token, type: T): TypedValue<T extends undefined ? VariableType : T & {}> | null;
    static evaluateExpr(expr: ExpressionAST): TypedValue | null;
    static evaluateExpr<T extends VariableType>(expr: ExpressionAST, type: T): TypedValue<T> | null;
    static evaluateExpr<T extends VariableType | undefined>(expr: ExpressionAST, type: T): TypedValue<T extends undefined ? VariableType : T & {}> | null;
    static evaluateExpr<T extends VariableType | undefined | "variable">(expr: ExpressionAST, type: T, recursive?: boolean): VariableData | ConstantData | TypedValue<T extends (undefined | "variable") ? VariableType : T & {}>;
    evaluate<T extends ExpressionASTNode, InputType extends PrimitiveVariableTypeName | VariableType, Type extends VariableType>(value: TypedNodeValue<T, InputType, Type>): VariableTypeMapping<Type>;
    evaluateUntyped(expr: UntypedNodeValue): TypedValue;
    evaluateUntyped<Type extends VariableType>(expr: UntypedNodeValue, type: Type): TypedValue<Type>;
    resolveVariableType(type: UnresolvedVariableType): VariableType;
    handleNonexistentClass(name: string, range: TextRangeLike, gRange: TextRangeLike): never;
    handleNonexistentType(name: string, range: TextRangeLike): never;
    handleNonexistentFunction(name: string, range: TextRangeLike): never;
    handleNonexistentVariable(name: string, range: TextRangeLike): never;
    activeScopes(): Generator<VariableScope, null, unknown>;
    getVariable(name: string): VariableData | ConstantData | null;
    getType(name: string): VariableType | null;
    getEnumFromValue(name: string): EnumeratedVariableType | null;
    getPointerTypeFor(type: VariableType): PointerVariableType | null;
    getCurrentScope(): VariableScope;
    canAccessClass(clazz: ClassVariableType): boolean;
    defineVariable(name: string, data: VariableData | ConstantData, range: TextRangeLike): void;
    defineFunction(name: string, data: FunctionData, range: TextRange): void;
    getFunction({ text, range }: Token): FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
    getClass(name: string, range: TextRangeLike, gRange: TextRangeLike): ClassVariableType<boolean>;
    getCurrentFunction(): FunctionData | ClassMethodStatement | null;
    cloneValue<T extends VariableType>(type: T, value: VariableTypeMapping<T> | null): VariableTypeMapping<T> | null;
    assembleScope(func: ProcedureStatement | FunctionStatement, args: RangeArray<ExpressionAST>): VariableScope;
    callFunction<T extends boolean>(funcNode: FunctionData, args: RangeArray<ExpressionAST>, requireReturnValue?: T): VariableValue | (T extends false ? null : never);
    callClassMethod<T extends boolean>(method: ClassMethodData, clazz: ClassVariableType, instance: VariableTypeMapping<ClassVariableType>, args: RangeArray<ExpressionAST>, requireReturnValue?: T): (T extends false ? null : T extends undefined ? TypedValue | null : T extends true ? TypedValue : never);
    callBuiltinFunction(fn: BuiltinFunctionData, args: RangeArray<ExpressionAST>, returnType?: VariableType): TypedValue;
    runBlock(code: ProgramASTNodeGroup, allScopesEmpty: boolean, ...scopes: VariableScope[]): void | {
        type: "function_return";
        value: VariableValue;
    };
    runBlockFast(code: ProgramASTNodeGroup & {
        requiresScope: false;
        hasTypesOrConstants: false;
        hasReturn: false;
    }): void;
    statementExecuted(range: TextRangeLike, increment?: number): void;
    runProgram(code: ProgramASTNodeGroup): void;
    getOpenFile(filename: string): OpenedFile;
    getOpenFile<T extends FileMode>(filename: string, modes: T[], operationDescription: string): OpenedFileOfType<T>;
}
