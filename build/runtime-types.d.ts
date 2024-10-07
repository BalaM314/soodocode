import { Token } from "./lexer-types.js";
import type { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTNode, ExpressionASTRangeTypeNode, ProgramASTBranchNode, ProgramASTNodeGroup } from "./parser-types.js";
import { Runtime } from "./runtime.js";
import type { AssignmentStatement, BuiltinFunctionArguments, ClassPropertyStatement, ClassStatement, ConstantStatement, DeclareStatement, DefineStatement, ForStatement, FunctionStatement, ProcedureStatement, Statement } from "./statements.js";
import { ClassFunctionStatement, ClassProcedureStatement } from "./statements.js";
import type { BoxPrimitive, IFormattable, MaybePromise, RangeAttached, TextRange } from "./types.js";
import { RangeArray } from "./utils.js";
export type VariableTypeMapping<T> = T extends PrimitiveVariableType<infer U> ? (U extends "INTEGER" ? number : U extends "REAL" ? number : U extends "STRING" ? string : U extends "CHAR" ? string : U extends "BOOLEAN" ? boolean : U extends "DATE" ? Date : never) : T extends ArrayVariableType ? (Array<VariableTypeMapping<ArrayElementVariableType> | null> | Int32Array | Float64Array) : T extends IntegerRangeVariableType ? number : T extends RecordVariableType ? {
    [index: string]: VariableTypeMapping<any> | null;
} : T extends PointerVariableType ? VariableData<VariableType> | ConstantData<VariableType> : T extends EnumeratedVariableType ? string : T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> : T extends ClassVariableType ? {
    properties: {
        [index: string]: VariableTypeMapping<any> | null;
    };
    propertyTypes: Record<string, VariableType>;
    type: ClassVariableType;
} : never;
export declare const primitiveVariableTypeNames: readonly ["INTEGER", "REAL", "STRING", "CHAR", "BOOLEAN", "DATE"];
export type PrimitiveVariableTypeName = typeof primitiveVariableTypeNames extends ReadonlyArray<infer T> ? T : never;
export type PrimitiveVariableTypeMapping<T extends PrimitiveVariableTypeName> = T extends "INTEGER" ? number : T extends "REAL" ? number : T extends "STRING" ? string : T extends "CHAR" ? string : T extends "BOOLEAN" ? boolean : T extends "DATE" ? Date : never;
export type TypedValue<T extends VariableType = VariableType> = T extends unknown ? TypedValue_<T> : never;
export type { TypedValue_ };
declare class TypedValue_<T extends VariableType> {
    type: T;
    value: VariableTypeMapping<T>;
    constructor(type: T, value: VariableTypeMapping<T>);
    typeIs<Type extends typeof PrimitiveVariableType | typeof ArrayVariableType | typeof RecordVariableType | typeof PointerVariableType | typeof EnumeratedVariableType | typeof SetVariableType | typeof ClassVariableType>(clazz: Type): this is TypedValue_<Type["prototype"]>;
    typeIs<Type extends PrimitiveVariableTypeName>(type: Type): this is TypedValue_<PrimitiveVariableType<Type>>;
    asHTML(recursive: boolean): string;
    asString(): string;
}
export declare const TypedValue: { [N in PrimitiveVariableTypeName]: (value: VariableTypeMapping<PrimitiveVariableType<N>>) => TypedValue_<PrimitiveVariableType<N>>; };
export declare function typedValue<T extends VariableType>(type: T, value: VariableTypeMapping<T>): TypedValue;
export interface NodeValue {
    node: ExpressionASTNode;
    value: VariableValue | TypedValue | null | undefined;
    init(): MaybePromise<void>;
}
export declare class TypedNodeValue<T extends ExpressionASTNode = ExpressionASTNode, InputType extends PrimitiveVariableTypeName | VariableType = VariableType, Type extends VariableType = InputType extends PrimitiveVariableTypeName ? PrimitiveVariableType<InputType> : InputType> implements NodeValue {
    node: T;
    value: VariableTypeMapping<Type> | null | undefined;
    type: Type;
    range: TextRange;
    constructor(node: T, inputType: InputType, value?: VariableTypeMapping<Type> | null | undefined);
    init(): Promise<void>;
}
export declare class UntypedNodeValue<T extends ExpressionAST = ExpressionAST> implements NodeValue {
    node: T;
    constructor(node: T);
    range: TextRange;
    value: TypedValue | null | undefined;
    init(): Promise<void>;
}
export declare abstract class BaseVariableType implements IFormattable {
    abstract getInitValue(runtime: Runtime, requireInit: boolean): unknown;
    abstract init(runtime: Runtime): MaybePromise<void>;
    validate(runtime: Runtime): MaybePromise<void>;
    is(...type: PrimitiveVariableTypeName[]): boolean;
    abstract fmtDebug(): string;
    fmtQuoted(): string;
    abstract fmtText(): string;
}
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
export declare class IntegerRangeVariableType extends BaseVariableType {
    low: number;
    high: number;
    range: TextRange;
    constructor(low: number, high: number, range: TextRange);
    init(runtime: Runtime): void;
    possible(): boolean;
    getInitValue(runtime: Runtime, requireInit: boolean): number | null;
    fmtText(): string;
    fmtDebug(): string;
    asString(value: VariableTypeMapping<this>): string;
    asHTML(value: VariableTypeMapping<this>): string;
    overlaps(other: IntegerRangeVariableType): boolean;
    static from(node: ExpressionASTRangeTypeNode): IntegerRangeVariableType;
}
export declare class ArrayVariableType<Init extends boolean = true> extends BaseVariableType {
    lengthInformationExprs: [low: ExpressionAST, high: ExpressionAST][] | null;
    lengthInformationRange: TextRange | null;
    elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null;
    range: TextRange;
    totalLength: number | null;
    arraySizes: number[] | null;
    lengthInformation: [low: number, high: number][] | null;
    static maxLength: number;
    constructor(lengthInformationExprs: [low: ExpressionAST, high: ExpressionAST][] | null, lengthInformationRange: TextRange | null, elementType: (Init extends true ? never : UnresolvedVariableType) | VariableType | null, range: TextRange);
    init(runtime: Runtime): Promise<void>;
    validate(runtime: Runtime): void;
    clone(): ArrayVariableType<Init>;
    fmtText(): string;
    fmtShort(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime, requireInit: boolean): VariableTypeMapping<ArrayVariableType>;
    static from(node: ExpressionASTArrayTypeNode): ArrayVariableType<false>;
    mapValues<T>(value: VariableTypeMapping<ArrayVariableType>, callback: (tval: TypedValue | null) => T): T[];
    asHTML(value: VariableTypeMapping<ArrayVariableType>, recursive: boolean): string;
    asString(value: VariableTypeMapping<ArrayVariableType>): string;
}
export declare class RecordVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    name: string;
    fields: Record<string, [type: (Init extends true ? never : UnresolvedVariableType) | VariableType, range: TextRange]>;
    directDependencies: Set<VariableType<true>>;
    constructor(initialized: Init, name: string, fields: Record<string, [type: (Init extends true ? never : UnresolvedVariableType) | VariableType, range: TextRange]>);
    init(runtime: Runtime): Promise<void>;
    addDependencies(type: VariableType): void;
    validate(): void;
    fmtText(): string;
    fmtShort(): string;
    fmtQuoted(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime, requireInit: boolean): VariableValue | null;
    iterate<T>(value: VariableTypeMapping<RecordVariableType>, callback: (tval: TypedValue | null, name: string, range: TextRange) => T): T[];
    asHTML(value: VariableTypeMapping<RecordVariableType>): string;
    asString(value: VariableTypeMapping<RecordVariableType>): string;
}
export declare class PointerVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    name: string;
    target: (Init extends true ? never : UnresolvedVariableType) | VariableType;
    range: TextRange;
    constructor(initialized: Init, name: string, target: (Init extends true ? never : UnresolvedVariableType) | VariableType, range: TextRange);
    init(runtime: Runtime): Promise<void>;
    validate(): void;
    static isInfinite(type: PointerVariableType, seen?: Set<PointerVariableType<true>>): boolean;
    fmtText(): string;
    fmtShort(): string;
    fmtQuoted(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    asHTML(value: VariableValue): string;
    asString(value: VariableValue): string;
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
    asHTML(value: VariableTypeMapping<EnumeratedVariableType>): string;
    asString(value: VariableTypeMapping<EnumeratedVariableType>): string;
}
export declare class SetVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    name: string;
    baseType: (Init extends true ? never : UnresolvedVariableType) | VariableType;
    constructor(initialized: Init, name: string, baseType: (Init extends true ? never : UnresolvedVariableType) | VariableType);
    init(runtime: Runtime): Promise<void>;
    fmtText(): string;
    fmtShort(): string;
    toQuotedString(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    mapValues<T>(value: VariableTypeMapping<SetVariableType>, callback: (tval: TypedValue) => T): T[];
    asHTML(value: VariableTypeMapping<SetVariableType>): string;
    asString(value: VariableTypeMapping<SetVariableType>): string;
}
export declare class ClassVariableType<Init extends boolean = true> extends BaseVariableType {
    initialized: Init;
    statement: ClassStatement;
    properties: Record<string, [(Init extends true ? never : UnresolvedVariableType) | VariableType, ClassPropertyStatement]>;
    ownMethods: Record<string, ClassMethodData>;
    allMethods: Record<string, [source: ClassVariableType<Init extends true ? true : boolean>, data: ClassMethodData]>;
    propertyStatements: ClassPropertyStatement[];
    name: string;
    baseClass: ClassVariableType<Init extends true ? true : boolean> | null;
    constructor(initialized: Init, statement: ClassStatement, properties?: Record<string, [(Init extends true ? never : UnresolvedVariableType) | VariableType, ClassPropertyStatement]>, ownMethods?: Record<string, ClassMethodData>, allMethods?: Record<string, [source: ClassVariableType<Init extends true ? true : boolean>, data: ClassMethodData]>, propertyStatements?: ClassPropertyStatement[]);
    init(runtime: Runtime): Promise<void>;
    fmtText(): string;
    fmtShort(): string;
    fmtPlain(): string;
    toQuotedString(): string;
    fmtDebug(): string;
    getInitValue(runtime: Runtime): VariableValue | null;
    validate(runtime: Runtime): Promise<void>;
    getPropertyType(property: string, x: VariableTypeMapping<ClassVariableType>): VariableType;
    inherits(other: ClassVariableType): boolean;
    construct(runtime: Runtime, args: RangeArray<ExpressionASTNode>): Promise<{
        properties: {
            [index: string]: VariableTypeMapping<any> | null;
        };
        propertyTypes: Record<string, VariableType>;
        type: ClassVariableType;
    }>;
    getScope(runtime: Runtime, instance: VariableTypeMapping<ClassVariableType>): VariableScope;
    iterateProperties<T>(value: VariableTypeMapping<ClassVariableType>, callback: (tval: TypedValue | null, name: string, statement: ClassPropertyStatement) => T): T[];
    asHTML(value: VariableTypeMapping<ClassVariableType>): string;
    asString(value: VariableTypeMapping<ClassVariableType>): string;
}
export declare function typesEqual(a: VariableType | UnresolvedVariableType, b: VariableType | UnresolvedVariableType, types?: [VariableType<true>, VariableType<true>][]): boolean;
export declare function typesAssignable(base: VariableType, ext: VariableType): true | string;
export declare function typesAssignable(base: UnresolvedVariableType, ext: UnresolvedVariableType): true | string;
export declare const checkClassMethodsCompatible: (runtime: Runtime, base: ClassMethodStatement, derived: ClassMethodStatement) => Promise<void>;
export type UnresolvedVariableType = PrimitiveVariableType | IntegerRangeVariableType | ArrayVariableType<false> | ["unresolved", name: string, range: TextRange];
export type VariableType<Init extends boolean = true> = PrimitiveVariableType<"INTEGER"> | PrimitiveVariableType<"REAL"> | PrimitiveVariableType<"STRING"> | PrimitiveVariableType<"CHAR"> | PrimitiveVariableType<"BOOLEAN"> | PrimitiveVariableType<"DATE"> | PrimitiveVariableType | IntegerRangeVariableType | ArrayVariableType<Init> | RecordVariableType<Init> | PointerVariableType<Init> | EnumeratedVariableType | SetVariableType<Init> | ClassVariableType<Init>;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType | ClassVariableType;
export type VariableValue = VariableTypeMapping<any>;
export declare const fileModes: readonly ["READ", "WRITE", "APPEND", "RANDOM"];
export type FileMode = typeof fileModes extends ReadonlyArray<infer T> ? T : never;
export declare function FileMode(input: string): FileMode;
export type File = {
    readonly name: string;
    readonly text: string;
};
export type OpenedFile = {
    readonly name: string;
    readonly mode: FileMode;
    readonly openRange: TextRange;
    text: string;
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
    assignabilityType?: T;
    updateType?: (type: VariableType) => unknown;
    value: VariableTypeMapping<T> | Uninitialized;
    declaration: DeclareStatement | FunctionStatement | ProcedureStatement | DefineStatement | AssignmentStatement | "dynamic";
    mutable: true;
};
export type ConstantData<T extends VariableType = VariableType> = {
    type: T;
    value: VariableTypeMapping<T>;
    declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement;
    mutable: false;
};
export type FunctionData<T extends "function" | "procedure" = "function" | "procedure"> = (T extends unknown ? ProgramASTBranchNode<T> : never) & {
    nodeGroups: [body: ProgramASTNodeGroup];
};
export type BuiltinFunctionData = {
    args: BuiltinFunctionArguments;
    returnType: VariableType | null;
    name: string;
    impl: (this: Runtime, ...args: (RangeAttached<BoxPrimitive<VariableValue>>)[]) => VariableValue;
    aliases: string[];
};
export type ClassMethodStatement = ClassFunctionStatement | ClassProcedureStatement;
export type ClassMethodData = ProgramASTBranchNode & {
    nodeGroups: [body: ProgramASTNodeGroup];
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
