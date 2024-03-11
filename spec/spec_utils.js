import { token } from "../src/lexer-types.js";
import { operators } from "../src/parser.js";
export const operatorTokens = {
    "add": token("operator.add", "+"),
    "subtract": token("operator.subtract", "-"),
    "multiply": token("operator.multiply", "*"),
    "divide": token("operator.divide", "/"),
    "mod": token("operator.mod", "MOD"),
    "integer_divide": token("operator.integer_divide", "DIV"),
    "and": token("operator.and", "AND"),
    "or": token("operator.or", "OR"),
    "not": token("operator.not", "NOT"),
    "equal_to": token("operator.equal_to", "="),
    "not_equal_to": token("operator.not_equal_to", "<>"),
    "less_than": token("operator.less_than", "<"),
    "greater_than": token("operator.greater_than", ">"),
    "less_than_equal": token("operator.less_than_equal", "<="),
    "greater_than_equal": token("operator.greater_than_equal", ">="),
    "string_concatenate": token("operator.string_concatenate", "&"),
    "negate": token("operator.subtract", "-"),
};
export function is_ExpressionASTArrayTypeNode(input) {
    return Array.isArray(input[1]);
}
export function process_Statement(input) {
    return new input[0](input[1].map(process_ExpressionASTExt));
}
export function process_ExpressionASTArrayTypeNode(input) {
    return {
        lengthInformation: input[0].map(bounds => bounds.map(b => token("number.decimal", b.toString()))),
        type: token(input[1])
    };
}
export function process_ExpressionASTExt(input) {
    if (is_ExpressionASTArrayTypeNode(input))
        return process_ExpressionASTArrayTypeNode(input);
    else
        return process_ExpressionAST(input);
}
export function process_ExpressionAST(input) {
    if (input.length == 2) {
        return token(...input);
    }
    else {
        let operator;
        let operatorToken;
        if (Array.isArray(input[1]) && input[1][0] == "array access") {
            operator = input[1][0];
            operatorToken = token("name", input[1][1]);
        }
        else if (Array.isArray(input[1]) && input[1][0] == "function call") {
            operator = input[1][0];
            operatorToken = token("name", input[1][1]);
        }
        else {
            operator = operators[input[1]];
            operatorToken = operatorTokens[input[1]];
        }
        return {
            nodes: input[2].map(process_ExpressionAST),
            operator, operatorToken
        };
    }
}
export function process_ProgramAST(output) {
    return output.map(n => Array.isArray(n)
        ? process_Statement(n)
        : {
            type: n.type,
            controlStatements: n.controlStatements.map(process_Statement),
            nodeGroups: n.nodeGroups.map(process_ProgramAST),
        });
}
