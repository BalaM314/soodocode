import { getText } from "./lexer.js";
import { statements } from "./statements.js";
/** `low` and `high` must correspond to the indexes of the lowest and highest elements in the function arguments. */
export function parseFunctionArguments(tokens, low, high) {
    const size = high - low + 1;
    if (!(size != 0 || size % 4 != 3))
        return `Incorrect number of tokens (${size}), must be 0 or 3 above a multiple of 4`;
    const numArgs = Math.ceil(size / 4);
    const args = new Map();
    for (let i = 0; i < numArgs; i++) {
        const name = tokens[low + 4 * i + 0];
        const colon = tokens[low + 4 * i + 1];
        const type = tokens[low + 4 * i + 2];
        const comma = tokens[low + 4 * i + 3];
        if (!name)
            return `Missing name`;
        if (name.type != "name")
            return `Expected a name, got "${name.text}" (${name.type})`;
        if (!colon)
            return `Missing colon`;
        if (colon.type != "punctuation.colon")
            return `Expected a colon, got "${colon.text}" (${colon.type})`;
        if (!type)
            return `Missing type`;
        if (type.type != "name")
            return `Expected a type, got "${type.text}" (${type.type})`;
        if (!comma)
            return `Missing comma`;
        if (i == numArgs - 1 && comma.type != "parentheses.close") //Last argument and the 4th token is the closing paren
            return `Expected closing parentheses, got "${comma.text}" (${comma.type})`;
        if (i != numArgs - 1 && comma.type != "punctuation.comma") //Not the last argument and the token is a comma
            return `Expected a comma, got "${comma.text}" (${comma.type})`;
        args.set(name.text, type.text.toUpperCase());
    }
    return args;
}
export function parse(tokens) {
    const lines = [[]];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "newline") {
            if (i != (tokens.length - 1) && lines.at(-1).length != 0)
                lines.push([]);
        }
        else {
            lines.at(-1).push(tokens[i]);
        }
    }
    const statements = lines.map(parseStatement);
    const program = [];
    function getActiveBuffer() {
        if (blockStack.length == 0)
            return program;
        else
            return blockStack.at(-1).nodes;
    }
    const blockStack = [];
    for (const statement of statements) {
        if (statement.category == "normal") {
            getActiveBuffer().push(statement);
        }
        else if (statement.category == "block") {
            const node = {
                startStatement: statement,
                endStatement: null,
                type: statement.stype,
                nodes: []
            };
            getActiveBuffer().push(node);
            blockStack.push(node);
        }
        else if (statement.category == "block_end") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                throw new Error(`Invalid statement "${stringifyStatement(statement)}": no open blocks`);
            else if (lastNode.startStatement.stype == statement.stype.split(".")[0]) { //probably bad code
                lastNode.endStatement = statement;
                blockStack.pop();
            }
            else
                throw new Error(`Invalid statement "${stringifyStatement(statement)}": current block is of type ${lastNode.startStatement.stype}`);
        }
        else
            throw new Error("impossible");
    }
    if (blockStack.length)
        throw new Error(`There were unclosed blocks: "${stringifyStatement(blockStack.at(-1).startStatement)}" requires a matching "${blockStack.at(-1).startStatement.blockEndStatement().type}" statement`);
    return program;
}
/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export function parseStatement(tokens) {
    const statement = getStatement(tokens);
    if (typeof statement == "string")
        throw new Error(`Invalid line ${tokens.map(t => t.text).join(" ")}: ${statement}`);
    return new statement(tokens);
}
export function getStatement(tokens) {
    if (tokens.length < 1)
        return "Empty statement";
    let possibleStatements;
    if (tokens[0].type in statements.startKeyword)
        possibleStatements = [statements.startKeyword[tokens[0].type]];
    else
        possibleStatements = statements.irregular;
    if (possibleStatements.length == 0)
        return `No possible statements`;
    let errors = [];
    for (const possibleStatement of possibleStatements) {
        const result = possibleStatement.check(tokens);
        if (Array.isArray(result))
            errors.push(result);
        else
            return possibleStatement;
    }
    let maxError = errors[0];
    for (const error of errors) {
        if (error[1] > maxError[1])
            maxError = error;
    }
    return maxError[0];
}
export function stringifyStatement(statement) {
    return statement.tokens.map(t => t.text).join(" ");
}
const operators = [["multiply", "divide"], ["add", "subtract"]].reverse();
export function parseExpression(input) {
    //If there is only one token
    if (input.length == 1) {
        if (input[0].type == "number.decimal") //and it's a number
            return input[0]; //nothing to parse, just return the number
        else
            throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: not a number`);
    }
    //If the whole expression is surrounded by parentheses, parse the inner expression
    if (input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
        return parseExpression(input.slice(1, -1));
    //Go through P E M-D A-S in reverse order to find the operator with the lowest priority
    for (const operatorsOfPriority of operators) {
        let parenNestLevel = 0;
        //Find the index of the last (lowest priority) operator of the current priority
        //Iterate through string backwards
        for (let i = input.length - 1; i >= 0; i--) {
            //Handle parentheses
            //The string is being iterated through backwards, so ) means go up a level and ( means go down a level
            if (input[i].type == "parentheses.close")
                parenNestLevel++;
            else if (input[i].type == "parentheses.open")
                parenNestLevel--;
            if (parenNestLevel < 0)
                //nest level going below 0 means too many (, so unclosed parens
                throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed parentheses`);
            if (parenNestLevel == 0 && //the operator is not inside parentheses and
                operatorsOfPriority.map(o => `operator.${o}`).includes(input[i].type) //it is currently being searched for
            ) {
                //this is the lowest priority operator in the expression and should become the root node
                const left = input.slice(0, i);
                const right = input.slice(i + 1);
                //Make sure there is something on left and right of the operator
                if (left.length == 0)
                    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[i].text}`);
                if (right.length == 0)
                    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
                return {
                    token: input[i],
                    nodes: [parseExpression(left), parseExpression(right)]
                };
            }
        }
        //Nest level being above zero at the end of the string means too many )
        if (parenNestLevel != 0)
            throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no parentheses group to close`);
        //No operators of the current priority found, look for operator with the next level higher priority
    }
    //No operators found at all, something went wrong
    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found`);
}
