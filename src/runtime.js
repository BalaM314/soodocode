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
    evaluateExpr(expr) {
        if ("operator" in expr) {
            switch (expr.operator) {
                case "array access": crash(`Arrays are not yet supported`);
                case "function call": return this.callFunction(expr.operatorToken.text, expr.nodes, true);
                case operators.add: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") + this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
                case operators.subtract: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") - this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
                case operators.multiply: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") * this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
                case operators.divide: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") / this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
                case operators.mod: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") % this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
                default: crash("Not yet implemented"); //TODO
            }
        }
        else {
            switch (expr.type) {
                case "boolean.false": return false;
                case "boolean.true": return false;
                case "number.decimal": return Number(expr.text);
                case "string": return expr.text.slice(1, -1); //remove the quotes
                case "name":
                    if (!(expr.text in this.variables))
                        fail(`Undeclared variable ${expr.text}`);
                    if (this.variables[expr.text].value == null)
                        fail(`Cannot use the value of uninitialized variable ${expr.text}`);
                    return this.variables[expr.text].value;
                default: fail(`Cannot evaluate token of type ${expr.type}`);
            }
        }
    }
    evaluateExprTyped(expr, type) {
        const result = this.evaluateExpr(expr);
        switch (type) {
            //note: I am unable to think of a way to avoid using "as any" in this function impl
            case "INTEGER":
                if (typeof result == "number")
                    return result;
                else
                    fail(`Cannot convert expression to number`);
            default:
                crash(`not yet implemented`); //TODO
        }
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
