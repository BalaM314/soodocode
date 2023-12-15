import { operators } from "./parser.js";
import { ProcedureStatement } from "./statements.js";
import { crash } from "./utils.js";
import { fail } from "./utils.js";
export class Runtime {
    constructor(_input, _output) {
        this._input = _input;
        this._output = _output;
        this.variables = {};
        this.functions = {};
        this.types = {};
        this.files = {};
    }
    evaluateExpr(expr, type) {
        if ("operator" in expr) {
            switch (expr.operator) {
                case "array access": crash(`Arrays are not yet supported`);
                case "function call": return this.callFunction(expr.operatorToken.text, expr.nodes, true); //TODO typecheck
            }
            arithmetic: if (!type || type == "INTEGER" || type == "REAL") {
                let guessedType = type ?? "REAL"; //Try to evaluate it as a real, we can cast it back later
                //Note: do not allow coercing a normal division result to an integer, DIV should be used for that
                let outType;
                let value;
                //if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
                switch (expr.operator) {
                    case operators.add:
                        outType = "INTEGER";
                        value = this.evaluateExpr(expr.nodes[0], guessedType) + this.evaluateExpr(expr.nodes[1], guessedType);
                        break;
                    case operators.subtract:
                        outType = "INTEGER";
                        value = this.evaluateExpr(expr.nodes[0], guessedType) - this.evaluateExpr(expr.nodes[1], guessedType);
                        break;
                    case operators.multiply:
                        outType = "INTEGER";
                        value = this.evaluateExpr(expr.nodes[0], guessedType) * this.evaluateExpr(expr.nodes[1], guessedType);
                        break;
                    case operators.divide:
                        outType = "REAL";
                        value = this.evaluateExpr(expr.nodes[0], guessedType) / this.evaluateExpr(expr.nodes[1], guessedType);
                        break;
                    case operators.integer_divide:
                        outType = "INTEGER";
                        value = Math.trunc(this.evaluateExpr(expr.nodes[0], guessedType) / this.evaluateExpr(expr.nodes[1], guessedType));
                        break;
                    case operators.mod:
                        outType = "INTEGER";
                        value = this.evaluateExpr(expr.nodes[0], guessedType) % this.evaluateExpr(expr.nodes[1], guessedType);
                        break;
                    case operators.and:
                    case operators.or:
                    case operators.equal_to:
                    case operators.not_equal_to:
                    case operators.not:
                    case operators.greater_than:
                    case operators.greater_than_equal:
                    case operators.less_than:
                    case operators.less_than_equal:
                    case operators.string_concatenate:
                        if (type)
                            fail(`Cannot evaluate expression starting with ${expr.operator}: expected the expression to evaluate to a value of type ${type}`);
                        else
                            break arithmetic; //type is unknown but its not an arithmetic operator
                    default: crash(`impossible`);
                }
                if (outType == "REAL" && type == "INTEGER")
                    fail(`Arithmetic operation evaluated to value of type REAL, cannot be cast to INTEGER\
help: try using DIV instead of / to produce an integer as the result`);
                else
                    return value;
            }
            crash(`Non arithmetic operations are not yet implemented`); //TODO
        }
        else {
            switch (expr.type) {
                case "boolean.false":
                    if (!type || type == "BOOLEAN")
                        return false;
                    else if (type == "STRING")
                        return "FALSE";
                    else
                        fail(`Cannot convert value FALSE to ${type}`);
                case "boolean.false":
                    if (!type || type == "BOOLEAN")
                        return true;
                    else if (type == "STRING")
                        return "TRUE";
                    else
                        fail(`Cannot convert value TRUE to ${type}`);
                case "number.decimal":
                    if (!type || type == "INTEGER" || type == "REAL" || type == "STRING") {
                        const val = Number(expr.text);
                        if (!Number.isFinite(val))
                            fail(`Value ${expr.text} cannot be converted to a number: too large`);
                        if (type == "INTEGER" && !Number.isInteger(val))
                            fail(`Value ${expr.text} cannot be converted to an integer`);
                        if (type == "INTEGER" && !Number.isSafeInteger(val))
                            fail(`Value ${expr.text} cannot be converted to an integer: too large`);
                        if (type == "STRING")
                            return expr.text;
                        else
                            return val;
                    }
                    else
                        fail(`Cannot convert number to type ${type}`);
                case "string":
                    return expr.text.slice(1, -1); //remove the quotes
                case "name":
                    const variable = this.variables[expr.text];
                    if (!variable)
                        fail(`Undeclared variable ${expr.text}`);
                    if (variable.value == null)
                        fail(`Cannot use the value of uninitialized variable ${expr.text}`);
                    if (type)
                        return this.coerceValue(variable.value, variable.type, type);
                    else
                        return variable.value;
                default: fail(`Cannot evaluate token of type ${expr.type}`);
            }
        }
    }
    // evaluateExprTyped<T extends VariableType>(expr:ExpressionAST, type:T):VariableTypeMapping[T] {
    // 	const result = this.evaluateExpr(expr);
    // 	switch(type){
    // 		//note: I am unable to think of a way to avoid using "as any" in this function impl
    // 		case "INTEGER":
    // 			if(typeof result == "number") return result as any;
    // 			else fail(`Cannot convert expression to number`);
    // 		default:
    // 			crash(`not yet implemented`);//TODO
    // 	}
    // }
    coerceValue(value, from, to) {
        //typescript really hates this function, beware
        if (from == to)
            return value;
        if (from == "STRING" && to == "CHAR")
            return value;
        if (from == "INTEGER" && to == "REAL")
            return value;
        if (from == "REAL" && to == "INTEGER")
            return Math.trunc(value);
        if (to == "STRING" && "toString" in value)
            return value.toString();
        fail(`Cannot coerce value of type ${from} to ${to}`);
    }
    callFunction(name, args, requireReturnValue = false) {
        const func = this.functions[name];
        if (!name)
            fail(`Unknown function ${name}`);
        if (func.controlStatements[0] instanceof ProcedureStatement) {
            if (requireReturnValue)
                fail(`Cannot use return value of ${name}() as it is a procedure`);
            //TODO scope?
            this.runBlock([func]);
            return null;
        }
        else { //must be functionstatement
            this.runBlock([func]);
            return crash(`Executing functions is not yet implemented`);
        }
    }
    runBlock(code) {
        for (const line of code) {
            if ("nodeGroups" in line) {
                crash(`TODO`);
            }
            else {
                line.run(this);
            }
        }
    }
}
