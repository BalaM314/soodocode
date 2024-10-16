import { ExpressionASTNode, ExpressionASTNodeExt, ProgramAST, ProgramASTNode, ProgramASTNodeGroup, Runtime, Statement } from "../../core/build/index.js";
import "../../core/build/utils/globals.js";
export declare function getElement<T extends typeof HTMLElement>(id: string, type: T, mode?: "id" | "class"): T["prototype"];
export declare function flattenTree(program: ProgramASTNodeGroup): (readonly [depth: number, statement: Statement])[];
export declare function displayExpressionHTML(node: ExpressionASTNodeExt, expand?: boolean, format?: boolean): string;
export declare function displayProgram(program: ProgramAST | ProgramASTNode[]): string;
export declare function displayStatement(statement: Statement): string;
export declare function generateConfigsDialog(): void;
export declare function evaluateExpressionDemo(node: ExpressionASTNode): number;
export declare function download(filename: string, data: BlobPart): void;
declare global {
    var runtime: Runtime;
}
