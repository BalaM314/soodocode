import { Token } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ProgramASTNode } from "./parser-types.js";
import { BuiltinFunctionData, ClassMethodData, ClassMethodStatement, ClassVariableType, ConstantData, EnumeratedVariableType, File, FileMode, FunctionData, OpenedFile, OpenedFileOfType, PointerVariableType, TypedValue, UnresolvedVariableType, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue } from "./runtime-types.js";
import { FunctionStatement, ProcedureStatement } from "./statements.js";
import type { TextRange, TextRangeLike } from "./types.js";
import { RangeArray } from "./utils.js";
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
    builtinFunctions: Record<"LEFT" | "RIGHT" | "MID" | "LENGTH" | "TO_UPPER" | "TO_LOWER" | "UCASE" | "LCASE" | "NUM_TO_STR" | "STR_TO_NUM" | "IS_NUM" | "ASC" | "CHR" | "INT" | "RAND" | "DAY" | "MONTH" | "YEAR" | "DAYINDEX" | "SETDATE" | "TODAY" | "EOF" | "ROUND", BuiltinFunctionData> & Partial<Record<string, BuiltinFunctionData>>;
    constructor(_input: (message: string, type: VariableType) => string, _output: (values: TypedValue[]) => void);
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType?: VariableType): TypedValue;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType: "variable"): VariableData;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, outType?: VariableType | "variable"): TypedValue | VariableData;
    processRecordAccess(expr: ExpressionASTBranchNode, outType?: VariableType): TypedValue;
    processRecordAccess(expr: ExpressionASTBranchNode, outType: "variable"): VariableData | ConstantData;
    processRecordAccess(expr: ExpressionASTBranchNode, outType: "function"): ClassMethodCallInformation;
    processRecordAccess(expr: ExpressionASTBranchNode, outType?: VariableType | "variable" | "function"): TypedValue | VariableData | ConstantData | ClassMethodCallInformation;
    assignExpr(target: ExpressionAST, src: ExpressionAST): void;
    evaluateExpr(expr: ExpressionAST): TypedValue;
    evaluateExpr(expr: ExpressionAST, undefined: undefined, recursive: boolean): TypedValue;
    evaluateExpr(expr: ExpressionAST, type: "variable", recursive?: boolean): VariableData | ConstantData;
    evaluateExpr(expr: ExpressionAST, type: "function", recursive?: boolean): FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
    evaluateExpr<T extends VariableType | undefined>(expr: ExpressionAST, type: T, recursive?: boolean): TypedValue<T extends undefined ? VariableType : T & {}>;
    evaluateToken(token: Token): TypedValue;
    evaluateToken(token: Token, type: "variable"): VariableData | ConstantData;
    evaluateToken(token: Token, type: "function"): FunctionData | BuiltinFunctionData;
    evaluateToken<T extends VariableType | undefined>(token: Token, type: T): TypedValue<T extends undefined ? VariableType : T & {}>;
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
    static evaluateToken(token: Token): TypedValue;
    static evaluateToken<T extends VariableType | undefined>(token: Token, type: T): TypedValue<T extends undefined ? VariableType : T & {}>;
    resolveVariableType(type: UnresolvedVariableType): VariableType;
    handleNonexistentClass(name: string, range: TextRangeLike): never;
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
    getClass(name: string, range: TextRange): ClassVariableType<boolean>;
    getCurrentFunction(): FunctionData | ClassMethodStatement | null;
    cloneValue<T extends VariableType>(type: T, value: VariableTypeMapping<T> | null): VariableTypeMapping<T> | null;
    assembleScope(func: ProcedureStatement | FunctionStatement, args: RangeArray<ExpressionAST>): VariableScope;
    callFunction<T extends boolean>(funcNode: FunctionData, args: RangeArray<ExpressionAST>, requireReturnValue?: T): VariableValue | (T extends false ? null : never);
    callClassMethod<T extends boolean>(method: ClassMethodData, clazz: ClassVariableType, instance: VariableTypeMapping<ClassVariableType>, args: RangeArray<ExpressionAST>, requireReturnValue?: T): (T extends false ? null : T extends undefined ? TypedValue | null : T extends true ? TypedValue : never);
    callBuiltinFunction(fn: BuiltinFunctionData, args: RangeArray<ExpressionAST>, returnType?: VariableType): TypedValue;
    runBlock(code: ProgramASTNode[], ...scopes: VariableScope[]): void | {
        type: "function_return";
        value: VariableValue;
    };
    runProgram(code: ProgramASTNode[]): void;
    getOpenFile(filename: string): OpenedFile;
    getOpenFile<T extends FileMode>(filename: string, modes: T[], operationDescription: string): OpenedFileOfType<T>;
}
