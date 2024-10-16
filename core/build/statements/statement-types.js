import { crash } from "../utils/funcs.js";
export const statementTypes = [
    "declare", "define", "constant", "assignment", "output", "input", "return", "call",
    "type", "type.pointer", "type.enum", "type.set", "type.end",
    "if", "if.end", "else",
    "switch", "switch.end", "case", "case.range",
    "for", "for.step", "for.end",
    "while", "while.end",
    "do_while", "do_while.end",
    "function", "function.end",
    "procedure", "procedure.end",
    "open_file", "read_file", "write_file", "close_file",
    "seek", "get_record", "put_record",
    "class", "class.inherits", "class.end",
    "class_property",
    "class_procedure", "class_procedure.end",
    "class_function", "class_function.end",
    "illegal.assignment", "illegal.end", "illegal.for.end"
];
export function StatementType(input) {
    if (statementTypes.includes(input))
        return input;
    crash(`"${input}" is not a valid statement type`);
}
