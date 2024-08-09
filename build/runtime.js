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
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ProgramASTBranchNode, operators } from "./parser-types.js";
import { ArrayVariableType, ClassVariableType, EnumeratedVariableType, PointerVariableType, PrimitiveVariableType, RecordVariableType, typesAssignable, typesEqual } from "./runtime-types.js";
import { ClassFunctionStatement, ClassProcedureStatement, ClassStatement, ConstantStatement, FunctionStatement, ProcedureStatement, Statement, TypeStatement } from "./statements.js";
import { biasedLevenshtein, boxPrimitive, crash, errorBoundary, f, fail, forceType, groupArray, impossible, min, rethrow, tryRun, tryRunOr } from "./utils.js";
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
                this.currentlyResolvingPointerTypeName = null;
                this.fs = new Files();
                this.builtinFunctions = getBuiltinFunctions();
            }
            finishEvaluation(value, from, to) {
                if (to && to instanceof ArrayVariableType && (!to.lengthInformation || !to.elementType))
                    return [from, this.coerceValue(value, from, to)];
                else if (to)
                    return [to, this.coerceValue(value, from, to)];
                else
                    return [from, value];
            }
            processArrayAccess(expr, outType) {
                const _target = this.evaluateExpr(expr.target, "variable");
                if (!(_target.type instanceof ArrayVariableType))
                    fail(f.quote `Cannot convert variable of type ${_target.type} to an array`, expr.target);
                const target = _target;
                const targetType = target.type;
                if (!targetType.lengthInformation)
                    crash(`Cannot access elements in an array of unknown length`);
                if (!targetType.elementType)
                    crash(`Cannot access elements in an array of unknown type`);
                if (outType instanceof ArrayVariableType)
                    fail(f.quote `Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${outType}, but the array access produces a result of type ${targetType.elementType}`, expr.target);
                if (expr.indices.length != targetType.lengthInformation.length)
                    fail(`Cannot evaluate expression starting with "array access": \
${targetType.lengthInformation.length}-dimensional array requires ${targetType.lengthInformation.length} indices, \
but found ${expr.indices.length} indices`, expr.indices);
                const indexes = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER)[1]]);
                let invalidIndexIndex;
                if ((invalidIndexIndex = indexes.findIndex(([_expr, value], index) => value > targetType.lengthInformation[index][1] ||
                    value < targetType.lengthInformation[index][0])) != -1)
                    fail(`Array index out of bounds: \
value ${indexes[invalidIndexIndex][1]} was not in range \
(${targetType.lengthInformation[invalidIndexIndex].join(" to ")})`, indexes[invalidIndexIndex][0]);
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
                    fail(f.text `Cannot use the value of uninitialized variable ${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]`, expr.target);
                return this.finishEvaluation(output, targetType.elementType, outType);
            }
            processRecordAccess(expr, outType) {
                if (!(expr.nodes[1] instanceof Token))
                    crash(`Second node in record access expression was not a token`);
                const property = expr.nodes[1].text;
                if (expr.nodes[0] instanceof Token && expr.nodes[0].type == "keyword.super") {
                    if (!this.classData)
                        fail(`SUPER is only valid within a class`, expr.nodes[0]);
                    const baseType = this.classData.clazz.baseClass ?? fail(`SUPER does not exist for class ${this.classData.clazz.fmtQuoted()} because it does not inherit from any other class`, expr.nodes[0]);
                    if (!(outType == "function"))
                        fail(`Expected this expression to evaluate to a value, but it is a member access on SUPER, which can only return methods`, expr);
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
                    targetType = target.type;
                    targetValue = target.value;
                }
                else {
                    [targetType, targetValue] = this.evaluateExpr(expr.nodes[0]);
                }
                if (targetType instanceof RecordVariableType) {
                    forceType(targetValue);
                    const outputType = targetType.fields[property]?.[0] ?? fail(f.quote `Property ${property} does not exist on type ${targetType}`, expr.nodes[1]);
                    if (outType == "variable") {
                        return {
                            type: outputType,
                            declaration: (target).declaration,
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
                        return this.finishEvaluation(value, outputType, outType);
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
                            return this.finishEvaluation(value, outputType, outType);
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
                const [valType, val] = this.evaluateExpr(src, variable.assignabilityType ?? variable.type);
                variable.value = val;
                variable.updateType?.(valType);
            }
            evaluateExpr(expr, type, _recursive = false) {
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
                        const [outputType, output] = this.callClassMethod(func.method, func.clazz, func.instance, expr.args, true);
                        return this.finishEvaluation(output, outputType, type);
                    }
                    else if ("name" in func) {
                        const output = this.callBuiltinFunction(func, expr.args);
                        return this.finishEvaluation(output[1], output[0], type);
                    }
                    else {
                        if (func.type == "procedure")
                            fail(f.quote `Procedure ${expr.functionName} does not return a value.`, expr.functionName);
                        const statement = func.controlStatements[0];
                        const output = this.callFunction(func, expr.args, true);
                        return this.finishEvaluation(output, this.resolveVariableType(statement.returnType), type);
                    }
                }
                if (expr instanceof ExpressionASTClassInstantiationNode) {
                    if (type == "variable" || type == "function")
                        fail(`Expected this expression to evaluate to a ${type}, but found a class instantiation expression, which can only return a class instance, not a ${type}.`, expr);
                    const clazz = this.getClass(expr.className.text, expr.className.range);
                    const output = clazz.construct(this, expr.args);
                    return this.finishEvaluation(output, clazz, type);
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
                                const [targetType, targetValue] = this.evaluateExpr(expr.nodes[0], type?.target, true);
                                const pointerType = this.getPointerTypeFor(targetType) ?? fail(f.quote `Cannot find a pointer type for ${targetType}`, expr.operatorToken, expr);
                                if (!configs.pointers.implicit_variable_creation.value)
                                    rethrow(err, m => m + `\n${configs.pointers.implicit_variable_creation.errorHelp}`);
                                return this.finishEvaluation({
                                    type: targetType,
                                    declaration: "dynamic",
                                    mutable: true,
                                    value: targetValue
                                }, pointerType, type);
                            }
                            const pointerType = this.getPointerTypeFor(variable.type) ?? fail(f.quote `Cannot find a pointer type for ${variable.type}`, expr.operatorToken, expr);
                            return this.finishEvaluation(variable, pointerType, type);
                        }
                        case operators.pointer_dereference: {
                            if (type == "function")
                                fail(`Expected this expression to evaluate to a function, but found a dereferencing expression, which cannot return a function`, expr);
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
                    fail(`Cannot evaluate this expression as a ${type}`, expr);
                if (type?.is("REAL", "INTEGER") || expr.operator.category == "arithmetic") {
                    if (type && !(type.is("REAL", "INTEGER") || type instanceof EnumeratedVariableType))
                        fail(f.quote `expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`, expr);
                    let guessedType = type ?? PrimitiveVariableType.REAL;
                    let value;
                    if (expr.operator.type == "unary_prefix") {
                        const [_operandType, operand] = this.evaluateExpr(expr.nodes[0], guessedType, true);
                        switch (expr.operator) {
                            case operators.negate:
                                return [PrimitiveVariableType.INTEGER, -operand];
                            default: crash("impossible");
                        }
                    }
                    let _leftType, left, _rightType, right;
                    if (expr.operator == operators.add || expr.operator == operators.subtract) {
                        [_leftType, left] = this.evaluateExpr(expr.nodes[0], undefined, true);
                        [_rightType, right] = this.evaluateExpr(expr.nodes[1], undefined, true);
                    }
                    else {
                        [_leftType, left] = this.evaluateExpr(expr.nodes[0], guessedType, true);
                        [_rightType, right] = this.evaluateExpr(expr.nodes[1], guessedType, true);
                    }
                    if (_leftType instanceof EnumeratedVariableType) {
                        left = left;
                        if (type && !(type instanceof EnumeratedVariableType))
                            fail(f.quote `expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
                        const other = this.coerceValue(right, _rightType, PrimitiveVariableType.INTEGER);
                        const value = _leftType.values.indexOf(left);
                        if (value == -1)
                            crash(`enum fail`);
                        if (expr.operator == operators.add) {
                            return this.finishEvaluation(_leftType.values[value + other] ?? fail(f.text `Cannot add ${other} to enum value "${left}": no corresponding value in ${_leftType}`, expr), _leftType, type);
                        }
                        else if (expr.operator == operators.subtract) {
                            return this.finishEvaluation(_leftType.values[value + other] ?? fail(f.text `Cannot subtract ${other} from enum value "${left}": no corresponding value in ${_leftType}`, expr), _leftType, type);
                        }
                        else
                            fail(f.quote `Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[0]);
                    }
                    else if (_rightType instanceof EnumeratedVariableType) {
                        right = right;
                        if (type && !(type instanceof EnumeratedVariableType))
                            fail(f.quote `expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
                        const other = this.coerceValue(left, _leftType, PrimitiveVariableType.INTEGER);
                        const value = _rightType.values.indexOf(right);
                        if (value == -1)
                            crash(`enum fail`);
                        if (expr.operator == operators.add) {
                            return this.finishEvaluation(_rightType.values[value + other] ?? fail(f.quote `Cannot add ${other} to ${value}: no corresponding value in ${_rightType}`, expr), _rightType, type);
                        }
                        else if (expr.operator == operators.subtract) {
                            fail(`Cannot subtract an enum value from a number`, expr);
                        }
                        else
                            fail(f.quote `Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[1]);
                    }
                    else {
                        if (_leftType != guessedType) {
                            left = this.coerceValue(left, _leftType, guessedType, expr.nodes[0]);
                            _leftType = guessedType;
                        }
                        if (_rightType != guessedType) {
                            right = this.coerceValue(right, _rightType, guessedType, expr.nodes[1]);
                            _rightType = guessedType;
                        }
                        forceType(left);
                        forceType(right);
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
                    return [guessedType, value];
                }
                if (type?.is("BOOLEAN") || expr.operator.category == "logical") {
                    if (type && !type.is("BOOLEAN"))
                        fail(f.quote `Expected this expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`, expr);
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
                            fail(f.quote `Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns another type`, expr);
                    }
                }
                if (type?.is("STRING") || expr.operator.category == "string") {
                    if (type && !type.is("STRING"))
                        fail(f.quote `expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`, expr);
                    switch (expr.operator) {
                        case operators.string_concatenate:
                            return [PrimitiveVariableType.STRING, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.STRING, true)[1] + this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.STRING, true)[1]];
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
                    const enumType = this.getEnumFromValue(token.text);
                    if (enumType) {
                        if (type == "variable")
                            fail(f.quote `Cannot evaluate enum value ${token.text} as a variable`, token);
                        return this.finishEvaluation(token.text, enumType, type);
                    }
                    else {
                        const variable = this.getVariable(token.text) ?? this.handleNonexistentVariable(token.text, token.range);
                        if (type == "variable")
                            return variable;
                        if (variable.value == null)
                            fail(f.quote `Variable ${token.text} has not been initialized`, token);
                        return this.finishEvaluation(variable.value, variable.type, type);
                    }
                }
                if (type == "variable" || type == "function")
                    fail(f.quote `Cannot evaluate token ${token.text} as a ${type}`, token);
                switch (token.type) {
                    case "boolean.false":
                        if (!type || type.is("BOOLEAN"))
                            return [PrimitiveVariableType.BOOLEAN, false];
                        else if (type.is("STRING"))
                            return [PrimitiveVariableType.STRING, "FALSE"];
                        else
                            fail(f.text `Cannot convert value FALSE to type ${type}`, token);
                        break;
                    case "boolean.true":
                        if (!type || type.is("BOOLEAN"))
                            return [PrimitiveVariableType.BOOLEAN, true];
                        else if (type.is("STRING"))
                            return [PrimitiveVariableType.STRING, "TRUE"];
                        else
                            fail(f.text `Cannot convert value TRUE to type ${type}`, token);
                        break;
                    case "number.decimal":
                        if (!type || type.is("INTEGER", "REAL", "STRING")) {
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
                            fail(f.quote `Cannot convert number to type ${type}`, token);
                        break;
                    case "string":
                        if (!type || type.is("STRING"))
                            return [PrimitiveVariableType.STRING, token.text.slice(1, -1)];
                        else
                            fail(f.quote `Cannot convert value ${token} to type ${type}`, token);
                        break;
                    case "char":
                        if (!type || type.is("CHAR") || type.is("STRING"))
                            return [PrimitiveVariableType.CHAR, token.text.slice(1, -1)];
                        else
                            fail(f.quote `Cannot convert value ${token} to type ${type}`, token);
                        break;
                    default: fail(f.quote `Cannot evaluate token ${token}`, token);
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
                    if (this.scopes[i].opaque && i > 1)
                        i = 1;
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
                    if (scope.types[name]) {
                        if (!(scope.types[name] instanceof ClassVariableType))
                            fail(f.quote `Type ${name} is not a class, it is ${scope.types[name]}`, range);
                        return scope.types[name];
                    }
                }
                fail(f.quote `Class ${name} has not been defined.`, range);
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
            coerceValue(value, from, to, range) {
                let assignabilityError;
                if ((assignabilityError = typesAssignable(to, from)) === true)
                    return value;
                let disabledConfig = null;
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
                if (from.is("INTEGER") && to.is("REAL"))
                    return value;
                if (from.is("REAL") && to.is("INTEGER"))
                    return Math.trunc(value);
                if (to.is("STRING")) {
                    if (from.is("BOOLEAN")) {
                        if (configs.coercion.booleans_to_string.value)
                            return value.toString().toUpperCase();
                        else
                            disabledConfig = configs.coercion.booleans_to_string;
                    }
                    else if (from.is("INTEGER") || from.is("REAL")) {
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
                if (from instanceof EnumeratedVariableType && (to.is("INTEGER") || to.is("REAL"))) {
                    if (configs.coercion.enums_to_integer.value)
                        return from.values.indexOf(value);
                    else
                        disabledConfig = configs.coercion.enums_to_integer;
                }
                fail(f.quote `Cannot coerce value of type ${from} to ${to}` + (assignabilityError ? `: ${assignabilityError}.` :
                    disabledConfig ? `\nhelp: enable the config "${disabledConfig.name}" to allow this` : ""), range);
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
                        properties: Object.fromEntries(Object.entries(value.properties)
                            .map(([k, v]) => [k, this.cloneValue(type.properties[k][0], v)])),
                        propertyTypes: {},
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
                            get value() { return varData.value ?? fail(`Variable (passed by reference) has not been initialized`, args[i]); },
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
                    fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);
                const scope = this.assembleScope(func, args);
                const output = this.runBlock(funcNode.nodeGroups[0], scope);
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
                const output = this.runBlock(method.nodeGroups[0], classScope, methodScope);
                this.classData = previousClassData;
                if (func instanceof ClassProcedureStatement) {
                    return null;
                }
                else {
                    return (output ? [this.resolveVariableType(func.returnType), output.value] : fail(f.quote `Function ${func.name} did not return a value`, undefined));
                }
            }
            callBuiltinFunction(fn, args, returnType) {
                if (fn.args.size != args.length)
                    fail(f.quote `Incorrect number of arguments for function ${fn.name}`, undefined);
                if (!fn.returnType)
                    fail(f.quote `Builtin function ${fn.name} does not return a value`, undefined);
                const evaluatedArgs = [];
                let i = 0;
                nextArg: for (const { type } of fn.args.values()) {
                    const errors = [];
                    for (const possibleType of type) {
                        if (tryRunOr(() => {
                            evaluatedArgs.push([this.evaluateExpr(args[i], possibleType)[1], args[i].range]);
                            i++;
                        }, err => errors.push(err)))
                            continue nextArg;
                    }
                    throw errors.at(-1);
                }
                const processedArgs = evaluatedArgs.map(([value, range]) => Object.assign(boxPrimitive(value), { range }));
                if (returnType)
                    return [returnType, this.coerceValue(fn.impl.apply(this, processedArgs), fn.returnType, returnType)];
                else
                    return [fn.returnType, fn.impl.apply(this, processedArgs)];
            }
            runBlock(code, ...scopes) {
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
                for (const node of typeNodes) {
                    let name, type;
                    if (node instanceof Statement) {
                        [name, type] = node.createType(this);
                    }
                    else {
                        [name, type] = node.controlStatements[0].createTypeBlock(this, node);
                    }
                    if (this.getCurrentScope().types[name])
                        fail(f.quote `Type ${name} was defined twice`, node);
                    this.getCurrentScope().types[name] = type;
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
                    opaque: true,
                    variables: {},
                    types: {}
                });
                for (const [name, file] of Object.entries(this.openFiles)) {
                    if (file == undefined)
                        delete this.openFiles[name];
                    else
                        fail(f.quote `File ${name} was not closed`, file.openRange);
                }
            }
            getOpenFile(filename, modes, operationDescription) {
                const data = (this.openFiles[filename] ?? fail(f.quote `File ${filename} is not open or does not exist.`, undefined));
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
        _a.NotStaticError = class extends Error {
        },
        _a;
})();
export { Runtime };
