import { configs } from "./config.js";
import { ClassFunctionStatement } from "./statements.js";
import { crash, errorBoundary, f, fail, getTotalRange, impossible, zip } from "./utils.js";
export class BaseVariableType {
    validate(runtime) { }
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
    fmtShort() {
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
                INTEGER: configs.default_values.INTEGER.value,
                REAL: configs.default_values.REAL.value,
                STRING: configs.default_values.STRING.value,
                CHAR: configs.default_values.CHAR.value,
                BOOLEAN: configs.default_values.BOOLEAN.value,
                DATE: new Date(configs.default_values.DATE.value),
            }[this.name];
        else
            return null;
    }
    asString(value) {
        switch (this.name) {
            case "CHAR":
            case "STRING":
            case "INTEGER":
            case "REAL":
                return value.toString();
            case "BOOLEAN":
                return value.toString().toUpperCase();
            case "DATE":
                return value.toLocaleDateString("en-GB");
            default: impossible();
        }
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
    constructor(lengthInformationExprs, lengthInformationRange, elementType, range) {
        super();
        this.lengthInformationExprs = lengthInformationExprs;
        this.lengthInformationRange = lengthInformationRange;
        this.elementType = elementType;
        this.range = range;
        this.totalLength = null;
        this.arraySizes = null;
        this.lengthInformation = null;
    }
    init(runtime) {
        if (Array.isArray(this.elementType))
            this.elementType = runtime.resolveVariableType(this.elementType);
        if (this.lengthInformationExprs) {
            this.lengthInformation = new Array(this.lengthInformationExprs.length);
            for (const [i, [low_, high_]] of this.lengthInformationExprs.entries()) {
                const low = runtime.evaluateExpr(low_, PrimitiveVariableType.INTEGER)[1];
                const high = runtime.evaluateExpr(high_, PrimitiveVariableType.INTEGER)[1];
                if (high < low)
                    fail(`Invalid length information: upper bound cannot be less than lower bound`, high_);
                this.lengthInformation[i] = [low, high];
            }
            this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
            this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
        }
        else if (!configs.arrays.unspecified_length.value)
            fail(`Please specify the length of the array\n${configs.arrays.unspecified_length.errorHelp}`, this.range);
    }
    clone() {
        const type = new ArrayVariableType(this.lengthInformationExprs, this.lengthInformationRange, this.elementType, this.range);
        type.lengthInformation = this.lengthInformation;
        type.arraySizes = this.arraySizes;
        type.totalLength = this.totalLength;
        return type;
    }
    fmtText() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
        return f.text `ARRAY${rangeText} OF ${this.elementType ?? "ANY"}`;
    }
    fmtShort() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
        return f.text `ARRAY${rangeText} OF ${this.elementType ?? "ANY"}`;
    }
    fmtDebug() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}]` : "";
        return f.debug `ARRAY${rangeText} OF ${this.elementType ?? "ANY"}`;
    }
    getInitValue(runtime, requireInit) {
        if (!this.lengthInformation)
            fail(f.quote `${this} is not a valid variable type: length must be specified here`, undefined);
        if (!this.elementType)
            fail(f.quote `${this} is not a valid variable type: element type must be specified here`, undefined);
        const type = this.elementType;
        if (type instanceof ArrayVariableType)
            crash(`Attempted to initialize array of arrays`);
        return Array.from({ length: this.totalLength }, () => type.getInitValue(runtime, configs.initialization.arrays_default.value));
    }
    static from(node) {
        return new ArrayVariableType(node.lengthInformation, node.lengthInformation ? getTotalRange(node.lengthInformation.flat()) : null, PrimitiveVariableType.resolve(node.elementType), node.range);
    }
    asString(value) {
        return `[${value.map(v => this.elementType.asString(v)).join(", ")}]`;
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
        for (const [name, [field, range]] of Object.entries(this.fields)) {
            if (Array.isArray(field))
                this.fields[name][0] = runtime.resolveVariableType(field);
            else if (field instanceof ArrayVariableType)
                field.init(runtime);
            this.addDependencies(this.fields[name][0]);
        }
        this.initialized = true;
    }
    addDependencies(type) {
        if (type instanceof RecordVariableType) {
            this.directDependencies.add(type);
            type.directDependencies.forEach(d => this.directDependencies.add(d));
        }
        else if (type instanceof ArrayVariableType && type.elementType != null) {
            this.addDependencies(type.elementType);
        }
    }
    validate() {
        for (const [name, [type, range]] of Object.entries(this.fields)) {
            if (type == this)
                fail(f.text `Recursive type "${this.name}" has infinite size: field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object\nhelp: change the field's type to be "pointer to ${this.name}"`, range);
            if (type instanceof ArrayVariableType && type.elementType == this)
                fail(f.text `Recursive type "${this.name}" has infinite size: field "${name}" immediately references the parent type, so initializing it would require creating an infinitely large object\nhelp: change the field's type to be "array of pointer to ${this.name}"`, range);
            if (type instanceof RecordVariableType && type.directDependencies.has(this))
                fail(f.quote `Recursive type ${this.name} has infinite size: initializing field ${name} indirectly requires initializing the parent type, which requires initializing the field again\nhelp: change the field's type to be a pointer`, range);
        }
    }
    fmtText() {
        return `${this.name} (user-defined record type)`;
    }
    fmtShort() {
        return this.name;
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
            .map(([k, [v, r]]) => [k, v.getInitValue(runtime, false)]));
    }
    asString(value) {
        fail(`Outputting record type instances is not yet implemented`, undefined);
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
        return f.short `${this.name} (user-defined pointer type ^${this.target})`;
    }
    fmtShort() {
        return this.name;
    }
    fmtQuoted() {
        return f.short `"${this.name}" (user-defined pointer type ^${this.target})`;
    }
    fmtDebug() {
        return f.short `PointerVariableType [${this.name}] to "${this.target}"`;
    }
    getInitValue(runtime) {
        return null;
    }
    asString(value) {
        return "pointer";
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
    fmtShort() {
        return this.name;
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
    asString(value) {
        return value;
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
    fmtShort() {
        return this.name;
    }
    toQuotedString() {
        return f.text `"${this.name}" (user-defined set type containing "${this.baseType}")`;
    }
    fmtDebug() {
        return f.debug `SetVariableType [${this.name}] (contains: ${this.baseType})`;
    }
    getInitValue(runtime) {
        crash(`Cannot initialize a variable of type SET`);
    }
    asString(value) {
        return `[${value.map(v => this.baseType.asString(v)).join(", ")}]`;
    }
}
export class ClassVariableType extends BaseVariableType {
    constructor(initialized, statement, properties = {}, ownMethods = {}, allMethods = {}, propertyStatements = []) {
        super();
        this.initialized = initialized;
        this.statement = statement;
        this.properties = properties;
        this.ownMethods = ownMethods;
        this.allMethods = allMethods;
        this.propertyStatements = propertyStatements;
        this.name = this.statement.name.text;
        this.baseClass = null;
    }
    init(runtime) {
        for (const statement of this.propertyStatements) {
            const type = runtime.resolveVariableType(statement.varType);
            for (const [name] of statement.variables) {
                this.properties[name][0] = type;
            }
        }
        this.initialized = true;
    }
    fmtText() {
        return f.text `${this.name} (user-defined class type)`;
    }
    fmtShort() {
        return this.name;
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
    validate(runtime) {
        if (this.baseClass) {
            for (const name of Object.keys(this.baseClass.allMethods)) {
                if (this.ownMethods[name]) {
                    checkClassMethodsCompatible(runtime, this.baseClass.allMethods[name][1].controlStatements[0], this.ownMethods[name].controlStatements[0]);
                }
            }
        }
    }
    getPropertyType(property, x) {
        if (!(this.properties[property]))
            crash(`Property ${property} does not exist`);
        return x.propertyTypes[property] ?? this.properties[property][0];
    }
    inherits(other) {
        return this.baseClass != null && (other == this.baseClass || this.baseClass.inherits(other));
    }
    construct(runtime, args) {
        const This = this;
        const propertiesInitializer = {};
        Object.defineProperties(propertiesInitializer, Object.fromEntries(Object.entries(This.properties).map(([k, v]) => [k, {
                enumerable: true,
                configurable: true,
                get() {
                    const value = v[0].getInitValue(runtime, false);
                    Object.defineProperty(propertiesObj, k, {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value,
                    });
                    return value;
                },
                set(val) {
                    Object.defineProperty(propertiesObj, k, {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: val,
                    });
                },
            }])));
        const propertiesObj = Object.create(propertiesInitializer);
        const data = {
            properties: propertiesObj,
            propertyTypes: {},
            type: This
        };
        const [clazz, method] = This.allMethods["NEW"]
            ?? fail(f.quote `No constructor was defined for class ${this.name}`, this.statement);
        runtime.callClassMethod(method, clazz, data, args);
        for (const key of Object.keys(This.properties)) {
            void propertiesObj[key];
        }
        Object.setPrototypeOf(propertiesObj, Object.prototype);
        return data;
    }
    getScope(runtime, instance) {
        return {
            statement: this.statement,
            opaque: true,
            types: {},
            variables: Object.fromEntries(Object.entries(this.properties).map(([k, v]) => [k, {
                    type: instance.propertyTypes[k] ?? v[0],
                    assignabilityType: v[0],
                    updateType(type) {
                        if (v[0] instanceof ArrayVariableType && !v[0].lengthInformation) {
                            instance.propertyTypes[k] = type;
                        }
                    },
                    get value() { return instance.properties[k]; },
                    set value(value) { instance.properties[k] = value; },
                    declaration: v[1],
                    mutable: true,
                }]))
        };
    }
    asString(value) {
        return `${this.name} { NOT_YET_IMPLEMENTED }`;
    }
}
export function typesEqual(a, b, types = new Array()) {
    return a == b ||
        (Array.isArray(a) && Array.isArray(b) && a[1] == b[1]) ||
        (a instanceof ArrayVariableType && b instanceof ArrayVariableType && a.arraySizes?.toString() == b.arraySizes?.toString() && (a.elementType == b.elementType ||
            Array.isArray(a.elementType) && Array.isArray(b.elementType) && a.elementType[1] == b.elementType[1])) ||
        (a instanceof PointerVariableType && b instanceof PointerVariableType && (types.some(([_a, _b]) => a == _a && b == _b) ||
            typesEqual(a.target, b.target, types.concat([[a, b]])))) ||
        (a instanceof SetVariableType && b instanceof SetVariableType && a.baseType == b.baseType);
}
export function typesAssignable(base, ext) {
    if (base == ext)
        return true;
    if (Array.isArray(base) && Array.isArray(ext))
        return base[1] == ext[1] || "";
    if (base instanceof ArrayVariableType && ext instanceof ArrayVariableType) {
        if (base.elementType != null) {
            if (ext.elementType == null)
                return f.quote `Type "ANY" is not assignable to type ${base.elementType}`;
            if (!typesEqual(base.elementType, ext.elementType))
                return f.quote `Types ${base.elementType} and ${ext.elementType} are not equal`;
        }
        if (base.lengthInformation != null) {
            if (ext.lengthInformation == null)
                return `cannot assign an array with unknown length to an array requiring a specific length`;
            if (configs.coercion.arrays_same_length.value) {
                if (base.arraySizes.toString() != ext.arraySizes.toString())
                    return "these array types have different lengths";
            }
            else {
                if (base.lengthInformation.toString() != ext.lengthInformation.toString()) {
                    if (base.arraySizes.toString() == ext.arraySizes.toString())
                        return `these array types have different start and end indexes\n${configs.coercion.arrays_same_length.errorHelp}`;
                    return "theses array types have different lengths";
                }
            }
        }
        return true;
    }
    if (base instanceof PointerVariableType && ext instanceof PointerVariableType) {
        return typesEqual(base.target, ext.target) || f.quote `Types ${base.target} and ${ext.target} are not equal`;
    }
    if (base instanceof SetVariableType && ext instanceof SetVariableType) {
        return typesEqual(base.baseType, ext.baseType) || f.quote `Types ${base.baseType} and ${ext.baseType} are not equal`;
    }
    if (base instanceof ClassVariableType && ext instanceof ClassVariableType) {
        return ext.inherits(base) || "";
    }
    return "";
}
export const checkClassMethodsCompatible = errorBoundary({
    message: (base, derived) => `Derived class method ${derived.name} is not compatible with the same method in the base class: `,
})(function _checkClassMethodsCompatible(runtime, base, derived) {
    if (base.accessModifier != derived.accessModifier)
        fail(f.text `Method was ${base.accessModifier} in base class, cannot override it with a ${derived.accessModifier} method`, derived.accessModifierToken);
    if (base.stype != derived.stype)
        fail(f.text `Method was a ${base.stype.split("_")[1]} in base class, cannot override it with a ${derived.stype.split("_")[1]}`, derived.methodKeywordToken);
    if (!(base.name == "NEW" && derived.name == "NEW")) {
        if (base.args.size != derived.args.size)
            fail(`Method should have ${base.args.size} parameter${base.args.size == 1 ? "" : "s"}, but it has ${derived.args.size} parameter${derived.args.size == 1 ? "" : "s"}.`, derived.argsRange);
        for (const [[aName, aType], [bName, bType]] of zip(base.args.entries(), derived.args.entries())) {
            let result;
            if ((result = typesAssignable(runtime.resolveVariableType(bType.type), runtime.resolveVariableType(aType.type))) != true)
                fail(f.quote `Argument ${bName} in derived class is not assignable to argument ${aName} in base class: type ${aType.type} is not assignable to type ${bType.type}` + (result ? `: ${result}.` : ""), derived.argsRange);
            if (aType.passMode != bType.passMode)
                fail(f.quote `Argument ${bName} in derived class is not assignable to argument ${aName} in base class because their pass modes are different.`, derived.argsRange);
        }
    }
    if (base instanceof ClassFunctionStatement && derived instanceof ClassFunctionStatement) {
        let result;
        if ((result = typesAssignable(runtime.resolveVariableType(base.returnType), runtime.resolveVariableType(derived.returnType))) != true)
            fail(f.quote `Return type ${derived.returnType} is not assignable to ${base.returnType}` + (result ? `: ${result}.` : ""), derived.returnTypeToken);
    }
});
export const fileModes = ["READ", "WRITE", "APPEND", "RANDOM"];
export function FileMode(input) {
    if (fileModes.includes(input))
        return input;
    crash(`${input} is not a valid file mode`);
}
