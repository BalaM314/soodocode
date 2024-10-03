/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains code for the user interface.
*/

import * as lexerTypes from "./lexer-types.js";
import * as lexer from "./lexer.js";
import * as parserTypes from "./parser-types.js";
import * as parser from "./parser.js";
import * as runtime from "./runtime.js";
import * as runtimeTypes from "./runtime-types.js";
import * as statements from "./statements.js";
import * as utils from "./utils.js";
import * as config from "./config.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTNode, ExpressionASTNodeExt, ExpressionASTRangeTypeNode, ProgramAST, ProgramASTNode } from "./parser-types.js";
import { Runtime } from "./runtime.js";
import { Statement } from "./statements.js";
import { SoodocodeError, applyRangeTransformers, crash, escapeHTML, fail, impossible, parseError, f, capitalizeText } from "./utils.js";
import { configs } from "./config.js";

const savedProgramKey = "soodocode:savedProgram";

const persistentFilesystem = new runtime.Files();

function getElement<T extends typeof HTMLElement>(id:string, type:T, mode:"id" | "class" = "id"){
	const element:unknown = mode == "class" ? document.getElementsByClassName(id)[0] : document.getElementById(id);
	if(element instanceof type) return element as T["prototype"];
	else if(element instanceof HTMLElement) crash(`Element with id ${id} was fetched as type ${type.name}, but was of type ${element.constructor.name}`);
	else crash(`Element with id ${id} does not exist`);
}

type FlattenTreeOutput = [depth:number, statement:Statement];
export function flattenTree(program:parserTypes.ProgramASTNodeGroup):FlattenTreeOutput[]{
	return program.map(s => {
		if(s instanceof Statement) return [[0, s] satisfies FlattenTreeOutput];
		else return flattenTree(
			parserTypes.ProgramASTNodeGroup.from((s.nodeGroups as ProgramASTNode[][]).flat())
		).map(([depth, statement]) => [depth + 1, statement] satisfies FlattenTreeOutput);
	}).flat(1);
}

