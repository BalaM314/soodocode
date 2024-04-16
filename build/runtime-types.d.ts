/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/
import type { ProgramASTBranchNode, ProgramASTNode } from "./parser-types.js";
import type { Runtime } from "./runtime.js";
import type { DeclareStatement, FunctionStatement, ProcedureStatement, DefineStatement, ConstantStatement, ForStatement, Statement, BuiltinFunctionArguments } from "./statements.js";
/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping<T> = T extends PrimitiveVariableType<infer U> ? (U extends "INTEGER" ? number : U extends "REAL" ? number : U extends "STRING" ? string : U extends "CHAR" ? string : U extends "BOOLEAN" ? boolean : U extends "DATE" ? Date : never) : T extends ArrayVariableType ? Array<VariableTypeMapping<ArrayElementVariableType> | null> : T extends RecordVariableType ? Record<string, unknown> : T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> : T extends EnumeratedVariableType ? string : T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> : never;
export type PrimitiveVariableTypeName = "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE";
export type PrimitiveVariableType_<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> = T extends string ? PrimitiveVariableType<T> : never;
export declare class PrimitiveVariableType<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> {
    name: T;
    static INTEGER: PrimitiveVariableType<"INTEGER">;
    static REAL: PrimitiveVariableType<"REAL">;
    static STRING: PrimitiveVariableType<"STRING">;
    static CHAR: PrimitiveVariableType<"CHAR">;
    static BOOLEAN: PrimitiveVariableType<"BOOLEAN">;
    static DATE: PrimitiveVariableType<"DATE">;
    private constructor();
    is<T extends PrimitiveVariableTypeName>(...type: T[]): this is PrimitiveVariableType<T>;
    static valid(input: string): input is PrimitiveVariableTypeName;
    static get(type: PrimitiveVariableTypeName): PrimitiveVariableType;
    static get(type: string): PrimitiveVariableType | undefined;
    static resolve(type: string): Exclude<UnresolvedVariableType, ArrayVariableType>;
    getInitValue(runtime: Runtime): number | string | boolean | Date;
}
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
    is(...type: PrimitiveVariableTypeName[]): boolean;
}
export declare class RecordVariableType {
    name: string;
    fields: Record<string, VariableType>;
    constructor(name: string, fields: Record<string, VariableType>);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    is(...type: PrimitiveVariableTypeName[]): boolean;
}
export declare class PointerVariableType {
    name: string;
    target: VariableType;
    constructor(name: string, target: VariableType);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    is(...type: PrimitiveVariableTypeName[]): boolean;
}
export declare class EnumeratedVariableType {
    name: string;
    values: string[];
    constructor(name: string, values: string[]);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    is(...type: PrimitiveVariableTypeName[]): boolean;
}
export declare class SetVariableType {
    name: string;
    baseType: PrimitiveVariableType;
    constructor(name: string, baseType: PrimitiveVariableType);
    toString(): string;
    toQuotedString(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    is(...type: PrimitiveVariableTypeName[]): boolean;
}
export declare function typesEqual(a: VariableType, b: VariableType): boolean;
export type UnresolvedVariableType = PrimitiveVariableType | ArrayVariableType | ["unresolved", name: string];
export type VariableType = PrimitiveVariableType<"INTEGER"> | PrimitiveVariableType<"REAL"> | PrimitiveVariableType<"STRING"> | PrimitiveVariableType<"CHAR"> | PrimitiveVariableType<"BOOLEAN"> | PrimitiveVariableType<"DATE"> | PrimitiveVariableType | ArrayVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType | SetVariableType;
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
    lines: string[];
    lineNumber: number;
} | {
    mode: "WRITE" | "APPEND";
} | {
    mode: "RANDOM";
    data: string[];
    currentPointer: number;
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
