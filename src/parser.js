import { getText } from "./lexer.js";
import { statements } from "./statements.js";
import { impossible, splitArray, fail } from "./utils.js";
export function parseFunctionArguments(tokens) {
    const args = new Map();
    let expected = "nameOrEndOrPassMode";
    let passMode = "value";
    let name = null;
    for (let i = 0; i < tokens.length + 1; i++) {
        //fancy processing trick, loop through all the tokens and also undefined at the end, to avoid duplicating logic
        const token = tokens[i];
        const tokenName = token ? `"${token.text}" (${token.type})` : "nothing";
        if (expected == "nameOrEndOrPassMode" || expected == "name" || expected == "nameOrPassMode") {
            //weird combined if, necessary due to passMode
            if (token?.type == "keyword.by-reference" && (expected == "nameOrPassMode" || expected == "nameOrEndOrPassMode")) {
                passMode = "reference";
                expected = "name";
            }
            else if (token?.type == "keyword.by-value" && (expected == "nameOrPassMode" || expected == "nameOrEndOrPassMode")) {
                passMode = "value";
                expected = "name";
            }
            else {
                if ((expected != "nameOrEndOrPassMode" && !token) || //Expecting name and there is no token
                    (token && token.type != "name") //or, there is a token and it's not a name
                )
                    return `Expected a name, got ${tokenName}`;
                else {
                    if (token)
                        name = token.text;
                    //If this is the last token, then the value of "expected" will never be checked again, no need for an extra check
                    expected = "colon";
                }
            }
        }
        else if (expected == "colon") {
            if (!token || token.type != "punctuation.colon")
                return `Expected a colon, got ${tokenName}`;
            else
                expected = "type";
        }
        else if (expected == "type") {
            if (!token || token.type != "name")
                return `Expected a type, got ${tokenName}`;
            else {
                expected = "commaOrEnd";
                if (!name)
                    impossible();
                args.set(name, { type: token.text, passMode });
            }
        }
        else if (expected == "commaOrEnd") {
            if (token && token.type != "punctuation.comma")
                return `Expected a comma or end of arguments, got ${tokenName}`;
            else
                expected = "nameOrPassMode";
        }
        else
            expected;
    }
    return args;
}
export function parse(tokens) {
    let lines = [[]];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "newline") {
            lines.push([]);
        }
        else {
            lines.at(-1).push(tokens[i]);
        }
    }
    lines = lines.filter(l => l.length != 0); //remove blank lines
    const statements = lines.map(parseStatement);
    const program = [];
    function getActiveBuffer() {
        if (blockStack.length == 0)
            return program;
        else
            return blockStack.at(-1).nodeGroups.at(-1);
    }
    const blockStack = [];
    for (const statement of statements) {
        if (statement.category == "normal") {
            getActiveBuffer().push(statement);
        }
        else if (statement.category == "block") {
            const node = {
                controlStatements: [statement],
                type: statement.stype,
                nodeGroups: [[]]
            };
            getActiveBuffer().push(node);
            blockStack.push(node);
        }
        else if (statement.category == "block_end") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                fail(`Unexpected statement "${statement.toString()}": no open blocks`);
            else if (lastNode.controlStatements[0].stype == statement.stype.split(".")[0]) { //probably bad code
                lastNode.controlStatements.push(statement);
                blockStack.pop();
            }
            else
                fail(`Unexpected statement "${statement.toString()}": current block is of type ${lastNode.controlStatements[0].stype}`);
        }
        else if (statement.category == "block_multi_split") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                fail(`Unexpected statement "${statement.toString()}": no open blocks`);
            if (!lastNode.controlStatements[0].type.supportsSplit(lastNode, statement))
                fail(`Unexpected statement "${statement.toString()}": current block cannot be split by "${statement.toString()}"`);
            lastNode.controlStatements.push(statement);
            lastNode.nodeGroups.push([]);
        }
        else
            statement.category;
    }
    if (blockStack.length)
        fail(`There were unclosed blocks: "${blockStack.at(-1).controlStatements[0].toString()}" requires a matching "${blockStack.at(-1).controlStatements[0].blockEndStatement().type}" statement`);
    return program;
}
/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export function parseStatement(tokens) {
    if (tokens.length < 1)
        fail("Empty statement");
    let possibleStatements;
    if (tokens[0].type in statements.startKeyword)
        possibleStatements = [statements.startKeyword[tokens[0].type]];
    else
        possibleStatements = statements.irregular;
    if (possibleStatements.length == 0)
        fail(`No possible statements`);
    let errors = [];
    for (const possibleStatement of possibleStatements) {
        const result = checkStatement(possibleStatement, tokens);
        if (Array.isArray(result)) {
            return new possibleStatement(result.map(x => "start" in x ? parseExpression(tokens.slice(x.start, x.end + 1)) : x));
        }
        else
            errors.push(result);
    }
    let maxError = errors[0];
    for (const error of errors) {
        if (error.priority > maxError.priority)
            maxError = error;
    }
    fail(maxError.message);
}
/**
 * Checks if a Token[] is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 */
