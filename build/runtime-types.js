import { crash, f, fail, impossible } from "./utils.js";
export class BaseVariableType {
    checkSize() { }
    is(...type) {
        return false;
    }
    fmtQuoted() {
        return `"${this.fmtText()}"`;
    }
}
export class PrimitiveVariableType extends BaseVariableType {
    constructor(name) {
        super();
        this.name = name;
        PrimitiveVariableType.all.push(this);
    }
    init(runtime) { impossible(); }
    fmtDebug() {
        return `PrimitiveVariableType ${this.name}`;
    }
    fmtText() {
        return this.name;
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
    static resolve(token) {
        return this.get(token.text) ?? ["unresolved", token.text, token.range];
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
PrimitiveVariableType.all = [];
PrimitiveVariableType.INTEGER = new PrimitiveVariableType("INTEGER");
PrimitiveVariableType.REAL = new PrimitiveVariableType("REAL");
PrimitiveVariableType.STRING = new PrimitiveVariableType("STRING");
PrimitiveVariableType.CHAR = new PrimitiveVariableType("CHAR");
PrimitiveVariableType.BOOLEAN = new PrimitiveVariableType("BOOLEAN");
PrimitiveVariableType.DATE = new PrimitiveVariableType("DATE");
export class ArrayVariableType extends BaseVariableType {
    constructor(lengthInformation, type) {
        super();
        this.lengthInformation = lengthInformation;
        this.type = type;
        this.totalLength = null;
        this.arraySizes = null;
        if (this.lengthInformation) {
            if (this.lengthInformation.some(b => b[1] < b[0]))
                fail(`Invalid length information: upper bound cannot be less than lower bound`);
            if (this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n))))
                fail(`Invalid length information: bound was not an integer`);
            this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
            this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
        }
    }
    init(runtime) {
        if (Array.isArray(this.type))
            this.type = runtime.resolveVariableType(this.type);
    }
    fmtText() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
        return f.text `ARRAY${rangeText} OF ${this.type ?? "ANY"}`;
    }
    fmtDebug() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
        return f.debug `ARRAY${rangeText} OF ${this.type ?? "ANY"}`;
    }
    getInitValue(runtime, requireInit) {
        if (!this.lengthInformation)
            fail(f.quote `${this} is not a valid variable type: length must be specified here`);
        if (!this.type)
            fail(f.quote `${this} is not a valid variable type: element type must be specified here`);
        const type = this.type;
        if (type instanceof ArrayVariableType)
            crash(`Attempted to initialize array of arrays`);
        return Array.from({ length: this.totalLength }, () => type.getInitValue(runtime, true));
    }
    static from(node) {
        return new ArrayVariableType(node.lengthInformation?.map(bounds => bounds.map(t => Number(t.text))) ?? null, PrimitiveVariableType.resolve(node.elementType));
    }
}
export class RecordVariableType extends BaseVariableType {
    constructor(initialized, name, fields) {
        super();
        this.initialized = initialized;
        this.name = name;
        this.fields = fields;
        this.directDependencies = new Set();
    }
    init(runtime) {
        for (const [name, field] of Object.entries(this.fields)) {
            if (Array.isArray(field))
                this.fields[name] = runtime.resolveVariableType(field);
            else if (field instanceof ArrayVariableType)
                field.init(runtime);
            this.addDependencies(this.fields[name]);
        }
        this.initialized = true;
    }
    addDependencies(type) {
        if (type instanceof RecordVariableType) {
            this.directDependencies.add(type);
            type.directDependencies.forEach(d => this.directDependencies.add(d));
        }
        else if (type instanceof ArrayVariableType && type.type != null) {
            this.addDependencies(type.type);
        }
    }
    checkSize() {
        for (const [name, type] of Object.entries(this.fields)) {
            if (type == this)
                fail(f.text `Recursive type "${this.name}" has infinite size: field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object\nhelp: change the field's type to be "pointer to ${this.name}"`);
            if (type instanceof ArrayVariableType && type.type == this)
                fail(f.text `Recursive type "${this.name}" has infinite size: field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object\nhelp: change the field's type to be "array of pointer to ${this.name}"`);
            if (type instanceof RecordVariableType && type.directDependencies.has(this))
                fail(f.quote `Recursive type ${this.name} has infinite size: initializing field ${name} indirectly requires initializing the parent type, which requires initializing the field again\nhelp: change the field's type to be a pointer`);
        }
    }
    fmtText() {
        return `${this.name} (user-defined record type)`;
    }
    fmtQuoted() {
        return `"${this.name}" (user-defined record type)`;
    }
    fmtDebug() {
        return `RecordVariableType [${this.name}] (fields: ${Object.keys(this.fields).join(", ")})`;
    }
    getInitValue(runtime, requireInit) {
        if (!this.initialized)
            crash(`Type not initialized`);
        return Object.fromEntries(Object.entries(this.fields)
            .map(([k, v]) => [k, v.getInitValue(runtime, false)]));
    }
}
export class PointerVariableType extends BaseVariableType {
    constructor(initialized, name, target) {
        super();
        this.initialized = initialized;
        this.name = name;
        this.target = target;
    }
    init(runtime) {
        if (Array.isArray(this.target))
            this.target = runtime.resolveVariableType(this.target);
        this.initialized = true;
    }
    fmtText() {
        return f.text `${this.name} (user-defined pointer type ^${this.target})`;
    }
    fmtQuoted() {
        return f.text `"${this.name}" (user-defined pointer type ^${this.target})`;
    }
    fmtDebug() {
        return f.debug `PointerVariableType [${this.name}] to "${this.target}"`;
    }
    getInitValue(runtime) {
        return null;
    }
}
export class EnumeratedVariableType extends BaseVariableType {
    constructor(name, values) {
        super();
        this.name = name;
        this.values = values;
    }
    init() { }
    fmtText() {
        return `${this.name} (user-defined enumerated type)`;
    }
    fmtQuoted() {
        return `"${this.name}" (user-defined enumerated type)`;
    }
    fmtDebug() {
        return f.debug `EnumeratedVariableType [${this.name}] (values: ${this.values.join(", ")})`;
    }
    getInitValue(runtime) {
        return null;
    }
}
export class SetVariableType extends BaseVariableType {
    constructor(initialized, name, baseType) {
        super();
        this.initialized = initialized;
        this.name = name;
        this.baseType = baseType;
    }
    init(runtime) {
        if (Array.isArray(this.baseType))
            this.baseType = runtime.resolveVariableType(this.baseType);
        this.initialized = true;
    }
    fmtText() {
        return f.text `${this.name} (user-defined set type containing "${this.baseType}")`;
    }
    toQuotedString() {
        return f.text `"${this.name}" (user-defined set type containing "${this.baseType}")`;
    }
    fmtDebug() {
        return f.debug `SetVariableType [${this.name}] (contains: ${this.baseType})`;
    }
    getInitValue(runtime) {
        fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`);
    }
}
export class ClassVariableType extends BaseVariableType {
    constructor(statement, properties = {}, ownMethods = {}, allMethods = {}) {
        super();
        this.statement = statement;
        this.properties = properties;
        this.ownMethods = ownMethods;
        this.allMethods = allMethods;
        this.name = this.statement.name.text;
        this.baseClass = null;
    }
    init() { }
    fmtText() {
        return f.text `${this.name} (user-defined class type)`;
    }
    fmtPlain() {
        return this.name;
    }
    toQuotedString() {
        return f.quote `"${this.name}" (user-defined class type)`;
    }
    fmtDebug() {
        return f.debug `ClassVariableType [${this.name}]`;
    }
    getInitValue(runtime) {
        return null;
    }
    inherits(other) {
        return this.baseClass != null && (other == this.baseClass || this.baseClass.inherits(other));
    }
    construct(runtime, args) {
        const data = {
            properties: Object.fromEntries(Object.entries(this.properties).map(([k, v]) => [k,
                runtime.resolveVariableType(v.varType).getInitValue(runtime, false)
            ])),
            type: this
        };
        const [clazz, method] = this.allMethods["NEW"] ?? fail(f.quote `No constructor was defined for class ${this.name}`);
        runtime.callClassMethod(method, clazz, data, args);
        return data;
    }
    getScope(runtime, instance) {
        return {
            statement: this.statement,
            types: {},
            variables: Object.fromEntries(Object.entries(this.properties).map(([k, v]) => [k, {
                    type: runtime.resolveVariableType(v.varType),
                    get value() { return instance.properties[k]; },
                    set value(value) { instance.properties[k] = value; },
                    declaration: v,
                    mutable: true,
                }]))
        };
    }
}
export const fileModes = ["READ", "WRITE", "APPEND", "RANDOM"];
export function FileMode(input) {
    if (fileModes.includes(input))
        return input;
    crash(`${input} is not a valid file mode`);
}
