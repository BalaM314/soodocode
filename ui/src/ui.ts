/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains code for the user interface.
*/

import * as sc from "../../core/build/index.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTNode, ExpressionASTRangeTypeNode, File, LocalFileSystem, ProgramAST, ProgramASTNode, ProgramASTNodeGroup, Runtime, SoodocodeError, Statement, StatementNode, Token, capitalizeText, configs, crash, escapeHTML, f, fail, loadConfigs, parse, parseError, resetToDefaults, saveConfigs, symbolize, tokenize } from "../../core/build/index.js";
import "../../core/build/utils/globals.js";

const savedProgramKey = "soodocode:savedProgram";
const fileSystem = new LocalFileSystem(true);

const soodocodeInput = getElement("soodocode-input", HTMLTextAreaElement);
const header = getElement("header", HTMLDivElement);
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
const sampleProgramsDialog = getElement("sample-programs-dialog", HTMLDialogElement);
const fileSelect = getElement("files-dialog-select", HTMLSelectElement);
const fileDownloadButton = getElement("files-dialog-download", HTMLSpanElement);
const fileUploadButton = getElement("files-dialog-upload", HTMLSpanElement);
const fileCreateButton = getElement("files-dialog-create", HTMLSpanElement);
const fileDeleteButton = getElement("files-dialog-delete", HTMLSpanElement);
const fileContents = getElement("files-dialog-contents", HTMLTextAreaElement);
const fileDialogUploadInput = getElement("file-dialog-upload-button", HTMLInputElement);
const sampleProgramsContent = getElement("sample-programs-content", HTMLDivElement);

export function getElement<T extends typeof HTMLElement>(id:string, type:T, mode:"id" | "class" = "id"){
	const element:unknown = mode == "class" ? document.getElementsByClassName(id)[0] : document.getElementById(id);
	if(element instanceof type) return element as T["prototype"];
	else if(element instanceof HTMLElement) crash(`Element with id ${id} was fetched as type ${type.name}, but was of type ${element.constructor.name}`);
	else crash(`Element with id ${id} does not exist`);
}

export function flattenTree(program:ProgramASTNodeGroup):(readonly [depth:number, statement:Statement])[]{
	return program.map(s => {
		if(s instanceof Statement) return [[0, s] as const];
		else return flattenTree(
			ProgramASTNodeGroup.from((s.nodeGroups as ProgramASTNode[][]).flat())
		).map(([depth, statement]) => [depth + 1, statement] as const);
	}).flat(1);
}