/** Must escape HTML special chars from user input. */
export function displayExpressionHTML(node:ExpressionASTNodeExt, expand = false, format = true):string {
	if(node instanceof Token || node instanceof ExpressionASTArrayTypeNode || node instanceof ExpressionASTRangeTypeNode)
		return escapeHTML(node.fmtText());
	if(node instanceof ExpressionASTFunctionCallNode || node instanceof ExpressionASTArrayAccessNode || node instanceof ExpressionASTClassInstantiationNode) {
		const text = escapeHTML(node.fmtText());
		return format ? `<span class="expression-display-block">${text}</span>` : text;
	}

	const compressed = !expand || node.nodes.every(n => n instanceof Token);
	if(compressed){
		const text = escapeHTML(node.fmtText());
		return format ? `<span class="expression-display-block">${text}</span>` : text;
	} else {
		if(node.operator.fix.startsWith("unary_prefix")) return (
`(
${escapeHTML(node.operatorToken.text)}
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
		else if(node.operator.fix.startsWith("unary_postfix")) return (
`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${escapeHTML(node.operatorToken.text)}
)`
		);
		else return (
`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${escapeHTML(node.operatorToken.text)}
${displayExpressionHTML(node.nodes[1], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}

/** Must escape HTML special chars from user input. */
export function displayProgram(program:ProgramAST | ProgramASTNode[]):string {
	return (Array.isArray(program) ? program : program.nodes).map(node => {
		if(node instanceof Statement) return displayStatement(node);
		if(node.nodeGroups.length == 1) return (
`<div class="program-display-outer">\
${displayStatement(node.controlStatements[0])}\
<div class="program-display-inner">\
${displayProgram(node.nodeGroups[0])}\
</div>\
${displayStatement(node.controlStatements.at(-1)!)}\
</div>`
		);
		return (
`<div class="program-display-outer">\
${displayStatement(node.controlStatements[0])}\
${node.nodeGroups.map<[ProgramASTNode[], Statement]>((n, i) => [n, node.controlStatements[i + 1] ?? crash(`Cannot display nodes`)]).map(([group, statement]) =>
	(group.length > 0 ? `<div class="program-display-inner">\
${displayProgram(group)}\
</div>` : "") +
displayStatement(statement)
).join("")}\
</div>`
		);
	}).join("");
}
/** Must escape HTML special chars from user input. */
export function displayStatement(statement:Statement){
	return (
`<div class="program-display-statement">\
${statement.nodes.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpressionHTML(t, false)}</span>`).join(" ")}\
</div>`
	);
}

export function generateConfigsDialog():HTMLElement {
	// Behold, the Document Object Model!
	const wrapper = document.createElement("div");
	wrapper.id = "settings-dialog-inner";

	for(const [sectionName, section] of Object.entries(configs)){
		const header = document.createElement("span");
		header.classList.add("settings-section-header");
		header.innerText = capitalizeText(sectionName);
		wrapper.append(header);
		const settingsGrid = document.createElement("div");
		settingsGrid.classList.add("settings-grid");
		for(const [id, config] of Object.entries(section)){
			const gridItem = document.createElement("div");
			gridItem.classList.add("settings-grid-item");
			const label = document.createElement("label");
			//TODO save configs
			const input = document.createElement("input");
			input.name = id;
			if(typeof config.value == "boolean"){
				input.type = "checkbox";
				input.checked = Boolean(config.value);
				input.addEventListener("change", () => {
					config.value = input.checked;
				});
			} else if(typeof config.value == "number"){
				input.type = "number";
				if(config.range){
					[input.min, input.max] = config.range.map(String);
				}
				input.value = Number(config.value).toString();
				input.addEventListener("change", () => {
					const value = Number(input.value);
					if(isNaN(value)) return;
					if(config.range){
						if(!(config.range[0] <= value && value <= config.range[1])) return;
					}
					config.value = Number(input.value);
				});
			} else if(typeof config.value == "string"){
				input.type = "text";
				input.value = config.value;
				if(config.stringLength != undefined){
					input.minLength = input.maxLength = config.stringLength;
				}
				input.addEventListener("change", () => {
					if(config.stringLength != undefined && input.value.length != config.stringLength) return;
					config.value = input.value;
				});
			} else if(config.value instanceof Date){
				input.type = "date";
				input.value = config.value.toLocaleDateString().replaceAll("/", "-");
				input.addEventListener("change", () => {
					const date = new Date(input.value);
					if(!isNaN(date.getTime())) config.value = date;
				});
			} else crash(`Unknown config type ${typeof config.value}`);
			label.append(input); //this is valid and removes the need for the 'for' attribute
			label.append(config.name);
			gridItem.append(label);
			const description = document.createElement("div");
			if(config.description){
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


export function evaluateExpressionDemo(node:ExpressionASTNode):number {
	if(node instanceof Token){
		if(node.type == "number.decimal") return Number(node.text);
		else if(node.type == "name") fail(`Cannot evaluate expression: variable content unknown`, node);
		else fail(f.quote`Cannot evaluate expression: cannot evaluate token ${node}: not a number`, node);
	} else if(node instanceof ExpressionASTFunctionCallNode || node instanceof ExpressionASTClassInstantiationNode){
		fail(f.quote`Cannot evaluate expression ${node}: function call result unknown`, node);
	} else if(node instanceof ExpressionASTArrayAccessNode){
		fail(f.quote`Cannot evaluate expression ${node}: array contents unknown`, node);
	} else switch(node.operator.id){
		case "operator.negate": return - evaluateExpressionDemo(node.nodes[0]);
		case "operator.add": return evaluateExpressionDemo(node.nodes[0]) + evaluateExpressionDemo(node.nodes[1]);
		case "operator.subtract": return evaluateExpressionDemo(node.nodes[0]) - evaluateExpressionDemo(node.nodes[1]);
		case "operator.multiply": return evaluateExpressionDemo(node.nodes[0]) * evaluateExpressionDemo(node.nodes[1]);
		case "operator.divide": return evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]);
		case "operator.integer_divide": return Math.trunc(evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]));
		case "operator.mod": return evaluateExpressionDemo(node.nodes[0]) % evaluateExpressionDemo(node.nodes[1]);
		default: fail(f.quote`Cannot evaluate expression: cannot evaluate node ${node}: unknown operator type ${node.operator.id}`, node);
	}
}

export function download(filename:string, data:BlobPart){
	const el = document.createElement("a");
	el.setAttribute("href", URL.createObjectURL(new Blob([data])));
	el.setAttribute("download", filename);
	el.style.display = "none";
	document.body.appendChild(el);
	el.click();
	document.body.removeChild(el);
}

const soodocodeInput = getElement("soodocode-input", HTMLTextAreaElement);
const headerText = getElement("header-text", HTMLSpanElement);
const secondFocusableElement = getElement("second-focusable-element", HTMLAnchorElement, "class");
const outputDiv = getElement("output-div", HTMLDivElement);
const dumpTokensButton = getElement("dump-tokens-button", HTMLButtonElement);
const executeSoodocodeButton = getElement("execute-soodocode-button", HTMLButtonElement);
// const expressionInput = getElement("expression-input", HTMLInputElement);
// const expressionOutputDiv = getElement("expression-output-div", HTMLDivElement);
// const dumpExpressionTreeButton = getElement("dump-expression-tree-button", HTMLButtonElement);
// const dumpExpressionTreeVerbose = getElement("dump-expression-tree-verbose", HTMLInputElement);
// const evaluateExpressionButton = getElement("evaluate-expression-button", HTMLButtonElement);
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

window.addEventListener("keydown", e => {
	if(e.key == "s" && e.ctrlKey){
		e.preventDefault();
		download("program.sc", soodocodeInput.value);
	} else if(e.key == "o" && e.ctrlKey){
		e.preventDefault();
		uploadButton.click();
	} else if(e.key == "Escape"){
		if(document.activeElement == soodocodeInput){
			//When in the code editor: Escape and focus the next element in the tab order, which is the github icon
			//Necessary because the code editor captures tab, which is normally used to do that
			secondFocusableElement.focus();
		} else {
			//When not in the code editor: focus the code editor
			soodocodeInput.focus();
		}
	} else if(e.key == " " || e.key == "Enter"){
		const el = document.activeElement;
		if(el instanceof HTMLSpanElement && el.classList.contains("text-button")){
			el.click();
			e.preventDefault();
		}
	}
});

uploadButton.onchange = (event:Event) => {
	//Load a save file
	const file = (event.target as HTMLInputElement)?.files?.[0];
	if(!file) return;
	const reader = new FileReader();
	reader.readAsText(file);
	reader.onload = e => {
		const content = e.target?.result?.toString();
		if(content == null) return;
		if(confirm(`Are you sure you want to load this file? This will erase your current program.`)){
			soodocodeInput.value = content;
		}
	};
};

//Save program to localstorage
setInterval(saveAll, 5000);
window.addEventListener("beforeunload", saveAll);
loadAll();

getElement("settings-dialog-button", HTMLSpanElement).addEventListener("click", () => {
	settingsDialog.showModal();
});
getElement("files-dialog-button", HTMLSpanElement).addEventListener("click", () => {
	filesDialog.showModal();
});
settingsDialog.append(generateConfigsDialog());
function getSelectedFile():runtimeTypes.File | null {
	const filename = fileSelect.value.split("file_")[1];
	if(!filename) return null;
	return persistentFilesystem.files[filename] ?? null;
}
function onSelectedFileChange(){
	const file = getSelectedFile();
	if(file){
		fileContents.value = file.text;
		fileContents.placeholder = "File empty...";
		fileContents.disabled = false;
	} else {
		fileContents.value = "";
		fileContents.placeholder = "Select a file to edit...";
		fileContents.disabled = true;
	}
}
function updateFileSelectOptions(filenameToSelect?:string){
	//Keep the first one
	const oldValue = fileSelect.value;
	Array.from(fileSelect.children).slice(1).forEach(n => n.remove());
	for(const file of Object.values(persistentFilesystem.files)){
		const option = document.createElement("option");
		option.value = `file_${file.name}`;
		option.innerText = file.name;
		fileSelect.appendChild(option);
	}
	if(filenameToSelect && filenameToSelect in persistentFilesystem.files){
		fileSelect.value = `file_${filenameToSelect}`;
	} else if(oldValue.split("file_")[1] in persistentFilesystem.files){
		fileSelect.value = oldValue;
	}
}
updateFileSelectOptions();
onSelectedFileChange();
fileContents.addEventListener("change", function updateFileData(){
	const file = getSelectedFile();
	if(!file) return;
	if(!fileContents.value.endsWith("\n")) fileContents.value += "\n";
	file.text = fileContents.value;
});
fileSelect.addEventListener("change", onSelectedFileChange);
fileDownloadButton.addEventListener("click", () => {
	const file = getSelectedFile();
	if(!file){
		alert(`Please select a file to download.`);
	} else {
		download(file.name, file.text);
	}
});
fileUploadButton.addEventListener("click", () => fileDialogUploadInput.click());
fileDeleteButton.addEventListener("click", () => {
	const file = getSelectedFile();
	if(!file){
		alert(`Please select a file to delete.`);
	} else {
		if(confirm(`Are you sure you want to delete the file ${file.name}? This action is irreversible.`)){
			delete persistentFilesystem.files[file.name];
			updateFileSelectOptions();
			onSelectedFileChange();
		}
	}
});
fileCreateButton.addEventListener("click", () => {
	const filename = prompt("Enter the name of the file to create:");
	if(!filename) return;
	if(!(filename in persistentFilesystem.files)){
		persistentFilesystem.getFile(filename, true);
	}
	updateFileSelectOptions(filename);
	onSelectedFileChange();
});
fileDialogUploadInput.addEventListener("change", (event) => {
	const file = (event.target as HTMLInputElement)?.files?.[0];
	if(!file) return;
	const reader = new FileReader();
	reader.readAsText(file);
	reader.onload = e => {
		const content = e.target?.result?.toString();
		if(content == null) return;
		if(persistentFilesystem.getFile(file.name)?.text && !confirm(`Are you sure you want to overwrite the existing file ${file.name}? This action is irreversible.`)) return;
		const fi = persistentFilesystem.getFile(file.name, true);
		fi.text = content;
		updateFileSelectOptions(file.name);
		onSelectedFileChange();
	};
});

/*evaluateExpressionButton.addEventListener("click", () => {
	try {
		expressionOutputDiv.innerText = evaluateExpressionDemo(
			parser.parseExpression(
				lexer.tokenize(
					lexer.symbolize(
						expressionInput.value
						// |> operator when
					)
				).tokens
			)
		).toString();
		expressionOutputDiv.style.color = "white";
	} catch(err){
		expressionOutputDiv.style.color = "red";
		if(err instanceof SoodocodeError){
			expressionOutputDiv.innerText = "Error: " + err.message;
			if(err.rangeSpecific) expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeSpecific)}"`;
			if(err.rangeGeneral) expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeGeneral)}"`;
		} else {
			console.error(err);
			expressionOutputDiv.innerText = "Soodocode crashed! " + parseError(err);
		}
	}
});

