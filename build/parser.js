/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the parser, which takes a list of tokens
and processes it into an abstract syntax tree (AST),
which is the preferred representation of the program.
*/
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ProgramASTBranchNode } from "./parser-types.js";
import { PrimitiveVariableType } from "./runtime-types.js";
import { CaseBranchRangeStatement, CaseBranchStatement, statements } from "./statements.js";
import { crash, errorBoundary, fail, fquote, impossible, SoodocodeError, splitTokens, splitTokensOnComma, splitTokensWithSplitter } from "./utils.js";
//TODO add a way to specify the range for an empty list of tokens
/** Parses function arguments, such as `x:INTEGER, BYREF y, z:DATE` into a Map containing their data */
export const parseFunctionArguments = errorBoundary()((tokens) => {
    //special case: blank
    if (tokens.length == 0)
        return new Map();
    let passMode = "value";
    let type = null;
    //Split the array on commas (no paren handling necessary)
    const argumentz = splitTokens(tokens, "punctuation.comma").map(section => {
        let passMode;
        let type;
        //Increase the offset by 1 to ignore the pass mode specifier if present
        let offset = 0;
        if (section[0]?.type == "keyword.pass_mode.by_reference") {
            offset = 1;
            passMode = "reference";
        }
        else if (section[0]?.type == "keyword.pass_mode.by_value") {
            offset = 1;
            passMode = "value";
        }
        else
            passMode = null;
        //There must be a name
        if (section[offset + 0]?.type != "name")
            fail(`Expected a name, got ${section[offset + 0] ?? "end of function arguments"}`, section[offset + 0] ?? (section[offset - 1] ?? tokens.at(-1)).rangeAfter());
        //If the name is the only thing present, then the type is specified later, leave it as null
        if (section.length == offset + 1) {
            type = null;
        }
        else {
            //Expect a colon
            if (section[offset + 1]?.type != "punctuation.colon")
                fail(`Expected a colon, got ${section[offset + 1] ?? "end of function arguments"}`, section[offset + 1] ?? (section[offset + 0] ?? tokens.at(-1)).rangeAfter());
            type = processTypeData(parseType(section.slice(offset + 2)));
        }
        return [
            section[offset + 0],
            { passMode, type }
        ];
    })
        .map(([name, data]) => [name, {
            passMode: data.passMode ? passMode = data.passMode : passMode,
            type: data.type
        }])
        .reverse()
        .map(([name, data]) => [name, {
            passMode: data.passMode,
            type: data.type ? type = data.type : type ?? fail(`Type not specified for function argument "${name.text}"`, name)
        }])
        .reverse();
    const argumentsMap = new Map(argumentz.map(([name, data]) => [name.text, data]));
    if (argumentsMap.size != argumentz.length) {
        const [duplicateArgument] = argumentz.find((a, i) => argumentz.find((b, j) => a[0].text == b[0].text && i != j)) ??
            crash(`Unable to find the duplicate function argument in ${argumentz.map(([name, arg]) => name)}`);
        fail(`Duplicate function argument "${duplicateArgument.text}"`, duplicateArgument);
    }
    return argumentsMap;
});
export const processTypeData = errorBoundary()((typeNode) => {
    if (typeNode instanceof Token) {
        return PrimitiveVariableType.get(typeNode.text) ?? ["unresolved", typeNode.text];
    }
    else
        return typeNode.toData();
});
export const parseType = errorBoundary()((tokens) => {
    if (tokens.length == 1) {
        if (tokens[0].type == "name")
            return tokens[0];
        else
            fail(`Token ${tokens[0]} is not a valid type`);
    }
    //Array type
    if (!(tokens[0]?.type == "keyword.array" &&
        tokens[1]?.type == "bracket.open" &&
        tokens.at(-2)?.type == "keyword.of" &&
        tokens.at(-1)?.type == "name"))
        fail(fquote `Cannot parse type from ${tokens}`);
    return new ExpressionASTArrayTypeNode(splitTokensWithSplitter(tokens.slice(2, -3), "punctuation.comma").map(({ group, splitter }) => {
        if (group.length != 3)
            fail(fquote `Invalid array range specifier ${group}`, group.length ? group : splitter);
        if (group[0].type != "number.decimal")
            fail(fquote `Expected a number, got ${group[0].text}`, group[0]);
        if (group[1].type != "punctuation.colon")
            fail(fquote `Expected a colon, got ${group[1].text}`, group[1]);
        if (group[2].type != "number.decimal")
            fail(fquote `Expected a number, got ${group[2].text}`, group[2]);
        return [group[0], group[2]];
    }), tokens.at(-1), tokens);
});
export function splitTokensToStatements(tokens) {
    const statementData = [
        [CaseBranchStatement, 2],
        [CaseBranchStatement, 3],
        [CaseBranchRangeStatement, 4],
        [CaseBranchRangeStatement, 5],
        [CaseBranchRangeStatement, 6],
    ];
    return splitTokens(tokens, "newline").map(ts => {
        for (const [statement, length] of statementData) {
            if (ts.length > length && Array.isArray(checkStatement(statement, ts.slice(0, length))))
                return [ts.slice(0, length), ts.slice(length)];
        }
        return [ts];
    }).flat(1).filter(ts => ts.length > 0); //remove blank lines
}
export function parse({ program, tokens }) {
    const lines = splitTokensToStatements(tokens);
    const statements = lines.map(parseStatement);
    const programNodes = [];
    function getActiveBuffer() {
        if (blockStack.length == 0)
            return programNodes;
        else
            return blockStack.at(-1).nodeGroups.at(-1);
    }
    const blockStack = [];
    for (const statement of statements) {
        if (statement.category == "normal") {
            getActiveBuffer().push(statement);
        }
        else if (statement.category == "block") {
            const node = new ProgramASTBranchNode(statement.stype, [statement], [[]]);
            getActiveBuffer().push(node);
            blockStack.push(node);
        }
        else if (statement.category == "block_end") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                fail(`Unexpected statement: no open blocks`, statement);
            else if (statement instanceof lastNode.controlStatements[0].type.blockEndStatement()) {
                lastNode.controlStatements.push(statement);
                lastNode.controlStatements[0].type.checkBlock(lastNode);
                blockStack.pop();
            }
            else
                fail(`Unexpected statement: current block is of type ${lastNode.controlStatements[0].stype}`, statement, null);
        }
        else if (statement.category == "block_multi_split") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                fail(`Unexpected statement: this statement must be inside a block`, statement, null);
            let errorMessage;
            if ((errorMessage = lastNode.controlStatements[0].type.supportsSplit(lastNode, statement)) !== true)
                fail(`Unexpected statement: ${errorMessage}`, statement, null);
            lastNode.controlStatements.push(statement);
            lastNode.nodeGroups.push([]);
        }
        else
            statement.category;
    }
    if (blockStack.length)
        fail(`There were unclosed blocks: "${blockStack.at(-1).controlStatements[0].toString()}" requires a matching "${blockStack.at(-1).controlStatements[0].type.blockEndStatement().type}" statement`, blockStack.at(-1).controlStatements[0], null);
    return {
        program,
        nodes: programNodes
    };
}
/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export const parseStatement = errorBoundary()((tokens) => {
    if (tokens.length < 1)
        crash("Empty statement");
    const possibleStatements = tokens[0].type in statements.byStartKeyword
        ? statements.byStartKeyword[tokens[0].type]
        : statements.irregular;
    if (possibleStatements.length == 0)
        fail(`No possible statements`, tokens);
    const errors = [];
    for (const possibleStatement of possibleStatements) {
        const result = checkStatement(possibleStatement, tokens);
        if (Array.isArray(result)) {
            try {
                return new possibleStatement(result.map(x => x instanceof Token
                    ? x
                    : (x.type == "expression" ? parseExpression : parseType)(tokens.slice(x.start, x.end + 1))));
            }
            catch (err) {
                if (err instanceof SoodocodeError)
                    errors.push({
                        message: err.message,
                        priority: 10,
                        range: err.rangeSpecific ?? null,
                        err
                    });
                else
                    throw err;
            }
        }
        else {
            if (possibleStatement.suppressErrors)
                result.priority = 0;
            errors.push(result);
        }
    }
    let maxError = errors[0];
    for (const error of errors) {
        if (error.priority >= maxError.priority)
            maxError = error;
    }
    if (maxError.err)
        throw maxError.err;
    else
        fail(maxError.message, maxError.range, tokens);
});
export function isLiteral(type) {
    switch (type) {
        case "boolean.false":
        case "boolean.true":
        case "number.decimal":
        case "string":
        case "char":
            return true;
        default: return false;
    }
}
/**
 * Checks if a Token[] is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 * `input` must not be empty.
 */
