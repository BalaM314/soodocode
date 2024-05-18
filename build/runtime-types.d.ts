import { RangeArray, Token } from "./lexer-types.js";
import type { ExpressionASTArrayTypeNode, ExpressionASTNode, ProgramASTBranchNode, ProgramASTNode } from "./parser-types.js";
import type { Runtime } from "./runtime.js";
import type { BuiltinFunctionArguments, ClassPropertyStatement, ClassStatement, ConstantStatement, DeclareStatement, DefineStatement, ForStatement, FunctionStatement, ProcedureStatement, Statement } from "./statements.js";
import { ClassFunctionStatement, ClassProcedureStatement } from "./statements.js";
import type { BoxPrimitive, IFormattable, RangeAttached, TextRange } from "./types.js";
export type VariableTypeMapping<T> = T extends PrimitiveVariableType<infer U> ? (U extends "INTEGER" ? number : U extends "REAL" ? number : U extends "STRING" ? string : U extends "CHAR" ? string : U extends "BOOLEAN" ? boolean : U extends "DATE" ? Date : never) : T extends ArrayVariableType ? Array<VariableTypeMapping<ArrayElementVariableType> | null> : T extends RecordVariableType ? {
    [index: string]: VariableTypeMapping<any> | null;
} : T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> : T extends EnumeratedVariableType ? string : T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> : T extends ClassVariableType ? {
    properties: {
        [index: string]: VariableTypeMapping<any> | null;
    };
    type: ClassVariableType;
} : never;
export declare abstract class BaseVariableType implements IFormattable {
    abstract getInitValue(runtime: Runtime, requireInit: boolean): unknown;
    abstract init(runtime: Runtime): void;
    checkSize(): void;
    is(...type: PrimitiveVariableTypeName[]): boolean;
    abstract fmtDebug(): string;
    fmtQuoted(): string;
    abstract fmtText(): string;
}
export type PrimitiveVariableTypeName = "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE";
export type PrimitiveVariableType_<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> = T extends string ? PrimitiveVariableType<T> : never;
export declare class PrimitiveVariableType<T extends PrimitiveVariableTypeName = PrimitiveVariableTypeName> extends BaseVariableType {
    name: T;
    static all: PrimitiveVariableType[];
    static INTEGER: PrimitiveVariableType<"INTEGER">;
    static REAL: PrimitiveVariableType<"REAL">;
    static STRING: PrimitiveVariableType<"STRING">;
    static CHAR: PrimitiveVariableType<"CHAR">;
    static BOOLEAN: PrimitiveVariableType<"BOOLEAN">;
    static DATE: PrimitiveVariableType<"DATE">;
    private constructor();
    init(runtime: Runtime): void;
    fmtDebug(): string;
    fmtText(): T;
    fmtShort(): T;
    is<T extends PrimitiveVariableTypeName>(...type: T[]): this is PrimitiveVariableType<T>;
    static valid(input: string): input is PrimitiveVariableTypeName;
    static get(type: PrimitiveVariableTypeName): PrimitiveVariableType;
    static get(type: string): PrimitiveVariableType | undefined;
    static resolve(token: Token): Exclude<UnresolvedVariableType, ArrayVariableType>;
    getInitValue(runtime: Runtime, requireInit: boolean): number | string | boolean | Date | null;
}
export declare class ArrayVariableType<Init extends boolean = true> extends BaseVariableType {
    lengthInformation: [low: number, high: number][] | null;
    lengthInformationRange: TextRange | null;
    elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null;
    totalLength: number | null;
    arraySizes: number[] | null;
    constructor(lengthInformation: [low: number, high: number][] | null, lengthInformationRange: TextRange | null, elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null);
    init(runtime: Runtime): void;
    fmtText(): string;
    fmtShort(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime, requireInit: boolean): VariableTypeMapping<ArrayVariableType>;
    static from(node: ExpressionASTArrayTypeNode): ArrayVariableType<false>;
}
export declare class RecordVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    name: string;
    fields: Record<string, [type: (Init extends true ? never : UnresolvedVariableType) | VariableType, range: TextRange]>;
    directDependencies: Set<VariableType>;
    constructor(initialized: Init, name: string, fields: Record<string, [type: (Init extends true ? never : UnresolvedVariableType) | VariableType, range: TextRange]>);
    init(runtime: Runtime): void;
    addDependencies(type: VariableType): void;
    checkSize(): void;
    fmtText(): string;
    fmtShort(): string;
    fmtQuoted(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime, requireInit: boolean): VariableValue | null;
}
export declare class PointerVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    name: string;
    target: (Init extends true ? never : UnresolvedVariableType) | VariableType;
    constructor(initialized: Init, name: string, target: (Init extends true ? never : UnresolvedVariableType) | VariableType);
    init(runtime: Runtime): void;
    fmtText(): string;
    fmtShort(): string;
    fmtQuoted(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare class EnumeratedVariableType extends BaseVariableType {
    name: string;
    values: string[];
    constructor(name: string, values: string[]);
    init(): void;
    fmtText(): string;
    fmtShort(): string;
    fmtQuoted(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare class SetVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    name: string;
    baseType: (Init extends true ? never : UnresolvedVariableType) | VariableType;
    constructor(initialized: Init, name: string, baseType: (Init extends true ? never : UnresolvedVariableType) | VariableType);
    init(runtime: Runtime): void;
    fmtText(): string;
    fmtShort(): string;
    toQuotedString(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
}
export declare class ClassVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    statement: ClassStatement;
    properties: Record<string, [(Init extends true ? never : UnresolvedVariableType) | VariableType, ClassPropertyStatement]>;
    ownMethods: Record<string, ClassMethodData>;
    allMethods: Record<string, [source: ClassVariableType<Init>, data: ClassMethodData]>;
    propertyStatements: ClassPropertyStatement[];
    name: string;
    baseClass: ClassVariableType<Init> | null;
    constructor(initialized: Init, statement: ClassStatement, properties?: Record<string, [(Init extends true ? never : UnresolvedVariableType) | VariableType, ClassPropertyStatement]>, ownMethods?: Record<string, ClassMethodData>, allMethods?: Record<string, [source: ClassVariableType<Init>, data: ClassMethodData]>, propertyStatements?: ClassPropertyStatement[]);
    init(runtime: Runtime): void;
    fmtText(): string;
    fmtShort(): string;
    fmtPlain(): string;
    toQuotedString(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    inherits(other: ClassVariableType): boolean;
    construct(runtime: Runtime, args: RangeArray<ExpressionASTNode>): {
        properties: {
            [index: string]: string | number | boolean | Date | (string | number | boolean | Date | {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | VariableData<VariableType, null> | ConstantData<VariableType> | null)[] | any | VariableData<any, null> | ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            } | VariableData<VariableType, null> | ConstantData<VariableType> | null)[] | {
                [index: string]: string | number | boolean | Date | (string | number | boolean | Date | any | VariableData<VariableType, null> | ConstantData<VariableType> | null)[] | any | VariableData<any, null> | ConstantData<any> | (string | number | boolean | Date)[] | any | null;
            } | VariableData<any, null> | ConstantData<any> | (string | number | boolean | Date)[] | any | null;
        };
        type: ClassVariableType<true>;
    };
    getScope(runtime: Runtime, instance: VariableTypeMapping<ClassVariableType>): VariableScope;
}
export type UnresolvedVariableType = PrimitiveVariableType | ArrayVariableType<false> | ["unresolved", name: string, range: TextRange];
export type VariableType = PrimitiveVariableType<"INTEGER"> | PrimitiveVariableType<"REAL"> | PrimitiveVariableType<"STRING"> | PrimitiveVariableType<"CHAR"> | PrimitiveVariableType<"BOOLEAN"> | PrimitiveVariableType<"DATE"> | PrimitiveVariableType | ArrayVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType | SetVariableType | ClassVariableType;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType;
export type VariableValue = VariableTypeMapping<any>;
export declare const fileModes: readonly ["READ", "WRITE", "APPEND", "RANDOM"];
export type FileMode = typeof fileModes extends ReadonlyArray<infer T> ? T : never;
export declare function FileMode(input: string): FileMode;
export type File = {
    name: string;
    text: string;
};
export type OpenedFile = {
    file: File;
    mode: FileMode;
    openRange: TextRange;
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
export type OpenedFileOfType<T extends FileMode> = OpenedFile & {
    mode: T;
};
export type VariableData<T extends VariableType = VariableType, Uninitialized = null> = {
    type: T;
    value: VariableTypeMapping<T> | Uninitialized;
    declaration: DeclareStatement | FunctionStatement | ProcedureStatement | DefineStatement | "dynamic";
    mutable: true;
};
export type ConstantData<T extends VariableType = VariableType> = {
    type: T;
    value: VariableTypeMapping<T>;
    declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement;
    mutable: false;
};
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
    impl: (this: Runtime, ...args: (RangeAttached<BoxPrimitive<VariableValue>>)[]) => VariableValue;
};
export type ClassMethodStatement = ClassFunctionStatement | ClassProcedureStatement;
export type ClassMethodData = ProgramASTBranchNode & {
    nodeGroups: [body: ProgramASTNode[]];
} & ({
    type: "class_function";
    controlStatements: [start: ClassFunctionStatement, end: Statement];
} | {
    type: "class_procedure";
    controlStatements: [start: ClassProcedureStatement, end: Statement];
});
export type VariableScope = {
    statement: Statement | "global";
    opaque: boolean;
    variables: Record<string, VariableData | ConstantData>;
    types: Record<string, VariableType>;
};
