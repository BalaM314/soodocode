import { Token } from "./lexer-types.js";
import { tokenTextMapping } from "./lexer.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTRangeTypeNode, operators, operatorsByPriority, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNodeGroup } from "./parser-types.js";
import { ArrayVariableType, IntegerRangeVariableType, PrimitiveVariableType } from "./runtime-types.js";
import { CaseBranchRangeStatement, CaseBranchStatement, Statement, statements } from "./statements.js";
import { biasedLevenshtein, closestKeywordToken, crash, displayTokenMatcher, errorBoundary, f, fail, fakeObject, findLastNotInGroup, forceType, impossible, isKey, manageNestLevel, max, RangeArray, splitTokens, splitTokensOnComma, tryRun } from "./utils.js";
export const parseFunctionArguments = errorBoundary()(function _parseFunctionArguments(tokens) {
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
export const processTypeData = errorBoundary()(function _processTypeData(typeNode) {
    if (typeNode instanceof Token) {
        return PrimitiveVariableType.resolve(typeNode);
    }
    else if (typeNode instanceof ExpressionASTArrayTypeNode) {
        return ArrayVariableType.from(typeNode);
    }
    else if (typeNode instanceof ExpressionASTRangeTypeNode) {
        return IntegerRangeVariableType.from(typeNode);
    }
    typeNode;
    impossible();
});
export const parseType = errorBoundary()(function _parseType(tokens) {
    if (tokens.length == 0)
        crash(`Cannot parse empty type`);
    if (checkTokens(tokens, ["name"]))
        return tokens[0];
    if (checkTokens(tokens, ["number.decimal", "operator.range", "number.decimal"]))
        return new ExpressionASTRangeTypeNode(tokens[0], tokens[2], tokens);
    if (checkTokens(tokens, ["keyword.array", "keyword.of", "name"]))
        return new ExpressionASTArrayTypeNode(null, tokens.at(-1), tokens);
    if (checkTokens(tokens, ["keyword.array", "bracket.open", ".+", "bracket.close", "keyword.of", "name"]))
        return new ExpressionASTArrayTypeNode(splitTokensOnComma(tokens.slice(2, -3)).map((group) => {
            const groups = splitTokens(group, "punctuation.colon");
            if (groups.length != 2)
                fail(`Invalid array range specifier $rc: must consist of two expressions separated by a colon`, group);
            return groups.map(a => parseExpression(a));
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
    return splitTokens(tokens.select((token, i) => !(token.type == "newline" && tokens[i + 1]?.type == "keyword.then")), "newline").map(ts => {
        for (const [statement, length] of statementData) {
            if (ts.length > length && Array.isArray(checkStatement(statement, ts.slice(0, length), false)))
                return [ts.slice(0, length), ts.slice(length)];
        }
        return [ts];
    }).flat(1).filter(ts => ts.length > 0);
}
export function parse({ program, tokens }) {
    const lines = splitTokensToStatements(tokens);
    const programNodes = new ProgramASTNodeGroup();
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
            const node = new ProgramASTBranchNode(ProgramASTBranchNodeType(statement.stype), [statement], [new ProgramASTNodeGroup()]);
            getActiveBuffer().push(node);
            blockStack.push(node);
        }
        else if (statement.category == "block_end") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                fail(`Unexpected statement: no open blocks`, statement);
            else if (statement instanceof lastNode.controlStatements[0].type.blockEndStatement()) {
                lastNode.controlStatements_().push(statement);
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
            lastNode.controlStatements_().push(statement);
            lastNode.nodeGroups.push(new ProgramASTNodeGroup());
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
    let validStatements = statements.byStartKeyword[tokens[0].type]
        ?? (() => {
            const closest = closestKeywordToken(tokens[0].text);
            if (closest && statements.byStartKeyword[closest]) {
                return [...statements.irregular, ...statements.byStartKeyword[closest]];
            }
            else {
                return statements.irregular;
            }
        })();
    if (context != "any") {
        const ctx = context?.controlStatements[0].type;
        if (ctx?.allowOnly) {
            const allowedValidStatements = validStatements.filter(s => ctx.allowOnly.has(s.type));
            if (allowedValidStatements.length == 0) {
                return [
                    validStatements,
                    statement => fail(`${statement.typeName()} statement is not valid here: the only statements allowed in ${context.type} blocks are ${[...ctx.allowOnly].map(s => `"${Statement.typeName(s)}"`).join(", ")}`, tokens)
                ];
            }
            else
                validStatements = allowedValidStatements;
        }
    }
    if (validStatements.length == 0)
        fail(`No valid statement definitions`, tokens);
    const allowedValidStatements = validStatements.filter(s => context == "any" || !(s.blockType && s.blockType != context?.type.split(".")[0]));
    if (allowedValidStatements.length == 0) {
        return [
            validStatements,
            statement => fail(`${statement.typeName()} statement is only valid in ${ProgramASTBranchNode.typeName(statement.blockType)} blocks`, tokens)
        ];
    }
    else
        validStatements = allowedValidStatements;
    return [validStatements, null];
}
export const parseStatement = errorBoundary()(function _parseStatement(tokens, context, allowRecursiveCall) {
    if (tokens.length <= 0)
        crash("Empty statement");
    const [possibleStatements, statementError] = getPossibleStatements(tokens, context);
    const errors = [];
    for (const possibleStatement of possibleStatements) {
        const result = checkStatement(possibleStatement, tokens, allowRecursiveCall);
        if (Array.isArray(result)) {
            if (possibleStatement.invalidMessage) {
                if (typeof possibleStatement.invalidMessage == "function") {
                    if (context == "any")
                        context = null;
                    const [message, range] = possibleStatement.invalidMessage(result, context);
                    fail(message, range ?? tokens);
                }
                else {
                    fail(possibleStatement.invalidMessage, tokens);
                }
            }
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
            fail({
                summary: `Expected a statement, not an expression`,
                help: [f.range `use the CALL statement to evaluate this expression, by changing the line to "CALL ${tokens}"`],
            }, tokens);
        else
            fail(`Expected a statement, not an expression`, tokens);
    }
    const maxError = max(errors, e => e.priority) ?? crash(`must have been at least one error`);
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
export function checkStatement(statement, input, allowRecursiveCall) {
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
            const nestLevel = manageNestLevel();
            while (statement.tokens[i + 1] != input[j].type || nestLevel.in()) {
                nestLevel.update(input[j]);
                anyTokensSkipped = true;
                j++;
                if (j >= input.length) {
                    if (i == statement.tokens.length - 1)
                        break;
                    const expectedType = statement.tokens[i + 1];
                    if (isKey(tokenTextMapping, expectedType)) {
                        const nestLevel = manageNestLevel();
                        const err = max(input.slice(start).map(token => {
                            nestLevel.update(token);
                            return nestLevel.out() && getMessage(expectedType, token, 10);
                        }).filter(Boolean), m => m.priority, 49);
                        if (err)
                            return err;
                    }
                    return {
                        message: `Expected ${displayTokenMatcher(statement.tokens[i + 1])}, found end of line`,
                        priority: 4,
                        range: input.at(-1).rangeAfter()
                    };
                }
            }
            const end = j - 1;
            if (end < start && !allowEmpty)
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
                return {
                    message: `Expected ${displayTokenMatcher(statement.tokens[i])}, found end of line`,
                    priority: 4,
                    range: input.at(-1).rangeAfter()
                };
            if (statement.tokens[i] == "#")
                impossible();
            else if (statement.tokens[i] == "." || statement.tokens[i] == input[j].type || (statement.tokens[i] == "file_mode" && input[j].type.startsWith("keyword.file_mode.")) || (statement.tokens[i] == "class_modifier" && input[j].type.startsWith("keyword.class_modifier.")) || (statement.tokens[i] == "name" && input[j].type == "keyword.new")) {
                output.push(input[j]);
                j++;
            }
            else if (statement.tokens[i] == "literal" || statement.tokens[i] == "literal|otherwise") {
                if (isLiteral(input[j].type) || (statement.tokens[i] == "literal|otherwise" && input[j].type == "keyword.otherwise")) {
                    output.push(input[j++]);
                }
                else if (input[j].type == "operator.minus" && j + 1 < input.length && input[j + 1].type == "number.decimal") {
                    const negativeNumber = input[j + 1].clone();
                    negativeNumber.extendRange(input[j]);
                    negativeNumber.text = input[j].text + negativeNumber.text;
                    output.push(negativeNumber);
                    j += 2;
                }
                else
                    return getMessage(statement.tokens[i], input[j], 5);
            }
            else
                return getMessage(statement.tokens[i], input[j], 5);
        }
    }
    if (j != input.length) {
        if (j > 0 && allowRecursiveCall) {
            try {
                void parseStatement(input.slice(j), "any", false);
                return {
                    message: {
                        summary: f.quote `Expected end of line, found beginning of new statement`,
                        help: [f.quoteRange `add a newline or semicolon before ${input[j]}`],
                    },
                    priority: 20,
                    range: input[j].range
                };
            }
            catch { }
        }
        return { message: f.quote `Expected end of line, found ${input[j]}`, priority: 7, range: input[j].range };
    }
    return output;
}
function getMessage(expected, found, priority) {
    const message = f.text `Expected ${displayTokenMatcher(expected)}, got \`${found}\``;
    const range = found.range;
    if (isKey(tokenTextMapping, expected)) {
        if (tokenTextMapping[expected].toLowerCase() == found.text.toLowerCase())
            return {
                message: {
                    summary: message,
                    elaboration: `keywords are case sensitive`,
                },
                priority: 50,
                range
            };
        if (biasedLevenshtein(tokenTextMapping[expected], found.text) < 2)
            priority = 50;
    }
    return { message, priority, range };
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
function canBeOperator(token) {
    return Object.values(operators).find(o => o.token == token.type);
}
function canBeUnaryOperator(token) {
    return Object.values(operators).find(o => o.fix.startsWith("unary_prefix") && o.token == token.type);
}
export const expressionLeafNodeTypes = ["number.decimal", "name", "string", "char", "boolean.false", "boolean.true"];
export function parseExpressionLeafNode(token, allowSuper = false, allowNew = false) {
    if (expressionLeafNodeTypes.includes(token.type) ||
        (allowSuper && token.type == "keyword.super") ||
        (allowNew && token.type == "keyword.new"))
        return token;
    else
        fail(`Invalid expression leaf node`, token);
}
;
export const parseExpression = errorBoundary({
    predicate: (_input, recursive) => !recursive,
    message: () => `Expected "$rc" to be an expression, but it was invalid: `
})(function _parseExpression(input, recursive = false, allowSuper = false, allowNew = false) {
    if (!Array.isArray(input))
        crash(`parseExpression(): expected array of tokens, got ${input}`);
    if (input.length == 1)
        return parseExpressionLeafNode(input[0], allowSuper, allowNew);
    let deferredError = () => fail(`No operators found`, input.length > 0 ? input : undefined);
    for (const operatorsOfCurrentPriority of operatorsByPriority) {
        const nestLevel = manageNestLevel(true);
        for (let i = input.length - 1; i >= 0; i--) {
            nestLevel.update(input[i]);
            let operator;
            if (nestLevel.out() &&
                operatorsOfCurrentPriority.find(o => (operator = o).token == input[i].type)) {
                if (operator.fix.startsWith("unary_prefix")) {
                    const right = input.slice(i + 1);
                    if (i != 0) {
                        if (operator.fix == "unary_prefix_o_postfix") {
                            if (right.every(n => operatorsOfCurrentPriority.some(o => o.token == n.type && o.fix == "unary_postfix_o_prefix" || o.fix == "unary_prefix_o_postfix")))
                                continue;
                            if (right[0] && canBeOperator(right[0])) {
                                deferredError = () => fail(f.text `Unexpected expression on right side of operator ${input[i]}`, input[i]);
                                continue;
                            }
                        }
                        if (canBeUnaryOperator(input[i - 1]))
                            continue;
                        fail(f.text `Unexpected expression on left side of operator ${input[i]}`, input[i]);
                    }
                    if (right.length == 0)
                        fail(f.text `Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
                    if (right.length == 1 && operator.id == "operator.negate" && right[0].type == "number.decimal") {
                        const negativeNumber = right[0].clone();
                        negativeNumber.extendRange(input[i]);
                        negativeNumber.text = input[i].text + negativeNumber.text;
                        return negativeNumber;
                    }
                    return new ExpressionASTBranchNode(input[i], operator, new RangeArray([parseExpression(right, true)]), input);
                }
                else if (operator.fix.startsWith("unary_postfix")) {
                    const left = input.slice(0, i);
                    if (i != input.length - 1) {
                        if (operator.fix == "unary_postfix_o_prefix" && left.length == 0)
                            continue;
                        if (input[i + 1] && canBeOperator(input[i + 1])) {
                            deferredError = () => fail(f.text `Unexpected expression on right side of operator ${input[i]}`, input[i]);
                            continue;
                        }
                        fail(f.text `Unexpected expression on right side of operator ${input[i]}`, input[i]);
                    }
                    if (left.length == 0)
                        fail(f.text `Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
                    return new ExpressionASTBranchNode(input[i], operator, new RangeArray([parseExpression(left, true)]), input);
                }
                else {
                    const left = input.slice(0, i);
                    const right = input.slice(i + 1);
                    if (left.length == 0) {
                        if (operator.fix == "binary_o_unary_prefix")
                            continue;
                        else
                            fail(f.text `Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
                    }
                    if (right.length == 0)
                        fail(f.text `Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
                    if (operator.fix == "binary_o_unary_prefix") {
                        if (cannotEndExpression(input[i - 1]))
                            continue;
                    }
                    if (operator == operators.access) {
                        if (!(right.length == 1 && (right[0].type == "name" || right[0].type == "keyword.new"))) {
                            deferredError = () => fail(`Access operator can only have a single token to the right, which must be a property name`, right);
                            continue;
                        }
                    }
                    return new ExpressionASTBranchNode(input[i], operator, new RangeArray([parseExpression(left, true, operator == operators.access), parseExpression(right, true, false, operator == operators.access)]), input);
                }
            }
        }
        nestLevel.done(input);
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
    deferredError();
});
