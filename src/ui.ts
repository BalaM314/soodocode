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
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTNode, ProgramAST, ProgramASTNode } from "./parser-types.js";
import { Runtime } from "./runtime.js";
import { Statement } from "./statements.js";
import { SoodocodeError, applyRangeTransformers, crash, escapeHTML, fail, impossible, parseError, f } from "./utils.js";
import { Config, configs } from "./config.js";

function getElement<T extends typeof HTMLElement>(id:string, type:T){
	const element = <unknown>document.getElementById(id);
	if(element instanceof type) return element as T["prototype"];
	else if(element instanceof HTMLElement) crash(`Element with id ${id} was fetched as type ${type.name}, but was of type ${element.constructor.name}`);
	else crash(`Element with id ${id} does not exist`);
}

type FlattenTreeOutput = [depth:number, statement:Statement];
export function flattenTree(program:ProgramASTNode[]):FlattenTreeOutput[]{
	return program.map(s => {
		if(s instanceof Statement) return [[0, s] satisfies FlattenTreeOutput];
		else return flattenTree(s.nodeGroups.flat()).map(([depth, statement]) => [depth + 1, statement] satisfies FlattenTreeOutput);
	}).flat(1);
}


export function displayExpressionHTML(node:ExpressionASTNode | ExpressionASTArrayTypeNode, expand = false, format = true):string {
	if(node instanceof Token || node instanceof ExpressionASTArrayTypeNode)
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
		if(node.operator.type.startsWith("unary_prefix")) return (
`(
${node.operatorToken.text}
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
		else if(node.operator.type.startsWith("unary_postfix")) return (
`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
)`
		);
		else return (
`(
${displayExpressionHTML(node.nodes[0], expand, format).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
${displayExpressionHTML(node.nodes[1], expand, format).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}

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
export function displayStatement(statement:Statement){
	return (
`<div class="program-display-statement">\
${statement.tokens.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpressionHTML(t, false)}</span>`).join(" ")}\
</div>`
	);
}

export function generateConfigsDialog():HTMLElement {
	// Behold, the Document Object Model!
	const wrapper = document.createElement("div");
	wrapper.id = "settings-dialog-inner";

	for(const [sectionName, section] of Object.entries(configs)){
		if(sectionName == "default_values") continue; //TODO
		const header = document.createElement("span");
		header.classList.add("settings-section-header");
		header.innerText = sectionName;
		wrapper.append(header);
		const settingsGrid = document.createElement("div");
		settingsGrid.classList.add("settings-grid");
		for(const [id, config] of Object.entries(section)){
			const gridItem = document.createElement("div");
			gridItem.classList.add("settings-grid-item");
			const label = document.createElement("label");
			const input = document.createElement("input");
			input.type = "checkbox";
			input.name = id;
			input.checked = Boolean(config.value);
			const description = document.createElement("div");
			if(config.description){
				description.classList.add("settings-description");
				description.innerText = config.description;
			}
			input.addEventListener("change", () => {
				config.value = input.checked; //TODO corrupts non-boolean sttings
				//saveConfigs(); TODO save configs
			});
			label.append(input); //this is valid and removes the need for the 'for' attribute
			label.append(config.name);
			gridItem.append(label);
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
	} else switch(node.operator.name){
		case "operator.negate": return - evaluateExpressionDemo(node.nodes[0]);
		case "operator.add": return evaluateExpressionDemo(node.nodes[0]) + evaluateExpressionDemo(node.nodes[1]);
		case "operator.subtract": return evaluateExpressionDemo(node.nodes[0]) - evaluateExpressionDemo(node.nodes[1]);
		case "operator.multiply": return evaluateExpressionDemo(node.nodes[0]) * evaluateExpressionDemo(node.nodes[1]);
		case "operator.divide": return evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]);
		case "operator.integer_divide": return Math.trunc(evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]));
		case "operator.mod": return evaluateExpressionDemo(node.nodes[0]) % evaluateExpressionDemo(node.nodes[1]);
		default: fail(f.quote`Cannot evaluate expression: cannot evaluate node ${node}: unknown operator type ${node.operator.name}`, node);
	}
}

export function download(filename:string, data:BlobPart){
	//Self explanatory.
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
// const expressionInput = getElement("expression-input", HTMLInputElement);
// const expressionOutputDiv = getElement("expression-output-div", HTMLDivElement);
// const dumpExpressionTreeButton = getElement("dump-expression-tree-button", HTMLButtonElement);
// const dumpExpressionTreeVerbose = getElement("dump-expression-tree-verbose", HTMLInputElement);
// const evaluateExpressionButton = getElement("evaluate-expression-button", HTMLButtonElement);
const uploadButton = getElement("upload-button", HTMLInputElement);
const settingsDialog = getElement("settings-dialog", HTMLDialogElement);

window.addEventListener("keydown", e => {
	if(e.key == "s" && e.ctrlKey){
		e.preventDefault();
		download("program.sc", soodocodeInput.value);
	} else if(e.key == "o" && e.ctrlKey){
		e.preventDefault();
		uploadButton.click();
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

getElement("settings-dialog-button", HTMLSpanElement).addEventListener("click", () => {
	settingsDialog.showModal();
});
settingsDialog.append(generateConfigsDialog());

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
	}
	//Update text
	// const newText = soodocodeInput.value.replace("", "");
	// if(soodocodeInput.value != newText){
	// 	const start = soodocodeInput.selectionStart;
	// 	soodocodeInput.value = newText;
	// 	soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start;
	// }
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
${displayProgram(program)}`
		;
		outputDiv.style.color = "white";
	} catch(err){
		outputDiv.style.color = "red";
		if(err instanceof SoodocodeError){
			outputDiv.innerText = `Error: ${err.message}`;
			if(err.rangeSpecific) outputDiv.innerText += `\nat "${soodocodeInput.value.slice(...err.rangeSpecific)}"`;
			if(err.rangeGeneral) outputDiv.innerText += `\nat "${soodocodeInput.value.slice(...err.rangeGeneral)}"`;
		} else {
			outputDiv.innerText = `Soodocode crashed! ${parseError(err)}`;
		}
	}
});

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

	if( //There is only one range, or the specific range is entirely inside the general range
		(!error.rangeGeneral || !error.rangeSpecific || (
			error.rangeGeneral[0] <= error.rangeSpecific[0] && error.rangeGeneral[1] >= error.rangeSpecific[1]
		))
	){
		const range = error.rangeGeneral ?? error.rangeSpecific ?? impossible();
		const beforeText = text.slice(0, range[0]);
		const rangeText = text.slice(...range);
		const beforeLines = beforeText.split("\n");
		const lineNumber = beforeLines.length;
		const formattedPreviousLine = beforeLines.at(-2)
			? `${" ".repeat(lineNumber.toString().length)} | ${escapeHTML(beforeLines.at(-2))}\n`
			: "";
		const startOfLine = beforeLines.at(-1)!;
		const restOfLine = text.slice(range[1]).split("\n")[0];
		const formattedRangeText = error.rangeSpecific ?
			applyRangeTransformers(rangeText, [[
				error.rangeSpecific.map(n => n - range[0]),
				`<span class="error-range-inner">`, "</span>", escapeHTML
			]])
			: escapeHTML(rangeText);
		return `
${formattedPreviousLine}\
${lineNumber} | ${escapeHTML(startOfLine)}<span class="error-range-outer">${formattedRangeText}</span>${escapeHTML(restOfLine)}`;
	} else {
		//Drop the general range TODO fix
		const trimEnd = text.slice(error.rangeSpecific[1]).indexOf("\n");
		text = text.slice(0, trimEnd);
		const fullText = applyRangeTransformers(text, [
			[error.rangeSpecific, `<span class="error-range-inner">`, "</span>", escapeHTML]
		]);
		const trimStart = fullText.slice(0, error.rangeSpecific[0]).lastIndexOf("\n");
		return fullText.slice(trimStart);
	}
}

function printPrefixed(value:unknown){
	console.log(`%c[Runtime]`, `color: lime;`, value);
}

let shouldDump = false;
executeSoodocodeButton.addEventListener("click", () => executeSoodocode());
let lastOutputText:string = "";
function executeSoodocode(){
	const output:string[] = [];
	const runtime = new Runtime(
		(msg) => prompt(msg) ?? fail("User did not input a value", undefined),
		m => {
			const str = m.map(x => x.asHTML(false)).join("");
			output.push(str);
			printPrefixed(str);
		}
	);
	try {
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
		const outputText = output.join("\n") || "<no output>";
		outputDiv.innerHTML = outputText;
		if(lastOutputText == outputText){
			//flash
			outputDiv.style.animationName = "";
			void outputDiv.offsetHeight; //reflow
			outputDiv.style.animationName = "highlight-output-div";
		}
		lastOutputText = outputText;
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
		lexer, lexerTypes, parser, parserTypes, statements, utils, runtime, runtimeTypes
	);
}

dumpFunctionsToGlobalScope();