export const checkStatement = errorBoundary()((statement, input) => {
    //warning: despite writing it, I do not fully understand this code
    //but it works
    if (input.length == 0)
        crash(`checkStatement() called with empty input`);
    const output = [];
    let i, j;
    for (i = (statement.tokens[0] == "#") ? 1 : 0, j = 0; i < statement.tokens.length; i++) {
        if (statement.tokens[i] == ".+" || statement.tokens[i] == ".*" || statement.tokens[i] == "expr+" || statement.tokens[i] == "type+") {
            const allowEmpty = statement.tokens[i] == ".*";
            const start = j;
            if (j >= input.length) {
                if (allowEmpty)
                    continue; //Consumed all tokens
                else
                    return { message: `Unexpected end of line`, priority: 4, range: input.at(-1).rangeAfter() };
            }
            let anyTokensSkipped = false;
            while (statement.tokens[i + 1] != input[j].type) { //Repeat until the current token in input is the next token
                anyTokensSkipped = true;
                j++;
                if (j >= input.length) { //end reached
                    if (i == statement.tokens.length - 1)
                        break; //Consumed all tokens
                    return { message: `Expected a ${statement.tokens[i + 1]}, but none were found`, priority: 4, range: input.at(-1).rangeAfter() };
                }
            }
            const end = j - 1;
            if (!anyTokensSkipped && !allowEmpty)
                return { message: `Expected one or more tokens, but found zero`, priority: 6, range: input[j].range };
            if (statement.tokens[i] == "expr+")
                output.push({ type: "expression", start, end });
            else if (statement.tokens[i] == "type+")
                output.push({ type: "type", start, end });
            else
                output.push(...input.slice(start, end + 1));
        }
        else {
            if (j >= input.length)
                return { message: `Expected ${statement.tokens[i]}, found end of line`, priority: 4, range: input.at(-1).rangeAfter() };
            if (statement.tokens[i] == "#")
                impossible();
            else if (statement.tokens[i] == "." || statement.tokens[i] == input[j].type || (statement.tokens[i] == "file_mode" && input[j].type.startsWith("keyword.file_mode."))) {
                output.push(input[j]);
                j++; //Token matches, move to next one
            }
            else if (statement.tokens[i] == "literal" || statement.tokens[i] == "literal|otherwise") {
                if (isLiteral(input[j].type) || (statement.tokens[i] == "literal|otherwise" && input[j].type == "keyword.otherwise"))
                    output.push(input[j++]); //The current token is a valid literal or it's "otherwise" and that's allowed
                else if (input[j].type == "operator.minus" && j + 1 < input.length && input[j + 1].type == "number.decimal") {
                    //Replace the number token with a negative number, and drop the minus operator
                    const negativeNumber = input[j + 1].clone();
                    negativeNumber.extendRange(input[j]);
                    negativeNumber.text = input[j].text + negativeNumber.text;
                    output.push(negativeNumber);
                    j += 2;
                }
                else
                    return { message: `Expected a ${statement.tokens[i]}`, priority: 8, range: input[j].range };
            }
            else
                return { message: `Expected a ${statement.tokens[i]}`, priority: 5, range: input[j].range };
        }
    }
    if (j != input.length)
        return { message: `Expected end of line, found ${input[j].type}`, priority: 7, range: input[j].range };
    return output;
});
/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export const operatorsByPriority = ((input) => input.map(row => row.map(o => ({
    token: o.token,
    category: o.category,
    type: o.type ?? "binary",
    name: o.name ?? o.token,
}))))([
    [
        {
            token: "operator.or",
            category: "logical"
        }
    ], [
        {
            token: "operator.and",
            category: "logical"
        }
    ], [
        {
            token: "operator.equal_to",
            category: "logical"
        }, {
            token: "operator.not_equal_to",
            category: "logical"
        }
    ], [
        {
            token: "operator.less_than",
            category: "logical"
        }, {
            token: "operator.less_than_equal",
            category: "logical"
        }, {
            token: "operator.greater_than",
            category: "logical"
        }, {
            token: "operator.greater_than_equal",
            category: "logical"
        }
    ], [
        {
            token: "operator.add",
            category: "arithmetic"
        }, {
            name: "operator.subtract",
            token: "operator.minus",
            category: "arithmetic",
            type: "binary_o_unary_prefix"
        }, {
            token: "operator.string_concatenate",
            category: "string"
        }
    ], [
        {
            token: "operator.multiply",
            category: "arithmetic"
        }, {
            token: "operator.divide",
            category: "arithmetic"
        }, {
            token: "operator.integer_divide",
            category: "arithmetic"
        }, {
            token: "operator.mod",
            category: "arithmetic"
        }
    ],
    //no exponentiation operator?
    [
        {
            token: "operator.pointer",
            name: "operator.pointer_reference",
            category: "special",
            type: "unary_prefix_o_postfix"
        },
        {
            token: "operator.not",
            category: "logical",
            type: "unary_prefix"
        },
        {
            token: "operator.minus",
            name: "operator.negate",
            category: "arithmetic",
            type: "unary_prefix"
        },
    ],
    [
        {
            token: "operator.pointer",
            name: "operator.pointer_dereference",
            category: "special",
            type: "unary_postfix_o_prefix"
        }
    ],
    [
        {
            token: "punctuation.period",
            name: "operator.access",
            category: "special",
        }
    ]
    //(function call)
    //(array access)
]);
/** Indexed by OperatorType */
export const operators = Object.fromEntries(operatorsByPriority.flat().map(o => [
    o.name.startsWith("operator.") ? o.name.split("operator.")[1] : o.name, o
]));
function cannotEndExpression(token) {
    //TODO is this the best way?
    return token.type.startsWith("operator.") || token.type == "parentheses.open" || token.type == "bracket.open";
}
function canBeUnaryOperator(token) {
    return Object.values(operators).find(o => o.type.startsWith("unary_prefix") && o.token == token.type);
}
export const expressionLeafNodeTypes = ["number.decimal", "name", "string", "char", "boolean.false", "boolean.true"];
export const parseExpressionLeafNode = errorBoundary()((token) => {
    //Number, string, char, boolean, and variables can be parsed as-is
    if (expressionLeafNodeTypes.includes(token.type))
        return token;
    else
        fail(`Invalid expression leaf node`);
});
//TOOD allow specifying adding a call stack message to errorBoundary(), should add "cannot parse expression" to all of these
export const parseExpression = errorBoundary({
    predicate: (input, recursive) => !recursive,
    message: () => `Cannot parse expression "$rc": `
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
})((input, recursive = false) => {
    if (!Array.isArray(input))
        crash(`parseExpression(): expected array of tokens, got ${input}`);
    //If there is only one token
    if (input.length == 1)
        return parseExpressionLeafNode(input[0]);
    //Go through P E M-D A-S in reverse order to find the operator with the lowest priority
    //TODO O(mn) unnecessarily, optimize
    for (const operatorsOfCurrentPriority of operatorsByPriority) {
        let parenNestLevel = 0, bracketNestLevel = 0;
        //Find the index of the last (lowest priority) operator of the current priority
        //Iterate through token list backwards
        for (let i = input.length - 1; i >= 0; i--) {
            //Handle parentheses
            //The token list is being iterated through backwards, so ) means go up a level and ( means go down a level
            if (input[i].type == "parentheses.close")
                parenNestLevel++;
            else if (input[i].type == "parentheses.open")
                parenNestLevel--;
            else if (input[i].type == "bracket.close")
                bracketNestLevel++;
            else if (input[i].type == "bracket.open")
                bracketNestLevel--;
            if (parenNestLevel < 0)
                //nest level going below 0 means too many (
                fail(`Unclosed parentheses`, input[i]);
            if (bracketNestLevel < 0)
                //nest level going below 0 means too many [
                fail(`Unclosed square bracket`, input[i]);
            let operator; //assignment assertion goes brrrrr
            if (parenNestLevel == 0 && bracketNestLevel == 0 && //the operator is not inside parentheses and
                operatorsOfCurrentPriority.find(o => (operator = o).token == input[i].type) //it is currently being searched for
            ) {
                //this is the lowest priority operator in the expression and should become the root node
                if (operator.type.startsWith("unary_prefix")) {
                    //Make sure there is only something on right side of the operator
                    const right = input.slice(i + 1);
                    if (i != 0) { //if there are tokens to the left of a unary prefix operator
                        if (operator.type == "unary_prefix_o_postfix" && (
                        //"^ x ^ ^"
                        //     ⬆: this should be allowed
                        //x^.prop"
                        // ⬆: this should NOT be allowed
                        //Make sure everything to the right is unary postfix operators of the same priority
                        right.every(n => operatorsOfCurrentPriority.some(o => o.token == n.type && o.type == "unary_postfix_o_prefix" || o.type == "unary_prefix_o_postfix"))))
                            continue; //this is the postfix operator
                        //Binary operators
                        //  1 / 2 / 3
                        // (1 / 2)/ 3
                        // ^
                        // lowest priority is rightmost
                        //Unary operators
                        // - - 2
                        // -(- 2)
                        // ^
                        // lowest priority is leftmost
                        if (canBeUnaryOperator(input[i - 1]))
                            continue; //Operator priority assumption is wrong, try again!
                        fail(`Unexpected expression on left side of operator "${input[i].text}"`, input[i]);
                    }
                    if (right.length == 0)
                        fail(`Mo expression on right side of operator ${input[i].text}`, input[i].rangeAfter());
                    if (right.length == 1 && operator.name == "operator.negate" && right[0].type == "number.decimal") {
                        //Special handling for negative numbers:
                        //Do not create an expression, instead mutate the number token into a negative number
                        //Very cursed
                        const negativeNumber = right[0].clone();
                        negativeNumber.extendRange(input[i]);
                        negativeNumber.text = input[i].text + negativeNumber.text;
                        return negativeNumber;
                    }
                    return new ExpressionASTBranchNode(input[i], operator, [parseExpression(right, true)], input);
                }
                else if (operator.type.startsWith("unary_postfix")) {
                    //Make sure there is only something on left side of the operator
                    const left = input.slice(0, i);
                    if (i != input.length - 1) { //if there are tokens to the right of a unary postfix operator
                        if (operator.type == "unary_postfix_o_prefix" && left.length == 0)
                            continue; //this is the prefix operator
                        //No need to worry about operator priority changing for postfix
                        fail(`Unexpected expression on left side of operator "${input[i].text}"`, input[i]);
                    }
                    if (left.length == 0)
                        fail(`Mo expression on left side of operator ${input[i].text}`, input[i].rangeBefore());
                    return new ExpressionASTBranchNode(input[i], operator, [parseExpression(left, true)], input);
                }
                else {
                    //Make sure there is something on left and right of the operator
                    const left = input.slice(0, i);
                    const right = input.slice(i + 1);
                    if (left.length == 0) {
                        if (operator.type == "binary_o_unary_prefix")
                            continue; //this is the unary operator, try again
                        else
                            fail(`No expression on left side of operator ${input[i].text}`, input[i].rangeBefore());
                    }
                    if (right.length == 0)
                        fail(`No expression on right side of operator ${input[i].text}`, input[i].rangeAfter());
                    if (operator.type == "binary_o_unary_prefix") {
                        if (cannotEndExpression(input[i - 1]))
                            continue; //Binary operator can't fit here, this must be the unary operator
                    }
                    if (operator == operators.access) {
                        if (!(right.length == 1 && right[0].type == "name"))
                            continue;
                        //fail(`Access operator can only have a single token to the right, which must be a property name`, right);
                    }
                    return new ExpressionASTBranchNode(input[i], operator, [parseExpression(left, true), parseExpression(right, true)], input);
                }
            }
        }
        //Nest level being above zero at the beginning of the token list means too many )
        if (parenNestLevel != 0) {
            //Iterate through the tokens left-to-right to find the unmatched paren
            input.reduce((acc, item) => {
                if (item.type == "parentheses.open")
                    acc++;
                else if (item.type == "parentheses.close")
                    acc--;
                if (acc < 0) //found the extra )
                    fail(`No parentheses group to close`, item);
                return acc;
            }, 0);
            impossible();
        }
        if (bracketNestLevel != 0) {
            //Iterate through the tokens left-to-right to find the unmatched bracket
            input.reduce((acc, item) => {
                if (item.type == "bracket.open")
                    acc++;
                else if (item.type == "bracket.close")
                    acc--;
                if (acc < 0) //found the extra ]
                    fail(`No bracket group to close`, item);
                return acc;
            }, 0);
            impossible();
        }
        //No operators of the current priority found, look for operator with the next level higher priority
    }
    //If the whole expression is surrounded by parentheses, parse the inner expression
    //Must be after the main loop to avoid triggering on ( 2)+(2 )
    //Possible optimization: allow this to run before the loop if token length is <= 4
    if (input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
        return parseExpression(input.slice(1, -1), true);
    //Special case: function call
    if (input[0]?.type == "name" && input[1]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close") {
        return new ExpressionASTFunctionCallNode(input[0], input.length == 3
            ? [] //If there are no arguments, don't generate a blank argument group
            : splitTokensOnComma(input.slice(2, -1)).map(e => parseExpression(e, true)), input);
    }
    //Special case: Class instantiation expression
    if (input[0]?.type == "keyword.new" && input[1]?.type == "name" && input[2]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close") {
        return new ExpressionASTClassInstantiationNode(input[1], input.length == 4
            ? [] //If there are no arguments, don't generate a blank argument group
            : splitTokensOnComma(input.slice(3, -1)).map(e => parseExpression(e, true)), input);
    }
    //Special case: array access
    const bracketIndex = input.findIndex(t => t.type == "bracket.open");
    if (bracketIndex != -1 && input.at(-1)?.type == "bracket.close") {
        const target = input.slice(0, bracketIndex);
        const indicesTokens = input.slice(bracketIndex + 1, -1);
        if (target.length == 0)
            fail(`Missing target in array index expression`);
        if (indicesTokens.length == 0)
            fail(`Missing indices in array index expression`);
        const parsedTarget = parseExpression(target, true);
        return new ExpressionASTArrayAccessNode(parsedTarget, splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true)), input);
    }
    //No operators found at all, something went wrong
    fail(`No operators found`);
});
