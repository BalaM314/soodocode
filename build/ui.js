import * as lexerTypes from "./lexer-types.js";
import * as lexer from "./lexer.js";
import * as parserTypes from "./parser-types.js";
import * as parser from "./parser.js";
import * as runtime from "./runtime.js";
import * as runtimeTypes from "./runtime-types.js";
import * as statements from "./statements.js";
import * as utils from "./utils.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTRangeTypeNode } from "./parser-types.js";
import { Runtime } from "./runtime.js";
import { Statement } from "./statements.js";
import { SoodocodeError, applyRangeTransformers, crash, escapeHTML, fail, parseError, f, capitalizeText } from "./utils.js";
import { configs } from "./config.js";
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
    if (node instanceof Token || node instanceof ExpressionASTArrayTypeNode || node instanceof ExpressionASTRangeTypeNode)
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
${statement.nodes.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpressionHTML(t, false)}</span>`).join(" ")}\
</div>`);
}
export function generateConfigsDialog() {
    const wrapper = document.createElement("div");
    wrapper.id = "settings-dialog-inner";
    for (const [sectionName, section] of Object.entries(configs)) {
        const header = document.createElement("span");
        header.classList.add("settings-section-header");
        header.innerText = capitalizeText(sectionName);
        wrapper.append(header);
        const settingsGrid = document.createElement("div");
        settingsGrid.classList.add("settings-grid");
        for (const [id, config] of Object.entries(section)) {
            const gridItem = document.createElement("div");
            gridItem.classList.add("settings-grid-item");
            const label = document.createElement("label");
            const input = document.createElement("input");
            input.name = id;
            if (typeof config.value == "boolean") {
                input.type = "checkbox";
                input.checked = Boolean(config.value);
                input.addEventListener("change", () => {
                    config.value = input.checked;
                });
            }
            else if (typeof config.value == "number") {
                input.type = "number";
                input.value = Number(config.value).toString();
                input.addEventListener("change", () => {
                    config.value = Number(input.value);
                });
            }
            else if (typeof config.value == "string") {
                input.type = "text";
                input.value = config.value;
                input.addEventListener("change", () => {
                    config.value = input.value;
                });
            }
            else if (config.value instanceof Date) {
                input.type = "date";
                input.value = config.value.toLocaleDateString().replaceAll("/", "-");
                input.addEventListener("change", () => {
                    const date = new Date(input.value);
                    if (!isNaN(date.getTime()))
                        config.value = date;
                });
            }
            else
                crash(`Unknown config type ${typeof config.value}`);
            label.append(input);
            label.append(config.name);
            gridItem.append(label);
            const description = document.createElement("div");
            if (config.description) {
                description.classList.add("settings-description");
                description.innerText = config.description;
            }
            gridItem.append(description);
            settingsGrid.append(gridItem);
        }
        wrapper.append(settingsGrid);
    }
    return wrapper;
}
export function evaluateExpressionDemo(node) {
    if (node instanceof Token) {
        if (node.type == "number.decimal")
            return Number(node.text);
        else if (node.type == "name")
            fail(`Cannot evaluate expression: variable content unknown`, node);
        else
            fail(f.quote `Cannot evaluate expression: cannot evaluate token ${node}: not a number`, node);
    }
    else if (node instanceof ExpressionASTFunctionCallNode || node instanceof ExpressionASTClassInstantiationNode) {
        fail(f.quote `Cannot evaluate expression ${node}: function call result unknown`, node);
    }
    else if (node instanceof ExpressionASTArrayAccessNode) {
        fail(f.quote `Cannot evaluate expression ${node}: array contents unknown`, node);
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
            default: fail(f.quote `Cannot evaluate expression: cannot evaluate node ${node}: unknown operator type ${node.operator.name}`, node);
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
const uploadButton = getElement("upload-button", HTMLInputElement);
const settingsDialog = getElement("settings-dialog", HTMLDialogElement);
window.addEventListener("keydown", e => {
    if (e.key == "s" && e.ctrlKey) {
        e.preventDefault();
        download("program.sc", soodocodeInput.value);
    }
    else if (e.key == "o" && e.ctrlKey) {
        e.preventDefault();
        uploadButton.click();
    }
});
uploadButton.onchange = (event) => {
    const file = event.target?.files?.[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = e => {
        const content = e.target?.result?.toString();
        if (content == null)
            return;
        if (confirm(`Are you sure you want to load this file? This will erase your current program.`)) {
            soodocodeInput.value = content;
        }
    };
};
getElement("settings-dialog-button", HTMLSpanElement).addEventListener("click", () => {
    settingsDialog.showModal();
});
settingsDialog.append(generateConfigsDialog());
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
    if (error.rangeSpecific) {
        if (error.rangeSpecific[0] == error.rangeSpecific[1]) {
            error.rangeSpecific[1]++;
        }
        if (error.rangeSpecific[1] - error.rangeSpecific[0] == 1) {
            const specificText = text.slice(...error.rangeSpecific);
            if (specificText == "" || specificText == "\n")
                error.rangeSpecific = error.rangeSpecific.map(n => n - 1);
        }
    }
    if (error.rangeGeneral && error.rangeSpecific) {
        if (error.rangeSpecific[1] - error.rangeSpecific[0] == 1 &&
            error.rangeGeneral[1] == error.rangeSpecific[0])
            error.rangeGeneral[1]++;
    }
    const outerRange = utils.getTotalRange([error.rangeGeneral, error.rangeSpecific].filter(Boolean));
    const beforeText = text.slice(0, outerRange[0]);
    const rangeText = text.slice(...outerRange);
    const beforeLines = beforeText.split("\n");
    const lineNumber = beforeLines.length.toString();
    const formattedPreviousLine = beforeLines.at(-2)
        ? `${" ".repeat(lineNumber.length)} | ${escapeHTML(beforeLines.at(-2))}\n`
        : "";
    const startOfLine = beforeLines.at(-1);
    const restOfLine = text.slice(outerRange[1]).split("\n")[0];
    const formattedRangeText = applyRangeTransformers(rangeText, [
        error.rangeGeneral && [
            error.rangeGeneral.map(n => n - outerRange[0]),
            `<span class="error-range-outer">`, "</span>", escapeHTML
        ],
        error.rangeSpecific && [
            error.rangeSpecific.map(n => n - outerRange[0]),
            `<span class="error-range-inner">`, "</span>", escapeHTML
        ],
    ].filter(Boolean));
    return `
${formattedPreviousLine}\
${lineNumber} | ${escapeHTML(startOfLine)}${formattedRangeText}</span>${escapeHTML(restOfLine)}`;
}
function printPrefixed(value) {
    console.log(`%c[Runtime]`, `color: lime;`, value);
}
function flashOutputDiv() {
    outputDiv.style.animationName = "";
    void outputDiv.offsetHeight;
    outputDiv.style.animationName = "highlight-output-div";
}
let shouldDump = false;
executeSoodocodeButton.addEventListener("click", () => executeSoodocode());
let lastOutputText = "";
function executeSoodocode() {
    const noOutput = `<span style="color: lightgray;">&lt;no output&gt;</span>`;
    const output = [];
    const runtime = new Runtime((msg) => prompt(msg) ?? fail("User did not input a value", undefined), m => {
        const str = m.map(x => x.asHTML(false)).join("");
        output.push(str);
        if (configs.runtime.display_output_immediately.value) {
            outputDiv.innerHTML += str + "\n";
            console.log("now");
        }
        printPrefixed(str);
    });
    try {
        if (configs.runtime.display_output_immediately.value)
            outputDiv.innerHTML = "";
        console.time("parsing");
        const symbols = lexer.symbolize(soodocodeInput.value);
        const tokens = lexer.tokenize(symbols);
        const program = parser.parse(tokens);
        console.timeEnd("parsing");
        if (shouldDump) {
            Object.assign(window, {
                symbols, tokens, program, runtime
            });
        }
        runtime.fs.makeBackup();
        console.time("execution");
        runtime.runProgram(program.nodes);
        console.timeEnd("execution");
        if (configs.runtime.display_output_immediately.value) {
            if (outputDiv.innerText.trim().length == 0)
                outputDiv.innerHTML = noOutput;
            if (outputDiv.innerHTML == lastOutputText)
                flashOutputDiv();
            lastOutputText = outputDiv.innerHTML;
        }
        else {
            const outputText = output.join("\n") || noOutput;
            outputDiv.innerHTML = outputText;
            if (lastOutputText == outputText)
                flashOutputDiv();
            lastOutputText = outputText;
        }
    }
    catch (err) {
        runtime.fs.loadBackup();
        if (err instanceof SoodocodeError) {
            outputDiv.innerHTML = `<span class="error-message">${escapeHTML(err.formatMessage(soodocodeInput.value))}</span>\n`
                + showRange(soodocodeInput.value, err);
        }
        else if (["too much recursion", "Maximum call stack size exceeded"].includes(err?.message)) {
            outputDiv.innerHTML = `<span class="error-message">Maximum call stack size exceeded\nhelp: make sure your recursive functions can reach their base case</span>`;
        }
        else {
            outputDiv.innerHTML = `<span class="error-message">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
        }
        console.error(err);
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
    window.runtime = new Runtime((msg) => prompt(msg) ?? fail("User did not input a value", undefined), printPrefixed);
    Object.assign(window, lexer, lexerTypes, parser, parserTypes, statements, utils, runtime, runtimeTypes);
}
dumpFunctionsToGlobalScope();
