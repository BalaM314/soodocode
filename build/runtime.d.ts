/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/
import { Token } from "./lexer-types.js";
import { ProgramASTBranchNode, ProgramASTNode, ExpressionASTBranchNode, ExpressionAST, ExpressionASTArrayAccessNode } from "./parser-types.js";
import { ProcedureStatement, Statement, ConstantStatement, DeclareStatement, ForStatement, FunctionStatement, DefineStatement, BuiltinFunctionArguments } from "./statements.js";
/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping<T> = T extends "INTEGER" ? number : T extends "REAL" ? number : T extends "STRING" ? string : T extends "CHAR" ? string : T extends "BOOLEAN" ? boolean : T extends "DATE" ? Date : T extends ArrayVariableType ? Array<VariableTypeMapping<ArrayElementVariableType> | null> : T extends RecordVariableType ? Record<string, unknown> : T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> : T extends EnumeratedVariableType ? string : T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> : never;
export type PrimitiveVariableTypeName = "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE";
export type PrimitiveVariableType = PrimitiveVariableTypeName;
/** Contains data about an array type. Processed from an ExpressionASTArrayTypeNode. */
export declare class ArrayVariableType {
    lengthInformation: [low: number, high: number][];
    type: Exclude<UnresolvedVariableType, ArrayVariableType>;
    totalLength: number;
    arraySizes: number[];
    constructor(lengthInformation: [low: number, high: number][], type: Exclude<UnresolvedVariableType, ArrayVariableType>);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableTypeMapping<ArrayVariableType>;
}
export declare class RecordVariableType {
    name: string;
    fields: Record<string, VariableType>;
    constructor(name: string, fields: Record<string, VariableType>);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare class PointerVariableType {
    name: string;
    target: VariableType;
    constructor(name: string, target: VariableType);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare class EnumeratedVariableType {
    name: string;
    values: string[];
    constructor(name: string, values: string[]);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare class SetVariableType {
    name: string;
    baseType: PrimitiveVariableType;
    constructor(name: string, baseType: PrimitiveVariableType);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare function typesEqual(a: VariableType, b: VariableType): boolean;
export type UnresolvedVariableType = PrimitiveVariableType | ArrayVariableType | ["unresolved", name: string];
export type VariableType = PrimitiveVariableType | ArrayVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType | SetVariableType;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType;
export type VariableValue = VariableTypeMapping<any>;
export type FileMode = "READ" | "WRITE" | "APPEND" | "RANDOM";
export type File = {
    name: string;
    text: string;
};
export type OpenedFile = {
    file: File;
    mode: FileMode;
} & ({
    mode: "READ";
    lines: Iterator<string>;
} | {
    mode: "WRITE" | "APPEND" | "RANDOM";
});
export type VariableData<T extends VariableType = VariableType, /** Set this to never for initialized */ Uninitialized = null> = {
    type: T;
    /** Null indicates that the variable has not been initialized */
    value: VariableTypeMapping<T> | Uninitialized;
    declaration: DeclareStatement | FunctionStatement | ProcedureStatement | DefineStatement | "dynamic";
    mutable: true;
};
export type ConstantData<T extends VariableType = VariableType> = {
    type: T;
    /** Cannot be null */
    value: VariableTypeMapping<T>;
    declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement;
    mutable: false;
};
/** Either a function or a procedure */
export type FunctionData = ProgramASTBranchNode & {
    nodeGroups: [body: ProgramASTNode[]];
} & ({
    type: "function";
    controlStatements: [start: FunctionStatement, end: Statement];
} | {
    type: "procedure";
    controlStatements: [start: ProcedureStatement, end: Statement];
});
export type BuiltinFunctionData = {
    args: BuiltinFunctionArguments;
    returnType: VariableType | null;
    name: string;
    impl: (...args: VariableValue[]) => VariableValue;
};
export type VariableScope = {
    statement: Statement | "global";
    variables: Record<string, VariableData | ConstantData>;
    types: Record<string, VariableType>;
};
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
    /** Returned variable may not be initialized */
    getVariable(name: string): VariableData | ConstantData | null;
    getType(name: string): VariableType | null;
    getEnumFromValue(name: string): EnumeratedVariableType | null;
    getPointerTypeFor(type: VariableType): PointerVariableType | null;
    getCurrentScope(): VariableScope;
    getFunction(name: string): FunctionData | BuiltinFunctionData;
    getCurrentFunction(): FunctionData | null;
    coerceValue<T extends VariableType, S extends VariableType>(value: VariableTypeMapping<T>, from: T, to: S): VariableTypeMapping<S>;
    cloneValue<T extends VariableType>(type: T, value: VariableTypeMapping<T> | null): VariableTypeMapping<T> | null;
    callFunction(funcNode: FunctionData, args: ExpressionAST[]): VariableValue | null;
    callFunction(funcNode: FunctionData, args: ExpressionAST[], requireReturnValue: true): VariableValue;
    callBuiltinFunction(fn: BuiltinFunctionData, args: ExpressionAST[], returnType?: VariableType): [type: VariableType, value: VariableValue];
    runBlock(code: ProgramASTNode[], scope?: VariableScope): void | {
        type: "function_return";
        value: VariableValue;
    };
    /** Creates a scope. */
    runProgram(code: ProgramASTNode[]): void;
}
