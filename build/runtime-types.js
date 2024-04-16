/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the runtime, such as the variable types and associated utility types.
*/
import { fail, crash, fquote } from "./utils.js";
export class PrimitiveVariableType {
    constructor(name) {
        this.name = name;
    }
    is(...type) {
        return type.includes(this.name);
    }
    static valid(input) {
        return input == "INTEGER" || input == "REAL" || input == "STRING" || input == "CHAR" || input == "BOOLEAN" || input == "DATE";
    }
    static get(type) {
        return this.valid(type) ? this[type] : undefined;
    }
    static resolve(type) {
        return this.get(type) ?? ["unresolved", type];
    }
    getInitValue(runtime, requireInit) {
        if (requireInit)
            return {
                INTEGER: 0,
                REAL: 0,
                STRING: "",
                CHAR: '',
                BOOLEAN: false,
                DATE: new Date()
            }[this.name];
        else
            return null;
    }
}
PrimitiveVariableType.INTEGER = new PrimitiveVariableType("INTEGER");
PrimitiveVariableType.REAL = new PrimitiveVariableType("REAL");
PrimitiveVariableType.STRING = new PrimitiveVariableType("STRING");
PrimitiveVariableType.CHAR = new PrimitiveVariableType("CHAR");
PrimitiveVariableType.BOOLEAN = new PrimitiveVariableType("BOOLEAN");
PrimitiveVariableType.DATE = new PrimitiveVariableType("DATE");
/** Contains data about an array type. Processed from an ExpressionASTArrayTypeNode. */
export class ArrayVariableType {
    constructor(lengthInformation, type) {
        this.lengthInformation = lengthInformation;
        this.type = type;
        if (this.lengthInformation.some(b => b[1] < b[0]))
            fail(`Invalid length information: upper bound cannot be less than lower bound`);
        if (this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n))))
            fail(`Invalid length information: bound was not an integer`);
        this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
        this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
    }
    toString() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
    }
    toQuotedString() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
    }
    getInitValue(runtime, requireInit) {
        const type = runtime.resolveVariableType(this.type);
        if (type instanceof ArrayVariableType)
            crash(`Attempted to initialize array of arrays`);
        return Array.from({ length: this.totalLength }, () => type.getInitValue(runtime, true));
    }
    is(...type) { return false; }
}
export class RecordVariableType {
    constructor(name, fields) {
        this.name = name;
        this.fields = fields;
    }
    toString() {
        return `${this.name} (user-defined record type)`;
    }
    toQuotedString() {
        return fquote `${this.name} (user-defined record type)`;
    }
    getInitValue(runtime, requireInit) {
        return Object.fromEntries(Object.entries(this.fields).map(([k, v]) => [k, v]).map(([k, v]) => [k,
            typeof v == "string" ? null : v.getInitValue(runtime, false)
        ]));
    }
    is(...type) { return false; }
}
export class PointerVariableType {
    constructor(name, target) {
        this.name = name;
        this.target = target;
    }
    toString() {
        return `${this.name} (user-defined pointer type ^${this.target})`;
    }
    toQuotedString() {
        return fquote `${this.name} (user-defined pointer type ^${this.target})`;
    }
    getInitValue(runtime) {
        return null;
    }
    is(...type) { return false; }
}
export class EnumeratedVariableType {
    constructor(name, values) {
        this.name = name;
        this.values = values;
    }
    toString() {
        return `${this.name} (user-defined enumerated type)`;
    }
    toQuotedString() {
        return fquote `${this.name} (user-defined enumerated type)`;
    }
    getInitValue(runtime) {
        return null;
    }
    is(...type) { return false; }
}
export class SetVariableType {
    constructor(name, baseType) {
        this.name = name;
        this.baseType = baseType;
    }
    toString() {
        return `${this.name} (user-defined set type containing ${this.baseType})`;
    }
    toQuotedString() {
        return fquote `${this.name} (user-defined set type containing ${this.baseType})`;
    }
    getInitValue(runtime) {
        fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`);
    }
    is(...type) { return false; }
}
export function typesEqual(a, b) {
    return a == b ||
        (a instanceof ArrayVariableType && b instanceof ArrayVariableType && a.arraySizes.toString() == b.arraySizes.toString() && (a.type == b.type ||
            Array.isArray(a.type) && Array.isArray(b.type) && a.type[1] == b.type[1])) ||
        (a instanceof PointerVariableType && b instanceof PointerVariableType && typesEqual(a.target, b.target)) ||
        (a instanceof SetVariableType && b instanceof SetVariableType && a.baseType == b.baseType);
}
