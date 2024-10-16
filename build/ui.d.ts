import * as parserTypes from "./parser/parser-types.js";
import { ExpressionASTNode, ExpressionASTNodeExt, ProgramAST, ProgramASTNode } from "./parser/parser-types.js";
import { Runtime } from "./runtime/runtime.js";
import { Statement } from "./statements/statement.js";
export declare function getElement<T extends typeof HTMLElement>(id: string, type: T, mode?: "id" | "class"): T["prototype"];
export declare function flattenTree(program: parserTypes.ProgramASTNodeGroup): (readonly [depth: number, statement: Statement])[];
export declare function displayExpressionHTML(node: ExpressionASTNodeExt, expand?: boolean, format?: boolean): string;
export declare function displayProgram(program: ProgramAST | ProgramASTNode[]): string;
export declare function displayStatement(statement: Statement): string;
export declare function generateConfigsDialog(): void;
export declare function evaluateExpressionDemo(node: ExpressionASTNode): number;
export declare function download(filename: string, data: BlobPart): void;
declare global {
    var runtime: Runtime;
}
