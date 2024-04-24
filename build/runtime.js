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
import { ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode } from "./parser-types.js";
import { operators } from "./parser.js";
import { ArrayVariableType, ClassVariableType, EnumeratedVariableType, PointerVariableType, PrimitiveVariableType, RecordVariableType, typesEqual } from "./runtime-types.js";
import { ClassProcedureStatement, FunctionStatement, ProcedureStatement, Statement } from "./statements.js";
import { SoodocodeError, crash, errorBoundary, fail, f, impossible } from "./utils.js";
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
                this.fs = new Files();
            }
            processArrayAccess(expr, operation, arg2) {
                const _variable = this.evaluateExpr(expr.target, "variable");
                if (!(_variable.type instanceof ArrayVariableType))
                    fail(f.quote `Cannot convert variable of type ${_variable.type} to an array`, expr.target);
                const variable = _variable;
                const varTypeData = variable.type;
                if (arg2 instanceof ArrayVariableType)
                    fail(f.quote `Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the array access produces a result of type ${varTypeData.type}`, expr.target);
                if (expr.indices.length != variable.type.lengthInformation.length)
                    fail(`Cannot evaluate expression starting with "array access": \
${variable.type.lengthInformation.length}-dimensional array requires ${variable.type.lengthInformation.length} indices, \
but found ${expr.indices.length} indices`, expr.indices);
                const indexes = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER)[1]]);
                let invalidIndexIndex;
                if ((invalidIndexIndex = indexes.findIndex(([_expr, value], index) => value > varTypeData.lengthInformation[index][1] ||
                    value < varTypeData.lengthInformation[index][0])) != -1)
                    fail(`Array index out of bounds: \
value ${indexes[invalidIndexIndex][1]} was not in range \
(${varTypeData.lengthInformation[invalidIndexIndex].join(" to ")})`, indexes[invalidIndexIndex][0]);
                const index = indexes.reduce((acc, [_expr, value], index) => (acc + value - varTypeData.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : varTypeData.arraySizes[index]), 0);
                if (index >= variable.value.length)
                    crash(`Array index bounds check failed`);
                if (operation == "get") {
                    const type = arg2;
                    if (type == "variable") {
                        return {
                            type: this.resolveVariableType(varTypeData.type),
                            declaration: variable.declaration,
                            mutable: true,
                            get value() { return variable.value[index]; },
                            set value(val) { variable.value[index] = val; }
                        };
                    }
                    const output = variable.value[index];
                    if (output == null)
                        fail(f.text `Cannot use the value of uninitialized variable ${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]`, expr.target);
                    if (type)
                        return [type, this.coerceValue(output, this.resolveVariableType(varTypeData.type), type)];
                    else
                        return [this.resolveVariableType(varTypeData.type), output];
                }
                else {
                    variable.value[index] = this.evaluateExpr(arg2, this.resolveVariableType(varTypeData.type))[1];
                }
            }
            processRecordAccess(expr, operation, arg2) {
                if (!(expr.nodes[1] instanceof Token))
                    impossible();
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
                        const outputType = this.resolveVariableType(variable.type.properties[property]?.varType ?? fail(f.quote `Property ${property} does not exist on type ${variable.type}`, expr.nodes[1]));
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
                    const [objType, obj] = this.evaluateExpr(expr.nodes[0]);
                    if (objType instanceof RecordVariableType) {
                        if (type == "function")
                            fail(f.quote `Expected this expression to evaluate to a function, but found a property access on a variable of type ${type}, which cannot have functions as properties`);
                        const outputType = objType.fields[property] ?? fail(f.quote `Property ${property} does not exist on value of type ${objType}`, expr.nodes[1]);
                        const value = obj[property];
                        if (value === null)
                            fail(f.text `Cannot use the value of uninitialized variable "${expr.nodes[0]}.${property}"`, expr.nodes[1]);
                        if (type)
                            return [type, this.coerceValue(value, outputType, type)];
                        else
                            return [outputType, value];
                    }
                    else if (objType instanceof ClassVariableType) {
                        if (type == "function") {
                            const method = objType.methods[property];
                            return [method, objType, obj];
                        }
                        else {
                            const outputType = this.resolveVariableType(objType.properties[property]?.varType ?? fail(f.quote `Property ${property} does not exist on type ${objType}`, expr.nodes[1]));
                            const value = obj.properties[property];
                            if (value === null)
                                fail(f.text `Cannot use the value of uninitialized variable "${expr.nodes[0]}.${property}"`, expr.nodes[1]);
                            if (type)
                                return [type, this.coerceValue(value, outputType, type)];
                            else
                                return [outputType, value];
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
                    if (expr.functionName instanceof Token) {
                        const fn = this.getFunction(expr.functionName.text);
                        if ("name" in fn) {
                            const output = this.callBuiltinFunction(fn, expr.args);
                            if (type)
                                return [type, this.coerceValue(output[1], output[0], type)];
                            else
                                return output;
                        }
                        else {
                            if (fn.type == "procedure")
                                fail(f.quote `Procedure ${expr.functionName} does not return a value.`);
                            const statement = fn.controlStatements[0];
                            const output = this.callFunction(fn, expr.args, true);
                            if (type)
                                return [type, this.coerceValue(output, this.resolveVariableType(statement.returnType), type)];
                            else
                                return [this.resolveVariableType(statement.returnType), output];
                        }
                    }
                    else if (expr.functionName instanceof ExpressionASTBranchNode) {
                        const func = this.evaluateExpr(expr.functionName, "function");
                        if (Array.isArray(func)) {
                            if (func[0].type == "class_procedure")
                                fail(f.quote `Expected this expression to return a value, but the function ${expr.functionName} is a procedure which does not return a value`);
                            return this.callClassMethod(func[0], func[1], func[2], expr.args, true);
                        }
                        else
                            crash(`Branched function call node should not be able to return regular functions`);
                    }
                    else
                        crash(`Function name was an unexpected node type`);
                }
                if (expr instanceof ExpressionASTClassInstantiationNode) {
                    if (type == "variable")
                        fail(`Expected this expression to evaluate to a variable, but found a class instantiation expression, which can only return a class instance, not a variable.`);
                    if (type == "function")
                        fail(`Expected this expression to evaluate to a function, but found a class instantiation expression, which can only return a class instance, not a function.`);
                    const clazz = this.getClass(expr.className.text);
                    const output = clazz.construct(this, expr.args);
                    if (type)
                        return [type, this.coerceValue(output, clazz, type)];
                    else
                        return [clazz, output];
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
                                    return [pointerType, {
                                            type: targetType,
                                            declaration: "dynamic",
                                            mutable: true,
                                            value: targetValue
                                        }];
                                }
                                else
                                    throw err;
                            }
                            const pointerType = this.getPointerTypeFor(variable.type) ?? fail(f.quote `Cannot find a pointer type for ${variable.type}`);
                            if (type)
                                return [pointerType, this.coerceValue(variable, pointerType, type)];
                            else
                                return [pointerType, variable];
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
                                if (type)
                                    return [pointerVariableType.target, this.coerceValue(pointerVariableData.value, pointerVariableType.target, type)];
                                else
                                    return [pointerVariableType.target, pointerVariableData.value];
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
                        return this.getFunction(token.text);
                    const enumType = this.getEnumFromValue(token.text);
                    if (enumType) {
                        if (type == "variable")
                            fail(f.quote `Cannot evaluate token ${token.text} as a variable`);
                        if (!type || type === enumType)
                            return [enumType, token.text];
                        else
                            fail(f.quote `Cannot convert value of type ${enumType} to ${type}`);
                    }
                    else {
                        const variable = this.getVariable(token.text);
                        if (!variable)
                            fail(f.quote `Undeclared variable ${token}`);
                        if (type == "variable")
                            return variable;
                        if (variable.value == null)
                            fail(`Cannot use the value of uninitialized variable ${token.text}`);
                        if (type !== undefined)
                            return [type, this.coerceValue(variable.value, variable.type, type)];
                        else
                            return [variable.type, variable.value];
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
                        if (!type || type.is("CHAR"))
                            return [PrimitiveVariableType.CHAR, token.text.slice(1, -1)];
                        else
                            fail(f.quote `Cannot convert value ${token} to type ${type}`);
                        break;
                    default: fail(f.quote `Cannot evaluate token ${token} of type ${token.type}`);
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
                if (type instanceof PrimitiveVariableType || type instanceof ArrayVariableType)
                    return type;
                else
                    return this.getType(type[1]) ?? fail(f.quote `Type ${type[1]} does not exist`);
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
            getFunction(name) {
                return this.functions[name] ?? builtinFunctions[name] ?? fail(f.quote `Function ${name} has not been defined.`);
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
                const scope = this.scopes.findLast((s) => s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement);
                if (!scope)
                    return null;
                return this.functions[scope.statement.name] ?? impossible();
            }
            coerceValue(value, from, to) {
                if (typesEqual(from, to))
                    return value;
                if (from.is("STRING") && to.is("CHAR"))
                    return value;
                if (from.is("INTEGER") && to.is("REAL"))
                    return value;
                if (from.is("REAL") && to.is("INTEGER"))
                    return Math.trunc(value);
                if (to.is("STRING")) {
                    if (from.is("BOOLEAN", "CHAR", "DATE", "INTEGER", "REAL", "STRING"))
                        return value.toString();
                    else if (from instanceof ArrayVariableType)
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
                    return value.slice().map(v => this.cloneValue(this.resolveVariableType(type.type), v));
                if (type instanceof PointerVariableType)
                    return value;
                if (type instanceof RecordVariableType)
                    return Object.fromEntries(Object.entries(value)
                        .map(([k, v]) => [k, this.cloneValue(type.fields[k], v)]));
                crash(f.quote `Cannot clone value of type ${type}`);
            }
            assembleScope(func, args) {
                if (func.args.size != args.length)
                    fail(`Incorrect number of arguments for function ${func.name}`);
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
                            fail(f.quote `Expected the argument to be of type ${rType}, but it was of type ${varData.type}. Cannot coerce BYREF arguments, please change the variable's type.`);
                        scope.variables[name] = {
                            declaration: func,
                            mutable: true,
                            type: rType,
                            get value() { return varData.value ?? fail(`Variable (passed by reference) has not been initialized`); },
                            set value(value) { varData.value = value; }
                        };
                    }
                    else {
                        const value = this.evaluateExpr(args[i], rType)[1];
                        scope.variables[name] = {
                            declaration: func,
                            mutable: true,
                            type: rType,
                            value: this.cloneValue(rType, value)
                        };
                    }
                }
                return scope;
            }
            callFunction(funcNode, args, requireReturnValue = false) {
                const func = funcNode.controlStatements[0];
                if (func instanceof ProcedureStatement) {
                    if (requireReturnValue)
                        fail(`Cannot use return value of ${func.name}() as it is a procedure`);
                }
                else if (func instanceof FunctionStatement) {
                }
                else
                    crash(`Invalid function ${func.stype}`);
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
            callClassMethod(funcNode, clazz, instance, args, requireReturnValue = false) {
                const func = funcNode.controlStatements[0];
                if (func instanceof ClassProcedureStatement && requireReturnValue)
                    fail(`Cannot use return value of ${func.name}() as it is a procedure`);
                const classScope = clazz.getScope(this, instance);
                const methodScope = this.assembleScope(func, args);
                const output = this.runBlock(funcNode.nodeGroups[0], classScope, methodScope);
                if (func instanceof ClassProcedureStatement) {
                    return null;
                }
                else {
                    return output ? [this.resolveVariableType(func.returnType), output] : fail(f.quote `Function ${func.name} did not return a value`);
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
                        try {
                            processedArgs.push(this.evaluateExpr(args[i], possibleType)[1]);
                            i++;
                            continue nextArg;
                        }
                        catch (err) {
                            if (err instanceof SoodocodeError)
                                errors.push(err);
                            else
                                throw err;
                        }
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
                for (const node of code) {
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