dumpExpressionTreeButton.addEventListener("click", () => {
	try {
		const text = displayExpressionHTML(
			parser.parseExpression(
				lexer.tokenize(
					lexer.symbolize(
						expressionInput.value
					)
				).tokens
			), dumpExpressionTreeVerbose.checked, false
		);
		console.log(text);

		//Syntax highlighting
		let outputText = "";
		let linePos = 0;
		let lineParenColor:string | null = null;
		for(const char of text){
			if(char == "\t"){
				outputText += "  ";
				linePos ++;
			} else if((['+','-','*','/'] as const).includes(char)) outputText += `<span style="color:white;font-weight:bold;">${char}</span>`;
			else if(/\d/.test(char)) outputText += `<span style="color:#B5CEA8;">${char}</span>`;
			else if(dumpExpressionTreeVerbose.checked && ['(',')'].includes(char)){
				lineParenColor ??= `hsl(${(linePos / 2) * (360 / 6)}, 100%, 70%)`;
				outputText += `<span style="color:${lineParenColor}">${char}</span>`;
			} else if(dumpExpressionTreeVerbose.checked && ['↱','↳'].includes(char)){
				outputText += `<span style="color:hsl(${(linePos / 2) * (360 / 6)}, 100%, 70%);">${char}</span>`;
			} else outputText += char;
			linePos ++;
			if(char == "\n"){
				linePos = 0;
				lineParenColor = null;
			}
		}

		expressionOutputDiv.innerHTML = outputText;
		expressionOutputDiv.style.color = "white";
	} catch(err){
		expressionOutputDiv.style.color = "red";
		if(err instanceof SoodocodeError){
			expressionOutputDiv.innerText = "Error: " + err.message;
			if(err.rangeSpecific) expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeSpecific)}"`;
			if(err.rangeGeneral) expressionOutputDiv.innerText += `\nat "${expressionInput.value.slice(...err.rangeGeneral)}"`;
		} else {
			console.error(err);
			expressionOutputDiv.innerText = "Soodocode crashed!" + parseError(err);
		}
	}
});*/

