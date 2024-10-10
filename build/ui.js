import * as lexerTypes from "./lexer-types.js";
import * as lexer from "./lexer.js";
import * as parserTypes from "./parser-types.js";
import * as parser from "./parser.js";
import * as runtime from "./runtime.js";
import * as runtimeTypes from "./runtime-types.js";
import * as statements from "./statements.js";
import * as utils from "./utils.js";
import * as config from "./config.js";
import * as files from "./files.js";
import * as builtin_functions from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTRangeTypeNode } from "./parser-types.js";
import { Runtime } from "./runtime.js";
import { Statement } from "./statements.js";
import { SoodocodeError, crash, escapeHTML, fail, parseError, f, capitalizeText } from "./utils.js";
import { configs } from "./config.js";
const savedProgramKey = "soodocode:savedProgram";
const fileSystem = new files.BrowserFileSystem(true);
const soodocodeInput = getElement("soodocode-input", HTMLTextAreaElement);
const headerText = getElement("header-text", HTMLSpanElement);
const secondFocusableElement = getElement("second-focusable-element", HTMLAnchorElement, "class");
const outputDiv = getElement("output-div", HTMLDivElement);
const dumpTokensButton = getElement("dump-tokens-button", HTMLButtonElement);
const executeSoodocodeButton = getElement("execute-soodocode-button", HTMLButtonElement);
const uploadButton = getElement("upload-button", HTMLInputElement);
const settingsDialog = getElement("settings-dialog", HTMLDialogElement);
const filesDialog = getElement("files-dialog", HTMLDialogElement);
const fileSelect = getElement("files-dialog-select", HTMLSelectElement);
const fileDownloadButton = getElement("files-dialog-download", HTMLSpanElement);
const fileUploadButton = getElement("files-dialog-upload", HTMLSpanElement);
const fileCreateButton = getElement("files-dialog-create", HTMLSpanElement);
const fileDeleteButton = getElement("files-dialog-delete", HTMLSpanElement);
const fileContents = getElement("files-dialog-contents", HTMLTextAreaElement);
const fileDialogUploadInput = getElement("file-dialog-upload-button", HTMLInputElement);
export function getElement(id, type, mode = "id") {
    const element = mode == "class" ? document.getElementsByClassName(id)[0] : document.getElementById(id);
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
            return flattenTree(parserTypes.ProgramASTNodeGroup.from(s.nodeGroups.flat())).map(([depth, statement]) => [depth + 1, statement]);
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
        if (node.operator.fix.startsWith("unary_prefix"))
            return (`(
${escapeHTML(node.operatorToken.text)}
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`);
        else if (node.operator.fix.startsWith("unary_postfix"))
            return (`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${escapeHTML(node.operatorToken.text)}
)`);
        else
            return (`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${escapeHTML(node.operatorToken.text)}
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
    const wrapper = getElement("settings-dialog-inner", HTMLDivElement);
    wrapper.innerHTML = "";
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
                if (config.range) {
                    [input.min, input.max] = config.range.map(String);
                }
                input.value = Number(config.value).toString();
                input.addEventListener("change", () => {
                    const value = Number(input.value);
                    if (isNaN(value))
                        return;
                    if (config.range) {
                        if (!(config.range[0] <= value && value <= config.range[1]))
                            return;
                    }
                    config.value = Number(input.value);
                });
            }
            else if (typeof config.value == "string") {
                input.type = "text";
                input.value = config.value;
                if (config.stringLength != undefined) {
                    input.minLength = input.maxLength = config.stringLength;
                }
                input.addEventListener("change", () => {
                    if (config.stringLength != undefined && input.value.length != config.stringLength)
                        return;
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
        switch (node.operator.id) {
            case "operator.negate": return -evaluateExpressionDemo(node.nodes[0]);
            case "operator.add": return evaluateExpressionDemo(node.nodes[0]) + evaluateExpressionDemo(node.nodes[1]);
            case "operator.subtract": return evaluateExpressionDemo(node.nodes[0]) - evaluateExpressionDemo(node.nodes[1]);
            case "operator.multiply": return evaluateExpressionDemo(node.nodes[0]) * evaluateExpressionDemo(node.nodes[1]);
            case "operator.divide": return evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]);
            case "operator.integer_divide": return Math.trunc(evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]));
            case "operator.mod": return evaluateExpressionDemo(node.nodes[0]) % evaluateExpressionDemo(node.nodes[1]);
            default: fail(f.quote `Cannot evaluate expression: cannot evaluate node ${node}: unknown operator type ${node.operator.id}`, node);
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
function setupGlobalKeybinds() {
    window.addEventListener("keydown", e => {
        if (e.key == "s" && e.ctrlKey) {
            e.preventDefault();
            download("program.sc", soodocodeInput.value);
        }
        else if (e.key == "o" && e.ctrlKey) {
            e.preventDefault();
            uploadButton.click();
        }
        else if (e.key == "Escape") {
            if (document.activeElement == soodocodeInput) {
                secondFocusableElement.focus();
            }
            else {
                soodocodeInput.focus();
            }
        }
        else if (e.key == " " || e.key == "Enter") {
            const el = document.activeElement;
            if (el instanceof HTMLSpanElement && el.classList.contains("text-button")) {
                el.click();
                e.preventDefault();
            }
        }
    });
}
function setupEventHandlers() {
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
        generateConfigsDialog();
        settingsDialog.showModal();
    });
    getElement("settings-dialog-reset-default", HTMLSpanElement).addEventListener("click", () => {
        if (confirm(`Are you sure you want to restore all settings to their default values?`)) {
            config.resetToDefaults();
            generateConfigsDialog();
            config.saveConfigs();
        }
    });
    getElement("files-dialog-button", HTMLSpanElement).addEventListener("click", () => {
        filesDialog.showModal();
    });
    executeSoodocodeButton.addEventListener("click", () => executeSoodocode());
    dumpTokensButton.addEventListener("click", displayAST);
}
function setupAutosave() {
    setInterval(saveAll, 5000);
    window.addEventListener("beforeunload", saveAll);
    loadAll();
}
function getSelectedFile() {
    const filename = fileSelect.value.split("file_")[1];
    if (!filename)
        return null;
    return fileSystem.openFile(filename) ?? null;
}
function onSelectedFileChange() {
    const file = getSelectedFile();
    if (file) {
        fileContents.value = file.text;
        fileContents.placeholder = "File empty...";
        fileContents.disabled = false;
    }
    else {
        fileContents.value = "";
        fileContents.placeholder = "Select a file to edit...";
        fileContents.disabled = true;
    }
}
function updateFileSelectOptions(filenameToSelect) {
    const oldValue = fileSelect.value;
    Array.from(fileSelect.children).slice(1).forEach(n => n.remove());
    for (const filename of fileSystem.listFiles()) {
        const option = document.createElement("option");
        option.value = `file_${filename}`;
        option.innerText = filename;
        fileSelect.appendChild(option);
    }
    if (filenameToSelect && fileSystem.hasFile(filenameToSelect)) {
        fileSelect.value = `file_${filenameToSelect}`;
    }
    else if (fileSystem.hasFile(oldValue.split("file_")[1])) {
        fileSelect.value = oldValue;
    }
}
function setupFileGUI() {
    updateFileSelectOptions();
    onSelectedFileChange();
    setupFileGUIHandlers();
}
function setupFileGUIHandlers() {
    fileContents.addEventListener("change", function updateFileData() {
        const file = getSelectedFile();
        if (!file)
            return;
        if (!fileContents.value.endsWith("\n"))
            fileContents.value += "\n";
        fileSystem.updateFile(file.name, fileContents.value);
    });
    fileSelect.addEventListener("change", onSelectedFileChange);
    fileDownloadButton.addEventListener("click", () => {
        const file = getSelectedFile();
        if (!file) {
            alert(`Please select a file to download.`);
        }
        else {
            download(file.name, file.text);
        }
    });
    fileUploadButton.addEventListener("click", () => fileDialogUploadInput.click());
    fileDeleteButton.addEventListener("click", () => {
        const file = getSelectedFile();
        if (!file) {
            alert(`Please select a file to delete.`);
        }
        else {
            if (confirm(`Are you sure you want to delete the file ${file.name}? This action is irreversible.`)) {
                fileSystem.deleteFile(file.name);
                updateFileSelectOptions();
                onSelectedFileChange();
            }
        }
    });
    fileCreateButton.addEventListener("click", () => {
        const filename = prompt("Enter the name of the file to create:");
        if (!filename)
            return;
        if (!fileSystem.hasFile(filename)) {
            fileSystem.createFile(filename);
        }
        updateFileSelectOptions(filename);
        onSelectedFileChange();
    });
    fileDialogUploadInput.addEventListener("change", (event) => {
        const file = event.target?.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = e => {
            const content = e.target?.result?.toString();
            if (content == null)
                return;
            if (fileSystem.openFile(file.name)?.text && !confirm(`Are you sure you want to overwrite the existing file ${file.name}? This action is irreversible.`))
                return;
            fileSystem.updateFile(file.name, content);
            updateFileSelectOptions(file.name);
            onSelectedFileChange();
        };
    });
}
function setupTextEditor() {
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
        else if (e.key == "\\" && e.ctrlKey) {
            displayAST();
        }
    };
}
function printPrefixed(value) {
    console.log(`%c[Runtime]`, `color: lime;`, value);
}
function flashOutputDiv() {
    outputDiv.style.animationName = "";
    void outputDiv.offsetHeight;
    outputDiv.style.animationName = "highlight-output-div";
}
function displayAST() {
    outputDiv.classList.remove("state-error", "state-success");
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
        outputDiv.classList.add("state-success");
    }
    catch (err) {
        outputDiv.classList.add("state-error");
        if (err instanceof SoodocodeError) {
            outputDiv.innerHTML = err.formatMessageHTML(soodocodeInput.value);
        }
        else {
            outputDiv.innerHTML = `<span class="error-message">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
        }
        console.error(err);
    }
}
let lastOutputText = "";
function executeSoodocode() {
    const noOutput = `<span style="color: lightgray;">&lt;no output&gt;</span>`;
    const output = [];
    const runtime = new Runtime((msg) => prompt(msg) ?? fail("User did not input a value", undefined), m => {
        const str = m.map(x => x.asHTML(false)).join(" ");
        output.push(str);
        if (configs.runtime.display_output_immediately.value) {
            outputDiv.innerHTML += str + "\n";
            console.log("now");
        }
        printPrefixed(str);
    }, fileSystem);
    outputDiv.classList.remove("state-error", "state-success");
    try {
        if (configs.runtime.display_output_immediately.value)
            outputDiv.innerHTML = "";
        console.time("parsing");
        const symbols = lexer.symbolize(soodocodeInput.value);
        const tokens = lexer.tokenize(symbols);
        const program = parser.parse(tokens);
        console.timeEnd("parsing");
        Object.assign(window, {
            symbols, tokens, program, runtime
        });
        fileSystem.makeBackup();
        console.time("execution");
        runtime.runProgram(program.nodes);
        console.timeEnd("execution");
        updateFileSelectOptions();
        onSelectedFileChange();
        outputDiv.classList.add("state-success");
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
        fileSystem.loadBackup();
        outputDiv.classList.add("state-error");
        if (err instanceof SoodocodeError) {
            outputDiv.innerHTML = err.formatMessageHTML(soodocodeInput.value);
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
function saveAll() {
    if (soodocodeInput.value.trim().length > 0) {
        localStorage.setItem(savedProgramKey, soodocodeInput.value);
    }
    config.saveConfigs();
}
function loadAll() {
    const savedProgram = localStorage.getItem(savedProgramKey);
    if (savedProgram && savedProgram.trim().length > 0 && soodocodeInput.value.trim().length == 0) {
        soodocodeInput.value = savedProgram;
    }
    config.loadConfigs();
}
function setupHeaderEasterEgg() {
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
}
function dumpFunctionsToGlobalScope() {
    window.runtime = new Runtime((msg) => prompt(msg) ?? fail("User did not input a value", undefined), printPrefixed);
    Object.assign(window, lexer, lexerTypes, parser, parserTypes, statements, utils, runtime, runtimeTypes, config, builtin_functions, files, {
        persistentFilesystem: fileSystem
    });
}
function main() {
    setupGlobalKeybinds();
    setupEventHandlers();
    setupAutosave();
    setupFileGUI();
    generateConfigsDialog();
    setupTextEditor();
    setupHeaderEasterEgg();
    dumpFunctionsToGlobalScope();
}
main();
