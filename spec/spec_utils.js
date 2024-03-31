import { Token, token } from "../src/lexer-types.js";
import { ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ProgramASTBranchNode } from "../src/parser-types.js";
import { operators } from "../src/parser.js";
import { Statement } from "../src/statements.js";
import { crash } from "../src/utils.js";
export const operatorTokens = {
    "add": token("operator.add", "+"),
    "subtract": token("operator.minus", "-"),
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
    "negate": token("operator.minus", "-"),
    "access": token("punctuation.period", "."),
};
export function is_ExpressionASTArrayTypeNode(input) {
    return Array.isArray(input[1]);
}
export function process_Statement(input) {
    return new input[0](input[1].map(process_ExpressionASTExt));
}
export function process_ExpressionASTArrayTypeNode(input) {
    return new ExpressionASTArrayTypeNode(input[0].map(bounds => bounds.map(b => token("number.decimal", b.toString()))), token(input[1]), [token(input[1])] //SPECNULL
    );
}
export function process_ExpressionASTExt(input) {
    if (is_ExpressionASTArrayTypeNode(input))
        return process_ExpressionASTArrayTypeNode(input);
    else
        return process_ExpressionAST(input); //unsafe
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
        return new ExpressionASTBranchNode(operatorToken, operator, input[2].map(process_ExpressionAST), [operatorToken] //SPECNULL
        );
    }
}
export function process_ProgramAST(input, program = "" /* SPECNULL */) {
    return {
        program,
        nodes: input.map(process_ProgramASTNode)
    };
}
export function process_ProgramASTNode(input) {
    return Array.isArray(input)
        ? process_Statement(input)
        : new ProgramASTBranchNode(input.type, input.controlStatements.map(process_Statement), input.nodeGroups.map(block => block.map(process_ProgramASTNode)));
}
export const anyRange = [jasmine.any(Number), jasmine.any(Number)];
/** Mutates input unsafely */
export function applyAnyRange(input) {
    if (input instanceof Token) {
        input.range;
        input.range = anyRange;
    }
    else if (input instanceof Statement) {
        input.range;
        input.range = anyRange;
        input.tokens.forEach(applyAnyRange);
    }
    else if (input instanceof ExpressionASTBranchNode) {
        input.range;
        input.range = anyRange;
        input.allTokens;
        input.allTokens = jasmine.any(Array);
        applyAnyRange(input.operatorToken);
        input.nodes.forEach(applyAnyRange);
    }
    else if (input instanceof ExpressionASTArrayTypeNode) {
        input.range;
        input.range = anyRange;
        input.allTokens;
        input.allTokens = jasmine.any(Array);
        applyAnyRange(input.elementType);
    }
    else if (input instanceof ProgramASTBranchNode) {
        input.controlStatements.forEach(applyAnyRange);
        input.nodeGroups.forEach(block => block.forEach(applyAnyRange));
    }
    else if ("nodes" in input && "program" in input) {
        input.nodes.forEach(applyAnyRange);
    }
    else {
        input;
        crash(`Type error at applyAnyRange()`);
    }
    return input;
}