soodocodeInput.onkeydown = e => {
	if((e.shiftKey && e.key == "Tab") || (e.key == "[" && e.ctrlKey)){
		e.preventDefault();
		//Save cursor position
		const start = soodocodeInput.selectionStart, end = soodocodeInput.selectionEnd;
		const numNewlinesBefore = soodocodeInput.value.slice(0, start).match(/\n/g)?.length ?? 0;
		const numNewlinesWithin = soodocodeInput.value.slice(start, end).match(/\n(?=\t)/g)?.length ?? 0;
		//indent the text
		soodocodeInput.value = soodocodeInput.value
			.slice(0, end)
			.split("\n")
			.map((line, i) =>
				i >= numNewlinesBefore && line.startsWith("\t") ? line.slice(1) : line
			).join("\n") + soodocodeInput.value.slice(end);
		//Replace cursor position
		soodocodeInput.selectionStart = start - 1;
		soodocodeInput.selectionEnd = end - 1 - numNewlinesWithin;
	} else if(e.key == "Tab" || (e.key == "]" && e.ctrlKey)){
		e.preventDefault();
		if(soodocodeInput.selectionStart == soodocodeInput.selectionEnd && !(e.key == "]" && e.ctrlKey)){
			//Insert a tab character

			//Save cursor position
			const start = soodocodeInput.selectionStart;
			//Insert tab
			soodocodeInput.value = soodocodeInput.value.slice(0, start) + "\t" + soodocodeInput.value.slice(start);
			//Replace cursor position
			soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start + 1;
		} else {
			//indent the block

			//Save cursor position
			const start = soodocodeInput.selectionStart, end = soodocodeInput.selectionEnd;
			const numNewlinesBefore = soodocodeInput.value.slice(0, start).match(/\n/g)?.length ?? 0;
			const numNewlinesWithin = soodocodeInput.value.slice(start, end).match(/\n/g)?.length ?? 0;
			//indent the text
			soodocodeInput.value = soodocodeInput.value
				.slice(0, end)
				.split("\n")
				.map((line, i) =>
					i >= numNewlinesBefore ? "\t" + line : line
				).join("\n") + soodocodeInput.value.slice(end);
			//Replace cursor position
			soodocodeInput.selectionStart = start + 1;
			soodocodeInput.selectionEnd = end + 1 + numNewlinesWithin;
		}
	} else if(e.key == "Enter" && e.ctrlKey){
		e.preventDefault();
		executeSoodocode();
	} else if(e.key == "\\" && e.ctrlKey){
		displayAST();
	}
	//Update text
	// const newText = soodocodeInput.value.replace("", "");
	// if(soodocodeInput.value != newText){
	// 	const start = soodocodeInput.selectionStart;
	// 	soodocodeInput.value = newText;
	// 	soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start;
	// }
};

