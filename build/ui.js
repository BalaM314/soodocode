import * as lexerTypes from "./lexer-types.js";
import * as lexer from "./lexer.js";
import * as parserTypes from "./parser-types.js";
import * as parser from "./parser.js";
import * as runtime from "./runtime.js";
import * as statements from "./statements.js";
import * as utils from "./utils.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode } from "./parser-types.js";
import { Runtime } from "./runtime.js";
import { Statement } from "./statements.js";
import { SoodocodeError, applyRangeTransformers, crash, escapeHTML, fail, impossible, parseError, f } from "./utils.js";
function getElement(id, type) {
    const element = document.getElementById(id);
    if (element instanceof type)
        return element;
    else if (element instanceof HTMLElement)
        crash(`Element with id ${id} was fetched as type ${type.name}, but was of type ${element.constructor.name}`);
    else
        crash(`Element with id ${id} does not exist`);
}
export function flattenTree(program) {
    return program.map(s => {
        if (s instanceof Statement)
            return [[0, s]];
        else
            return flattenTree(s.nodeGroups.flat()).map(([depth, statement]) => [depth + 1, statement]);
    }).flat(1);
}
export function displayExpressionHTML(node, expand = false, format = true) {
    if (node instanceof Token || node instanceof ExpressionASTArrayTypeNode)
        return escapeHTML(node.fmtText());
    if (node instanceof ExpressionASTFunctionCallNode || node instanceof ExpressionASTArrayAccessNode || node instanceof ExpressionASTClassInstantiationNode) {
        const text = escapeHTML(node.fmtText());
        return format ? `<span class="expression-display-block">${text}</span>` : text;
    }
    const compressed = !expand || node.nodes.every(n => n instanceof Token);
    if (compressed) {
        const text = escapeHTML(node.fmtText());
        return format ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else {
        if (node.operator.type.startsWith("unary_prefix"))
            return (`(
${node.operatorToken.text}
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`);
        else if (node.operator.type.startsWith("unary_postfix"))
            return (`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
)`);
        else
            return (`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
${displayExpressionHTML(node.nodes[1], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`);
    }
}
export function displayProgram(program) {
    return (Array.isArray(program) ? program : program.nodes).map(node => {
        if (node instanceof Statement)
            return displayStatement(node);
        if (node.nodeGroups.length == 1)
            return (`<div class="program-display-outer">\
${displayStatement(node.controlStatements[0])}\
<div class="program-display-inner">\
${displayProgram(node.nodeGroups[0])}\
</div>\
${displayStatement(node.controlStatements.at(-1))}\
</div>`);
        return (`<div class="program-display-outer">\
${displayStatement(node.controlStatements[0])}\
${node.nodeGroups.map((n, i) => [n, node.controlStatements[i + 1] ?? crash(`Cannot display nodes`)]).map(([group, statement]) => (group.length > 0 ? `<div class="program-display-inner">\
${displayProgram(group)}\
</div>` : "") +
            displayStatement(statement)).join("")}\
</div>`);
    }).join("");
}
export function displayStatement(statement) {
    return (`<div class="program-display-statement">\
${statement.tokens.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpressionHTML(t, false)}</span>`).join(" ")}\
</div>`);
}
export function evaluateExpressionDemo(node) {
    if (node instanceof Token) {
        if (node.type == "number.decimal")
            return Number(node.text);
        else if (node.type == "name")
            fail(`Cannot evaluate expression: variable content unknown`);
        else
            fail(f.quote `Cannot evaluate expression: cannot evaluate token ${node}: not a number`);
    }
    else if (node instanceof ExpressionASTFunctionCallNode || node instanceof ExpressionASTClassInstantiationNode) {
        fail(f.quote `Cannot evaluate expression ${node}: function call result unknown`);
    }
    else if (node instanceof ExpressionASTArrayAccessNode) {
        fail(f.quote `Cannot evaluate expression ${node}: array contents unknown`);
    }
    else
        switch (node.operator.name) {
            case "operator.negate": return -evaluateExpressionDemo(node.nodes[0]);
            case "operator.add": return evaluateExpressionDemo(node.nodes[0]) + evaluateExpressionDemo(node.nodes[1]);
            case "operator.subtract": return evaluateExpressionDemo(node.nodes[0]) - evaluateExpressionDemo(node.nodes[1]);
            case "operator.multiply": return evaluateExpressionDemo(node.nodes[0]) * evaluateExpressionDemo(node.nodes[1]);
            case "operator.divide": return evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]);
            case "operator.integer_divide": return Math.trunc(evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]));
            case "operator.mod": return evaluateExpressionDemo(node.nodes[0]) % evaluateExpressionDemo(node.nodes[1]);
            default: fail(f.quote `Cannot evaluate expression: cannot evaluate node ${node}: unknown operator type ${node.operator.name}`);
        }
}
export function download(filename, data) {
    const el = document.createElement("a");
    el.setAttribute("href", URL.createObjectURL(new Blob([data])));
    el.setAttribute("download", filename);
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}
const headerText = getElement("header-text", HTMLSpanElement);
const soodocodeInput = getElement("soodocode-input", HTMLTextAreaElement);
const outputDiv = getElement("output-div", HTMLDivElement);
const dumpTokensButton = getElement("dump-tokens-button", HTMLButtonElement);
const executeSoodocodeButton = getElement("execute-soodocode-button", HTMLButtonElement);
const expressionInput = getElement("expression-input", HTMLInputElement);
const expressionOutputDiv = getElement("expression-output-div", HTMLDivElement);
const dumpExpressionTreeButton = getElement("dump-expression-tree-button", HTMLButtonElement);
const dumpExpressionTreeVerbose = getElement("dump-expression-tree-verbose", HTMLInputElement);
const evaluateExpressionButton = getElement("evaluate-expression-button", HTMLButtonElement);
window.addEventListener("keydown", e => {
    if (e.key == "s" && e.ctrlKey) {
        e.preventDefault();
        download("program.sc", soodocodeInput.value);
    }
});
evaluateExpressionButton.addEventListener("click", () => {
    try {
        expressionOutputDiv.innerText = evaluateExpressionDemo(parser.parseExpression(lexer.tokenize(lexer.symbolize(expressionInput.value)).tokens)).toString();
        expressionOutputDiv.style.color = "white";
    }
    catch (err) {
        expressionOutputDiv.style.color = "red";
        if (err instanceof SoodocodeError) {
            expressionOutputDiv.innerText = "Error: " + err.message;
            if (err.rangeSpecific)
                expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeSpecific)}"`;
            if (err.rangeGeneral)
                expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeGeneral)}"`;
        }
        else {
            console.error(err);
            expressionOutputDiv.innerText = "Soodocode crashed! " + parseError(err);
        }
    }
});
dumpExpressionTreeButton.addEventListener("click", () => {
    try {
        const text = displayExpressionHTML(parser.parseExpression(lexer.tokenize(lexer.symbolize(expressionInput.value)).tokens), dumpExpressionTreeVerbose.checked, false);
        console.log(text);
        let outputText = "";
        let linePos = 0;
        let lineParenColor = null;
        for (const char of text) {
            if (char == "\t") {
                outputText += "  ";
                linePos++;
            }
            else if (['+', '-', '*', '/'].includes(char))
                outputText += `<span style="color:white;font-weight:bold;">${char}</span>`;
            else if (/\d/.test(char))
                outputText += `<span style="color:#B5CEA8;">${char}</span>`;
            else if (dumpExpressionTreeVerbose.checked && ['(', ')'].includes(char)) {
                lineParenColor ?? (lineParenColor = `hsl(${(linePos / 2) * (360 / 6)}, 100%, 70%)`);
                outputText += `<span style="color:${lineParenColor}">${char}</span>`;
            }
            else if (dumpExpressionTreeVerbose.checked && ['↱', '↳'].includes(char)) {
                outputText += `<span style="color:hsl(${(linePos / 2) * (360 / 6)}, 100%, 70%);">${char}</span>`;
            }
            else
                outputText += char;
            linePos++;
            if (char == "\n") {
                linePos = 0;
                lineParenColor = null;
            }
        }
        expressionOutputDiv.innerHTML = outputText;
        expressionOutputDiv.style.color = "white";
    }
    catch (err) {
        expressionOutputDiv.style.color = "red";
        if (err instanceof SoodocodeError) {
            expressionOutputDiv.innerText = "Error: " + err.message;
            if (err.rangeSpecific)
                expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeSpecific)}"`;
            if (err.rangeGeneral)
                expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeGeneral)}"`;
        }
        else {
            console.error(err);
            expressionOutputDiv.innerText = "Soodocode crashed!" + parseError(err);
        }
    }
});
soodocodeInput.onkeydown = e => {
    if ((e.shiftKey && e.key == "Tab") || (e.key == "[" && e.ctrlKey)) {
        e.preventDefault();
        const start = soodocodeInput.selectionStart, end = soodocodeInput.selectionEnd;
        const numNewlinesBefore = soodocodeInput.value.slice(0, start).match(/\n/g)?.length ?? 0;
        const numNewlinesWithin = soodocodeInput.value.slice(start, end).match(/\n(?=\t)/g)?.length ?? 0;
        soodocodeInput.value = soodocodeInput.value
            .slice(0, end)
            .split("\n")
            .map((line, i) => i >= numNewlinesBefore && line.startsWith("\t") ? line.slice(1) : line).join("\n") + soodocodeInput.value.slice(end);
        soodocodeInput.selectionStart = start - 1;
        soodocodeInput.selectionEnd = end - 1 - numNewlinesWithin;
    }
    else if (e.key == "Tab" || (e.key == "]" && e.ctrlKey)) {
        e.preventDefault();
        if (soodocodeInput.selectionStart == soodocodeInput.selectionEnd && !(e.key == "]" && e.ctrlKey)) {
            const start = soodocodeInput.selectionStart;
            soodocodeInput.value = soodocodeInput.value.slice(0, start) + "\t" + soodocodeInput.value.slice(start);
            soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start + 1;
        }
        else {
            const start = soodocodeInput.selectionStart, end = soodocodeInput.selectionEnd;
            const numNewlinesBefore = soodocodeInput.value.slice(0, start).match(/\n/g)?.length ?? 0;
            const numNewlinesWithin = soodocodeInput.value.slice(start, end).match(/\n/g)?.length ?? 0;
            soodocodeInput.value = soodocodeInput.value
                .slice(0, end)
                .split("\n")
                .map((line, i) => i >= numNewlinesBefore ? "\t" + line : line).join("\n") + soodocodeInput.value.slice(end);
            soodocodeInput.selectionStart = start + 1;
            soodocodeInput.selectionEnd = end + 1 + numNewlinesWithin;
        }
    }
    else if (e.key == "Enter" && e.ctrlKey) {
        e.preventDefault();
        executeSoodocode();
    }
    const newText = soodocodeInput.value.replaceAll("\uF0AC", "<-").replaceAll("\u2190", "<-").replaceAll("\u2013", "-").replaceAll("\u2011", "-");
    if (soodocodeInput.value != newText) {
        const start = soodocodeInput.selectionStart;
        soodocodeInput.value = newText;
        soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start;
    }
};
dumpTokensButton.addEventListener("click", () => {
    try {
        const symbols = lexer.symbolize(soodocodeInput.value);
        const tokens = lexer.tokenize(symbols);
        const program = parser.parse(tokens);
        outputDiv.innerHTML = `\
<!--<h2>Symbols</h2>\
<div class="display-scroller">
<table>
<thead>
<tr> <th>Text</th> <th>Type</th> </tr>
</thead>
<tbody>
${symbols.symbols.map(t => `<tr><td>${escapeHTML(t.text).replace('\n', `<span style="text-decoration:underline">\\n</span>`)}</td><td>${t.type}</td></tr>`).join("\n")}
</tbody>
</table>
</div>-->
<h2>Tokens</h2>\
<div class="display-scroller">
<table>
<thead>
<tr> <th>Text</th> <th>Type</th> </tr>
</thead>
<tbody>
${tokens.tokens.map(t => `<tr><td>${escapeHTML(t.text).replace('\n', `<span style="text-decoration:underline">\\n</span>`)}</td><td>${t.type}</td></tr>`).join("\n")}
</tbody>
</table>
</div>
<h2>Statements</h2>
${displayProgram(program)}`;
        outputDiv.style.color = "white";
    }
    catch (err) {
        outputDiv.style.color = "red";
        if (err instanceof SoodocodeError) {
            outputDiv.innerText = `Error: ${err.message}`;
            if (err.rangeSpecific)
                outputDiv.innerText += `\nat "${soodocodeInput.value.slice(...err.rangeSpecific)}"`;
            if (err.rangeGeneral)
                outputDiv.innerText += `\nat "${soodocodeInput.value.slice(...err.rangeGeneral)}"`;
        }
        else {
            outputDiv.innerText = `Soodocode crashed! ${parseError(err)}`;
        }
    }
});
export function showRange(text, error) {
    if (!error.rangeGeneral && !error.rangeSpecific)
        return ``;
    if (error.rangeSpecific && error.rangeSpecific[1] - error.rangeSpecific[0] == 1) {
        const specificText = text.slice(...error.rangeSpecific);
        if (specificText == "" || specificText == "\n")
            error.rangeSpecific = error.rangeSpecific.map(n => n - 1);
    }
    if ((!error.rangeGeneral || !error.rangeSpecific || (error.rangeGeneral[0] <= error.rangeSpecific[0] && error.rangeGeneral[1] >= error.rangeSpecific[1]))) {
        const range = error.rangeGeneral ?? error.rangeSpecific ?? impossible();
        const beforeText = text.slice(0, range[0]);
        const rangeText = text.slice(...range);
        const beforeLines = beforeText.split("\n");
        const lineNumber = beforeLines.length;
        const formattedPreviousLine = beforeLines.at(-2)
            ? `${" ".repeat(lineNumber.toString().length)} | ${escapeHTML(beforeLines.at(-2))}\n`
            : "";
        const startOfLine = beforeLines.at(-1);
        const restOfLine = text.slice(range[1]).split("\n")[0];
        const formattedRangeText = error.rangeSpecific ?
            applyRangeTransformers(rangeText, [[
                    error.rangeSpecific.map(n => n - range[0]),
                    `<span style="text-decoration: underline wavy red;">`, "</span>", escapeHTML
                ]])
            : escapeHTML(rangeText);
        return `
${formattedPreviousLine}\
${lineNumber} | ${escapeHTML(startOfLine)}<span style="background-color: #FF03;">${formattedRangeText}</span>${escapeHTML(restOfLine)}`;
    }
    else {
        const trimEnd = text.slice(error.rangeSpecific[1]).indexOf("\n");
        text = text.slice(0, trimEnd);
        const fullText = applyRangeTransformers(text, [
            [error.rangeSpecific, `<span style="text-decoration: underline wavy red;">`, "</span>", escapeHTML]
        ]);
        const trimStart = fullText.slice(0, error.rangeSpecific[0]).lastIndexOf("\n");
        return fullText.slice(trimStart);
    }
}
let shouldDump = false;
executeSoodocodeButton.addEventListener("click", () => executeSoodocode());
function executeSoodocode() {
    const output = [];
    const runtime = new Runtime((msg) => prompt(msg) ?? fail("input was empty"), m => {
        output.push(m);
        console.log(`[Runtime] ${m}`);
    });
    try {
        const symbols = lexer.symbolize(soodocodeInput.value);
        const tokens = lexer.tokenize(symbols);
        const program = parser.parse(tokens);
        if (shouldDump) {
            Object.assign(window, {
                symbols, tokens, program, runtime
            });
        }
        runtime.fs.makeBackup();
        runtime.runProgram(program.nodes);
        outputDiv.innerText = output.join("\n") || "<no output>";
    }
    catch (err) {
        runtime.fs.loadBackup();
        if (err instanceof SoodocodeError) {
            outputDiv.innerHTML = `<span style="color: red;">${escapeHTML(err.formatMessage(soodocodeInput.value))}</span>\n`
                + showRange(soodocodeInput.value, err);
            console.error(err);
        }
        else {
            outputDiv.innerHTML = `<span style="color: red;">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
            console.error(err);
        }
    }
}
let flashing = false;
let bouncing = false;
let flipped = false;
const clickTimes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
headerText.addEventListener("click", e => {
    clickTimes.shift();
    clickTimes.push(Date.now());
    if (e.shiftKey)
        flashing = !flashing;
    if (e.altKey)
        bouncing = !bouncing;
    if (e.ctrlKey)
        flipped = !flipped;
    headerText.style.setProperty("transform", flipped ? "scaleX(-1)" : "none");
    headerText.style.setProperty("animation-name", bouncing ? "sizebounce" : "none");
    if (!e.shiftKey && !e.altKey && !e.ctrlKey)
        headerText.style.setProperty('color', `hsl(${Math.floor(Math.random() * 360)}, 80%, 80%)`);
    if (((Date.now() - clickTimes[0]) / 10) < 500)
        headerText.style.setProperty("visibility", "hidden");
});
setInterval(() => {
    if (flashing)
        headerText.style.setProperty('color', `hsl(${Math.floor(Math.random() * 360)}, 80%, 80%)`);
}, 500);
function dumpFunctionsToGlobalScope() {
    shouldDump = true;
    window.runtime = new Runtime((msg) => prompt(msg) ?? fail("input was empty"), m => console.log(`[Runtime] ${m}`));
    Object.assign(window, lexer, lexerTypes, parser, parserTypes, statements, utils, runtime);
}
dumpFunctionsToGlobalScope();