/** Must escape HTML special chars from user input. */
export function displayExpressionHTML(node:StatementNode, expand = false, format = true):string {
	if(node instanceof Token || node instanceof ExpressionASTArrayTypeNode || node instanceof ExpressionASTRangeTypeNode)
		return escapeHTML(node.fmtText());
	if(node instanceof ExpressionASTFunctionCallNode || node instanceof ExpressionASTArrayAccessNode || node instanceof ExpressionASTClassInstantiationNode){
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

export function generateConfigsDialog(){
	// Behold, the Document Object Model!
	const wrapper = getElement("settings-dialog-inner", HTMLDivElement);
	wrapper.innerHTML = "";

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

}

const sampleProgramData = [
	["Hello World", [
		["features/helloworld", "Hello World", "A simple program that outputs the text \"Hello, world!\"."],
	]],
	["Data structures", [
		["programs/resizable-array-wrapper", "Vector", "A resizable array, or vector. Has O(1+) insertion performance (amortized constant), meaning that even though insertion sometimes requires copying all elements, which is O(n), the average performance is O(1)."],
		["programs/binarytree", "Binary Tree", "A binary search tree with O(log n) average performance for search, insertion, and deletion."],
	]],
	["Features", [
		["programs/inheritance", "Inheritance", "A program that uses inheritance in classes."],
		["demos/varlength-arrays", "Variable length arrays", "A program showcasing variable length arrays. Although pseudocode arrays always have a fixed length, in some cases it is possible to allow variable length arrays while maintaining compatibility with the official specification. <a href='https://github.com/BalaM314/soodocode/blob/master/docs/notes.md#a-note-on-variable-length-array-types'>More information</a>"],
		["demos/pointer-names", "Pointer names", "A program that outputs a pointer. When outputting a pointer, soodocode will attempt to display a useful name."],
		["demos/output-color", "Output colors", "A program showcasing output colors. Soodocode adds color when outputting arrays, records, classes, and values inside composite data types."],
		["demos/classes/contravariance", "Contravariance", "A program showcasing <a target='_blank' href='https://en.wikipedia.org/wiki/Covariance_and_contravariance_(computer_science)#Inheritance_in_object-oriented_languages'>contravariance.</a>"],
	]],
	["Errors", [
		["demos/errors/flag", "Flag", "A program which is invalid because it attempts to store a flag in a character literal. Flags are actually two characters."],
		["demos/errors/array-out-of-bounds", "Array index out of bounds", "A program which attempts to access an invalid index in an array."],
		["demos/errors/typo3", "Typo", "A program containing a typo. Soodocode suggests a fix for the typo."],
	]],
	["Misc", [
		["programs/sieve", "Sieve of Eratosthenes", "The Sieve of Eratosthenes, a program which is commonly used for performance testing."],
		["programs/quine", "Quine", "A program that outputs its own source code. Must be run through the <a target='_blank' href='https://github.com/BalaM314/soodocode/?tab=readme-ov-file#cli'>CLI version</a>."],
		["programs/aprilfools", "April Fools", "An April Fools program."],
		["programs/fizzbuzz", "Fizzbuzz", "An implementation of fizzbuzz."],
	]],
] satisfies Array<[category:string, programs:Array<[path:string, name:string, description:string]>]>;
const defaultProgram = `\
// Soodocode Runtime: Example program
OUTPUT "Hello, world!"

FOR i <- 1 TO 100
  IF i MOD 15 = 0 THEN
    OUTPUT "FizzBuzz"
  ELSE; IF i MOD 5 = 0 THEN
    OUTPUT "Buzz"
  ELSE; IF i MOD 3 = 0 THEN
    OUTPUT "Fizz"
  ELSE
    OUTPUT i
  ENDIF; ENDIF; ENDIF
NEXT i

TYPE pINTEGER = ^INTEGER
DECLARE x: INTEGER
DECLARE y: pINTEGER
y <- ^x
y^ <- 5
OUTPUT "x is ", x
`;

export function generateSampleProgramsDialog(){
	for(const [headerText, samplePrograms] of sampleProgramData){
		const header = document.createElement("h2");
		header.className = "sample-programs-subheader";
		header.innerText = headerText;
		sampleProgramsContent.appendChild(header);
		const category = document.createElement("div");
		category.className = "sample-programs-category";
		for(const [path, name, description] of samplePrograms){
			const url = `https://balam314.github.io/soodocode/programs/${path}.sc`;
			const item = document.createElement("div");
			item.className = "sample-programs-item";
			const programName = document.createElement("div");
			programName.className = "sample-programs-name";
			programName.innerText = name;
			item.appendChild(programName);
			item.innerHTML += description;
			item.addEventListener("click", async (e) => {
				console.error(e.target);
				if(e.target instanceof HTMLAnchorElement) return;
				if(e.shiftKey) getSelection()?.removeAllRanges();
				try {
					item.style.cursor = "wait";
					const data = await fetch(url).then(r => r.ok ? r.text() : crash(''));
					const opened = importProgram(data, e.shiftKey, true);
					if(opened) sampleProgramsDialog.close();
				} catch(err){
					alert(`Failed to load the program.`);
				} finally {
					item.style.removeProperty("cursor");
				}
			});
			category.appendChild(item);
		}
		sampleProgramsContent.appendChild(category);
	}
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

function setupGlobalKeybinds(){
	window.addEventListener("keydown", e => {
		if(e.key == "Escape"){
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
		} else if(e.key == "s" && e.ctrlKey){
			e.preventDefault();
		} else if(e.key == "o" && e.ctrlKey){
			e.preventDefault();
		}
	});
}

function setupEventHandlers(){
	uploadButton.onchange = (event) => {
		//Load a save file
		const file = (event.target as HTMLInputElement)?.files?.[0];
		if(!file) return;
		const reader = new FileReader();
		reader.readAsText(file);
		reader.onload = e => {
			const content = e.target?.result?.toString();
			if(content == null) return;
			importProgram(content);
		};
	};
	getElement("settings-dialog-button", HTMLSpanElement).addEventListener("click", () => {
		generateConfigsDialog(); //update before showing
		settingsDialog.showModal();
	});
	getElement("programs-dialog-button", HTMLSpanElement).addEventListener("click", () => {
		sampleProgramsDialog.showModal();
	});
	getElement("settings-dialog-reset-default", HTMLSpanElement).addEventListener("click", () => {
		if(confirm(`Are you sure you want to restore all settings to their default values?`)){
			resetToDefaults();
			generateConfigsDialog();
			saveConfigs();
		}
	});
	getElement("files-dialog-button", HTMLSpanElement).addEventListener("click", () => {
		filesDialog.showModal();
	});
	executeSoodocodeButton.addEventListener("click", () => executeSoodocode());
	dumpTokensButton.addEventListener("click", displayAST);
}

/**
 * @returns whether the program was imported successfully
 */
function importProgram(content:string, bypassConfirm = false, canBypassConfirm = false){
	if(soodocodeInput.value.trim().length == 0){
		soodocodeInput.value = content;
		return true;
	} else {
		const message = `Are you sure you want to load this file? This will erase your current program.` + (canBypassConfirm ? `\nHold Shift to bypass this dialog.` : "");
		if(bypassConfirm || confirm(message)){
			soodocodeInput.value = content;
			return true;
		}
	}
	return false;
}

function setupAutosave(){
	//Save program to localstorage
	setInterval(saveAll, 5000);
	window.addEventListener("beforeunload", saveAll);
	loadAll();
}


function getSelectedFile():File | null {
	const filename = fileSelect.value.split("file_")[1];
	if(!filename) return null;
	return fileSystem.openFile(filename) ?? null;
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
	for(const filename of fileSystem.listFiles()){
		const option = document.createElement("option");
		option.value = `file_${filename}`;
		option.innerText = filename;
		fileSelect.appendChild(option);
	}
	if(filenameToSelect && fileSystem.hasFile(filenameToSelect)){
		fileSelect.value = `file_${filenameToSelect}`;
	} else if(fileSystem.hasFile(oldValue.split("file_")[1])){
		fileSelect.value = oldValue;
	}
}
function setupFileGUI(){
	updateFileSelectOptions();
	onSelectedFileChange();
	setupFileGUIHandlers();
}
function setupFileGUIHandlers(){
	filesDialog.addEventListener("keydown", (e) => {
		if(e.key == "s" && e.ctrlKey){
			e.preventDefault();
			fileDownloadButton.click();
		} else if(e.key == "o" && e.ctrlKey){
			e.preventDefault();
			fileUploadButton.click();
		}
	});
	fileContents.addEventListener("change", function updateFileData(){
		const file = getSelectedFile();
		if(!file) return;
		if(!fileContents.value.endsWith("\n")) fileContents.value += "\n"; //trailing newline
		fileSystem.updateFile(file.name, fileContents.value);
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
				fileSystem.deleteFile(file.name);
				updateFileSelectOptions();
				onSelectedFileChange();
			}
		}
	});
	fileCreateButton.addEventListener("click", () => {
		const filename = prompt("Enter the name of the file to create:");
		if(!filename) return;
		if(!fileSystem.hasFile(filename)){
			fileSystem.createFile(filename);
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
			if(fileSystem.openFile(file.name)?.text && !confirm(`Are you sure you want to overwrite the existing file ${file.name}? This action is irreversible.`)) return;
			fileSystem.updateFile(file.name, content);
			updateFileSelectOptions(file.name);
			onSelectedFileChange();
		};
	});
}

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

function setupTextEditor(){
	soodocodeInput.onkeydown = e => {
		if((e.shiftKey && e.key == "Tab") || (e.key == "[" && e.ctrlKey)){
			e.preventDefault();
			//Save cursor position
			const start = soodocodeInput.selectionStart, end = soodocodeInput.selectionEnd;
			const numNewlinesBefore = soodocodeInput.value.slice(0, start).match(/\n/g)?.length ?? 0;
			const numNewlinesWithin = soodocodeInput.value.slice(start, end).match(/\n(?=\t)/g)?.length ?? 0;
			//indent the text
			const newValue = soodocodeInput.value
				.slice(0, end)
				.split("\n")
				.map((line, i) =>
					i >= numNewlinesBefore && line.startsWith("\t") ? line.slice(1) : line
				).join("\n") + soodocodeInput.value.slice(end);
			
			//Only if it changed
			if(newValue != soodocodeInput.value){
				soodocodeInput.value = newValue;
				//Replace cursor position
				soodocodeInput.selectionStart = start - 1;
				soodocodeInput.selectionEnd = end - 1 - numNewlinesWithin;
			}
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
		} else if(e.key == "s" && e.ctrlKey && e.altKey){
			e.preventDefault();
			download("program.sc", soodocodeInput.value);
		} else if(e.key == "o" && e.ctrlKey){
			e.preventDefault();
			uploadButton.click();
		}
		//Update text
		// const newText = soodocodeInput.value.replace("", "");
		// if(soodocodeInput.value != newText){
		// 	const start = soodocodeInput.selectionStart;
		// 	soodocodeInput.value = newText;
		// 	soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start;
		// }
	};
}

function printPrefixed(value:unknown){
	console.log(`%c[Runtime]`, `color: lime;`, value);
}

function flashOutputDiv(){
	outputDiv.style.animationName = "";
	void outputDiv.offsetHeight; //reflow
	outputDiv.style.animationName = "highlight-output-div";
}

function displayAST(){
	outputDiv.classList.remove("state-error", "state-success");
	try {
		const symbols = symbolize(soodocodeInput.value);
		const tokens = tokenize(symbols);
		const program = parse(tokens);

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
	} catch(err){
		outputDiv.classList.add("state-error");
		if(err instanceof SoodocodeError){
			outputDiv.innerHTML = err.formatMessageHTML(soodocodeInput.value);
		} else {
			outputDiv.innerHTML = `<span class="error-message">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
		}
		console.error(err);
	}
}

function executeSoodocode(){
	const noOutput = `<span style="color: lightgray;">&lt;no output&gt;</span>`;
	const output:string[] = [];
	const runtime = new Runtime(
		(msg) => prompt(msg) ?? fail("User did not input a value", undefined),
		m => {
			const str = m.map(x => x.asHTML(false)).join("");
			output.push(str);
			if(configs.runtime.display_output_immediately.value){
				outputDiv.innerHTML += str + "\n";
				//Does not work
				console.log("now");
			}
			printPrefixed(str);
		},
		fileSystem
	);
	const lastOutputText = outputDiv.innerHTML;
	outputDiv.classList.remove("state-error", "state-success");
	try {
		if(configs.runtime.display_output_immediately.value) outputDiv.innerHTML = "";
		console.time("parsing");
		const symbols = symbolize(soodocodeInput.value);
		const tokens = tokenize(symbols);
		const program = parse(tokens);
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
		if(configs.runtime.display_output_immediately.value){
			if(outputDiv.innerText.trim().length == 0) outputDiv.innerHTML = noOutput;
			if(outputDiv.innerHTML == lastOutputText) flashOutputDiv();
		} else {
			const outputText = output.join("\n") || noOutput;
			outputDiv.innerHTML = outputText;
			if(lastOutputText == outputText) flashOutputDiv();
		}
	} catch(err){
		fileSystem.loadBackup();
		outputDiv.classList.add("state-error");
		if(err instanceof SoodocodeError){
			outputDiv.innerHTML = err.formatMessageHTML(soodocodeInput.value);
		} else if(["too much recursion", "Maximum call stack size exceeded"].includes((err as Record<string, unknown>)?.message)){
			outputDiv.innerHTML = `<span class="error-message">Maximum call stack size exceeded\nhelp: make sure your recursive functions can reach their base case</span>`;
		} else {
			outputDiv.innerHTML = `<span class="error-message">Soodocode crashed! ${escapeHTML(parseError(err))}</span>`;
		}
		if(outputDiv.innerHTML == lastOutputText) flashOutputDiv();
		console.error(err);
	}
}

function saveAll(){
	if(soodocodeInput.value.trim().length > 0){
		//If there is any text in the input, save it to localstorage
		localStorage.setItem(savedProgramKey, soodocodeInput.value);
	}
	saveConfigs();
}
function loadAll(){
	const savedProgram = localStorage.getItem(savedProgramKey);
	if(savedProgram && savedProgram.trim().length > 0 && soodocodeInput.value.trim().length == 0){
		//If there is a saved program, and the input is empty
		soodocodeInput.value = savedProgram;
	} else if(soodocodeInput.value.trim().length == 0){
		//Load the hello world program as a default
		soodocodeInput.value = defaultProgram;
	}
	loadConfigs();
}

function setupHeaderEasterEgg(){
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
		header.style.setProperty("transform", flipped ? "scaleX(-1)" : "none");
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
}

declare global {
	// eslint-disable-next-line no-var
	var runtime: Runtime;
}
function dumpFunctionsToGlobalScope(){
	window.runtime = new Runtime((msg) => prompt(msg) ?? fail("User did not input a value", undefined), printPrefixed);
	Object.assign(window,
		sc,
		{
			persistentFilesystem: fileSystem
		}
	);
}

function main(){
	setupGlobalKeybinds();
	setupEventHandlers();
	setupAutosave();
	setupFileGUI();
	generateConfigsDialog();
	generateSampleProgramsDialog();
	setupTextEditor();
	setupHeaderEasterEgg();
	dumpFunctionsToGlobalScope();
}
main();