function displayAST(){
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
	} catch (err) {
		if (err instanceof SoodocodeError) {
			outputDiv.innerHTML = `<span class="error-message">${escapeHTML(err.formatMessage(soodocodeInput.value))}</span>\n`
				+ showRange(soodocodeInput.value, err);
		} else {
			outputDiv.innerHTML = `<span class="error-message">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
		}
		console.error(err);
	}
}
dumpTokensButton.addEventListener("click", displayAST);

/** Must escape HTML special chars from user input. */
export function showRange(text:string, error:SoodocodeError):string {
	if(!error.rangeGeneral && !error.rangeSpecific) return ``; //can't show anything
	
	if(error.rangeSpecific){
		if(error.rangeSpecific[0] == error.rangeSpecific[1]){
			//Expand the range forward by one if it has a size of zero
			error.rangeSpecific[1] ++;
		}
		if(error.rangeSpecific[1] - error.rangeSpecific[0] == 1){
			//Move back the range if it only contains a newline, or nothing
			const specificText = text.slice(...error.rangeSpecific);
			if(specificText == "" || specificText == "\n")
				error.rangeSpecific = error.rangeSpecific.map(n => n - 1);
		}
	}
	if(error.rangeGeneral && error.rangeSpecific){
		//If the specific range is one character after the end of the general range, expand the general range
		if(
			error.rangeSpecific[1] - error.rangeSpecific[0] == 1 &&
			error.rangeGeneral[1] == error.rangeSpecific[0]
		) error.rangeGeneral[1] ++;
	}

	const outerRange = utils.getTotalRange([error.rangeGeneral, error.rangeSpecific].filter(Boolean));
	const beforeText = text.slice(0, outerRange[0]);
	const rangeText = text.slice(...outerRange);
	const beforeLines = beforeText.split("\n");
	const lineNumber = beforeLines.length.toString();
	const formattedPreviousLine = beforeLines.at(-2)
		? `${" ".repeat(lineNumber.length)} | ${escapeHTML(beforeLines.at(-2))}\n`
		: "";
	const startOfLine = beforeLines.at(-1)!;
	/** Might not be from the same line as startOfLine */
	const restOfLine = text.slice(outerRange[1]).split("\n")[0];
	const formattedRangeText = applyRangeTransformers(rangeText, [
		error.rangeGeneral && [
			error.rangeGeneral.map(n => n - outerRange[0]), //Everything before outerRange[0] was sliced off, so subtract that
			`<span class="error-range-outer">`, "</span>",
		] as const,
		error.rangeSpecific && [
			error.rangeSpecific.map(n => n - outerRange[0]), //Everything before outerRange[0] was sliced off, so subtract that
			`<span class="error-range-inner">`, "</span>",
		] as const,
	].filter(Boolean), escapeHTML);
	return `
${formattedPreviousLine}\
${lineNumber} | ${escapeHTML(startOfLine)}${formattedRangeText}</span>${escapeHTML(restOfLine)}`;
}

function printPrefixed(value:unknown){
	console.log(`%c[Runtime]`, `color: lime;`, value);
}
function flashOutputDiv(){
	outputDiv.style.animationName = "";
	void outputDiv.offsetHeight; //reflow
	outputDiv.style.animationName = "highlight-output-div";
}

let shouldDump = false;
executeSoodocodeButton.addEventListener("click", () => executeSoodocode());
let lastOutputText:string = "";
function executeSoodocode(){
	const noOutput = `<span style="color: lightgray;">&lt;no output&gt;</span>`;
	const output:string[] = [];
	const runtime = new Runtime(
		(msg) => prompt(msg) ?? fail("User did not input a value", undefined),
		m => {
			const str = m.map(x => x.asHTML(false)).join(" ");
			output.push(str);
			if(configs.runtime.display_output_immediately.value){
				outputDiv.innerHTML += str + "\n";
				//Does not work, TODO asyncify
				console.log("now");
			}
			printPrefixed(str);
		},
		persistentFilesystem
	);
	try {
		if(configs.runtime.display_output_immediately.value) outputDiv.innerHTML = "";
		console.time("parsing");
		const symbols = lexer.symbolize(soodocodeInput.value);
		const tokens = lexer.tokenize(symbols);
		const program = parser.parse(tokens);
		console.timeEnd("parsing");
		if(shouldDump){
			Object.assign(window, {
				symbols, tokens, program, runtime
			});
		}
		runtime.fs.makeBackup();
		console.time("execution");
		runtime.runProgram(program.nodes);
		console.timeEnd("execution");
		updateFileSelectOptions();
		onSelectedFileChange();

		if(configs.runtime.display_output_immediately.value){
			if(outputDiv.innerText.trim().length == 0) outputDiv.innerHTML = noOutput;
			if(outputDiv.innerHTML == lastOutputText) flashOutputDiv();
			lastOutputText = outputDiv.innerHTML;
		} else {
			const outputText = output.join("\n") || noOutput;
			outputDiv.innerHTML = outputText;
			if(lastOutputText == outputText) flashOutputDiv();
			lastOutputText = outputText;
		}
	} catch(err){
		runtime.fs.loadBackup();
		if(err instanceof SoodocodeError){
			outputDiv.innerHTML = `<span class="error-message">${escapeHTML(err.formatMessage(soodocodeInput.value))}</span>\n`
				+ showRange(soodocodeInput.value, err);
		} else if(["too much recursion", "Maximum call stack size exceeded"].includes((err as Record<string, unknown>)?.message)){
			outputDiv.innerHTML = `<span class="error-message">Maximum call stack size exceeded\nhelp: make sure your recursive functions can reach their base case</span>`;
		} else {
			outputDiv.innerHTML = `<span class="error-message">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
		}
		console.error(err);
	}
}

