import { Symbol, Token } from "../src/lexer.js";
import { operators } from "../src/parser.js";
export const operatorTokens = {
    "add": new Token("operator.add", "+"),
    "subtract": new Token("operator.subtract", "-"),
    "multiply": new Token("operator.multiply", "*"),
    "divide": new Token("operator.divide", "/"),
    "mod": new Token("operator.mod", "MOD"),
    "integer_divide": new Token("operator.integer_divide", "DIV"),
    "and": new Token("operator.and", "AND"),
    "or": new Token("operator.or", "OR"),
    "not": new Token("operator.not", "NOT"),
    "equal_to": new Token("operator.equal_to", "="),
    "not_equal_to": new Token("operator.not_equal_to", "<>"),
    "less_than": new Token("operator.less_than", "<"),
    "greater_than": new Token("operator.greater_than", ">"),
    "less_than_equal": new Token("operator.less_than_equal", "<="),
    "greater_than_equal": new Token("operator.greater_than_equal", ">="),
    "string_concatenate": new Token("operator.string_concatenate", "&"),
    "negate": new Token("operator.subtract", "-"),
};
export function symbol(type, text) {
    if (Array.isArray(type))
        return new Symbol(type[0], type[1]);
    else
        return new Symbol(type, text);
}
export function token(type, text) {
    if (Array.isArray(type))
        return new Token(type[0], type[1]);
    else
        return new Token(type, text);
}
export function is_ExpressionASTArrayTypeNode(input) {
    return Array.isArray(input[1]);
}
export function process_Statement(input) {
    return new input[0](input[1].map(process_ExpressionASTExt));
}
export function process_ExpressionASTArrayTypeNode(input) {
    return {
        lengthInformation: input[0].map(bounds => bounds.map(b => new Token("number.decimal", b.toString()))),
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
        return new Token(...input);
    }
    else {
        let operator;
        let operatorToken;
        if (Array.isArray(input[1]) && input[1][0] == "array access") {
            operator = input[1][0];
            operatorToken = new Token("name", input[1][1]);
        }
        else if (Array.isArray(input[1]) && input[1][0] == "function call") {
            operator = input[1][0];
            operatorToken = new Token("name", input[1][1]);
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
