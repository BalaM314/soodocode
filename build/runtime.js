var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { getBuiltinFunctions } from "./builtin_functions.js";
import { configs } from "./config.js";
import { BrowserFileSystem } from "./files.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ProgramASTBranchNode, operators } from "./parser-types.js";
import { ArrayVariableType, ClassVariableType, EnumeratedVariableType, IntegerRangeVariableType, PointerVariableType, PrimitiveVariableType, RecordVariableType, SetVariableType, TypedValue, typedValue, typesAssignable, typesEqual } from "./runtime-types.js";
import { ClassFunctionStatement, ClassProcedureStatement, ClassStatement, ConstantStatement, FunctionStatement, ProcedureStatement, Statement, TypeStatement } from "./statements.js";
import { biasedLevenshtein, boxPrimitive, crash, errorBoundary, f, fail, forceType, groupArray, impossible, min, rethrow, shallowCloneOwnProperties, tryRun, tryRunOr, zip } from "./utils.js";
function checkTypeMatch(a, b, range) {
    if (typesEqual(a, b))
        return true;
    if ((a.is("INTEGER") && b instanceof IntegerRangeVariableType) || (a instanceof IntegerRangeVariableType && b.is("INTEGER")))
        return true;
    const errorSummary = f.quote `Cannot test for equality between types ${a} and ${b}`;
    let elaboration = undefined;
    if (a instanceof IntegerRangeVariableType && b instanceof IntegerRangeVariableType) {
        if (a.overlaps(b))
            return true;
        else if (!configs.equality_checks.allow_different_types.value)
            elaboration = `the comparison will always return FALSE because the types do not overlap`;
    }
    if ((a.is("INTEGER") && b.is("REAL")) || (b.is("REAL") && a.is("INTEGER"))) {
        if (configs.equality_checks.coerce_int_real.value)
            return true;
        else if (!configs.equality_checks.allow_different_types.value)
            fail({
                summary: errorSummary,
                help: {
                    config: configs.equality_checks.coerce_int_real,
                    value: true,
                }
            }, range);
    }
    if ((a.is("STRING") && b.is("CHAR")) || (b.is("CHAR") && a.is("STRING"))) {
        if (configs.equality_checks.coerce_string_char.value)
            return true;
        else if (!configs.equality_checks.allow_different_types.value)
            fail({
                summary: errorSummary,
                help: {
                    config: configs.equality_checks.coerce_string_char,
                    value: true,
                }
            }, range);
    }
    if (a instanceof ArrayVariableType && b instanceof ArrayVariableType &&
        checkTypeMatch(a.elementType, b.elementType, range)) {
        if (configs.equality_checks.coerce_arrays.value)
            return true;
        else if (!configs.equality_checks.allow_different_types.value)
            fail({
                summary: errorSummary,
                elaboration: `these types have different lengths`,
                help: {
                    config: configs.equality_checks.coerce_arrays,
                    value: true
                }
            }, range);
    }
    if (!configs.equality_checks.allow_different_types.value)
        fail({
            summary: errorSummary,
            elaboration,
            help: {
                message: `to make this comparison always return FALSE`,
                config: configs.equality_checks.allow_different_types,
                value: true
            }
        }, range);
    return false;
}
function checkValueEquality(type, a, b, aPath, bPath, range) {
    if (a === null && b === null)
        return true;
    if (a === null || b === null)
        return false;
    if (type instanceof PrimitiveVariableType || type instanceof IntegerRangeVariableType)
        return a == b;
    if (type instanceof ClassVariableType)
        return a == b;
    if (type instanceof PointerVariableType)
        return a == b;
    if (type instanceof EnumeratedVariableType)
        return a == b;
    if (type instanceof SetVariableType) {
        forceType(a);
        forceType(b);
        return a.length == b.length &&
            [...zip(a.values(), b.values())].every(([aElement, bElement], i) => checkValueEquality(type.baseType, aElement, bElement, `${aPath}[${i}]`, `${bPath}[${i}]`, range));
    }
    if (type instanceof ArrayVariableType) {
        forceType(a);
        forceType(b);
        return a.length == b.length &&
            [...zip(a.values(), b.values())].every(([aElement, bElement], i) => checkValueEquality(type.elementType, aElement, bElement, `${aPath}[${i}]`, `${bPath}[${i}]`, range));
    }
    if (type instanceof RecordVariableType) {
        forceType(a);
        forceType(b);
        return Object.entries(type.fields).every(([name, [type, range]]) => checkValueEquality(type, a[name], b[name], `${aPath}.${name}`, `${bPath}.${name}`, range));
    }
    return false;
}
function coerceValue(value, from, to, range) {
    let assignabilityError;
    if ((assignabilityError = typesAssignable(to, from)) === true)
        return value;
    let disabledConfig = null;
    let helpMessage = null;
    if (from.isInteger() && to.is("REAL", "INTEGER"))
        return value;
    if (from.is("REAL") && to.is("INTEGER")) {
        forceType(value);
        if (configs.coercion.real_to_int.value) {
            if (Number.isInteger(value))
                return value;
            else if (configs.coercion.truncate_real_to_int.value)
                return Math.trunc(value);
            else {
                assignabilityError = `the number ${value} is not an integer`;
            }
        }
        else
            disabledConfig = configs.coercion.real_to_int;
    }
    if (from.is("STRING") && to.is("CHAR")) {
        if (configs.coercion.string_to_char.value) {
            const v = value;
            if (v.length == 1)
                return v;
            else
                assignabilityError = f.quote `the length of the string ${v} is not 1`;
        }
        else
            disabledConfig = configs.coercion.string_to_char;
    }
    if (to.is("STRING")) {
        if (from.is("BOOLEAN")) {
            if (configs.coercion.booleans_to_string.value)
                return value.toString().toUpperCase();
            else
                disabledConfig = configs.coercion.booleans_to_string;
        }
        else if (from.isInteger() || from.is("REAL")) {
            if (configs.coercion.numbers_to_string.value)
                return value.toString();
            else
                disabledConfig = configs.coercion.numbers_to_string;
        }
        else if (from.is("CHAR")) {
            if (configs.coercion.char_to_string.value)
                return value.toString();
            else
                disabledConfig = configs.coercion.char_to_string;
        }
        else if (from.is("DATE")) {
            if (configs.coercion.numbers_to_string.value)
                return value.toString();
            else
                disabledConfig = configs.coercion.numbers_to_string;
        }
        else if (from instanceof ArrayVariableType) {
            if (configs.coercion.arrays_to_string.value) {
                if (from.elementType instanceof PrimitiveVariableType || from.elementType instanceof EnumeratedVariableType) {
                    null;
                    return `[${value.join(",")}]`;
                }
                else
                    assignabilityError = `the type of the elements in the array does not support coercion to string`;
            }
            else
                disabledConfig = configs.coercion.arrays_to_string;
        }
        else if (from instanceof EnumeratedVariableType) {
            if (configs.coercion.enums_to_string.value)
                return value;
            else
                disabledConfig = configs.coercion.enums_to_string;
        }
    }
    if ((from.isInteger() || from.is("REAL")) && to.is("BOOLEAN"))
        helpMessage = `to check if this number is non-zero, add "\xA0<>\xA00" after this expression`;
    if (from instanceof EnumeratedVariableType && (to.is("INTEGER") || to.is("REAL"))) {
        if (configs.coercion.enums_to_integer.value)
            return from.values.indexOf(value);
        else
            disabledConfig = configs.coercion.enums_to_integer;
    }
    if (to instanceof IntegerRangeVariableType && from.is("INTEGER", "REAL")) {
        const v = value;
        if (Number.isInteger(v)) {
            if (to.low <= v && v <= to.high)
                return v;
            else
                assignabilityError = f.quote `Value ${v} is not in range ${to}`;
        }
        else
            assignabilityError = f.quote `Value ${v} is not an integer`;
    }
    fail({
        summary: f.quote `Cannot coerce value of type ${from} to ${to}`,
        elaboration: assignabilityError,
        help: disabledConfig ? {
            config: disabledConfig,
            value: true
        } : (helpMessage ?? undefined)
    }, range);
}
function finishEvaluation(value, from, to) {
    if (to && to instanceof ArrayVariableType && (!to.lengthInformation || !to.elementType))
        return typedValue(from, coerceValue(value, from, to));
    else if (to)
        return typedValue(to, coerceValue(value, from, to));
    else
        return typedValue(from, value);
}
let Runtime = (() => {
    var _a;
    let _instanceExtraInitializers = [];
    let _processArrayAccess_decorators;
    let _processRecordAccess_decorators;
    let _evaluateExpr_decorators;
    return _a = class Runtime {
            constructor(_input, _output, fs = new BrowserFileSystem(false)) {
                this._input = (__runInitializers(this, _instanceExtraInitializers), _input);
                this._output = _output;
                this.fs = fs;
                this.scopes = [];
                this.functions = Object.create(null);
                this.openFiles = Object.create(null);
                this.classData = null;
                this.currentlyResolvingTypeName = null;
                this.currentlyResolvingPointerTypeName = null;
                this.builtinFunctions = getBuiltinFunctions();
                this.statementsExecuted = 0;
            }
            processArrayAccess(expr, outType) {
                const _target = this.evaluateExpr(expr.target, "variable");
                if (!(_target.type instanceof ArrayVariableType))
                    fail({
                        summary: f.quoteRange `Variable ${expr.target} is not an array`,
                        elaboration: f.quote `Indexing notation can only be used on arrays, but the variable is of type ${_target.type}`
                    }, expr.target);
                const target = _target;
                const targetType = target.type;
                if (!targetType.lengthInformation)
                    crash(`Cannot access elements in an array of unknown length`);
                if (!targetType.elementType)
                    crash(`Cannot access elements in an array of unknown type`);
                if (outType instanceof ArrayVariableType)
                    fail({
                        summary: `Type mismatch`,
                        elaboration: [
                            f.quote `Expected this expression to have type ${outType},`,
                            f.quote `but this array access produces a result of type ${targetType.elementType}`
                        ]
                    }, expr.target);
                if (expr.indices.length != targetType.lengthInformation.length)
                    fail({
                        summary: `Incorrect number of indices`,
                        elaboration: [
                            f.range `"${expr.target}" is a ${targetType.lengthInformation.length}-dimensional array,`,
                            `so it needs ${targetType.lengthInformation.length} indices, not ${expr.indices.length}`
                        ],
                    }, expr.indices);
                const indexes = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER).value]);
                let invalidIndexIndex;
                if ((invalidIndexIndex = indexes.findIndex(([_expr, value], index) => value > targetType.lengthInformation[index][1] ||
                    value < targetType.lengthInformation[index][0])) != -1) {
                    const invalidIndex = indexes[invalidIndexIndex];
                    fail({
                        summary: `Array index out of bounds`,
                        elaboration: [
                            `the array's length is ${targetType.lengthInformation[invalidIndexIndex].join(" to ")}`,
                            (invalidIndex[0] instanceof Token && invalidIndex[0].type === "number.decimal")
                                ? f.quote `value ${invalidIndex[1]} is not in range`
                                : f.quoteRange `${invalidIndex[0]} evaluated to ${invalidIndex[1]}, which is not in range`
                        ]
                    }, invalidIndex[0]);
                }
                const index = indexes.reduce((acc, [_expr, value], index) => (acc + value - targetType.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : targetType.arraySizes[index + 1]), 0);
                if (index >= target.value.length)
                    crash(`Array index bounds check failed: ${indexes.map(v => v[1]).join(", ")}; ${index} > ${target.value.length}`);
                if (outType == "variable") {
                    return {
                        type: targetType.elementType,
                        declaration: target.declaration,
                        mutable: true,
                        get value() { return target.value[index]; },
                        set value(val) { target.value[index] = val; }
                    };
                }
                const output = target.value[index];
                if (output == null)
                    fail({
                        summary: f.text `Variable "${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]" has not been initialized`,
                        elaboration: `Variables cannot be accessed unless they have been initialized first`,
                        help: {
                            config: configs.initialization.arrays_default,
                            value: true,
                            message: "to automatically initialize all slots of arrays"
                        }
                    }, expr.indices);
                return finishEvaluation(output, targetType.elementType, outType);
            }
            processRecordAccess(expr, outType) {
                if (!(expr.nodes[1] instanceof Token))
                    crash(`Second node in record access expression was not a token`);
                const property = expr.nodes[1].text;
                if (expr.nodes[0] instanceof Token && expr.nodes[0].type == "keyword.super") {
                    if (!this.classData)
                        fail(`Keyword "SUPER" is only allowed in classes`, expr.nodes[0]);
                    const baseType = this.classData.clazz.baseClass ?? fail({
                        summary: f.quote `SUPER does not exist for class ${this.classData.clazz.fmtPlain()}`,
                        elaboration: [
                            `"SUPER" is a keyword that refers to the base class, which is the other class that this class inherits from`,
                            `but the class "${this.classData.clazz.fmtShort()}" does not inherit from any other class`
                        ]
                    }, expr.nodes[0]);
                    if (!(outType == "function"))
                        fail({
                            summary: "Type mismatch",
                            elaboration: [
                                `Expected this expression to evaluate to a value,`,
                                `but it is a member access on SUPER, which can only return methods`
                            ]
                        }, expr);
                    const [clazz, method] = baseType.allMethods[property] ?? fail(f.quote `Method ${property} does not exist on SUPER (class ${baseType.fmtPlain()})`, expr.nodes[1]);
                    return {
                        clazz, method, instance: this.classData.instance
                    };
                }
                let target = undefined;
                let targetType;
                let targetValue;
                if (outType == "variable") {
                    target = this.evaluateExpr(expr.nodes[0], "variable");
                    ({ type: targetType, value: targetValue } = target);
                }
                else {
                    ({ type: targetType, value: targetValue } = this.evaluateExpr(expr.nodes[0]));
                }
                if (targetType instanceof RecordVariableType) {
                    forceType(targetValue);
                    const outputType = targetType.fields[property]?.[0] ?? fail(f.quote `Property ${property} does not exist on type ${targetType}`, expr.nodes[1]);
                    if (outType == "variable") {
                        return {
                            type: outputType,
                            declaration: target.declaration,
                            mutable: true,
                            get value() { return targetValue[property]; },
                            set value(val) { targetValue[property] = val; }
                        };
                    }
                    else if (outType == "function") {
                        fail(f.quote `Expected this expression to evaluate to a function, but found a property access on a variable of type ${targetType}, which cannot have functions as properties`, expr);
                    }
                    else {
                        const value = targetValue[property];
                        if (value === null)
                            fail(f.text `Variable "${expr.nodes[0]}.${property}" has not been initialized`, expr.nodes[1]);
                        return finishEvaluation(value, outputType, outType);
                    }
                }
                else if (targetType instanceof ClassVariableType) {
                    const classInstance = targetValue;
                    const instanceType = classInstance.type;
                    if (outType == "function") {
                        const [clazz, method] = targetType.allMethods[property]
                            ? (instanceType.allMethods[property] ?? crash(`Inherited method not present`))
                            : instanceType.allMethods[property]
                                ? fail(f.quote `Method ${property} does not exist on type ${targetType}.
The data in the variable ${expr.nodes[0]} is of type ${instanceType.fmtPlain()} which has the method, \
but the type of the variable is ${targetType.fmtPlain()}.
help: change the type of the variable to ${instanceType.fmtPlain()}`, expr.nodes[1])
                                : fail(f.quote `Method ${property} does not exist on type ${targetType}`, expr.nodes[1]);
                        if (method.controlStatements[0].accessModifier == "private" && !this.canAccessClass(targetType))
                            fail(f.quote `Method ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
                        return { method, instance: classInstance, clazz };
                    }
                    else {
                        const propertyStatement = targetType.properties[property]?.[1] ?? (instanceType.properties[property]
                            ? fail(f.quote `Property ${property} does not exist on type ${targetType}.
The data in the variable ${expr.nodes[0]} is of type ${instanceType.fmtPlain()} which has the property, \
but the type of the variable is ${targetType.fmtPlain()}.
help: change the type of the variable to ${instanceType.fmtPlain()}`, expr.nodes[1])
                            : fail(f.quote `Property ${property} does not exist on type ${targetType}`, expr.nodes[1]));
                        if (propertyStatement.accessModifier == "private" && !this.canAccessClass(targetType))
                            fail(f.quote `Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
                        const outputType = targetType.getPropertyType(property, classInstance);
                        if (outType == "variable") {
                            return {
                                type: outputType,
                                assignabilityType: targetType.properties[property][0],
                                updateType(type) {
                                    if (outputType instanceof ArrayVariableType && !outputType.lengthInformation)
                                        classInstance.propertyTypes[property] = type;
                                },
                                declaration: target.declaration,
                                mutable: true,
                                get value() { return classInstance.properties[property]; },
                                set value(val) {
                                    classInstance.properties[property] = val;
                                }
                            };
                        }
                        else {
                            const value = classInstance.properties[property];
                            if (value === null)
                                fail(f.text `Variable "${expr.nodes[0]}.${property}" has not been initialized`, expr.nodes[1]);
                            return finishEvaluation(value, outputType, outType);
                        }
                    }
                }
                else
                    fail(f.quote `Cannot access property ${property} on variable of type ${targetType} because it is not a record or class type and cannot have proprties`, expr.nodes[0]);
            }
            assignExpr(target, src) {
                const variable = this.evaluateExpr(target, "variable");
                if (!variable.mutable)
                    fail(f.quote `Cannot assign to constant ${target}`, target);
                const { type, value } = this.evaluateUntyped(src, variable.assignabilityType ?? variable.type);
                variable.value = value;
                variable.updateType?.(type);
            }
            evaluateExpr(expr, type, recursive = false) {
                if (expr == undefined)
                    crash(`expr was ${expr}`);
                if (expr instanceof Token)
                    return this.evaluateToken(expr, type);
                if (expr instanceof ExpressionASTArrayAccessNode) {
                    if (type == "function")
                        fail(`Expected this expression to evaluate to a function, but found an array access, which cannot return a function.`, expr);
                    return this.processArrayAccess(expr, type);
                }
                if (expr instanceof ExpressionASTFunctionCallNode) {
                    if (type == "variable")
                        fail(`Expected this expression to evaluate to a variable, but found a function call, which cannot return a variable.`, expr);
                    if (type == "function")
                        fail(`Expected this expression to evaluate to a function, but found a function call, which cannot return a function.`, expr);
                    const func = this.evaluateExpr(expr.functionName, "function");
                    if ("clazz" in func) {
                        if (func.method.type == "class_procedure")
                            fail(f.quote `Expected this expression to return a value, but the function ${expr.functionName} is a procedure which does not return a value`, expr.functionName);
                        const output = this.callClassMethod(func.method, func.clazz, func.instance, expr.args, true);
                        return finishEvaluation(output.value, output.type, type);
                    }
                    else if ("name" in func) {
                        const output = this.callBuiltinFunction(func, expr.args);
                        return finishEvaluation(output.value, output.type, type);
                    }
                    else {
                        if (func.type == "procedure")
                            fail(f.quote `Procedure ${expr.functionName} does not return a value.`, expr.functionName);
                        const statement = func.controlStatements[0];
                        const output = this.callFunction(func, expr.args, true);
                        return finishEvaluation(output, this.resolveVariableType(statement.returnType), type);
                    }
                }
                if (expr instanceof ExpressionASTClassInstantiationNode) {
                    if (type == "variable" || type == "function")
                        fail(`Expected this expression to evaluate to a ${type}, but found a class instantiation expression, which can only return a class instance, not a ${type}.`, expr);
                    const clazz = this.getClass(expr.className.text, expr.className.range);
                    const output = clazz.construct(this, expr.args);
                    return finishEvaluation(output, clazz, type);
                }
                if (expr.operator.category == "special") {
                    switch (expr.operator) {
                        case operators.access:
                            return this.processRecordAccess(expr, type);
                        case operators.pointer_reference: {
                            if (type == "variable" || type == "function")
                                fail(`Expected this expression to evaluate to a ${type}, but found a referencing expression, which returns a pointer`, expr);
                            if (type && !(type instanceof PointerVariableType))
                                fail(f.quote `Expected result to be of type ${type}, but the reference operator will return a pointer`, expr);
                            const [variable, err] = tryRun(() => this.evaluateExpr(expr.nodes[0], "variable", true));
                            if (err) {
                                const target = this.evaluateExpr(expr.nodes[0], type?.target, true);
                                const pointerType = this.getPointerTypeFor(target.type) ?? fail(f.quote `Cannot find a pointer type for ${target.type}`, expr.operatorToken, expr);
                                if (!configs.pointers.implicit_variable_creation.value)
                                    rethrow(err, m => m + `\n${configs.pointers.implicit_variable_creation.errorHelp}`);
                                return finishEvaluation({
                                    type: target.type,
                                    declaration: "dynamic",
                                    mutable: true,
                                    value: target.value
                                }, pointerType, type);
                            }
                            const pointerType = this.getPointerTypeFor(variable.type) ?? fail(f.quote `Cannot find a pointer type for ${variable.type}`, expr.operatorToken, expr);
                            return finishEvaluation(variable, pointerType, type);
                        }
                        case operators.pointer_dereference: {
                            if (type == "function")
                                fail(`Expected this expression to evaluate to a function, but found a dereferencing expression, which cannot return a function`, expr);
                            const pointerVariable = this.evaluateExpr(expr.nodes[0], undefined, true);
                            if (pointerVariable.value == null)
                                fail(`Cannot dereference uninitialized pointer`, expr.nodes[0]);
                            if (!(pointerVariable.typeIs(PointerVariableType)))
                                fail(f.quote `Cannot dereference value of type ${pointerVariable.type} because it is not a pointer`, expr.nodes[0]);
                            if (type == "variable") {
                                if (!pointerVariable.value.mutable)
                                    fail(`Cannot assign to constant`, expr);
                                return pointerVariable.value;
                            }
                            else {
                                if (pointerVariable.value.value == null)
                                    fail(f.quote `Cannot dereference ${expr.nodes[0]} and use the value, because the underlying value has not been initialized`, expr.nodes[0]);
                                return finishEvaluation(pointerVariable.value.value, pointerVariable.type.target, type);
                            }
                        }
                        default: impossible();
                    }
                }
                if (type == "variable" || type == "function")
                    fail(`Cannot evaluate this expression as a ${type}`, expr);
                if (type?.is("REAL", "INTEGER") || expr.operator.category == "arithmetic") {
                    if (type && !(type.is("REAL", "INTEGER") || type instanceof EnumeratedVariableType))
                        fail(f.quote `expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`, expr);
                    let guessedType = type ?? PrimitiveVariableType.REAL;
                    let value;
                    if (expr.operator.fix == "unary_prefix") {
                        const operand = this.evaluateExpr(expr.nodes[0], guessedType, true);
                        switch (expr.operator) {
                            case operators.negate:
                                return TypedValue.INTEGER(-operand.value);
                            default: crash("impossible");
                        }
                    }
                    let left, right;
                    if (expr.operator == operators.add || expr.operator == operators.subtract) {
                        left = this.evaluateExpr(expr.nodes[0], undefined, true);
                        right = this.evaluateExpr(expr.nodes[1], undefined, true);
                    }
                    else {
                        left = this.evaluateExpr(expr.nodes[0], guessedType, true);
                        right = this.evaluateExpr(expr.nodes[1], guessedType, true);
                    }
                    if (left.typeIs(EnumeratedVariableType)) {
                        if (type && !(type instanceof EnumeratedVariableType))
                            fail(f.quote `expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
                        const other = coerceValue(right.value, right.type, PrimitiveVariableType.INTEGER);
                        const value = left.type.values.indexOf(left.value);
                        if (value == -1)
                            crash(`enum fail`);
                        if (expr.operator == operators.add) {
                            return finishEvaluation(left.type.values[value + other] ?? fail(f.text `Cannot add ${other} to enum value "${left.value}": no corresponding value in ${left.type}`, expr), left.type, type);
                        }
                        else if (expr.operator == operators.subtract) {
                            return finishEvaluation(left.type.values[value + other] ?? fail(f.text `Cannot subtract ${other} from enum value "${left.value}": no corresponding value in ${left.type}`, expr), left.type, type);
                        }
                        else
                            fail(f.quote `Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[0]);
                    }
                    else if (right.typeIs(EnumeratedVariableType)) {
                        if (type && !(type instanceof EnumeratedVariableType))
                            fail(f.quote `expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
                        const other = coerceValue(left.value, left.type, PrimitiveVariableType.INTEGER);
                        const value = right.type.values.indexOf(right.value);
                        if (value == -1)
                            crash(`enum fail`);
                        if (expr.operator == operators.add) {
                            return finishEvaluation(right.type.values[value + other] ?? fail(f.quote `Cannot add ${other} to ${value}: no corresponding value in ${right.type}`, expr), right.type, type);
                        }
                        else if (expr.operator == operators.subtract) {
                            fail(`Cannot subtract an enum value from a number`, expr);
                        }
                        else
                            fail(f.quote `Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[1]);
                    }
                    else {
                        left = coerceValue(left.value, left.type, guessedType, expr.nodes[0]);
                        right = coerceValue(right.value, right.type, guessedType, expr.nodes[1]);
                    }
                    switch (expr.operator) {
                        case operators.add:
                            value = left + right;
                            break;
                        case operators.subtract:
                            value = left - right;
                            break;
                        case operators.multiply:
                            value = left * right;
                            break;
                        case operators.divide:
                            if (right == 0)
                                fail(`Division by zero`, expr.nodes[1], expr);
                            value = left / right;
                            if (type?.is("INTEGER"))
                                fail(`This arithmetic operation evaluated to value of type REAL, cannot be coerced to INTEGER
help: try using DIV instead of / to produce an integer as the result`, expr.operatorToken, expr);
                            break;
                        case operators.integer_divide:
                            if (right == 0)
                                fail(`Division by zero`, expr.nodes[1], expr);
                            value = Math.trunc(left / right);
                            if (!type)
                                guessedType = PrimitiveVariableType.INTEGER;
                            break;
                        case operators.mod:
                            if (right == 0)
                                fail(`Division by zero`, expr.nodes[1], expr);
                            value = left % right;
                            break;
                        default:
                            fail(f.quote `Expected this expression to evaluate to a value of type ${type ?? impossible()}, but the operator ${expr.operator} produces a result of another type`, expr);
                    }
                    return typedValue(guessedType, value);
                }
                if (type?.is("BOOLEAN") || expr.operator.category == "logical") {
                    if (type && !type.is("BOOLEAN"))
                        fail(f.quote `Expected this expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`, expr);
                    if (expr.operator.fix == "unary_prefix") {
                        const operand = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true);
                        switch (expr.operator) {
                            case operators.not: {
                                return TypedValue.BOOLEAN(!operand.value);
                            }
                            default: crash("impossible");
                        }
                    }
                    switch (expr.operator) {
                        case operators.equal_to:
                        case operators.not_equal_to: {
                            const left = this.evaluateExpr(expr.nodes[0], undefined, true);
                            const right = this.evaluateExpr(expr.nodes[1], undefined, true);
                            const typesMatch = checkTypeMatch(left.type, right.type, expr.operatorToken.range);
                            const is_equal = typesMatch && checkValueEquality(left.type, left.value, right.value, expr.nodes[0].fmtText(), expr.nodes[1].fmtText(), expr.operatorToken.range);
                            return TypedValue.BOOLEAN((() => {
                                switch (expr.operator) {
                                    case operators.equal_to: return is_equal;
                                    case operators.not_equal_to: return !is_equal;
                                }
                            })());
                        }
                        case operators.and:
                        case operators.or: {
                            const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true).value;
                            const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true).value;
                            return TypedValue.BOOLEAN((() => {
                                switch (expr.operator) {
                                    case operators.and: return left && right;
                                    case operators.or: return left || right;
                                }
                            })());
                        }
                        case operators.greater_than:
                        case operators.greater_than_equal:
                        case operators.less_than:
                        case operators.less_than_equal: {
                            const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true).value;
                            const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true).value;
                            return TypedValue.BOOLEAN((() => {
                                switch (expr.operator) {
                                    case operators.greater_than: return left > right;
                                    case operators.greater_than_equal: return left >= right;
                                    case operators.less_than: return left < right;
                                    case operators.less_than_equal: return left <= right;
                                }
                            })());
                        }
                        default:
                            fail(f.quote `Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns another type`, expr);
                    }
                }
                if (type?.is("STRING") || expr.operator.category == "string") {
                    if (type && !type.is("STRING"))
                        fail(f.quote `expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`, expr);
                    const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.STRING, true).value;
                    const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.STRING, true).value;
                    switch (expr.operator) {
                        case operators.string_concatenate:
                            return TypedValue.STRING(left + right);
                        default:
                            fail(f.quote `Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns another type`, expr);
                    }
                }
                expr.operator.category;
                impossible();
            }
            evaluateToken(token, type) {
                if (token.type == "name") {
                    if (type == "function")
                        return this.getFunction(token);
                    if (type == "variable") {
                        const variable = this.getVariable(token.text);
                        if (variable)
                            return variable;
                        const enumType = this.getEnumFromValue(token.text);
                        if (enumType)
                            fail(f.quote `Cannot evaluate enum value ${token.text} as a variable`, token);
                        this.handleNonexistentVariable(token.text, token.range);
                    }
                    else {
                        const enumType = this.getEnumFromValue(token.text);
                        if (enumType)
                            return finishEvaluation(token.text, enumType, type);
                        const variable = this.getVariable(token.text) ?? this.handleNonexistentVariable(token.text, token.range);
                        if (variable.value == null)
                            fail(f.quote `Variable ${token.text} has not been initialized`, token);
                        return finishEvaluation(variable.value, variable.type, type);
                    }
                }
                if (type == "variable" || type == "function")
                    fail(f.quote `Cannot evaluate token ${token.text} as a ${type}`, token);
                switch (token.type) {
                    case "boolean.false":
                        return finishEvaluation(false, PrimitiveVariableType.BOOLEAN, type);
                    case "boolean.true":
                        return finishEvaluation(true, PrimitiveVariableType.BOOLEAN, type);
                    case "number.decimal": {
                        const val = Number(token.text);
                        if (Number.isNaN(val))
                            crash(`number was nan`);
                        if (!Number.isFinite(val))
                            fail(f.quote `Value ${token} cannot be converted to a number: too large`, token);
                        if (type?.is("INTEGER")) {
                            if (!Number.isInteger(val))
                                fail(f.quote `Value ${token} cannot be converted to an integer`, token);
                            if (!Number.isSafeInteger(val))
                                fail(f.quote `Value ${token} cannot be converted to an integer: too large`, token);
                            return TypedValue.INTEGER(val);
                        }
                        return finishEvaluation(val, PrimitiveVariableType.REAL, type);
                    }
                    case "string":
                        return finishEvaluation(token.text.slice(1, -1), PrimitiveVariableType.STRING, type);
                    case "char":
                        return finishEvaluation(token.text.slice(1, -1), PrimitiveVariableType.CHAR, type);
                    default: fail(f.quote `Cannot evaluate token ${token}`, token);
                }
            }
            static evaluateToken(token, type) {
                try {
                    return this.prototype.evaluateToken.call(new Proxy({}, {
                        get() { throw _a.NotStatic; },
                    }), token, type);
                }
                catch (err) {
                    if (err === _a.NotStatic)
                        return null;
                    else
                        throw err;
                }
            }
            static evaluateExpr(expr, type) {
                try {
                    return this.prototype.evaluateExpr.call(Object.setPrototypeOf(shallowCloneOwnProperties(_a.prototype), new Proxy({}, {
                        get() { throw _a.NotStatic; },
                    })), expr, type);
                }
                catch (err) {
                    if (err === _a.NotStatic)
                        return null;
                    else
                        throw err;
                }
            }
            evaluate(value) {
                return value.value ?? this.evaluateExpr(value.node, value.type).value;
            }
            evaluateUntyped(value, type) {
                if (value.value != null && type && !typesEqual(value.value.type, type)) {
                    const result = this.evaluateExpr(value.node, type);
                    value.value = result;
                    return result;
                }
                return value.value ?? this.evaluateExpr(value.node, type);
            }
            resolveVariableType(type) {
                if (type instanceof PrimitiveVariableType)
                    return type;
                else if (type instanceof IntegerRangeVariableType)
                    return type;
                else if (type instanceof ArrayVariableType) {
                    type.init(this);
                    return type;
                }
                else
                    return this.getType(type[1]) ?? this.handleNonexistentType(type[1], type[2]);
            }
            handleNonexistentClass(name, range) {
                const allClasses = [...this.activeScopes()].flatMap(s => Object.entries(s.types)
                    .filter((x) => x[1] instanceof ClassVariableType));
                if (this.currentlyResolvingTypeName == name)
                    fail(f.quote `Class ${name} does not exist yet, it is currently being initialized`, range);
                let found;
                if ((found =
                    min(allClasses, t => biasedLevenshtein(t[0], name) ?? Infinity, 2.5)) != undefined) {
                    fail(f.quote `Class ${name} does not exist\nhelp: perhaps you meant ${found[1]}`, range);
                }
                fail(f.quote `Class ${name} does not exist`, range);
            }
            handleNonexistentType(name, range) {
                const allTypes = [
                    ...[...this.activeScopes()].flatMap(s => Object.entries(s.types)),
                    ...PrimitiveVariableType.all.map(t => [t.name, t])
                ];
                if (PrimitiveVariableType.get(name.toUpperCase()))
                    fail(f.quote `Type ${name} does not exist\nhelp: perhaps you meant ${name.toUpperCase()} (uppercase)`, range);
                if (this.currentlyResolvingTypeName == name)
                    fail(f.quote `Type ${name} does not exist yet, it is currently being initialized`, range);
                let found;
                if ((found =
                    min(allTypes, t => t[0] == this.currentlyResolvingPointerTypeName ? Infinity : biasedLevenshtein(t[0], name), 2.5)) != undefined) {
                    fail(f.quote `Type ${name} does not exist\nhelp: perhaps you meant ${found[1]}`, range);
                }
                fail(f.quote `Type ${name} does not exist`, range);
            }
            handleNonexistentFunction(name, range) {
                const allFunctions = [
                    ...Object.entries(this.functions),
                    ...Object.entries(this.builtinFunctions),
                ];
                if (this.builtinFunctions[name.toUpperCase()])
                    fail(f.quote `Function ${name} does not exist\nhelp: perhaps you meant ${name.toUpperCase()} (uppercase)`, range);
                let found;
                if ((found =
                    min(allFunctions, t => biasedLevenshtein(t[0], name), 3)) != undefined) {
                    fail(f.quote `Function ${name} does not exist\nhelp: perhaps you meant ${found[0]}`, range);
                }
                fail(f.quote `Function ${name} does not exist`, range);
            }
            handleNonexistentVariable(name, range) {
                const allVariables = [
                    ...[...this.activeScopes()].flatMap(s => Object.keys(s.variables)),
                ];
                let found;
                if ((found =
                    min(allVariables, t => biasedLevenshtein(t, name), 2)) != undefined) {
                    fail(f.quote `Variable ${name} does not exist\nhelp: perhaps you meant ${found}`, range);
                }
                fail(f.quote `Variable ${name} does not exist`, range);
            }
            *activeScopes() {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    yield this.scopes[i];
                    if (this.scopes[i].opaque && i > 0) {
                        if (this.scopes[0].statement == "global")
                            yield this.scopes[0];
                        return null;
                    }
                }
                return null;
            }
            getVariable(name) {
                for (const scope of this.activeScopes()) {
                    if (scope.variables[name])
                        return scope.variables[name];
                }
                return null;
            }
            getType(name) {
                for (const scope of this.activeScopes()) {
                    if (scope.types[name])
                        return scope.types[name];
                }
                return null;
            }
            getEnumFromValue(name) {
                for (const scope of this.activeScopes()) {
                    const data = Object.values(scope.types)
                        .find((data) => data instanceof EnumeratedVariableType && data.values.includes(name));
                    if (data)
                        return data;
                }
                return null;
            }
            getPointerTypeFor(type) {
                for (const scope of this.activeScopes()) {
                    const data = Object.values(scope.types)
                        .find((data) => data instanceof PointerVariableType && typesEqual(data.target, type));
                    if (data)
                        return data;
                }
                return null;
            }
            getCurrentScope() {
                return this.scopes.at(-1) ?? crash(`No scope?`);
            }
            canAccessClass(clazz) {
                for (const { statement } of this.scopes.slice().reverse()) {
                    if (statement instanceof ClassStatement)
                        return statement == clazz.statement;
                    if ((statement.constructor == FunctionStatement || statement.constructor == ProcedureStatement) && !configs.classes.delegate_access_privileges.value)
                        return false;
                }
                return false;
            }
            defineVariable(name, data, range) {
                const currentScope = this.getCurrentScope();
                if (name in currentScope.variables)
                    fail(f.quote `Variable ${name} was already defined`, range);
                currentScope.variables[name] = data;
            }
            defineFunction(name, data, range) {
                if (name in this.functions)
                    fail(f.quote `Function or procedure ${name} has already been defined`, range);
                else if (name in this.builtinFunctions)
                    fail(f.quote `Function or procedure ${name} has already been defined as a builtin function`, range);
                this.functions[name] = data;
            }
            getFunction({ text, range }) {
                if (this.classData && this.classData.clazz.allMethods[text]) {
                    const [clazz, method] = this.classData.clazz.allMethods[text];
                    return { clazz, method, instance: this.classData.instance };
                }
                else
                    return this.functions[text] ?? this.builtinFunctions[text] ?? this.handleNonexistentFunction(text, range);
            }
            getClass(name, range) {
                for (const scope of this.activeScopes()) {
                    const type = scope.types[name];
                    if (type) {
                        if (type instanceof ClassVariableType)
                            return type;
                        else
                            fail(f.quote `Type ${name} is not a class, it is ${scope.types[name]}`, range);
                    }
                }
                this.handleNonexistentClass(name, range);
            }
            getCurrentFunction() {
                const scope = this.scopes.findLast((s) => s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement || s.statement instanceof ClassFunctionStatement || s.statement instanceof ClassProcedureStatement);
                if (!scope)
                    return null;
                if (scope.statement instanceof ClassFunctionStatement || scope.statement instanceof ClassProcedureStatement)
                    return scope.statement;
                else
                    return this.functions[scope.statement.name] ?? crash(`Function ${scope.statement.name} does not exist`);
            }
            cloneValue(type, value) {
                if (value == null)
                    return value;
                if (typeof value == "string")
                    return value;
                if (typeof value == "number")
                    return value;
                if (typeof value == "boolean")
                    return value;
                if (value instanceof Date)
                    return new Date(value);
                if (Array.isArray(value))
                    return value.slice().map(v => this.cloneValue(type.elementType ?? crash(`Cannot clone value in an array of unknown type`), v));
                if (type instanceof PointerVariableType)
                    return value;
                if (type instanceof RecordVariableType)
                    return Object.fromEntries(Object.entries(value)
                        .map(([k, v]) => [k, this.cloneValue(type.fields[k][0], v)]));
                if (type instanceof ClassVariableType)
                    return {
                        properties: Object.setPrototypeOf(Object.fromEntries(Object.entries(value.properties)
                            .map(([k, v]) => [k, this.cloneValue(type.properties[k][0], v)])), null),
                        propertyTypes: Object.setPrototypeOf(Object.fromEntries(Object.entries(value.propertyTypes)), null),
                        type: value.type
                    };
                crash(f.quote `Cannot clone value of type ${type}`);
            }
            assembleScope(func, args) {
                if (func.args.size != args.length)
                    fail(f.quote `Incorrect number of arguments for function ${func.name}`, args);
                const scope = {
                    statement: func,
                    opaque: !(func instanceof ClassProcedureStatement || func instanceof ClassFunctionStatement),
                    variables: Object.create(null),
                    types: Object.create(null),
                };
                for (const [i, [name, { type, passMode }]] of [...func.args.entries()].entries()) {
                    const rType = this.resolveVariableType(type);
                    if (passMode == "reference") {
                        const varData = this.evaluateExpr(args[i], "variable");
                        if (!typesEqual(varData.type, rType))
                            fail(f.quote `Expected the argument to be of type ${rType}, but it was of type ${varData.type}. Cannot coerce BYREF arguments, please change the variable's type or change the pass mode to BYVAL.`, args[i]);
                        scope.variables[name] = {
                            declaration: func,
                            mutable: true,
                            type: rType,
                            get value() { return varData.value ?? fail(`Variable (passed by reference) has not been initialized`, args[i]); },
                            set value(value) { varData.value = value; }
                        };
                    }
                    else {
                        const { type, value } = this.evaluateExpr(args[i], rType);
                        if (type instanceof ArrayVariableType && !type.lengthInformation)
                            crash(f.quote `evaluateExpr returned an array type of unspecified length at evaluating ${args[i]}`);
                        scope.variables[name] = {
                            declaration: func,
                            mutable: true,
                            type,
                            value: this.cloneValue(rType, value)
                        };
                    }
                }
                return scope;
            }
            callFunction(funcNode, args, requireReturnValue) {
                const func = funcNode.controlStatements[0];
                if (func instanceof ProcedureStatement && requireReturnValue)
                    fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);
                const scope = this.assembleScope(func, args);
                const output = this.runBlock(funcNode.nodeGroups[0], false, scope);
                if (func instanceof ProcedureStatement) {
                    return null;
                }
                else {
                    if (!output)
                        fail(f.quote `Function ${func.name} did not return a value`, undefined);
                    return output.value;
                }
            }
            callClassMethod(method, clazz, instance, args, requireReturnValue) {
                const func = method.controlStatements[0];
                if (func instanceof ClassProcedureStatement && requireReturnValue === true)
                    fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);
                if (func instanceof ClassFunctionStatement && requireReturnValue === false && !configs.statements.call_functions.value)
                    fail(`CALL cannot be used on functions according to Cambridge.\n${configs.statements.call_functions.errorHelp}`, undefined);
                const classScope = instance.type.getScope(this, instance);
                const methodScope = this.assembleScope(func, args);
                const previousClassData = this.classData;
                this.classData = { instance, method, clazz };
                const output = this.runBlock(method.nodeGroups[0], false, classScope, methodScope);
                this.classData = previousClassData;
                if (func instanceof ClassProcedureStatement) {
                    return null;
                }
                else {
                    if (!output)
                        fail(f.quote `Function ${func.name} did not return a value`, undefined);
                    return typedValue(this.resolveVariableType(func.returnType), output.value);
                }
            }
            callBuiltinFunction(fn, args, returnType) {
                if (fn.args.size != args.length)
                    fail(f.quote `Incorrect number of arguments for function ${fn.name}`, undefined);
                if (!fn.returnType)
                    fail(f.quote `Builtin function ${fn.name} does not return a value`, undefined);
                const evaluatedArgs = [];
                let i = 0;
                nextArg: for (const [name, { type }] of fn.args.entries()) {
                    const errors = [];
                    for (const possibleType of type) {
                        if (tryRunOr(() => {
                            evaluatedArgs.push([this.evaluateExpr(args[i], possibleType).value, args[i].range]);
                            i++;
                        }, err => errors.push(err)))
                            continue nextArg;
                    }
                    throw errors.at(-1) ?? crash(`Builtin function ${fn.name} has an argument ${name} that does not accept any types`);
                }
                const processedArgs = evaluatedArgs.map(([value, range]) => Object.assign(boxPrimitive(value), { range }));
                if (returnType)
                    return typedValue(returnType, coerceValue(fn.impl.apply(this, processedArgs), fn.returnType, returnType));
                else
                    return typedValue(fn.returnType, fn.impl.apply(this, processedArgs));
            }
            runBlock(code, allScopesEmpty, ...scopes) {
                if (code.simple() && allScopesEmpty)
                    return this.runBlockFast(code);
                this.scopes.push(...scopes);
                let returned = null;
                const { typeNodes, constants, others } = groupArray(code, c => (c instanceof TypeStatement ||
                    c instanceof ProgramASTBranchNode && c.controlStatements[0] instanceof TypeStatement) ? "typeNodes" :
                    c instanceof ConstantStatement ? "constants" :
                        "others", ["constants", "others", "typeNodes"]);
                for (const node of constants) {
                    node.run(this);
                }
                const types = [];
                const currentScopeTypes = this.getCurrentScope().types;
                for (const node of typeNodes) {
                    let name, type;
                    if (node instanceof Statement) {
                        [name, type] = node.createType(this);
                    }
                    else {
                        [name, type] = node.controlStatements[0].createTypeBlock(this, node);
                    }
                    if (currentScopeTypes[name])
                        fail(f.quote `Type ${name} was defined twice`, node);
                    currentScopeTypes[name] = type;
                    types.push([name, type]);
                }
                for (const [name, type] of types) {
                    this.currentlyResolvingTypeName = name;
                    if (type instanceof PointerVariableType)
                        this.currentlyResolvingPointerTypeName = name;
                    type.init(this);
                    this.currentlyResolvingPointerTypeName = null;
                }
                this.currentlyResolvingTypeName = null;
                for (const [name, type] of types) {
                    type.validate(this);
                }
                for (const node of others) {
                    this.statementExecuted(node);
                    let result;
                    if (node instanceof Statement) {
                        result = node.run(this);
                    }
                    else {
                        result = node.controlStatements[0].runBlock(this, node);
                    }
                    if (result) {
                        if (result.type == "function_return") {
                            returned = result.value;
                            break;
                        }
                    }
                }
                if (scopes.length > 0 && this.scopes.splice(-scopes.length).length != scopes.length)
                    crash(`Scope somehow disappeared`);
                if (returned !== null) {
                    return {
                        type: "function_return",
                        value: returned
                    };
                }
            }
            runBlockFast(code) {
                this.statementExecuted(code, code.length);
                for (const node of code) {
                    if (node instanceof Statement) {
                        node.run(this);
                    }
                    else {
                        node.controlStatements[0].runBlock(this, node);
                    }
                }
            }
            statementExecuted(range, increment = 1) {
                if ((this.statementsExecuted += increment) > configs.statements.max_statements.value) {
                    fail(`Statement execution limit reached (${configs.statements.max_statements.value})\n${configs.statements.max_statements.errorHelp}`, range);
                }
            }
            runProgram(code) {
                code.preRun();
                this.runBlock(code, false, {
                    statement: "global",
                    opaque: true,
                    variables: Object.create(null),
                    types: Object.create(null),
                });
                for (const [name, file] of Object.entries(this.openFiles)) {
                    if (file == undefined)
                        delete this.openFiles[name];
                    else
                        fail(f.quote `File ${name} was not closed`, file.openRange);
                }
            }
            getOpenFile(filename, modes, operationDescription) {
                const data = (this.openFiles[filename] ?? fail(f.quote `File ${filename} has not been opened.`, undefined));
                if (modes && operationDescription && !modes.includes(data.mode))
                    fail(f.quote `${operationDescription} requires the file to have been opened with mode ${modes.map(m => `"${m}"`).join(" or ")}, but the mode is ${data.mode}`, undefined);
                return data;
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _processArrayAccess_decorators = [errorBoundary()];
            _processRecordAccess_decorators = [errorBoundary()];
            _evaluateExpr_decorators = [errorBoundary({
                    predicate: (_expr, _type, recursive) => !recursive,
                    message: () => `Cannot evaluate expression "$rc": `
                })];
            __esDecorate(_a, null, _processArrayAccess_decorators, { kind: "method", name: "processArrayAccess", static: false, private: false, access: { has: obj => "processArrayAccess" in obj, get: obj => obj.processArrayAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(_a, null, _processRecordAccess_decorators, { kind: "method", name: "processRecordAccess", static: false, private: false, access: { has: obj => "processRecordAccess" in obj, get: obj => obj.processRecordAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(_a, null, _evaluateExpr_decorators, { kind: "method", name: "evaluateExpr", static: false, private: false, access: { has: obj => "evaluateExpr" in obj, get: obj => obj.evaluateExpr }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a.NotStatic = Symbol("not static"),
        _a;
})();
export { Runtime };
