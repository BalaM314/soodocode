import { RangeArray, Token } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ProgramASTNode } from "./parser-types.js";
import { BuiltinFunctionData, ClassMethodData, ClassMethodStatement, ClassVariableType, ConstantData, EnumeratedVariableType, File, FileMode, FunctionData, OpenedFile, OpenedFileOfType, PointerVariableType, TypedValue, UnresolvedVariableType, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue } from "./runtime-types.js";
import { FunctionStatement, ProcedureStatement } from "./statements.js";
import type { TextRange, TextRangeLike } from "./types.js";
export declare class Files {
    files: Record<string, File>;
    private backupFiles;
    getFile(filename: string, create: true): File;
    getFile(filename: string, create?: boolean): File | undefined;
    makeBackup(): void;
    canLoadBackup(): boolean;
    loadBackup(): void;
}
export type ClassMethodCallInformation = {
    clazz: ClassVariableType;
    instance: VariableTypeMapping<ClassVariableType>;
    method: ClassMethodData;
};
export declare class Runtime {
    _input: (message: string, type: VariableType) => string;
    _output: (values: TypedValue[]) => void;
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
    fs: Files;
    builtinFunctions: Record<"LEFT" | "RIGHT" | "MID" | "LENGTH" | "TO_UPPER" | "TO_LOWER" | "UCASE" | "LCASE" | "NUM_TO_STR" | "STR_TO_NUM" | "IS_NUM" | "ASC" | "CHR" | "INT" | "RAND" | "DAY" | "MONTH" | "YEAR" | "DAYINDEX" | "SETDATE" | "TODAY" | "EOF", BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
    constructor(_input: (message: string, type: VariableType) => string, _output: (values: TypedValue[]) => void);
    finishEvaluation(value: VariableValue, from: VariableType, to: VariableType | undefined): [type: VariableType, value: VariableValue];
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType?: VariableType): [type: VariableType, value: VariableValue];
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType: "variable"): VariableData;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType?: VariableType | "variable"): [type: VariableType, value: VariableValue] | VariableData;
    processRecordAccess(expr: ExpressionASTBranchNode, outType?: VariableType): [type: VariableType, value: VariableValue];
    processRecordAccess(expr: ExpressionASTBranchNode, outType: "variable"): VariableData | ConstantData;
    processRecordAccess(expr: ExpressionASTBranchNode, outType: "function"): ClassMethodCallInformation;
    processRecordAccess(expr: ExpressionASTBranchNode, outType?: VariableType | "variable" | "function"): [type: VariableType, value: VariableValue] | VariableData | ConstantData | ClassMethodCallInformation;
    assignExpr(target: ExpressionAST, src: ExpressionAST): void;
    evaluateExpr(expr: ExpressionAST): [type: VariableType, value: VariableValue];
    evaluateExpr(expr: ExpressionAST, undefined: undefined, recursive: boolean): [type: VariableType, value: VariableValue];
    evaluateExpr(expr: ExpressionAST, type: "variable", recursive?: boolean): VariableData | ConstantData;
    evaluateExpr(expr: ExpressionAST, type: "function", recursive?: boolean): FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
    evaluateExpr<T extends VariableType | undefined>(expr: ExpressionAST, type: T, recursive?: boolean): [type: T & {}, value: VariableTypeMapping<T>];
    evaluateToken(token: Token): [type: VariableType, value: VariableValue];
    evaluateToken(token: Token, type: "variable"): VariableData | ConstantData;
    evaluateToken(token: Token, type: "function"): FunctionData | BuiltinFunctionData;
    evaluateToken<T extends VariableType | undefined>(token: Token, type: T): [type: T & {}, value: VariableTypeMapping<T>];
    static NotStaticError: {
        new (message?: string | undefined): {
            name: string;
            message: string;
            stack?: string | undefined;
            cause?: unknown;
        };
        new (message?: string | undefined, options?: ErrorOptions | undefined): {
            name: string;
            message: string;
            stack?: string | undefined;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    static evaluateToken(token: Token, type?: VariableType): [type: VariableType, value: VariableValue];
    resolveVariableType(type: UnresolvedVariableType): VariableType;
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
    getFunction({ text, range }: Token): FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
    getClass<T extends boolean = boolean>(name: string, range: TextRange): ClassVariableType<T>;
    getCurrentFunction(): FunctionData | ClassMethodStatement | null;
    coerceValue<T extends VariableType, S extends VariableType>(value: VariableTypeMapping<T>, from: T, to: S, range?: TextRangeLike): VariableTypeMapping<S>;
    cloneValue<T extends VariableType>(type: T, value: VariableTypeMapping<T> | null): VariableTypeMapping<T> | null;
    assembleScope(func: ProcedureStatement | FunctionStatement, args: RangeArray<ExpressionAST>): VariableScope;
    callFunction<T extends boolean>(funcNode: FunctionData, args: RangeArray<ExpressionAST>, requireReturnValue?: T): VariableValue | (T extends false ? null : never);
    callClassMethod<T extends boolean>(method: ClassMethodData, clazz: ClassVariableType, instance: VariableTypeMapping<ClassVariableType>, args: RangeArray<ExpressionAST>, requireReturnValue?: T): (T extends false ? null : T extends undefined ? [type: VariableType, value: VariableValue] | null : T extends true ? [type: VariableType, value: VariableValue] : never);
    callBuiltinFunction(fn: BuiltinFunctionData, args: RangeArray<ExpressionAST>, returnType?: VariableType): [type: VariableType, value: VariableValue];
    runBlock(code: ProgramASTNode[], ...scopes: VariableScope[]): void | {
        type: "function_return";
        value: VariableValue;
    };
    runProgram(code: ProgramASTNode[]): void;
    getOpenFile(filename: string): OpenedFile;
    getOpenFile<T extends FileMode>(filename: string, modes: T[], operationDescription: string): OpenedFileOfType<T>;
}
