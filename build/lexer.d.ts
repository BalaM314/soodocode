import { SymbolType, SymbolizedProgram, TokenizedProgram } from "./lexer-types.js";
export declare const symbolTypeData: [
    identifier: string | [SymbolSpecifierFuncName] | RegExp,
    symbol: SymbolType
][];
export declare const tokenNameTypeData: {
    readonly AND: "operator.and";
    readonly APPEND: "keyword.file_mode.append";
    readonly ARRAY: "keyword.array";
    readonly BYREF: "keyword.pass_mode.by_reference";
    readonly BYVAL: "keyword.pass_mode.by_value";
    readonly CALL: "keyword.call";
    readonly CASE: "keyword.case";
    readonly CLASS: "keyword.class";
    readonly CLOSEFILE: "keyword.close_file";
    readonly CONSTANT: "keyword.constant";
    readonly DECLARE: "keyword.declare";
    readonly DEFINE: "keyword.define";
    readonly DIV: "operator.integer_divide";
    readonly ELSE: "keyword.else";
    readonly ENDCASE: "keyword.case_end";
    readonly ENDCLASS: "keyword.class_end";
    readonly ENDFUNCTION: "keyword.function_end";
    readonly ENDIF: "keyword.if_end";
    readonly ENDPROCEDURE: "keyword.procedure_end";
    readonly ENDTYPE: "keyword.type_end";
    readonly ENDWHILE: "keyword.while_end";
    readonly FALSE: "boolean.false";
    readonly FOR: "keyword.for";
    readonly FUNCTION: "keyword.function";
    readonly GETRECORD: "keyword.get_record";
    readonly IF: "keyword.if";
    readonly INHERITS: "keyword.inherits";
    readonly INPUT: "keyword.input";
    readonly MOD: "operator.mod";
    readonly NEW: "keyword.new";
    readonly NEXT: "keyword.for_end";
    readonly NOT: "operator.not";
    readonly OF: "keyword.of";
    readonly OPENFILE: "keyword.open_file";
    readonly OR: "operator.or";
    readonly OTHERWISE: "keyword.otherwise";
    readonly OUTPUT: "keyword.output";
    readonly PRIVATE: "keyword.class_modifier.private";
    readonly PROCEDURE: "keyword.procedure";
    readonly PUBLIC: "keyword.class_modifier.public";
    readonly PUTRECORD: "keyword.put_record";
    readonly RANDOM: "keyword.file_mode.random";
    readonly READ: "keyword.file_mode.read";
    readonly READFILE: "keyword.read_file";
    readonly REPEAT: "keyword.dowhile";
    readonly RETURN: "keyword.return";
    readonly RETURNS: "keyword.returns";
    readonly SEEK: "keyword.seek";
    readonly SET: "keyword.set";
    readonly STEP: "keyword.step";
    readonly SUPER: "keyword.super";
    readonly THEN: "keyword.then";
    readonly TO: "keyword.to";
    readonly TRUE: "boolean.true";
    readonly TYPE: "keyword.type";
    readonly UNTIL: "keyword.dowhile_end";
    readonly WHILE: "keyword.while";
    readonly WRITE: "keyword.file_mode.write";
    readonly WRITEFILE: "keyword.write_file";
    readonly "<-": "operator.assignment";
    readonly ">=": "operator.greater_than_equal";
    readonly "<=": "operator.less_than_equal";
    readonly "<>": "operator.not_equal_to";
    readonly "=": "operator.equal_to";
    readonly ">": "operator.greater_than";
    readonly "<": "operator.less_than";
    readonly "+": "operator.add";
    readonly "-": "operator.minus";
    readonly "*": "operator.multiply";
    readonly "/": "operator.divide";
    readonly "^": "operator.pointer";
    readonly "&": "operator.string_concatenate";
    readonly "(": "parentheses.open";
    readonly ")": "parentheses.close";
    readonly "[": "bracket.open";
    readonly "]": "bracket.close";
    readonly "{": "brace.open";
    readonly "}": "brace.close";
    readonly ":": "punctuation.colon";
    readonly ";": "punctuation.semicolon";
    readonly ",": "punctuation.comma";
    readonly ".": "punctuation.period";
    readonly "\n": "newline";
};
export declare const tokenTextMapping: Record<"brace.open" | "brace.close" | "bracket.open" | "bracket.close" | "parentheses.open" | "parentheses.close" | "punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" | "punctuation.period" | "boolean.true" | "boolean.false" | "keyword.declare" | "keyword.define" | "keyword.constant" | "keyword.output" | "keyword.input" | "keyword.call" | "keyword.if" | "keyword.then" | "keyword.else" | "keyword.if_end" | "keyword.for" | "keyword.to" | "keyword.for_end" | "keyword.step" | "keyword.while" | "keyword.while_end" | "keyword.dowhile" | "keyword.dowhile_end" | "keyword.function" | "keyword.function_end" | "keyword.procedure" | "keyword.procedure_end" | "keyword.return" | "keyword.returns" | "keyword.pass_mode.by_reference" | "keyword.pass_mode.by_value" | "keyword.type" | "keyword.type_end" | "keyword.open_file" | "keyword.read_file" | "keyword.write_file" | "keyword.close_file" | "keyword.get_record" | "keyword.put_record" | "keyword.seek" | "keyword.file_mode.read" | "keyword.file_mode.write" | "keyword.file_mode.append" | "keyword.file_mode.random" | "keyword.case" | "keyword.of" | "keyword.case_end" | "keyword.otherwise" | "keyword.class" | "keyword.class_end" | "keyword.new" | "keyword.super" | "keyword.inherits" | "keyword.class_modifier.private" | "keyword.class_modifier.public" | "keyword.array" | "keyword.set" | "newline" | "operator.add" | "operator.minus" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment" | "operator.pointer" | "operator.string_concatenate", "READ" | "WRITE" | "APPEND" | "RANDOM" | "\n" | "FALSE" | "TRUE" | "," | "[" | "]" | "NEW" | "." | "DECLARE" | "DEFINE" | "CONSTANT" | "OUTPUT" | "INPUT" | "RETURN" | "CALL" | "ENDTYPE" | "IF" | "ENDIF" | "ELSE" | "ENDCASE" | "FOR" | "NEXT" | "WHILE" | "ENDWHILE" | "REPEAT" | "UNTIL" | "FUNCTION" | "ENDFUNCTION" | "PROCEDURE" | "ENDPROCEDURE" | "OPENFILE" | "READFILE" | "WRITEFILE" | "CLOSEFILE" | "SEEK" | "GETRECORD" | "PUTRECORD" | "CLASS" | "ENDCLASS" | "AND" | "ARRAY" | "BYREF" | "BYVAL" | "CASE" | "DIV" | "INHERITS" | "MOD" | "NOT" | "OF" | "OR" | "OTHERWISE" | "PRIVATE" | "PUBLIC" | "RETURNS" | "SET" | "STEP" | "SUPER" | "THEN" | "TO" | "TYPE" | "<-" | ">=" | "<=" | "<>" | "=" | ">" | "<" | "+" | "-" | "*" | "/" | "^" | "&" | "(" | ")" | "{" | "}" | ":" | ";">;
type SymbolSpecifierFuncName = "isAlphanumeric" | "isNumber";
export declare function symbolize(input: string): SymbolizedProgram;
export declare function tokenize(input: SymbolizedProgram): TokenizedProgram;
export {};
