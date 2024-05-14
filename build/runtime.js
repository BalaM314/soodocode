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
import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ProgramASTBranchNode, operators } from "./parser-types.js";
import { ArrayVariableType, ClassVariableType, EnumeratedVariableType, PointerVariableType, PrimitiveVariableType, RecordVariableType, SetVariableType } from "./runtime-types.js";
import { ClassFunctionStatement, ClassProcedureStatement, ClassStatement, FunctionStatement, ProcedureStatement, Statement, TypeStatement } from "./statements.js";
import { SoodocodeError, biasedLevenshtein, crash, errorBoundary, f, fail, impossible, min, separateArray, tryRunOr, zip } from "./utils.js";
export function typesEqual(a, b) {
    return a == b ||
        (Array.isArray(a) && Array.isArray(b) && a[1] == b[1]) ||
        (a instanceof ArrayVariableType && b instanceof ArrayVariableType && a.arraySizes?.toString() == b.arraySizes?.toString() && (a.type == b.type ||
            Array.isArray(a.type) && Array.isArray(b.type) && a.type[1] == b.type[1])) ||
        (a instanceof PointerVariableType && b instanceof PointerVariableType && typesEqual(a.target, b.target)) ||
        (a instanceof SetVariableType && b instanceof SetVariableType && a.baseType == b.baseType);
}
export function typesAssignable(base, ext) {
    return base == ext ||
        (Array.isArray(base) && Array.isArray(ext) && base[1] == ext[1]) ||
        (base instanceof ArrayVariableType && ext instanceof ArrayVariableType && (base.arraySizes == null ||
            base.arraySizes.toString() == ext.arraySizes?.toString()) && ((base.type == null ||
            base.type == ext.type ||
            Array.isArray(base.type) && Array.isArray(ext.type) && base.type[1] == ext.type[1]))) ||
        (base instanceof PointerVariableType && ext instanceof PointerVariableType && typesEqual(base.target, ext.target)) ||
        (base instanceof SetVariableType && ext instanceof SetVariableType && base.baseType == ext.baseType) ||
        (base instanceof ClassVariableType && ext instanceof ClassVariableType && ext.inherits(base));
}
export function checkClassMethodsCompatible(base, derived) {
    if (base.accessModifier != derived.accessModifier)
        fail(f.text `Method was ${base.accessModifier} in base class, cannot override it with a ${derived.accessModifier} method`, derived.accessModifierToken);
    if (base.stype != derived.stype)
        fail(f.text `Method was a ${base.stype.split("_")[1]} in base class, cannot override it with a ${derived.stype.split("_")[1]}`, derived.methodKeywordToken);
    if (base.args.size != derived.args.size)
        fail(`Functions have different numbers of arguments.`, derived.argsRange);
    for (const [[aName, aType], [bName, bType]] of zip(base.args.entries(), derived.args.entries())) {
        if (!typesEqual(aType.type, bType.type))
            fail(f.quote `Argument ${bName} in derived class is not assignable to argument ${aName} in base class: type ${aType.type} is not assignable to type ${bType.type}.`, derived.argsRange);
        if (aType.passMode != bType.passMode)
            fail(f.quote `Argument ${bName} in derived class is not assignable to argument ${aName} in base class because their pass modes are different.`, derived.argsRange);
    }
    if (base instanceof ClassFunctionStatement && derived instanceof ClassFunctionStatement) {
        if (!typesEqual(derived.returnType, base.returnType))
            fail(f.quote `Return type ${derived.returnType} is not assignable to ${base.returnType}`, derived.returnTypeToken);
    }
}
export class Files {
    constructor() {
        this.files = {};
        this.backupFiles = null;
    }
    getFile(filename, create = false) {
        return this.files[filename] ?? (create ? this.files[filename] = {
            name: filename, text: ""
        } : undefined);
    }
    makeBackup() {
        this.backupFiles = JSON.stringify(this.files);
    }
    canLoadBackup() {
        return this.backupFiles != null;
    }
    loadBackup() {
        if (this.backupFiles)
            this.files = JSON.parse(this.backupFiles);
    }
}
let Runtime = (() => {
    var _a;
    let _instanceExtraInitializers = [];
    let _processArrayAccess_decorators;
    let _processRecordAccess_decorators;
    let _evaluateExpr_decorators;
    return _a = class Runtime {
            constructor(_input, _output) {
                this._input = (__runInitializers(this, _instanceExtraInitializers), _input);
                this._output = _output;
                this.scopes = [];
                this.functions = {};
                this.openFiles = {};
                this.classData = null;
                this.currentlyResolvingTypeName = null;
                this.fs = new Files();
            }
            finishEvaluation(value, from, to) {
                if (to && to instanceof ArrayVariableType && (!to.lengthInformation || !to.type))
                    return [from, this.coerceValue(value, from, to)];
                else if (to)
                    return [to, this.coerceValue(value, from, to)];
                else
                    return [from, value];
            }
            processArrayAccess(expr, operation, arg2) {
                const _variable = this.evaluateExpr(expr.target, "variable");
                if (!(_variable.type instanceof ArrayVariableType))
                    fail(f.quote `Cannot convert variable of type ${_variable.type} to an array`, expr.target);
                const variable = _variable;
                const varTypeData = variable.type;
                if (!varTypeData.lengthInformation)
                    crash(`Cannot access elements in an array of unknown length`);
                if (!varTypeData.type)
                    crash(`Cannot access elements in an array of unknown type`);
                if (arg2 instanceof ArrayVariableType)
                    fail(f.quote `Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the array access produces a result of type ${varTypeData.type}`, expr.target);
                if (expr.indices.length != varTypeData.lengthInformation.length)
                    fail(`Cannot evaluate expression starting with "array access": \
${varTypeData.lengthInformation.length}-dimensional array requires ${varTypeData.lengthInformation.length} indices, \
but found ${expr.indices.length} indices`, expr.indices);
                const indexes = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER)[1]]);
                let invalidIndexIndex;
                if ((invalidIndexIndex = indexes.findIndex(([_expr, value], index) => value > varTypeData.lengthInformation[index][1] ||
                    value < varTypeData.lengthInformation[index][0])) != -1)
                    fail(`Array index out of bounds: \
value ${indexes[invalidIndexIndex][1]} was not in range \
(${varTypeData.lengthInformation[invalidIndexIndex].join(" to ")})`, indexes[invalidIndexIndex][0]);
                const index = indexes.reduce((acc, [_expr, value], index) => (acc + value - varTypeData.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : varTypeData.arraySizes[index + 1]), 0);
                if (index >= variable.value.length)
                    crash(`Array index bounds check failed: ${indexes.map(v => v[1]).join(", ")}; ${index} > ${variable.value.length}`);
                if (operation == "get") {
                    const type = arg2;
                    if (type == "variable") {
                        return {
                            type: varTypeData.type,
                            declaration: variable.declaration,
                            mutable: true,
                            get value() { return variable.value[index]; },
                            set value(val) { variable.value[index] = val; }
                        };
                    }
                    const output = variable.value[index];
                    if (output == null)
                        fail(f.text `Cannot use the value of uninitialized variable ${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]`, expr.target);
                    return this.finishEvaluation(output, varTypeData.type, type);
                }
                else {
                    variable.value[index] = this.evaluateExpr(arg2, varTypeData.type)[1];
                }
            }
            processRecordAccess(expr, operation, arg2) {
                if (!(expr.nodes[1] instanceof Token))
                    crash(`Second node in record access expression was not a token`);
                const property = expr.nodes[1].text;
                if (operation == "set" || arg2 == "variable") {
                    const variable = this.evaluateExpr(expr.nodes[0], "variable");
                    if (variable.type instanceof RecordVariableType) {
                        const outputType = variable.type.fields[property] ?? fail(f.quote `Property ${property} does not exist on type ${variable.type}`, expr.nodes[1]);
                        if (arg2 == "variable") {
                            return {
                                type: outputType,
                                declaration: variable.declaration,
                                mutable: true,
                                get value() { return variable.value[property]; },
                                set value(val) {
                                    variable.value[property] = val;
                                }
                            };
                        }
                        else {
                            const value = arg2;
                            variable.value[property] = this.evaluateExpr(value, outputType)[1];
                        }
                    }
                    else if (variable.type instanceof ClassVariableType) {
                        const propertyStatement = variable.type.properties[property] ?? fail(f.quote `Property ${property} does not exist on type ${variable.type}`, expr.nodes[1]);
                        if (propertyStatement.accessModifier == "private" && !this.canAccessClass(variable.type))
                            fail(f.quote `Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
                        const outputType = this.resolveVariableType(propertyStatement.varType);
                        if (arg2 == "variable") {
                            return {
                                type: outputType,
                                declaration: variable.declaration,
                                mutable: true,
                                get value() { return variable.value.properties[property]; },
                                set value(val) {
                                    variable.value.properties[property] = val;
                                }
                            };
                        }
                        else {
                            const value = arg2;
                            variable.value[property] = this.evaluateExpr(value, outputType)[1];
                        }
                    }
                    else
                        fail(f.quote `Cannot access property ${property} on variable of type ${variable.type} because it is not a record or class type and cannot have proprties`, expr.nodes[0]);
                }
                else {
                    const type = arg2;
                    if (expr.nodes[0] instanceof Token && expr.nodes[0].type == "keyword.super") {
                        if (!this.classData)
                            fail(`SUPER is only valid within a class`, expr.nodes[0]);
                        const baseType = this.classData.clazz.baseClass ?? fail(`SUPER does not exist for class ${this.classData.clazz.fmtQuoted()} because it does not inherit from any other class`, expr.nodes[0]);
                        const [clazz, method] = baseType.allMethods[property] ?? fail(f.quote `Method ${property} does not exist on SUPER (class ${baseType.fmtPlain()})`, expr.nodes[1]);
                        return {
                            clazz, method, instance: this.classData.instance
                        };
                    }
                    const [objType, obj] = this.evaluateExpr(expr.nodes[0]);
                    if (objType instanceof RecordVariableType) {
                        if (type == "function")
                            fail(f.quote `Expected this expression to evaluate to a function, but found a property access on a variable of type ${type}, which cannot have functions as properties`);
                        const outputType = objType.fields[property] ?? fail(f.quote `Property ${property} does not exist on value of type ${objType}`, expr.nodes[1]);
                        const value = obj[property];
                        if (value === null)
                            fail(f.text `Cannot use the value of uninitialized variable "${expr.nodes[0]}.${property}"`, expr.nodes[1]);
                        return this.finishEvaluation(value, outputType, type);
                    }
                    else if (objType instanceof ClassVariableType) {
                        const classInstance = obj;
                        const classType = classInstance.type;
                        if (type == "function") {
                            const [clazz, method] = objType.allMethods[property]
                                ? (classType.allMethods[property] ?? crash(`Inherited method not present`))
                                : classType.allMethods[property]
                                    ? fail(f.quote `Method ${property} does not exist on type ${objType}.
The data in the variable ${expr.nodes[0]} is of type ${classType.fmtPlain()} which has the method, \
but the type of the variable is ${objType.fmtPlain()}.
help: change the type of the variable to ${classType.fmtPlain()}`, expr.nodes[1])
                                    : fail(f.quote `Method ${property} does not exist on type ${objType}`, expr.nodes[1]);
                            if (method.controlStatements[0].accessModifier == "private" && !this.canAccessClass(objType))
                                fail(f.quote `Method ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
                            return { method, instance: classInstance, clazz };
                        }
                        else {
                            const propertyStatement = objType.properties[property] ?? (classType.properties[property]
                                ? fail(f.quote `Property ${property} does not exist on type ${objType}.
The data in the variable ${expr.nodes[0]} is of type ${classType.fmtPlain()} which has the property, \
but the type of the variable is ${objType.fmtPlain()}.
help: change the type of the variable to ${classType.fmtPlain()}`, expr.nodes[1])
                                : fail(f.quote `Property ${property} does not exist on type ${objType}`, expr.nodes[1]));
                            if (propertyStatement.accessModifier == "private" && !this.canAccessClass(objType))
                                fail(f.quote `Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
                            const outputType = this.resolveVariableType(propertyStatement.varType);
                            const value = obj.properties[property];
                            if (value === null)
                                fail(f.text `Cannot use the value of uninitialized variable "${expr.nodes[0]}.${property}"`, expr.nodes[1]);
                            return this.finishEvaluation(value, outputType, type);
                        }
                    }
                    else
                        fail(f.quote `Cannot access property on value of type ${objType} because it is not a record type and cannot have proprties`, expr.nodes[0]);
                }
            }
            evaluateExpr(expr, type, _recursive = false) {
                if (expr == undefined)
                    crash(`expr was ${expr}`);
                if (expr instanceof Token)
                    return this.evaluateToken(expr, type);
                if (expr instanceof ExpressionASTArrayAccessNode) {
                    if (type == "function")
                        fail(`Expected this expression to evaluate to a function, but found an array access, which cannot return a function.`);
                    return this.processArrayAccess(expr, "get", type);
                }
                if (expr instanceof ExpressionASTFunctionCallNode) {
                    if (type == "variable")
                        fail(`Expected this expression to evaluate to a variable, but found a function call, which can only return values, not variables.`);
                    if (type == "function")
                        fail(`Expected this expression to evaluate to a function, but found a function call, which cannot return a function.`);
                    const func = this.evaluateExpr(expr.functionName, "function");
                    if ("clazz" in func) {
                        if (func.method.type == "class_procedure")
                            fail(f.quote `Expected this expression to return a value, but the function ${expr.functionName} is a procedure which does not return a value`);
                        const [outputType, output] = this.callClassMethod(func.method, func.clazz, func.instance, expr.args, true);
                        return this.finishEvaluation(output, outputType, type);
                    }
                    else if ("name" in func) {
                        const output = this.callBuiltinFunction(func, expr.args);
                        return this.finishEvaluation(output[1], output[0], type);
                    }
                    else {
                        if (func.type == "procedure")
                            fail(f.quote `Procedure ${expr.functionName} does not return a value.`);
                        const statement = func.controlStatements[0];
                        const output = this.callFunction(func, expr.args, true);
                        return this.finishEvaluation(output, this.resolveVariableType(statement.returnType), type);
                    }
                }
                if (expr instanceof ExpressionASTClassInstantiationNode) {
                    if (type == "variable" || type == "function")
                        fail(`Expected this expression to evaluate to a ${type}, but found a class instantiation expression, which can only return a class instance, not a ${type}.`);
                    const clazz = this.getClass(expr.className.text);
                    const output = clazz.construct(this, expr.args);
                    return this.finishEvaluation(output, clazz, type);
                }
                if (expr.operator.category == "special") {
                    switch (expr.operator) {
                        case operators.access:
                            return this.processRecordAccess(expr, "get", type);
                        case operators.pointer_reference: {
                            if (type == "variable" || type == "function")
                                fail(`Expected this expression to evaluate to a ${type}, but found a referencing expression, which returns a pointer`);
                            if (type && !(type instanceof PointerVariableType))
                                fail(f.quote `Expected result to be of type ${type}, but the reference operator will return a pointer`);
                            let variable;
                            try {
                                variable = this.evaluateExpr(expr.nodes[0], "variable", true);
                            }
                            catch (err) {
                                if (err instanceof SoodocodeError) {
                                    const [targetType, targetValue] = this.evaluateExpr(expr.nodes[0], type?.target, true);
                                    const pointerType = this.getPointerTypeFor(targetType) ?? fail(f.quote `Cannot find a pointer type for ${targetType}`);
                                    return this.finishEvaluation({
                                        type: targetType,
                                        declaration: "dynamic",
                                        mutable: true,
                                        value: targetValue
                                    }, pointerType, type);
                                }
                                else
                                    throw err;
                            }
                            const pointerType = this.getPointerTypeFor(variable.type) ?? fail(f.quote `Cannot find a pointer type for ${variable.type}`);
                            return this.finishEvaluation(variable, pointerType, type);
                        }
                        case operators.pointer_dereference: {
                            if (type == "function")
                                fail(`Expected this expression to evaluate to a function, but found a dereferencing expression, which cannot return a function`);
                            const [pointerVariableType, variableValue] = this.evaluateExpr(expr.nodes[0], undefined, true);
                            if (variableValue == null)
                                fail(`Cannot dereference uninitialized pointer`, expr.nodes[0]);
                            if (!(pointerVariableType instanceof PointerVariableType))
                                fail(f.quote `Cannot dereference value of type ${pointerVariableType} because it is not a pointer`, expr.nodes[0]);
                            const pointerVariableData = variableValue;
                            if (type == "variable") {
                                if (!pointerVariableData.mutable)
                                    fail(`Cannot assign to constant`, expr);
                                return pointerVariableData;
                            }
                            else {
                                if (pointerVariableData.value == null)
                                    fail(f.quote `Cannot dereference ${expr.nodes[0]} and use the value, because the underlying value has not been initialized`, expr.nodes[0]);
                                return this.finishEvaluation(pointerVariableData.value, pointerVariableType.target, type);
                            }
                        }
                        default: impossible();
                    }
                }
                if (type == "variable" || type == "function")
                    fail(`Cannot evaluate this expression as a ${type}`);
                if (type?.is("REAL", "INTEGER") || expr.operator.category == "arithmetic") {
                    if (type && !type.is("REAL", "INTEGER"))
                        fail(f.quote `expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`);
                    const guessedType = type ?? PrimitiveVariableType.REAL;
                    let value;
                    if (expr.operator.type == "unary_prefix") {
                        const [_operandType, operand] = this.evaluateExpr(expr.nodes[0], guessedType, true);
                        switch (expr.operator) {
                            case operators.negate:
                                return [PrimitiveVariableType.INTEGER, -operand];
                            default: crash("impossible");
                        }
                    }
                    const [_leftType, left] = this.evaluateExpr(expr.nodes[0], guessedType, true);
                    const [_rightType, right] = this.evaluateExpr(expr.nodes[1], guessedType, true);
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
                                fail(`Division by zero`);
                            value = left / right;
                            if (type?.is("INTEGER"))
                                fail(`Arithmetic operation evaluated to value of type REAL, cannot be coerced to INTEGER
help: try using DIV instead of / to produce an integer as the result`);
                            break;
                        case operators.integer_divide:
                            if (right == 0)
                                fail(`Division by zero`);
                            value = Math.trunc(left / right);
                            break;
                        case operators.mod:
                            if (right == 0)
                                fail(`Division by zero`);
                            value = left % right;
                            break;
                        default:
                            fail(f.quote `Expected the expression to evaluate to a value of type ${type ?? impossible()}, but the operator ${expr.operator} produces a result of another type`);
                    }
                    return [guessedType, value];
                }
                if (type?.is("BOOLEAN") || expr.operator.category == "logical") {
                    if (type && !type.is("BOOLEAN"))
                        fail(f.quote `Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`);
                    if (expr.operator.type == "unary_prefix") {
                        switch (expr.operator) {
                            case operators.not:
                                return [PrimitiveVariableType.BOOLEAN, !this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true)[1]];
                            default: crash("impossible");
                        }
                    }
                    switch (expr.operator) {
                        case operators.and:
                            return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true)[1] && this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true)[1]];
                        case operators.or:
                            return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true)[1] || this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true)[1]];
                        case operators.equal_to:
                        case operators.not_equal_to: {
                            const [leftType, left] = this.evaluateExpr(expr.nodes[0], undefined, true);
                            const [rightType, right] = this.evaluateExpr(expr.nodes[1], undefined, true);
                            const typesMatch = (leftType == rightType) ||
                                (leftType.is("INTEGER") && rightType.is("REAL")) ||
                                (leftType.is("REAL") && rightType.is("INTEGER"));
                            const is_equal = typesMatch && (left == right);
                            if (expr.operator == operators.equal_to)
                                return [PrimitiveVariableType.BOOLEAN, is_equal];
                            else
                                return [PrimitiveVariableType.BOOLEAN, !is_equal];
                        }
                        case operators.greater_than:
                            return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] > this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
                        case operators.greater_than_equal:
                            return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] >= this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
                        case operators.less_than:
                            return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] < this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
                        case operators.less_than_equal:
                            return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] <= this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
                        default:
                            fail(f.quote `Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns another type`);
                    }
                }
                if (type?.is("STRING") || expr.operator.category == "string") {
                    if (type && !type.is("STRING"))
                        fail(f.quote `expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`);
                    switch (expr.operator) {
                        case operators.string_concatenate:
                            return [PrimitiveVariableType.STRING, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.STRING, true)[1] + this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.STRING, true)[1]];
                        default:
                            fail(f.quote `Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns another type`);
                    }
                }
                expr.operator.category;
                impossible();
            }
            evaluateToken(token, type) {
                if (token.type == "name") {
                    if (type == "function")
                        return this.getFunction(token);
                    const enumType = this.getEnumFromValue(token.text);
                    if (enumType) {
                        if (type == "variable")
                            fail(f.quote `Cannot evaluate enum value ${token.text} as a variable`);
                        return this.finishEvaluation(token.text, enumType, type);
                    }
                    else {
                        const variable = this.getVariable(token.text) ?? this.handleNonexistentVariable(token.text, token.range);
                        if (type == "variable")
                            return variable;
                        if (variable.value == null)
                            fail(`Cannot use the value of uninitialized variable ${token.text}`);
                        return this.finishEvaluation(variable.value, variable.type, type);
                    }
                }
                if (type == "variable" || type == "function")
                    fail(f.quote `Cannot evaluate token ${token.text} as a ${type}`);
                switch (token.type) {
                    case "boolean.false":
                        if (!type || type.is("BOOLEAN"))
                            return [PrimitiveVariableType.BOOLEAN, false];
                        else if (type.is("STRING"))
                            return [PrimitiveVariableType.STRING, "FALSE"];
                        else
                            fail(f.text `Cannot convert value FALSE to type ${type}`);
                        break;
                    case "boolean.true":
                        if (!type || type.is("BOOLEAN"))
                            return [PrimitiveVariableType.BOOLEAN, true];
                        else if (type.is("STRING"))
                            return [PrimitiveVariableType.STRING, "TRUE"];
                        else
                            fail(f.text `Cannot convert value TRUE to type ${type}`);
                        break;
                    case "number.decimal":
                        if (!type || type.is("INTEGER", "REAL", "STRING")) {
                            const val = Number(token.text);
                            if (!Number.isFinite(val))
                                fail(f.quote `Value ${token} cannot be converted to a number: too large`);
                            if (type?.is("INTEGER")) {
                                if (!Number.isInteger(val))
                                    fail(f.quote `Value ${token} cannot be converted to an integer`);
                                if (!Number.isSafeInteger(val))
                                    fail(f.quote `Value ${token} cannot be converted to an integer: too large`);
                                return [PrimitiveVariableType.INTEGER, val];
                            }
                            else if (type?.is("STRING")) {
                                return [PrimitiveVariableType.STRING, token.text];
                            }
                            else {
                                return [PrimitiveVariableType.REAL, val];
                            }
                        }
                        else
                            fail(f.quote `Cannot convert number to type ${type}`);
                        break;
                    case "string":
                        if (!type || type.is("STRING"))
                            return [PrimitiveVariableType.STRING, token.text.slice(1, -1)];
                        else
                            fail(f.quote `Cannot convert value ${token} to type ${type}`);
                        break;
                    case "char":
                        if (!type || type.is("CHAR") || type.is("STRING"))
                            return [PrimitiveVariableType.CHAR, token.text.slice(1, -1)];
                        else
                            fail(f.quote `Cannot convert value ${token} to type ${type}`);
                        break;
                    default: fail(f.quote `Cannot evaluate token ${token}`);
                }
            }
            static evaluateToken(token, type) {
                try {
                    return this.prototype.evaluateToken.call(new Proxy({}, {
                        get() { throw new _a.NotStaticError(); },
                    }), token, type);
                }
                catch (err) {
                    if (err instanceof _a.NotStaticError)
                        fail(f.quote `Cannot evaluate token ${token} in a static context`, token);
                    else
                        throw err;
                }
            }
            resolveVariableType(type) {
                if (type instanceof PrimitiveVariableType)
                    return type;
                else if (type instanceof ArrayVariableType) {
                    type.init(this);
                    return type;
                }
                else
                    return this.getType(type[1]) ?? this.handleNonexistentType(type[1], type[2]);
            }
            handleNonexistentType(name, range) {
                const allTypes = [
                    ...this.scopes.flatMap(s => Object.entries(s.types)),
                    ...PrimitiveVariableType.all.map(t => [t.name, t])
                ];
                if (PrimitiveVariableType.get(name.toUpperCase()))
                    fail(f.quote `Type ${name} does not exist\nhelp: perhaps you meant ${name.toUpperCase()} (uppercase)`, range);
                if (this.currentlyResolvingTypeName == name)
                    fail(f.quote `Type ${name} does not exist yet, it is currently being initialized`, range);
                let found;
                if ((found =
                    min(allTypes, t => biasedLevenshtein(t[0], name) ?? Infinity, 2.5)) != undefined) {
                    fail(f.quote `Type ${name} does not exist\nhelp: perhaps you meant ${found[1]}`, range);
                }
                fail(f.quote `Type ${name} does not exist`, range);
            }
            handleNonexistentFunction(name, range) {
                const allFunctions = [
                    ...Object.entries(this.functions),
                    ...Object.entries(builtinFunctions),
                ];
                if (builtinFunctions[name.toUpperCase()])
                    fail(f.quote `Function ${name} does not exist\nhelp: perhaps you meant ${name.toUpperCase()} (uppercase)`, range);
                let found;
                if ((found =
                    min(allFunctions, t => biasedLevenshtein(t[0], name) ?? Infinity, 3)) != undefined) {
                    fail(f.quote `Function ${name} does not exist\nhelp: perhaps you meant ${found[0]}`, range);
                }
                fail(f.quote `Function ${name} does not exist`, range);
            }
            handleNonexistentVariable(name, range) {
                const allVariables = [
                    ...this.scopes.flatMap(s => Object.keys(s.variables)),
                ];
                let found;
                if ((found =
                    min(allVariables, t => biasedLevenshtein(t, name) ?? Infinity, 2)) != undefined) {
                    fail(f.quote `Variable ${name} does not exist\nhelp: perhaps you meant ${found}`, range);
                }
                fail(f.quote `Variable ${name} does not exist`, range);
            }
            getVariable(name) {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    if (this.scopes[i].variables[name])
                        return this.scopes[i].variables[name];
                }
                return null;
            }
            getType(name) {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    if (this.scopes[i].types[name])
                        return this.scopes[i].types[name];
                }
                return null;
            }
            getEnumFromValue(name) {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    const data = Object.values(this.scopes[i].types)
                        .find((data) => data instanceof EnumeratedVariableType && data.values.includes(name));
                    if (data)
                        return data;
                }
                return null;
            }
            getPointerTypeFor(type) {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    const data = Object.values(this.scopes[i].types)
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
                    if (statement.constructor == FunctionStatement || statement.constructor == ProcedureStatement)
                        return false;
                }
                return false;
            }
            getFunction({ text, range }) {
                if (this.classData && this.classData.clazz.allMethods[text]) {
                    const [clazz, method] = this.classData.clazz.allMethods[text];
                    return { clazz, method, instance: this.classData.instance };
                }
                else
                    return this.functions[text] ?? builtinFunctions[text] ?? this.handleNonexistentFunction(text, range);
            }
            getClass(name) {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    if (this.scopes[i].types[name]) {
                        if (!(this.scopes[i].types[name] instanceof ClassVariableType))
                            fail(f.quote `Type ${name} is not a class, it is ${this.scopes[i].types[name]}`);
                        return this.scopes[i].types[name];
                    }
                }
                fail(f.quote `Class ${name} has not been defined.`);
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
            coerceValue(value, from, to) {
                if (typesAssignable(to, from))
                    return value;
                if (from.is("STRING") && to.is("CHAR"))
                    return value;
                if (from.is("INTEGER") && to.is("REAL"))
                    return value;
                if (from.is("REAL") && to.is("INTEGER"))
                    return Math.trunc(value);
                if (to.is("STRING")) {
                    if (from.is("BOOLEAN"))
                        return value.toString().toUpperCase();
                    if (from.is("INTEGER") || from.is("REAL") || from.is("CHAR") || from.is("STRING") || from.is("DATE"))
                        return value.toString();
                    if (from instanceof ArrayVariableType)
                        return `[${value.join(",")}]`;
                }
                fail(f.quote `Cannot coerce value of type ${from} to ${to}`);
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
                    return value.slice().map(v => this.cloneValue(type.type ?? crash(`Cannot clone value in an array of unknown type`), v));
                if (type instanceof PointerVariableType)
                    return value;
                if (type instanceof RecordVariableType)
                    return Object.fromEntries(Object.entries(value)
                        .map(([k, v]) => [k, this.cloneValue(type.fields[k], v)]));
                if (type instanceof ClassVariableType)
                    return {
                        properties: Object.fromEntries(Object.entries(value.properties)
                            .map(([k, v]) => [k, this.cloneValue(this.resolveVariableType(type.properties[k].varType), v)])),
                        type: value.type
                    };
                crash(f.quote `Cannot clone value of type ${type}`);
            }
            assembleScope(func, args) {
                if (func.args.size != args.length)
                    fail(f.quote `Incorrect number of arguments for function ${func.name}`);
                const scope = {
                    statement: func,
                    variables: {},
                    types: {},
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
                            get value() { return varData.value ?? fail(`Variable (passed by reference) has not been initialized`); },
                            set value(value) { varData.value = value; }
                        };
                    }
                    else {
                        const [type, value] = this.evaluateExpr(args[i], rType);
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
                    fail(`Cannot use return value of ${func.name}() as it is a procedure`);
                const scope = this.assembleScope(func, args);
                const output = this.runBlock(funcNode.nodeGroups[0], scope);
                if (func instanceof ProcedureStatement) {
                    return null;
                }
                else {
                    if (!output)
                        fail(f.quote `Function ${func.name} did not return a value`);
                    return output.value;
                }
            }
            callClassMethod(method, clazz, instance, args, requireReturnValue) {
                const func = method.controlStatements[0];
                if (func instanceof ClassProcedureStatement && requireReturnValue === true)
                    fail(`Cannot use return value of ${func.name}() as it is a procedure`);
                if (func instanceof ClassFunctionStatement && requireReturnValue === false)
                    fail(`CALL cannot be used on functions because "Functions should only be called as part of an expression." according to Cambridge.`);
                const classScope = instance.type.getScope(this, instance);
                const methodScope = this.assembleScope(func, args);
                const previousClassData = this.classData;
                this.classData = { instance, method, clazz };
                const output = this.runBlock(method.nodeGroups[0], classScope, methodScope);
                this.classData = previousClassData;
                if (func instanceof ClassProcedureStatement) {
                    return null;
                }
                else {
                    return (output ? [this.resolveVariableType(func.returnType), output.value] : fail(f.quote `Function ${func.name} did not return a value`));
                }
            }
            callBuiltinFunction(fn, args, returnType) {
                if (fn.args.size != args.length)
                    fail(f.quote `Incorrect number of arguments for function ${fn.name}`);
                if (!fn.returnType)
                    fail(f.quote `Builtin function ${fn.name} does not return a value`);
                const processedArgs = [];
                let i = 0;
                nextArg: for (const { type } of fn.args.values()) {
                    const errors = [];
                    for (const possibleType of type) {
                        if (tryRunOr(() => {
                            processedArgs.push(this.evaluateExpr(args[i], possibleType)[1]);
                            i++;
                        }, err => errors.push(err)))
                            continue nextArg;
                    }
                    throw errors.at(-1);
                }
                if (returnType)
                    return [returnType, this.coerceValue(fn.impl.apply(this, processedArgs), fn.returnType, returnType)];
                else
                    return [fn.returnType, fn.impl.apply(this, processedArgs)];
            }
            runBlock(code, ...scopes) {
                this.scopes.push(...scopes);
                let returned = null;
                const [typeNodes, others] = separateArray(code, (c) => c instanceof TypeStatement ||
                    c instanceof ProgramASTBranchNode && c.controlStatements[0] instanceof TypeStatement);
                const types = [];
                for (const node of typeNodes) {
                    let type, name;
                    if (node instanceof Statement) {
                        [name, type] = node.createType(this);
                    }
                    else {
                        [name, type] = node.controlStatements[0].runTypeBlock(this, node);
                    }
                    if (this.getCurrentScope().types[name])
                        fail(f.quote `Type ${name} was declared twice`);
                    this.getCurrentScope().types[name] = type;
                    types.push(type);
                }
                for (const type of types) {
                    type.init(this);
                }
                for (const node of others) {
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
            runProgram(code) {
                this.runBlock(code, {
                    statement: "global",
                    variables: {},
                    types: {}
                });
                for (const filename in this.openFiles) {
                    if (this.openFiles[filename] == undefined)
                        delete this.openFiles[filename];
                    else
                        fail(f.quote `File ${filename} was not closed`);
                }
            }
            getOpenFile(filename, modes, operationDescription) {
                const data = (this.openFiles[filename] ?? fail(f.quote `File ${filename} is not open or does not exist.`));
                if (modes && operationDescription && !modes.includes(data.mode))
                    fail(f.quote `${operationDescription} requires the file to have been opened with mode ${modes.map(m => `"${m}"`).join(" or ")}, but the mode is ${data.mode}`);
                return data;
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _processArrayAccess_decorators = [errorBoundary()];
            _processRecordAccess_decorators = [errorBoundary()];
            _evaluateExpr_decorators = [errorBoundary({
                    predicate: (_expr, _type, recursive) => !recursive,
                    message: () => `Cannot evaluate expression $rc: `
                })];
            __esDecorate(_a, null, _processArrayAccess_decorators, { kind: "method", name: "processArrayAccess", static: false, private: false, access: { has: obj => "processArrayAccess" in obj, get: obj => obj.processArrayAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(_a, null, _processRecordAccess_decorators, { kind: "method", name: "processRecordAccess", static: false, private: false, access: { has: obj => "processRecordAccess" in obj, get: obj => obj.processRecordAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(_a, null, _evaluateExpr_decorators, { kind: "method", name: "evaluateExpr", static: false, private: false, access: { has: obj => "evaluateExpr" in obj, get: obj => obj.evaluateExpr }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a.NotStaticError = class extends Error {
        },
        _a;
})();
export { Runtime };
