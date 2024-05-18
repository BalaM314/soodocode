import { Token, RangeArray } from "./lexer-types.js";
import { tokenTextMapping } from "./lexer.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, operators, operatorsByPriority, ProgramASTBranchNode, ProgramASTBranchNodeType } from "./parser-types.js";
import { ArrayVariableType, PrimitiveVariableType } from "./runtime-types.js";
import { CaseBranchRangeStatement, CaseBranchStatement, Statement, statements } from "./statements.js";
import { crash, displayTokenMatcher, errorBoundary, f, fail, fakeObject, findLastNotInGroup, forceType, impossible, isKey, splitTokens, splitTokensOnComma, splitTokensWithSplitter, tryRun } from "./utils.js";
export const parseFunctionArguments = errorBoundary()((tokens) => {
    if (tokens.length == 0)
        return new Map();
    let passMode = "value";
    let type = null;
    const argumentz = splitTokensOnComma(tokens).map(section => {
        let passMode;
        let type;
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
        if (section[offset + 0]?.type != "name")
            fail(f.quote `Expected a name, got ${section[offset + 0] ?? "end of function arguments"}`, section[offset + 0] ?? (section[offset - 1] ?? tokens.at(-1)).rangeAfter());
        if (section.length == offset + 1) {
            type = null;
        }
        else {
            if (section[offset + 1]?.type != "punctuation.colon")
                fail(f.quote `Expected a colon, got ${section[offset + 1] ?? "end of function arguments"}`, section[offset + 1] ?? (section[offset + 0] ?? tokens.at(-1)).rangeAfter());
            if (offset + 2 >= section.length)
                fail(`Expected a colon, got end of function arguments`, section.at(-1).rangeAfter());
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
            type: data.type ? type = data.type : type ?? fail(f.quote `Type not specified for function argument ${name}`, name)
        }])
        .reverse();
    const argumentsMap = new Map(argumentz.map(([name, data]) => [name.text, data]));
    if (argumentsMap.size != argumentz.length) {
        const [duplicateArgument] = argumentz.find((a, i) => argumentz.find((b, j) => a[0].text == b[0].text && i != j)) ??
            crash(f.debug `Unable to find the duplicate function argument in ${tokens}`);
        fail(f.quote `Duplicate function argument ${duplicateArgument}`, duplicateArgument);
    }
    return argumentsMap;
});
export const processTypeData = errorBoundary()((typeNode) => {
    if (typeNode instanceof Token) {
        return PrimitiveVariableType.resolve(typeNode);
    }
    else
        return ArrayVariableType.from(typeNode);
});
export const parseType = errorBoundary()((tokens) => {
    if (tokens.length == 0)
        crash(`Cannot parse empty type`);
    if (checkTokens(tokens, ["name"]))
        return tokens[0];
    if (checkTokens(tokens, ["keyword.array", "keyword.of", "name"]))
        return new ExpressionASTArrayTypeNode(null, tokens.at(-1), tokens);
    if (checkTokens(tokens, ["keyword.array", "bracket.open", ".+", "bracket.close", "keyword.of", "name"]))
        return new ExpressionASTArrayTypeNode(splitTokensWithSplitter(tokens.slice(2, -3), "punctuation.comma").map(({ group, splitter }) => {
            if (group.length != 3)
                fail(f.quote `Invalid array range specifier ${group}`, group.length ? group : splitter);
            if (group[0].type != "number.decimal")
                fail(f.quote `Expected a number, got ${group[0]}`, group[0]);
            if (group[1].type != "punctuation.colon")
                fail(f.quote `Expected a colon, got ${group[1]}`, group[1]);
            if (group[2].type != "number.decimal")
                fail(f.quote `Expected a number, got ${group[2]}`, group[2]);
            return [group[0], group[2]];
        }), tokens.at(-1), tokens);
    if (checkTokens(tokens, ["keyword.array"]))
        fail(`Please specify the type of the array, like this: "ARRAY OF STRING"`, tokens);
    if (tokens.length <= 1)
        fail(f.quote `Cannot parse type from ${tokens}: expected the name of a builtin or user-defined type, or an array type definition, like "ARRAY[1:10] OF STRING"`, tokens);
    if (checkTokens(tokens, ["keyword.array", "bracket.open", ".+", "bracket.close", ".*"]))
        fail(`Please specify the type of the array, like this: "ARRAY[1:10] OF STRING"`, tokens);
    if (checkTokens(tokens, ["keyword.array", "parentheses.open", ".+", "parentheses.close", "keyword.of", "name"]))
        fail(`Array range specifiers use square brackets, like this: "ARRAY[1:10] OF STRING"`, tokens);
    if (checkTokens(tokens, ["keyword.set"]))
        fail(`Please specify the type of the set, like this: "SET OF STRING"`, tokens);
    if (checkTokens(tokens, ["keyword.set", "keyword.of", "name"]))
        fail(`Set types cannot be specified inline, please create a type alias first, like this: TYPE yournamehere = SET OF ${tokens[2].text}`, tokens);
    if (checkTokens(tokens, ["operator.pointer", "name"]))
        fail(`Pointer types cannot be specified inline, please create a type alias first, like this: TYPE p${tokens[1].text} = ^${tokens[1].text}`, tokens);
    fail(f.quote `Cannot parse type from ${tokens}`, tokens);
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
            if (ts.length > length && Array.isArray(checkStatement(statement, ts.slice(0, length), false)))
                return [ts.slice(0, length), ts.slice(length)];
        }
        return [ts];
    }).flat(1).filter(ts => ts.length > 0);
}
export function parse({ program, tokens }) {
    const lines = splitTokensToStatements(tokens);
    const programNodes = [];
    function getActiveBuffer() {
        if (blockStack.length == 0)
            return programNodes;
        else
            return blockStack.at(-1).nodeGroups.at(-1);
    }
    const blockStack = [];
    for (const line of lines) {
        const statement = parseStatement(line, blockStack.at(-1) ?? null, true);
        if (statement.category == "normal") {
            getActiveBuffer().push(statement);
        }
        else if (statement.category == "block") {
            const node = new ProgramASTBranchNode(ProgramASTBranchNodeType(statement.stype), [statement], [[]]);
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
                fail(f.quote `Unexpected statement: current block is of type ${lastNode.typeName()}`, statement, null);
        }
        else if (statement.category == "block_multi_split") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                fail(`Unexpected statement: ${statement.stype} statements must be inside a block`, statement, null);
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
        fail(f.quote `There were unclosed blocks: ${blockStack.at(-1).controlStatements[0]} requires a matching ${blockStack.at(-1).controlStatements[0].type.blockEndStatement().type} statement`, blockStack.at(-1).controlStatements[0], null);
    return {
        program,
        nodes: programNodes
    };
}
export function getPossibleStatements(tokens, context) {
    const ctx = context?.controlStatements[0].type;
    let validStatements = (tokens[0].type in statements.byStartKeyword
        ? statements.byStartKeyword[tokens[0].type]
        : statements.irregular);
    if (ctx?.allowOnly) {
        const allowedValidStatements = validStatements.filter(s => ctx.allowOnly?.has(s.type));
        if (allowedValidStatements.length == 0) {
            return [
                validStatements,
                statement => fail(`${statement.typeName()} statement is not valid here: the only statements allowed in ${context.type} blocks are ${[...ctx.allowOnly].map(s => `"${Statement.typeName(s)}"`).join(", ")}`, tokens)
            ];
        }
        else
            validStatements = allowedValidStatements;
    }
    if (validStatements.length == 0)
        fail(`No valid statement definitions`, tokens);
    const allowedValidStatements = validStatements.filter(s => !s.blockType || s.blockType == context?.type.split(".")[0]);
    if (allowedValidStatements.length == 0)
        return [
            validStatements,
            statement => fail(`${statement.typeName()} statement is only valid in ${ProgramASTBranchNode.typeName(statement.blockType)} blocks`, tokens)
        ];
    validStatements = allowedValidStatements;
    return [validStatements, null];
}
export const parseStatement = errorBoundary()((tokens, context, allowRecursiveCall) => {
    if (tokens.length < 1)
        crash("Empty statement");
    const [possibleStatements, statementError] = getPossibleStatements(tokens, context);
    const errors = [];
    for (const possibleStatement of possibleStatements) {
        const result = checkStatement(possibleStatement, tokens, allowRecursiveCall);
        if (Array.isArray(result)) {
            if (possibleStatement.invalidMessage)
                fail(possibleStatement.invalidMessage, tokens);
            const [out, err] = tryRun(() => new possibleStatement(new RangeArray(result.map(x => x instanceof Token
                ? x
                : (x.type == "expression" ? parseExpression : parseType)(tokens.slice(x.start, x.end + 1))))));
            if (out) {
                if (statementError)
                    statementError(possibleStatement);
                else
                    return out;
            }
            else
                errors.push({
                    message: err.message,
                    priority: 10,
                    range: err.rangeSpecific ?? null,
                    err
                });
        }
        else {
            if (possibleStatement.suppressErrors)
                result.priority = 0;
            errors.push(result);
        }
    }
    const [expr] = tryRun(() => parseExpression(tokens));
    if (expr && !(expr instanceof Token)) {
        if (expr instanceof ExpressionASTFunctionCallNode)
            fail(`Expected a statement, not an expression\nhelp: use the CALL statement to evaluate this expression`, tokens);
        else
            fail(`Expected a statement, not an expression`, tokens);
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
export const checkStatement = errorBoundary()((statement, input, allowRecursiveCall) => {
    if (input.length == 0)
        crash(`checkStatement() called with empty input`);
    if (statement.category == "block_multi_split" && !statement.blockType)
        crash(`block_multi_split statements must have a block type specified.`);
    const output = [];
    let i, j;
    for (i = (statement.tokens[0] == "#") ? 1 : 0, j = 0; i < statement.tokens.length; i++) {
        forceType(statement.tokens);
        if (statement.tokens[i] == ".+" || statement.tokens[i] == ".*" || statement.tokens[i] == "expr+" || statement.tokens[i] == "type+") {
            const allowEmpty = statement.tokens[i] == ".*";
            const start = j;
            if (j >= input.length) {
                if (allowEmpty)
                    continue;
                else
                    return {
                        message: `Expected ${displayTokenMatcher(statement.tokens[i])}, found end of line`,
                        priority: 4,
                        range: input.at(-1).rangeAfter()
                    };
            }
            let anyTokensSkipped = false;
            while (statement.tokens[i + 1] != input[j].type) {
                anyTokensSkipped = true;
                j++;
                if (j >= input.length) {
                    if (i == statement.tokens.length - 1)
                        break;
                    return { message: `Expected ${displayTokenMatcher(statement.tokens[i + 1])}, found end of line`, priority: 4, range: input.at(-1).rangeAfter() };
                }
            }
            const end = j - 1;
            if (!anyTokensSkipped && !allowEmpty)
                return {
                    message: `Expected ${displayTokenMatcher(statement.tokens[i])} before this token`,
                    priority: 6,
                    range: input[j].range
                };
            if (statement.tokens[i] == "expr+")
                output.push({ type: "expression", start, end });
            else if (statement.tokens[i] == "type+")
                output.push({ type: "type", start, end });
            else
                output.push(...input.slice(start, end + 1));
        }
        else {
            if (j >= input.length)
                return { message: `Expected ${displayTokenMatcher(statement.tokens[i])}, found end of line`, priority: 4, range: input.at(-1).rangeAfter() };
            if (statement.tokens[i] == "#")
                impossible();
            else if (statement.tokens[i] == "." || statement.tokens[i] == input[j].type || (statement.tokens[i] == "file_mode" && input[j].type.startsWith("keyword.file_mode.")) || (statement.tokens[i] == "class_modifier" && input[j].type.startsWith("keyword.class_modifier.")) || (statement.tokens[i] == "name" && input[j].type == "keyword.new")) {
                output.push(input[j]);
                j++;
            }
            else if (statement.tokens[i] == "literal" || statement.tokens[i] == "literal|otherwise") {
                if (isLiteral(input[j].type) || (statement.tokens[i] == "literal|otherwise" && input[j].type == "keyword.otherwise"))
                    output.push(input[j++]);
                else if (input[j].type == "operator.minus" && j + 1 < input.length && input[j + 1].type == "number.decimal") {
                    const negativeNumber = input[j + 1].clone();
                    negativeNumber.extendRange(input[j]);
                    negativeNumber.text = input[j].text + negativeNumber.text;
                    output.push(negativeNumber);
                    j += 2;
                }
                else
                    return { message: getMessage(statement.tokens[i], input[j]), priority: 8, range: input[j].range };
            }
            else
                return { message: getMessage(statement.tokens[i], input[j]), priority: 5, range: input[j].range };
        }
    }
    if (j != input.length) {
        if (j > 0 && allowRecursiveCall) {
            try {
                void parseStatement(input.slice(j), null, false);
                return { message: f.quote `Expected end of line, found beginning of new statement\nhelp: add a newline here`, priority: 20, range: input[j].range };
            }
            catch (err) {
                void err;
            }
        }
        return { message: f.quote `Expected end of line, found ${input[j]}`, priority: 7, range: input[j].range };
    }
    return output;
});
function getMessage(expected, found) {
    if (isKey(tokenTextMapping, expected) && tokenTextMapping[expected].toLowerCase() == found.text.toLowerCase())
        return f.text `Expected ${displayTokenMatcher(expected)}, got \`${found}\`\nhelp: keywords are case sensitive`;
    return f.text `Expected ${displayTokenMatcher(expected)}, got \`${found}\``;
}
export function checkTokens(tokens, input) {
    return Array.isArray(checkStatement(fakeObject({
        tokens: input,
        category: undefined,
        blockType: null,
    }), tokens, false));
}
function cannotEndExpression(token) {
    return token.type.startsWith("operator.") || token.type == "parentheses.open" || token.type == "bracket.open";
}
function canBeUnaryOperator(token) {
    return Object.values(operators).find(o => o.type.startsWith("unary_prefix") && o.token == token.type);
}
export const expressionLeafNodeTypes = ["number.decimal", "name", "string", "char", "boolean.false", "boolean.true", "keyword.super", "keyword.new"];
export const parseExpressionLeafNode = errorBoundary()((token) => {
    if (expressionLeafNodeTypes.includes(token.type))
        return token;
    else
        fail(`Invalid expression leaf node`, token);
});
export const parseExpression = errorBoundary({
    predicate: (_input, recursive) => !recursive,
    message: () => `Cannot parse expression "$rc": `
})((input, recursive = false) => {
    if (!Array.isArray(input))
        crash(`parseExpression(): expected array of tokens, got ${input}`);
    if (input.length == 1)
        return parseExpressionLeafNode(input[0]);
    let error = null;
    for (const operatorsOfCurrentPriority of operatorsByPriority) {
        let parenNestLevel = 0, bracketNestLevel = 0;
        for (let i = input.length - 1; i >= 0; i--) {
            if (input[i].type == "parentheses.close")
                parenNestLevel++;
            else if (input[i].type == "parentheses.open")
                parenNestLevel--;
            else if (input[i].type == "bracket.close")
                bracketNestLevel++;
            else if (input[i].type == "bracket.open")
                bracketNestLevel--;
            if (parenNestLevel < 0)
                fail(`Unclosed parentheses`, input[i]);
            if (bracketNestLevel < 0)
                fail(`Unclosed square bracket`, input[i]);
            let operator;
            if (parenNestLevel == 0 && bracketNestLevel == 0 &&
                operatorsOfCurrentPriority.find(o => (operator = o).token == input[i].type)) {
                if (operator.type.startsWith("unary_prefix")) {
                    const right = input.slice(i + 1);
                    if (i != 0) {
                        if (operator.type == "unary_prefix_o_postfix" && (right.every(n => operatorsOfCurrentPriority.some(o => o.token == n.type && o.type == "unary_postfix_o_prefix" || o.type == "unary_prefix_o_postfix"))))
                            continue;
                        if (canBeUnaryOperator(input[i - 1]))
                            continue;
                        fail(f.text `Unexpected expression on left side of operator ${input[i]}`, input[i]);
                    }
                    if (right.length == 0)
                        fail(f.text `Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
                    if (right.length == 1 && operator.name == "operator.negate" && right[0].type == "number.decimal") {
                        const negativeNumber = right[0].clone();
                        negativeNumber.extendRange(input[i]);
                        negativeNumber.text = input[i].text + negativeNumber.text;
                        return negativeNumber;
                    }
                    return new ExpressionASTBranchNode(input[i], operator, new RangeArray([parseExpression(right, true)]), input);
                }
                else if (operator.type.startsWith("unary_postfix")) {
                    const left = input.slice(0, i);
                    if (i != input.length - 1) {
                        if (operator.type == "unary_postfix_o_prefix" && left.length == 0)
                            continue;
                        fail(f.text `Unexpected expression on left side of operator ${input[i]}`, input[i]);
                    }
                    if (left.length == 0)
                        fail(f.text `Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
                    return new ExpressionASTBranchNode(input[i], operator, new RangeArray([parseExpression(left, true)]), input);
                }
                else {
                    const left = input.slice(0, i);
                    const right = input.slice(i + 1);
                    if (left.length == 0) {
                        if (operator.type == "binary_o_unary_prefix")
                            continue;
                        else
                            fail(f.text `Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
                    }
                    if (right.length == 0)
                        fail(f.text `Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
                    if (operator.type == "binary_o_unary_prefix") {
                        if (cannotEndExpression(input[i - 1]))
                            continue;
                    }
                    if (operator == operators.access) {
                        if (!(right.length == 1 && (right[0].type == "name" || right[0].type == "keyword.new"))) {
                            error = () => fail(`Access operator can only have a single token to the right, which must be a property name`, right);
                            continue;
                        }
                    }
                    return new ExpressionASTBranchNode(input[i], operator, new RangeArray([parseExpression(left, true), parseExpression(right, true)]), input);
                }
            }
        }
        if (parenNestLevel != 0) {
            input.reduce((acc, item) => {
                if (item.type == "parentheses.open")
                    acc++;
                else if (item.type == "parentheses.close")
                    acc--;
                if (acc < 0)
                    fail(`No parentheses group to close`, item);
                return acc;
            }, 0);
            impossible();
        }
        if (bracketNestLevel != 0) {
            input.reduce((acc, item) => {
                if (item.type == "bracket.open")
                    acc++;
                else if (item.type == "bracket.close")
                    acc--;
                if (acc < 0)
                    fail(`No bracket group to close`, item);
                return acc;
            }, 0);
            impossible();
        }
    }
    if (input[0]?.type == "keyword.new" && input[1]?.type == "name" && input[2]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close") {
        return new ExpressionASTClassInstantiationNode(input[1], new RangeArray(input.length == 4
            ? []
            : splitTokensOnComma(input.slice(3, -1)).map(e => parseExpression(e, true)), input.length == 4 ? input.slice(3, -1).range : undefined), input);
    }
    const parenIndex = findLastNotInGroup(input, "parentheses.open");
    if (parenIndex != null && parenIndex > 0 && input.at(-1)?.type == "parentheses.close") {
        const target = input.slice(0, parenIndex);
        const indicesTokens = input.slice(parenIndex + 1, -1);
        if (target.length == 0)
            crash(`Missing function in function call expression`);
        const parsedTarget = parseExpression(target, true);
        if (parsedTarget instanceof Token || parsedTarget instanceof ExpressionASTBranchNode)
            return new ExpressionASTFunctionCallNode(parsedTarget, new RangeArray(indicesTokens.length == 0
                ? []
                : splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true)), indicesTokens.length == 0 ? indicesTokens.range : undefined), input);
        else
            fail(f.quote `${parsedTarget} is not a valid function name, function names must be a single token, or the result of a property access`, parsedTarget);
    }
    if (input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
        return parseExpression(input.slice(1, -1), true);
    const bracketIndex = findLastNotInGroup(input, "bracket.open");
    if (bracketIndex != null && input.at(-1)?.type == "bracket.close") {
        const target = input.slice(0, bracketIndex);
        const indicesTokens = input.slice(bracketIndex + 1, -1);
        if (target.length == 0)
            fail(`Missing target in array index expression`, input[0].rangeBefore());
        if (indicesTokens.length == 0)
            fail(`Missing indices in array index expression`, input[0].rangeAfter());
        const parsedTarget = parseExpression(target, true);
        return new ExpressionASTArrayAccessNode(parsedTarget, new RangeArray(splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true))), input);
    }
    if (error)
        error();
    fail(`No operators found`, input.length > 0 ? input : undefined);
});