function saveAll(){
	if(soodocodeInput.value.trim().length > 0){
		//If there is any text in the input, save it to localstorage
		localStorage.setItem(savedProgramKey, soodocodeInput.value);
	}
	config.saveConfigs();
}
function loadAll(){
	const savedProgram = localStorage.getItem(savedProgramKey);
	if(savedProgram && savedProgram.trim().length > 0 && soodocodeInput.value.trim().length == 0){
		//If there is a saved program, and the input is empty
		soodocodeInput.value = savedProgram;
	}
	config.loadConfigs();
}

let flashing = false;
let bouncing = false;
let flipped = false;
const clickTimes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
headerText.addEventListener("click", e => {
	clickTimes.shift();
	clickTimes.push(Date.now());
	if(e.shiftKey) flashing = !flashing;
	if(e.altKey) bouncing = !bouncing;
	if(e.ctrlKey) flipped = !flipped;
	headerText.style.setProperty("transform", flipped ? "scaleX(-1)" : "none");
	headerText.style.setProperty("animation-name", bouncing ? "sizebounce" : "none");
	//modifying animation-play-state didn't work as the animation could get paused when the size is high, causing scrollbars to appear
	if(!e.shiftKey && !e.altKey && !e.ctrlKey)
		headerText.style.setProperty('color', `hsl(${Math.floor(Math.random() * 360)}, 80%, 80%)`);
	if(((Date.now() - clickTimes[0]) / 10) < 500)
		headerText.style.setProperty("visibility", "hidden");
});
setInterval(() => {
	if(flashing) headerText.style.setProperty('color', `hsl(${Math.floor(Math.random() * 360)}, 80%, 80%)`);
}, 500);

function dumpFunctionsToGlobalScope(){
	shouldDump = true;
	(window as unknown as {runtime: Runtime;}).runtime = new Runtime((msg) => prompt(msg) ?? fail("User did not input a value", undefined), printPrefixed);
	Object.assign(window,
		lexer, lexerTypes, parser, parserTypes, statements, utils, runtime, runtimeTypes, config,
		{
			persistentFilesystem
		}
	);
}

dumpFunctionsToGlobalScope();

