import { Token } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ExpressionASTNode, ProgramASTNode } from "./parser-types.js";
import { BuiltinFunctionData, ClassMethodData, ClassVariableType, ConstantData, EnumeratedVariableType, File, FileMode, FunctionData, OpenedFile, OpenedFileOfType, PointerVariableType, UnresolvedVariableType, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue } from "./runtime-types.js";
import { FunctionStatement, ProcedureStatement } from "./statements.js";
export declare class Files {
    files: Record<string, File>;
    private backupFiles;
    getFile(filename: string, create: true): File;
    getFile(filename: string, create?: boolean): File | undefined;
    makeBackup(): void;
    canLoadBackup(): boolean;
    loadBackup(): void;
}
export declare class Runtime {
    _input: (message: string) => string;
    _output: (message: string) => void;
    scopes: VariableScope[];
    functions: Record<string, FunctionData>;
    openFiles: Record<string, OpenedFile | undefined>;
    fs: Files;
    constructor(_input: (message: string) => string, _output: (message: string) => void);
    processArrayAccess(expr: ExpressionASTArrayAccessNode, operation: "get", type?: VariableType): [type: VariableType, value: VariableValue];
    processArrayAccess(expr: ExpressionASTArrayAccessNode, operation: "get", type: "variable"): VariableData;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, operation: "set", value: ExpressionAST): void;
    processArrayAccess(expr: ExpressionASTArrayAccessNode, operation: "get", type?: VariableType | "variable"): [type: VariableType, value: VariableValue] | VariableData;
    processRecordAccess(expr: ExpressionASTBranchNode, operation: "get", type?: VariableType): [type: VariableType, value: VariableValue];
    processRecordAccess(expr: ExpressionASTBranchNode, operation: "get", type: "variable"): VariableData | ConstantData;
    processRecordAccess(expr: ExpressionASTBranchNode, operation: "get", type?: VariableType | "variable"): [type: VariableType, value: VariableValue] | VariableData | ConstantData;
    processRecordAccess(expr: ExpressionASTBranchNode, operation: "set", value: ExpressionAST): void;
    evaluateExpr(expr: ExpressionAST): [type: VariableType, value: VariableValue];
    evaluateExpr(expr: ExpressionAST, undefined: undefined, recursive: boolean): [type: VariableType, value: VariableValue];
    evaluateExpr(expr: ExpressionAST, type: "variable", recursive?: boolean): VariableData | ConstantData;
    evaluateExpr<T extends VariableType | undefined>(expr: ExpressionAST, type: T, recursive?: boolean): [type: T & {}, value: VariableTypeMapping<T>];
    evaluateToken(token: Token): [type: VariableType, value: VariableValue];
    evaluateToken(token: Token, type: "variable"): VariableData | ConstantData;
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
    getVariable(name: string): VariableData | ConstantData | null;
    getType(name: string): VariableType | null;
    getEnumFromValue(name: string): EnumeratedVariableType | null;
    getPointerTypeFor(type: VariableType): PointerVariableType | null;
    getCurrentScope(): VariableScope;
    getFunction(name: ExpressionASTNode): FunctionData | BuiltinFunctionData;
    getClass(name: string): ClassVariableType;
    getCurrentFunction(): FunctionData | null;
    coerceValue<T extends VariableType, S extends VariableType>(value: VariableTypeMapping<T>, from: T, to: S): VariableTypeMapping<S>;
    cloneValue<T extends VariableType>(type: T, value: VariableTypeMapping<T> | null): VariableTypeMapping<T> | null;
    assembleScope(func: ProcedureStatement | FunctionStatement, args: ExpressionASTNode[]): VariableScope;
    callFunction(funcNode: FunctionData, args: ExpressionAST[]): VariableValue | null;
    callFunction(funcNode: FunctionData, args: ExpressionAST[], requireReturnValue: true): VariableValue;
    callClassMethod(funcNode: ClassMethodData, clazz: ClassVariableType, instance: VariableTypeMapping<ClassVariableType>, args: ExpressionAST[]): VariableValue | null;
    callClassMethod(funcNode: ClassMethodData, clazz: ClassVariableType, instance: VariableTypeMapping<ClassVariableType>, args: ExpressionAST[], requireReturnValue: true): VariableValue;
    callBuiltinFunction(fn: BuiltinFunctionData, args: ExpressionAST[], returnType?: VariableType): [type: VariableType, value: VariableValue];
    runBlock(code: ProgramASTNode[], ...scopes: VariableScope[]): void | {
        type: "function_return";
        value: VariableValue;
    };
    runProgram(code: ProgramASTNode[]): void;
    getOpenFile(filename: string): OpenedFile;
    getOpenFile<T extends FileMode>(filename: string, modes: T[], operationDescription: string): OpenedFileOfType<T>;
}