export function checkStatement(statement, input) {
    //warning: despite writing it, I do not fully understand this code
    //but it works
    //TODO understand it
    const output = [];
    for (var i = statement.tokens[0] == "#" ? 1 : 0, j = 0; i < statement.tokens.length; i++) {
        if (statement.tokens[i] == ".+" || statement.tokens[i] == ".*" || statement.tokens[i] == "expr+") {
            const allowEmpty = statement.tokens[i] == ".*";
            const start = j;
            if (j >= input.length) {
                if (allowEmpty)
                    continue; //Consumed all tokens
                else
                    return { message: `Unexpected end of line`, priority: 4 };
            }
            let anyTokensSkipped = false;
            while (statement.tokens[i + 1] != input[j].type) { //Repeat until the current token in input is the next token
                anyTokensSkipped = true;
                j++;
                if (j >= input.length) { //end reached
                    if (i == statement.tokens.length - 1)
                        break; //Consumed all tokens
                    return { message: `Expected a ${statement.tokens[i + 1]}, but none were found`, priority: 4 };
                }
            }
            const end = j - 1;
            if (!anyTokensSkipped && !allowEmpty)
                return { message: `Expected one or more tokens, but found zero`, priority: 6 };
            if (statement.tokens[i] == "expr+")
                output.push({ start, end });
            else
                output.push(...input.slice(start, end + 1));
        }
        else {
            if (j >= input.length)
                return { message: `Expected ${statement.tokens[i]}, found end of line`, priority: 4 };
            if (statement.tokens[i] == "#")
                impossible();
            else if (statement.tokens[i] == input[j].type) {
                output.push(input[j]);
                j++; //Token matches, move to next one
            }
            else
                return { message: `Expected a ${statement.tokens[i]}, got "${input[j].text}" (${input[j].type})`, priority: 5 };
        }
    }
    if (j != input.length)
        return { message: `Expected end of line, found ${input[j].type}`, priority: 7 };
    return output;
}
/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export const operatorsByPriority = ((input) => input.map(row => row.map(o => ({
    ...o,
    unary: o.unary ?? false
}))))([
    [
        {
            type: "operator.or",
            category: "logical"
        }
    ], [
        {
            type: "operator.and",
            category: "logical"
        }
    ], [
        {
            type: "operator.equal_to",
            category: "logical"
        }, {
            type: "operator.not_equal_to",
            category: "logical"
        }
    ], [
        {
            type: "operator.less_than",
            category: "logical"
        }, {
            type: "operator.less_than_equal",
            category: "logical"
        }, {
            type: "operator.greater_than",
            category: "logical"
        }, {
            type: "operator.greater_than_equal",
            category: "logical"
        }
    ], [
        {
            type: "operator.add",
            category: "arithmetic"
        }, {
            type: "operator.subtract",
            category: "arithmetic"
        }, {
            type: "operator.string_concatenate",
            category: "string"
        }
    ], [
        {
            type: "operator.multiply",
            category: "arithmetic"
        }, {
            type: "operator.divide",
            category: "arithmetic"
        }, {
            type: "operator.integer_divide",
            category: "arithmetic"
        }, {
            type: "operator.mod",
            category: "arithmetic"
        }
    ],
    //no exponentiation operator?
    [
        {
            type: "operator.not",
            category: "logical",
            unary: true,
        }
    ],
    //(function call)
    //(array access)
]);
/** Indexed by OperatorType */
export const operators = Object.fromEntries(operatorsByPriority.flat()
    .map(o => [
    o.type.startsWith("operator.") ? o.type.split("operator.")[1] : o.type,
    o
]));
export function parseExpressionLeafNode(input) {
    //Number, string, boolean, and variables can be parsed as-is
    if (input.type.startsWith("number.") || input.type == "name" || input.type == "string" || input.type.startsWith("boolean."))
        return input;
    else
        fail(`Invalid syntax: cannot parse expression \`${getText([input])}\`: not a valid expression leaf node`);
}
export function parseExpression(input) {
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
                //nest level going below 0 means too many (, so unclosed parens
                fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed parentheses`);
            if (bracketNestLevel < 0)
                //nest level going below 0 means too many (, so unclosed parens
                fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed square bracket`);
            let operator; //assignment assertion goes brrrrr
            if (parenNestLevel == 0 && bracketNestLevel == 0 && //the operator is not inside parentheses and
                operatorsOfCurrentPriority.find(o => (operator = o).type == input[i].type) //it is currently being searched for
            ) {
                //this is the lowest priority operator in the expression and should become the root node
                if (operator.unary) {
                    //Make sure there is only something on right side of the operator
                    const right = input.slice(i + 1);
                    if (i != 0)
                        fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unexpected expression on left side of operator ${input[i].text}`);
                    if (right.length == 0)
                        fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
                    return {
                        operatorToken: input[i],
                        operator,
                        nodes: [parseExpression(right)]
                    };
                }
                else {
                    //Make sure there is something on left and right of the operator
                    const left = input.slice(0, i);
                    const right = input.slice(i + 1);
                    if (left.length == 0)
                        fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[i].text}`);
                    if (right.length == 0)
                        fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
                    return {
                        operatorToken: input[i],
                        operator,
                        nodes: [parseExpression(left), parseExpression(right)]
                    };
                }
            }
        }
        //Nest level being above zero at the beginning of the string means too many )
        if (parenNestLevel != 0)
            fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no parentheses group to close`);
        if (bracketNestLevel != 0)
            fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no bracket group to close`);
        //No operators of the current priority found, look for operator with the next level higher priority
    }
    //If the whole expression is surrounded by parentheses, parse the inner expression
    //Must be after the main loop to avoid triggering on ( 2)+(2 )
    //Possible optimization: allow this to run before the loop if token length is <= 4
    if (input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
        return parseExpression(input.slice(1, -1));
    //Special case: function call
    if (input[0]?.type == "name" && input[1]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close") {
        let parenNestLevel = 0, bracketNestLevel = 0; //Duped paren handling, unavoidable
        return {
            operatorToken: input[0],
            operator: "function call",
            nodes: (input.length == 3 ? [] //If there are no arguments, don't generate a blank argument group
                //Split the tokens between the parens on commas
                : splitArray(input.slice(2, -1), t => {
                    if (t.type == "parentheses.open")
                        parenNestLevel++;
                    else if (t.type == "parentheses.close")
                        parenNestLevel--;
                    else if (t.type == "bracket.open")
                        bracketNestLevel++;
                    else if (t.type == "bracket.close")
                        bracketNestLevel--;
                    return parenNestLevel == 0 && bracketNestLevel == 0 && t.type == "punctuation.comma";
                })).map(parseExpression)
        };
    }
    //Special case: array access
    if (input[0]?.type == "name" && input[1]?.type == "bracket.open" && input.at(-1)?.type == "bracket.close" && input.length > 3) {
        let parenNestLevel = 0, bracketNestLevel = 0; //Duped paren handling but [] this time, unavoidable
        return {
            operatorToken: input[0],
            operator: "array access",
            //Split the tokens between the parens on commas
            nodes: splitArray(input.slice(2, -1), t => {
                if (t.type == "parentheses.open")
                    parenNestLevel++;
                else if (t.type == "parentheses.close")
                    parenNestLevel--;
                else if (t.type == "bracket.open")
                    bracketNestLevel++;
                else if (t.type == "bracket.close")
                    bracketNestLevel--;
                return parenNestLevel == 0 && bracketNestLevel == 0 && t.type == "punctuation.comma";
            }).map(parseExpression)
        };
    }
    //No operators found at all, something went wrong
    fail(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found`);
}
