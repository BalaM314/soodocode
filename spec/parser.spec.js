/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains unit tests for the parser.
*/
import "jasmine";
import { Token, token } from "../src/lexer-types.js";
import { ArrayTypeData } from "../src/parser-types.js";
import { parse, parseExpression, parseFunctionArguments, parseStatement, parseType } from "../src/parser.js";
import { AssignmentStatement, DeclarationStatement, DoWhileEndStatement, IfStatement, InputStatement, OutputStatement, ProcedureStatement, statements } from "../src/statements.js";
import { SoodocodeError } from "../src/utils.js";
import { process_ExpressionAST, process_ProgramAST, process_Statement, } from "./spec_utils.js";
//copy(tokenize(symbolize(``)).map(t => `{text: "${t.text}", type: "${t.type}"},`).join("\n"))
//i miss rust macros
const sampleExpressions = Object.entries({
    number: [
        [
            ["number.decimal", "5"],
        ],
        ["number.decimal", "5"],
    ],
    variable: [
        [
            ["name", "x"],
        ],
        ["name", "x"],
    ],
    parens: [
        [
            ["parentheses.open", "("],
            ["name", "x"],
            ["parentheses.close", ")"],
        ],
        ["name", "x"],
    ],
    manyparens: [
        [
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["name", "x"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
        ],
        ["name", "x"],
    ],
    addition: [
        [
            ["name", "x"],
            ["operator.add", "+"],
            ["name", "y"],
        ],
        ["tree", "add", [
                ["name", "x"],
                ["name", "y"],
            ]],
    ],
    precedence1: [
        [
            ["name", "x"],
            ["operator.subtract", "-"],
            ["name", "y"],
            ["operator.multiply", "*"],
            ["name", "z"],
        ],
        ["tree", "subtract", [
                ["name", "x"],
                ["tree", "multiply", [
                        ["name", "y"],
                        ["name", "z"],
                    ]],
            ]],
    ],
    precedence2: [
        [
            ["name", "x"],
            ["operator.multiply", "*"],
            ["name", "y"],
            ["operator.subtract", "-"],
            ["name", "z"],
        ],
        ["tree", "subtract", [
                ["tree", "multiply", [
                        ["name", "x"],
                        ["name", "y"],
                    ]],
                ["name", "z"],
            ]],
    ],
    precedence3: [
        [
            ["parentheses.open", "("],
            ["name", "x"],
            ["operator.multiply", "*"],
            ["name", "y"],
            ["parentheses.close", ")"],
            ["operator.subtract", "-"],
            ["name", "z"],
        ],
        ["tree", "subtract", [
                ["tree", "multiply", [
                        ["name", "x"],
                        ["name", "y"],
                    ]],
                ["name", "z"],
            ]],
    ],
    precedence4: [
        [
            ["name", "x"],
            ["operator.multiply", "*"],
            ["parentheses.open", "("],
            ["name", "y"],
            ["operator.subtract", "-"],
            ["name", "z"],
            ["parentheses.close", ")"],
        ],
        ["tree", "multiply", [
                ["name", "x"],
                ["tree", "subtract", [
                        ["name", "y"],
                        ["name", "z"],
                    ]],
            ]],
    ],
    parenbug1: [
        [
            ["parentheses.open", "("],
            ["name", "x"],
            ["parentheses.close", ")"],
            ["operator.multiply", "*"],
            ["parentheses.open", "("],
            ["name", "y"],
            ["parentheses.close", ")"],
        ],
        ["tree", "multiply", [
                ["name", "x"],
                ["name", "y"],
            ]],
    ],
    parenbad1: [
        [
            ["parentheses.open", "("],
        ],
        "error"
    ],
    parenbad2: [
        [
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    parenbad3: [
        [
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    parenbad4: [
        [
            ["parentheses.close", ")"],
            ["parentheses.open", "("],
        ],
        "error"
    ],
    parenbad5: [
        [
            ["parentheses.open", "("],
            ["name", "x"],
            ["operator.multiply", "*"],
            ["parentheses.open", "("],
            ["name", "y"],
            ["parentheses.close", ")"],
            ["parentheses.open", "("],
            ["operator.subtract", "-"],
            ["name", "z"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    functioncall1: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ],
        ["tree", ["function call", "amogus"], []]
    ],
    functioncall2: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["parentheses.close", ")"],
        ],
        ["tree", ["function call", "amogus"], [
                ["number.decimal", "5"],
            ]]
    ],
    functioncall3: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["punctuation.comma", ","],
            ["number.decimal", "6"],
            ["punctuation.comma", ","],
            ["boolean.true", "TRUE"],
            ["punctuation.comma", ","],
            ["string", `"sussy"`],
            ["operator.string_concatenate", "&"],
            ["string", `"amogus"`],
            ["punctuation.comma", ","],
            ["number.decimal", "0"],
            ["parentheses.close", ")"],
        ],
        ["tree", ["function call", "amogus"], [
                ["number.decimal", "5"],
                ["number.decimal", "6"],
                ["boolean.true", "TRUE"],
                ["tree", "string_concatenate", [
                        ["string", `"sussy"`],
                        ["string", `"amogus"`],
                    ]],
                ["number.decimal", "0"],
            ]]
    ],
    functioncallnested: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["punctuation.comma", ","],
            ["number.decimal", "6"],
            ["punctuation.comma", ","],
            ["name", "sussy"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
            ["punctuation.comma", ","],
            ["name", "baka"],
            ["parentheses.open", "("],
            ["name", "sussy"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["punctuation.comma", ","],
            ["string", `"sussy"`],
            ["operator.string_concatenate", "&"],
            ["string", `"amogus"`],
            ["punctuation.comma", ","],
            ["number.decimal", "0"],
            ["parentheses.close", ")"],
        ],
        ["tree", ["function call", "amogus"], [
                ["number.decimal", "5"],
                ["number.decimal", "6"],
                ["tree", ["function call", "sussy"], []],
                ["tree", ["function call", "baka"], [
                        ["tree", ["function call", "sussy"], []],
                    ]],
                ["tree", "string_concatenate", [
                        ["string", `"sussy"`],
                        ["string", `"amogus"`],
                    ]],
                ["number.decimal", "0"],
            ]]
    ],
    functioncallbad1: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
        ],
        "error"
    ],
    functioncallbad2: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["punctuation.comma", ","],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    functioncallbad3: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["punctuation.comma", ","],
            ["name", "baka"],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    functioncallbad4: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["name", "baka"],
            ["name", "baka"],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    functioncallbad5: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["name", "baka"],
            ["punctuation.comma", ","],
            ["name", "baka"],
            ["punctuation.comma", ","],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    functioncallbad6: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["punctuation.comma", ","],
            ["number.decimal", "6"],
            ["punctuation.comma", ","],
            ["name", "sussy"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
            ["name", "baka"],
            ["parentheses.open", "("],
            ["name", "sussy"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["punctuation.comma", ","],
            ["string", `"sussy"`],
            ["operator.string_concatenate", "&"],
            ["string", `"amogus"`],
            ["punctuation.comma", ","],
            ["number.decimal", "0"],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    array1: [
        [
            ["name", "amogus"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["bracket.close", "]"],
        ],
        ["tree", ["array access", "amogus"], [
                ["number.decimal", "1"],
            ]]
    ],
    array2: [
        [
            ["name", "amogus"],
            ["bracket.open", "["],
            ["name", "a"],
            ["operator.add", "+"],
            ["name", "b"],
            ["bracket.close", "]"],
        ],
        ["tree", ["array access", "amogus"], [
                ["tree", "add", [
                        ["name", "a"],
                        ["name", "b"],
                    ]],
            ]]
    ],
    arraynested1: [
        [
            ["name", "amogus"],
            ["bracket.open", "["],
            ["name", "a"],
            ["operator.add", "+"],
            ["name", "sussy"],
            ["bracket.open", "["],
            ["name", "b"],
            ["operator.add", "+"],
            ["name", "c"],
            ["bracket.close", "]"],
            ["bracket.close", "]"],
        ],
        ["tree", ["array access", "amogus"], [
                ["tree", "add", [
                        ["name", "a"],
                        ["tree", ["array access", "sussy"], [
                                ["tree", "add", [
                                        ["name", "b"],
                                        ["name", "c"],
                                    ]],
                            ]]
                    ]],
            ]]
    ],
    arrayfunction1: [
        [
            ["name", "arr"],
            ["bracket.open", "["],
            ["name", "a"],
            ["operator.add", "+"],
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["punctuation.comma", ","],
            ["number.decimal", "6"],
            ["parentheses.close", ")"],
            ["bracket.close", "]"],
        ],
        ["tree", ["array access", "arr"], [
                ["tree", "add", [
                        ["name", "a"],
                        ["tree", ["function call", "amogus"], [
                                ["number.decimal", "5"],
                                ["number.decimal", "6"],
                            ]]
                    ]],
            ]]
    ],
    arrayfunction2: [
        [
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["name", "a"],
            ["punctuation.comma", ","],
            ["name", "b"],
            ["operator.add", "+"],
            ["name", "amogus"],
            ["bracket.open", "["],
            ["number.decimal", "5"],
            ["punctuation.comma", ","],
            ["number.decimal", "6"],
            ["bracket.close", "]"],
            ["parentheses.close", ")"],
        ],
        ["tree", ["function call", "amogus"], [
                ["name", "a"],
                ["tree", "add", [
                        ["name", "b"],
                        ["tree", ["array access", "amogus"], [
                                ["number.decimal", "5"],
                                ["number.decimal", "6"],
                            ]]
                    ]],
            ]]
    ],
    arraybad1: [
        [
            ["name", "amogus"],
            ["bracket.open", "["],
            ["bracket.close", "]"],
        ],
        "error"
    ],
    arraybad2: [
        [
            ["name", "amogus"],
            ["bracket.open", "["],
            ["bracket.open", "["],
            ["bracket.close", "]"],
            ["bracket.close", "]"],
        ],
        "error"
    ],
    arrayfunctionbad1: [
        [
            ["name", "arr"],
            ["bracket.open", "["],
            ["name", "a"],
            ["operator.add", "+"],
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["number.decimal", "6"],
            ["parentheses.close", ")"],
            ["bracket.close", "]"],
        ],
        "error"
    ],
    arrayfunctionbad2: [
        [
            ["name", "arr"],
            ["bracket.open", "["],
            ["name", "a"],
            ["operator.add", "+"],
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "5"],
            ["punctuation.comma", ","],
            ["number.decimal", "6"],
            ["bracket.close", "]"],
            ["parentheses.close", ")"],
        ],
        "error"
    ],
    unary1: [
        [
            ["operator.subtract", "-"],
            ["number.decimal", "5"],
        ],
        ["tree", "negate", [
                ["number.decimal", "5"]
            ]]
    ],
    unary2: [
        [
            ["number.decimal", "5"],
            ["operator.multiply", "*"],
            ["operator.subtract", "-"],
            ["number.decimal", "5"],
        ],
        ["tree", "multiply", [
                ["number.decimal", "5"],
                ["tree", "negate", [
                        ["number.decimal", "5"]
                    ]]
            ]]
    ],
    unary3: [
        [
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["number.decimal", "5"],
        ],
        ["tree", "negate", [
                ["tree", "negate", [
                        ["number.decimal", "5"]
                    ]]
            ]]
    ],
    unary4: [
        [
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["operator.subtract", "-"],
            ["number.decimal", "5"],
        ],
        ["tree", "negate", [
                ["tree", "negate", [
                        ["tree", "negate", [
                                ["tree", "negate", [
                                        ["tree", "negate", [
                                                ["tree", "negate", [
                                                        ["tree", "negate", [
                                                                ["tree", "negate", [
                                                                        ["tree", "negate", [
                                                                                ["tree", "negate", [
                                                                                        ["number.decimal", "5"]
                                                                                    ]]
                                                                            ]]
                                                                    ]]
                                                            ]]
                                                    ]]
                                            ]]
                                    ]]
                            ]]
                    ]]
            ]]
    ],
    nestedunary1: [
        [
            ["name", "amogus"],
            ["bracket.open", "["],
            ["operator.subtract", "-"],
            ["number.decimal", "1"],
            ["bracket.close", "]"],
        ],
        ["tree", ["array access", "amogus"], [
                ["tree", "negate", [
                        ["number.decimal", "1"]
                    ]]
            ]]
    ],
    unarybad1: [
        [
            ["number.decimal", "5"],
            ["operator.subtract", "-"],
            ["operator.multiply", "*"],
            ["number.decimal", "5"],
        ],
        "error"
    ],
    unarybad2: [
        [
            ["number.decimal", "5"],
            ["operator.subtract", "-"],
        ],
        "error"
    ],
    SussyBaka: [
        [
            ["parentheses.open", "("],
            ["name", "a"],
            ["operator.greater_than_equal", ">="],
            ["name", "b"],
            ["operator.subtract", "-"],
            ["name", "c"],
            ["operator.mod", "MOD"],
            ["name", "d"],
            ["operator.less_than", "<"],
            ["name", "e"],
            ["operator.add", "+"],
            ["name", "f"],
            ["operator.less_than_equal", "<="],
            ["name", "g"],
            ["operator.equal_to", "="],
            ["name", "h"],
            ["operator.multiply", "*"],
            ["name", "i"],
            ["operator.divide", "/"],
            ["name", "j"],
            ["operator.greater_than", ">"],
            ["name", "k"],
            ["operator.integer_divide", "DIV"],
            ["name", "l"],
            ["operator.not_equal_to", "<>"],
            ["name", "m"],
            ["operator.or", "OR"],
            ["name", "n"],
            ["operator.and", "AND"],
            ["operator.not", "NOT"],
            ["name", "o"],
            ["parentheses.close", ")"],
            ["operator.or", "OR"],
            ["parentheses.open", "("],
            ["name", "a"],
            ["operator.greater_than_equal", ">="],
            ["parentheses.open", "("],
            ["name", "b"],
            ["operator.subtract", "-"],
            ["name", "c"],
            ["parentheses.close", ")"],
            ["operator.mod", "MOD"],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["name", "d"],
            ["operator.less_than", "<"],
            ["parentheses.open", "("],
            ["name", "e"],
            ["operator.add", "+"],
            ["parentheses.open", "("],
            ["name", "f"],
            ["operator.less_than_equal", "<="],
            ["name", "g"],
            ["parentheses.close", ")"],
            ["operator.equal_to", "="],
            ["name", "h"],
            ["operator.multiply", "*"],
            ["name", "i"],
            ["parentheses.close", ")"],
            ["operator.divide", "/"],
            ["name", "j"],
            ["parentheses.close", ")"],
            ["operator.greater_than", ">"],
            ["name", "k"],
            ["operator.integer_divide", "DIV"],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["name", "l"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["operator.not_equal_to", "<>"],
            ["name", "m"],
            ["operator.or", "OR"],
            ["name", "n"],
            ["parentheses.close", ")"],
            ["operator.and", "AND"],
            ["operator.not", "NOT"],
            ["name", "o"],
            ["parentheses.close", ")"],
        ],
        //this tree is hugee
        //how to edit it?
        //dont
        ["tree", "or", [["tree", "or", [["tree", "not_equal_to", [["tree", "equal_to", [["tree", "less_than_equal", [["tree", "less_than", [["tree", "greater_than_equal", [["name", "a"], ["tree", "subtract", [["name", "b"], ["tree", "mod", [["name", "c"], ["name", "d"]]]]]]], ["tree", "add", [["name", "e"], ["name", "f"]]]]], ["name", "g"]]], ["tree", "greater_than", [["tree", "divide", [["tree", "multiply", [["name", "h"], ["name", "i"]]], ["name", "j"]]], ["tree", "integer_divide", [["name", "k"], ["name", "l"]]]]]]], ["name", "m"]]], ["tree", "and", [["name", "n"], ["tree", "not", [["name", "o"]]]]]]], ["tree", "and", [["tree", "greater_than_equal", [["name", "a"], ["tree", "mod", [["tree", "subtract", [["name", "b"], ["name", "c"]]], ["tree", "or", [["tree", "not_equal_to", [["tree", "greater_than", [["tree", "less_than", [["name", "d"], ["tree", "divide", [["tree", "equal_to", [["tree", "add", [["name", "e"], ["tree", "less_than_equal", [["name", "f"], ["name", "g"]]]]], ["tree", "multiply", [["name", "h"], ["name", "i"]]]]], ["name", "j"]]]]], ["tree", "integer_divide", [["name", "k"], ["name", "l"]]]]], ["name", "m"]]], ["name", "n"]]]]]]], ["tree", "not", [["name", "o"]]]]]]]
    ],
    SussyBaka2: [
        [
            ["parentheses.open", "("],
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["number.decimal", "1"],
            ["operator.add", "+"],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["number.decimal", "2"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["operator.subtract", "-"],
            ["number.decimal", "3"],
            ["operator.multiply", "*"],
            ["number.decimal", "4"],
            ["operator.divide", "/"],
            ["number.decimal", "5"],
            ["operator.mod", "MOD"],
            ["number.decimal", "6"],
            ["operator.integer_divide", "DIV"],
            ["number.decimal", "7"],
            ["operator.greater_than", ">"],
            ["number.decimal", "8"],
            ["operator.greater_than", ">"],
            ["parentheses.open", "("],
            ["number.decimal", "9"],
            ["operator.equal_to", "="],
            ["number.decimal", "10"],
            ["parentheses.close", ")"],
            ["operator.and", "AND"],
            ["operator.not", "NOT"],
            ["number.decimal", "12"],
            ["punctuation.comma", ","],
            ["string", `"sus"`],
            ["punctuation.comma", ","],
            ["name", "x"],
            ["bracket.open", "["],
            ["number.decimal", "5"],
            ["bracket.close", "]"],
            ["punctuation.comma", ","],
            ["name", "amogus"],
            ["parentheses.open", "("],
            ["name", "arr"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["punctuation.comma", ","],
            ["number.decimal", "5"],
            ["bracket.close", "]"],
            ["punctuation.comma", ","],
            ["name", "bigarr"],
            ["bracket.open", "["],
            ["name", "sussy"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
            ["punctuation.comma", ","],
            ["name", "sussier"],
            ["parentheses.open", "("],
            ["number.decimal", "37"],
            ["punctuation.comma", ","],
            ["name", "y"],
            ["bracket.open", "["],
            ["number.decimal", "5"],
            ["operator.add", "+"],
            ["name", "z"],
            ["bracket.open", "["],
            ["number.decimal", "0"],
            ["punctuation.comma", ","],
            ["parentheses.open", "("],
            ["parentheses.open", "("],
            ["number.decimal", "0"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["bracket.close", "]"],
            ["bracket.close", "]"],
            ["parentheses.close", ")"],
            ["bracket.close", "]"],
            ["punctuation.comma", ","],
            ["number.decimal", "5"],
            ["parentheses.close", ")"],
            ["parentheses.close", ")"],
            ["operator.add", "+"],
            ["number.decimal", "0"],
            ["parentheses.close", ")"],
        ],
        //yet another huge tree
        ["tree", "add", [["tree", ["function call", "amogus"], [["tree", "and", [["tree", "greater_than", [["tree", "greater_than", [["tree", "subtract", [["tree", "add", [["number.decimal", "1"], ["number.decimal", "2"]]], ["tree", "integer_divide", [["tree", "mod", [["tree", "divide", [["tree", "multiply", [["number.decimal", "3"], ["number.decimal", "4"]]], ["number.decimal", "5"]]], ["number.decimal", "6"]]], ["number.decimal", "7"]]]]], ["number.decimal", "8"]]], ["tree", "equal_to", [["number.decimal", "9"], ["number.decimal", "10"]]]]], ["tree", "not", [["number.decimal", "12"]]]]], ["string", "\"sus\""], ["tree", ["array access", "x"], [["number.decimal", "5"]]], ["tree", ["function call", "amogus"], [["tree", ["array access", "arr"], [["number.decimal", "1"], ["number.decimal", "5"]]], ["tree", ["array access", "bigarr"], [["tree", ["function call", "sussy"], []], ["tree", ["function call", "sussier"], [["number.decimal", "37"], ["tree", ["array access", "y"], [["tree", "add", [["number.decimal", "5"], ["tree", ["array access", "z"], [["number.decimal", "0"], ["number.decimal", "0"]]]]]]]]]]], ["number.decimal", "5"]]]]], ["number.decimal", "0"]]]
    ]
}).map(([name, [program, output]]) => [
    name,
    program.map(token),
    output == "error" ? "error" : process_ExpressionAST(output)
]);
const parseStatementTests = Object.entries({
    output: [
        [
            ["keyword.output", "OUTPUT"],
            ["string", `"amogus"`],
        ],
        [OutputStatement, [
                ["keyword.output", "OUTPUT"],
                ["string", `"amogus"`],
            ]]
    ],
    input: [
        [
            ["keyword.input", "INPUT"],
            ["name", `amogus`],
        ],
        [InputStatement, [
                ["keyword.input", "INPUT"],
                ["name", `amogus`],
            ]]
    ],
    declare1: [
        [
            ["keyword.declare", "DECLARE"],
            ["name", "amogus"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ],
        [DeclarationStatement, [
                ["keyword.declare", "DECLARE"],
                ["name", "amogus"],
                ["punctuation.colon", ":"],
                ["name", "INTEGER"],
            ]]
    ],
    declare2: [
        [
            ["keyword.declare", "DECLARE"],
            ["name", "amogus"],
            ["punctuation.comma", ","],
            ["name", "sussy"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ],
        [DeclarationStatement, [
                ["keyword.declare", "DECLARE"],
                ["name", "amogus"],
                ["punctuation.comma", ","],
                ["name", "sussy"],
                ["punctuation.colon", ":"],
                ["name", "INTEGER"],
            ]]
    ],
    declare3: [
        [
            ["keyword.declare", "DECLARE"],
            ["name", "amogus"],
            ["punctuation.colon", ":"],
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "0"],
            ["punctuation.colon", ":"],
            ["number.decimal", "99"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ],
        [DeclarationStatement, [
                ["keyword.declare", "DECLARE"],
                ["name", "amogus"],
                ["punctuation.colon", ":"],
                [
                    [
                        [0, 99]
                    ],
                    ["name", "INTEGER"],
                ],
            ]]
    ],
    declareBad1: [
        [
            ["keyword.declare", "DECLARE"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ],
        "error"
    ],
    declareBad2: [
        [
            ["keyword.declare", "DECLARE"],
            ["name", "amogus"],
            ["punctuation.comma", ","],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ],
        "error"
    ],
    declareBad3: [
        [
            ["keyword.declare", "DECLARE"],
            ["name", "amogus"],
            ["name", "sussy"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ],
        "error"
    ],
    assign: [
        [
            ["name", "amogus"],
            ["operator.assignment", `<-`],
            ["number.decimal", "31415"],
        ],
        [AssignmentStatement, [
                ["name", "amogus"],
                ["operator.assignment", `<-`],
                ["number.decimal", "31415"],
            ]]
    ],
    if: [
        [
            ["keyword.if", "IF"],
            ["number.decimal", "5"],
            ["operator.less_than", `<`],
            ["name", "x"],
            ["keyword.then", "THEN"],
        ],
        [IfStatement, [
                ["keyword.if", "IF"],
                ["tree", "less_than", [
                        ["number.decimal", "5"],
                        ["name", "x"],
                    ]],
                ["keyword.then", "THEN"],
            ]]
    ],
    until1: [
        [
            ["keyword.dowhile_end", "UNTIL"],
            ["number.decimal", "5"],
            ["operator.less_than", `<`],
            ["name", "x"],
        ],
        [DoWhileEndStatement, [
                ["keyword.dowhile_end", "UNTIL"],
                ["tree", "less_than", [
                        ["number.decimal", "5"],
                        ["name", "x"],
                    ]],
            ]]
    ],
    until2: [
        [
            ["keyword.dowhile_end", "UNTIL"],
            ["operator.not", `NOT`],
            ["name", "x"],
        ],
        [DoWhileEndStatement, [
                ["keyword.dowhile_end", "UNTIL"],
                ["tree", "not", [
                        ["name", "x"],
                    ]],
            ]]
    ],
    procedure1: [
        [
            ["keyword.procedure", "PROCEDURE"],
            ["name", "func"],
            ["parentheses.open", `(`],
            ["parentheses.close", `)`],
        ],
        [ProcedureStatement, [
                ["keyword.procedure", "PROCEDURE"],
                ["name", "func"],
                ["parentheses.open", `(`],
                ["parentheses.close", `)`],
            ]]
    ],
    procedure2: [
        [
            ["keyword.procedure", "PROCEDURE"],
            ["name", "func"],
            ["parentheses.open", `(`],
            ["name", "x"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["parentheses.close", `)`],
        ],
        [ProcedureStatement, [
                ["keyword.procedure", "PROCEDURE"],
                ["name", "func"],
                ["parentheses.open", `(`],
                ["name", "x"],
                ["punctuation.colon", ":"],
                ["name", "INTEGER"],
                ["parentheses.close", `)`],
            ]]
    ],
    empty: [
        [],
        "error"
    ],
    randomjunk1: [
        [
            ["number.decimal", "31415"],
            ["name", "amogus"],
            ["operator.assignment", `<-`],
        ],
        "error"
    ],
    randomjunk2: [
        [
            ["name", "amogus"],
            ["number.decimal", "31415"],
            ["keyword.output", `OUTPUT`],
        ],
        "error"
    ],
    incompleteDeclare1: [
        [
            ["keyword.declare", `DECLARE`],
        ],
        "error"
    ],
    incompleteDeclare2: [
        [
            ["keyword.declare", `DECLARE`],
            ["name", "amogus"],
        ],
        "error"
    ],
    incompleteDeclare3: [
        [
            ["keyword.declare", `DECLARE`],
            ["name", "amogus"],
            ["punctuation.colon", ":"],
        ],
        "error"
    ],
    incompleteDeclare4: [
        [
            ["keyword.declare", `DECLARE`],
            ["name", "amogus"],
            ["name", "INTEGER"],
        ],
        "error"
    ],
    incompleteOutput: [
        [
            ["keyword.output", `OUTPUT`],
        ],
        "error"
    ],
    incompleteIf1: [
        [
            ["keyword.if", `IF`],
        ],
        "error"
    ],
    incompleteIf2: [
        [
            ["keyword.if", `IF`],
            ["name", "amogus"],
        ],
        "error"
    ],
    incompleteIf3: [
        [
            ["keyword.if", `IF`],
            ["name", "amogus"],
            ["operator.less_than", "<"],
        ],
        "error"
    ],
    incompleteIf4: [
        [
            ["keyword.if", `IF`],
            ["name", "amogus"],
            ["operator.less_than", "<"],
            ["number.decimal", "5"],
        ],
        "error"
    ],
    incompleteIf5: [
        [
            ["keyword.if", `IF`],
            ["keyword.then", `THEN`],
        ],
        "error"
    ],
    incompleteIf6: [
        [
            ["keyword.if", `IF`],
            ["operator.less_than", "<"],
            ["keyword.then", `THEN`],
        ],
        "error"
    ],
    incompleteIf7: [
        [
            ["keyword.if", `IF`],
            ["name", "amogus"],
            ["operator.less_than", "<"],
            ["keyword.then", `THEN`],
        ],
        "error"
    ],
    incompleteProcedure1: [
        [
            ["keyword.procedure", `PROCEDURE`],
            ["name", "amogus"],
            ["parentheses.open", "("],
        ],
        "error"
    ],
}).map(([name, [program, output]]) => [
    name,
    program.map(token),
    output == "error" ? "error" : process_Statement(output)
]);
const parseProgramTests = Object.entries({
    output: [
        [
            ["keyword.output", "OUTPUT"],
            ["string", `"amogus"`],
            ["newline", "\n"],
        ],
        [[OutputStatement, [
                    ["keyword.output", "OUTPUT"],
                    ["string", `"amogus"`],
                ]]]
    ],
    outputInputDeclareAssign: [
        [
            ["keyword.output", "OUTPUT"],
            ["string", `"amogus"`],
            ["newline", "\n"],
            ["keyword.input", "INPUT"],
            ["name", `amogus`],
            ["newline", "\n"],
            ["keyword.declare", "DECLARE"],
            ["name", "amogus"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["newline", "\n"],
            ["name", "amogus"],
            ["operator.assignment", `<-`],
            ["number.decimal", "31415"],
        ],
        [
            [OutputStatement, [
                    ["keyword.output", "OUTPUT"],
                    ["string", `"amogus"`],
                ]],
            [InputStatement, [
                    ["keyword.input", "INPUT"],
                    ["name", `amogus`],
                ]],
            [DeclarationStatement, [
                    ["keyword.declare", "DECLARE"],
                    ["name", "amogus"],
                    ["punctuation.colon", ":"],
                    ["name", "INTEGER"],
                ]],
            [AssignmentStatement, [
                    ["name", "amogus"],
                    ["operator.assignment", `<-`],
                    ["number.decimal", "31415"],
                ]],
        ]
    ],
    if: [
        [
            ["keyword.input", "INPUT"],
            ["name", `x`],
            ["newline", "\n"],
            ["keyword.if", "IF"],
            ["name", "x"],
            ["operator.less_than", "<"],
            ["number.decimal", "5"],
            ["keyword.then", "THEN"],
            ["newline", "\n"],
            ["keyword.output", "OUTPUT"],
            ["string", `"amogus"`],
            ["newline", "\n"],
            ["keyword.if_end", "ENDIF"],
        ],
        [
            [InputStatement, [
                    ["keyword.input", "INPUT"],
                    ["name", `x`],
                ]],
            {
                type: "if",
                controlStatements: [
                    [IfStatement, [
                            ["keyword.if", "IF"],
                            ["tree", "less_than", [
                                    ["name", "x"],
                                    ["number.decimal", "5"],
                                ]],
                            ["keyword.then", "THEN"],
                        ]],
                    [statements.byType["if.end"], [
                            ["keyword.if_end", "ENDIF"],
                        ]]
                ],
                nodeGroups: [[
                        [OutputStatement, [
                                ["keyword.output", "OUTPUT"],
                                ["string", `"amogus"`],
                            ]],
                    ]],
            }
        ],
    ],
    nested_if: [
        [
            ["keyword.input", "INPUT"],
            ["name", `x`],
            ["newline", "\n"],
            ["keyword.if", "IF"],
            ["name", "x"],
            ["operator.less_than", "<"],
            ["number.decimal", "5"],
            ["keyword.then", "THEN"],
            ["newline", "\n"],
            ["keyword.output", "OUTPUT"],
            ["string", `"X is less than 5"`],
            ["newline", "\n"],
            ["keyword.if", "IF"],
            ["name", "x"],
            ["operator.less_than", "<"],
            ["number.decimal", "2"],
            ["keyword.then", "THEN"],
            ["newline", "\n"],
            ["keyword.output", "OUTPUT"],
            ["string", `"X is also less than 2"`],
            ["newline", "\n"],
            ["keyword.if_end", "ENDIF"],
            ["newline", "\n"],
            ["keyword.if_end", "ENDIF"],
        ],
        [
            [InputStatement, [
                    ["keyword.input", "INPUT"],
                    ["name", `x`],
                ]],
            {
                type: "if",
                controlStatements: [
                    [IfStatement, [
                            ["keyword.if", "IF"],
                            ["tree", "less_than", [
                                    ["name", "x"],
                                    ["number.decimal", "5"],
                                ]],
                            ["keyword.then", "THEN"],
                        ]],
                    [statements.byType["if.end"], [
                            ["keyword.if_end", "ENDIF"],
                        ]],
                ],
                nodeGroups: [[
                        [OutputStatement, [
                                ["keyword.output", "OUTPUT"],
                                ["string", `"X is less than 5"`],
                            ]],
                        {
                            type: "if",
                            controlStatements: [
                                [IfStatement, [
                                        ["keyword.if", "IF"],
                                        ["tree", "less_than", [
                                                ["name", "x"],
                                                ["number.decimal", "2"],
                                            ]],
                                        ["keyword.then", "THEN"],
                                    ]],
                                [statements.byType["if.end"], [
                                        ["keyword.if_end", "ENDIF"],
                                    ]]
                            ],
                            nodeGroups: [[
                                    [OutputStatement, [
                                            ["keyword.output", "OUTPUT"],
                                            ["string", `"X is also less than 2"`],
                                        ]],
                                ]],
                        }
                    ]],
            }
        ],
    ]
}).map(([name, [program, output]]) => [
    name,
    program.map(token),
    output == "error" ? "error" : process_ProgramAST(output)
]);
const functionArgumentTests = Object.entries({
    blank: [[], {}],
    oneArg: [[
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ], {
            arg: ["INTEGER"],
        }],
    twoArgs: [[
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], {
            arg: ["INTEGER"],
            arg2: ["BOOLEAN"],
        }],
    threeArgs: [[
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
            ["punctuation.comma", ","],
            ["name", "arg3"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], {
            arg: ["INTEGER"],
            arg2: ["BOOLEAN"],
            arg3: ["STRING"],
        }],
    typeRepetition: [[
            ["name", "arg"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.comma", ","],
            ["name", "arg3"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], {
            arg: ["STRING"],
            arg2: ["STRING"],
            arg3: ["STRING"],
        }],
    typeRepetition2: [[
            ["name", "arg1"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.comma", ","],
            ["name", "arg3"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], {
            arg1: ["BOOLEAN"],
            arg2: ["BOOLEAN"],
            arg3: ["BOOLEAN"],
        }],
    passModeDefault: [[
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ], {
            arg: ["INTEGER", "value"],
        }],
    passModeSpecified1: [[
            ["keyword.by-reference", "BYREF"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ], {
            arg: ["INTEGER", "reference"],
        }],
    passModeSpecified2: [[
            ["keyword.by-value", "BYVAL"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
        ], {
            arg: ["INTEGER", "value"],
        }],
    passModeSpecified3: [[
            ["keyword.by-reference", "BYREF"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], {
            arg: ["INTEGER", "reference"],
            arg2: ["BOOLEAN", "reference"],
        }],
    passModeSpecified4: [[
            ["keyword.by-value", "BYVAL"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], {
            arg: ["INTEGER", "value"],
            arg2: ["BOOLEAN", "value"],
        }],
    passModeSpecifiedTwice: [[
            ["keyword.by-value", "BYVAL"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["keyword.by-value", "BYVAL"],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], {
            arg: ["INTEGER", "value"],
            arg2: ["BOOLEAN", "value"],
        }],
    passModeSpecifiedTwiceDifferently: [[
            ["keyword.by-reference", "BYREF"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["keyword.by-value", "BYVAL"],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], {
            arg: ["INTEGER", "reference"],
            arg2: ["BOOLEAN", "value"],
        }],
    passModeSpecifiedTwiceDifferently2: [[
            ["keyword.by-reference", "BYREF"],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["keyword.by-value", "BYVAL"],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
            ["punctuation.comma", ","],
            ["name", "arg3"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], {
            arg: ["INTEGER", "reference"],
            arg2: ["BOOLEAN", "value"],
            arg3: ["STRING", "value"],
        }],
    weirdCombination1: [[
            ["keyword.by-reference", "BYREF"],
            ["name", "arg"],
            ["punctuation.comma", ","],
            ["keyword.by-value", "BYVAL"],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
            ["punctuation.comma", ","],
            ["name", "arg3"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], {
            arg: ["BOOLEAN", "reference"],
            arg2: ["BOOLEAN", "value"],
            arg3: ["STRING", "value"],
        }],
    nameOnly: [[
            ["name", "arg2"],
        ], "error"],
    missingType: [[
            ["name", "arg2"],
            ["punctuation.colon", ":"],
        ], "error"],
    missingComma: [[
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "DATE"],
            ["name", "arg2"],
        ], "error"],
    extraComma: [[
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "CHAR"],
            ["punctuation.comma", ","],
        ], "error"],
    onlyPassMode: [[
            ["keyword.by-reference", "BYREF"],
        ], "error"],
    onlyPassMode2: [[
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["keyword.by-reference", "BYREF"],
        ], "error"],
    doublePassMode: [[
            ["keyword.by-reference", "BYREF"],
            ["keyword.by-value", "BYVAL"],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
        ], "error"],
    doubleArg1: [[
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "INTEGER"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "BOOLEAN"],
            ["punctuation.comma", ","],
            ["name", "arg"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], "error"],
    doubleArg2: [[
            ["name", "arg"],
            ["punctuation.comma", ","],
            ["name", "arg4"],
            ["punctuation.comma", ","],
            ["name", "arg4"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], "error"],
    missingType2: [[
            ["keyword.by-reference", "BYREF"],
            ["name", "arg1"],
            ["punctuation.comma", ","],
            ["name", "arg2"],
            ["punctuation.comma", ","],
            ["name", "arg3"],
        ], "error"],
    randomJunk: [[
            ["keyword.case", "CASE"],
            ["name", "arg2"],
            ["punctuation.colon", ":"],
            ["name", "STRING"],
        ], "error"],
}).map(([name, [input, output]]) => ({
    name,
    input: input.map(token),
    output: output == "error" ? "error" :
        Object.fromEntries(Object.entries(output).map(([name, [type, passMode]]) => [name, { type, passMode: passMode ? passMode : jasmine.any(String) }]))
}));
const parseTypeTests = Object.entries({
    simpleType1: [[
            ["name", "INTEGER"],
        ],
        ["name", "INTEGER"]
    ],
    simpleType2: [[
            ["name", "BOOLEAN"],
        ],
        ["name", "BOOLEAN"],
    ],
    simpleType3: [[
            ["name", "STRING"],
        ],
        ["name", "STRING"],
    ],
    simpleType4: [[
            ["name", "CHAR"],
        ],
        ["name", "CHAR"],
    ],
    "1dArray": [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "10"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ], [
            [
                [1, 10]
            ],
            ["name", "INTEGER"],
        ]],
    "1dArray2": [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "0"],
            ["punctuation.colon", ":"],
            ["number.decimal", "102"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "DATE"],
        ], [
            [
                [0, 102]
            ],
            ["name", "DATE"],
        ]],
    "2dArray": [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "10"],
            ["punctuation.comma", ","],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "20"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ], [
            [
                [1, 10],
                [1, 20],
            ],
            ["name", "INTEGER"]
        ]],
    "2dArray2": [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "0"],
            ["punctuation.colon", ":"],
            ["number.decimal", "103"],
            ["punctuation.comma", ","],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "22"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "BOOLEAN"],
        ], [
            [
                [0, 103],
                [1, 22],
            ],
            ["name", "BOOLEAN"]
        ]],
    "4dArray": [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "10"],
            ["punctuation.comma", ","],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "20"],
            ["punctuation.comma", ","],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "30"],
            ["punctuation.comma", ","],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "40"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ], [
            [
                [1, 10],
                [1, 20],
                [1, 30],
                [1, 40],
            ],
            ["name", "INTEGER"]
        ]],
    invalid1: [[
            ["keyword.array", "ARRAY"],
        ], "error"],
    arrayButWithBraces: [[
            ["keyword.array", "ARRAY"],
            ["brace.open", "{"],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "10"],
            ["punctuation.comma", ","],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "20"],
            ["brace.close", "}"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ], "error"],
    unspecifiedLowerBound: [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "10"],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ], "error"],
    missingOf: [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "10"],
            ["bracket.close", "]"],
            ["name", "INTEGER"],
        ], "error"],
    extraComma: [[
            ["keyword.array", "ARRAY"],
            ["bracket.open", "["],
            ["number.decimal", "1"],
            ["punctuation.colon", ":"],
            ["number.decimal", "10"],
            ["punctuation.comma", ","],
            ["bracket.close", "]"],
            ["keyword.of", "OF"],
            ["name", "INTEGER"],
        ], "error"],
}).map(([name, [input, output]]) => ({
    name,
    input: input.map(t => new Token(t[0], t[1])),
    output: output == "error" ? output :
        ((output) => !Array.isArray(output[1]))(output) //weird type guard IIFE shenanigans
            ? token(output)
            : {
                lengthInformation: output[0].map(bounds => bounds.map(b => new Token("number.decimal", b.toString()))),
                type: token(output[1])
            }
}));
describe("parseExpression", () => {
    for (const [name, program, output] of sampleExpressions) {
        if (output === "error") {
            it(`should not parse ${name} into an expression`, () => {
                expect(() => parseExpression(program)).toThrowMatching(e => e instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} into an expression`, () => {
                expect(parseExpression(program)).toEqual(output);
            });
        }
    }
    it("should pass the fuzzer with n=5 l=4", () => {
        const tokens = [
            token("number.decimal", "5"),
            token("operator.add", "+"),
            token("operator.subtract", "-"),
            // token("operator.multiply", "*"),
            token("operator.not", "NOT"),
            // 	token("parentheses.open", "("),
            // 	token("parentheses.close", ")"),
        ];
        const length = 5;
        for (let i = 0; i < tokens.length ** length; i++) {
            const expr = Array.from({ length }, (_, j) => tokens[Math.floor(i / (tokens.length ** j)) % tokens.length]);
            try {
                parseExpression(expr);
            }
            catch (err) {
                if (!(err instanceof SoodocodeError))
                    throw err;
            }
        }
    });
});
describe("parseStatement", () => {
    for (const [name, program, output] of parseStatementTests) {
        if (output === "error") {
            it(`should not parse ${name} into a statement`, () => {
                expect(() => parseStatement(program)).toThrowMatching(e => e instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} into a statement`, () => {
                expect(parseStatement(program)).toEqual(output);
            });
        }
    }
});
describe("parse", () => {
    for (const [name, program, output] of parseProgramTests) {
        if (output === "error") {
            it(`should not parse ${name} into a program`, () => {
                expect(() => parse(program)).toThrowMatching(e => e instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} into a program`, () => {
                expect(parse(program)).toEqual(output);
            });
        }
    }
});
describe("parseFunctionArguments", () => {
    for (const { name, input, output } of functionArgumentTests) {
        if (output == "error") {
            it(`should not parse ${name} as function arguments`, () => {
                expect(() => parseFunctionArguments(input))
                    .toThrowMatching(t => t instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} as function arguments`, () => {
                expect(Object.fromEntries(parseFunctionArguments(input))).toEqual(output);
            });
        }
    }
});
describe("ArrayTypeData", () => {
    it(`should generate correct data`, () => {
        const data1 = new ArrayTypeData([[0, 9]], "BOOLEAN");
        expect(data1.lengthInformation_).toEqual([10]);
        expect(data1.totalLength).toEqual(10);
        const data2 = new ArrayTypeData([[1, 15]], "STRING");
        expect(data2.lengthInformation_).toEqual([15]);
        expect(data2.totalLength).toEqual(15);
        const data3 = new ArrayTypeData([[0, 9], [0, 19]], "BOOLEAN");
        expect(data3.lengthInformation_).toEqual([10, 20]);
        expect(data3.totalLength).toEqual(200);
        const data4 = new ArrayTypeData([[1, 10], [1, 15]], "DATE");
        expect(data4.lengthInformation_).toEqual([10, 15]);
        expect(data4.totalLength).toEqual(150);
        const data5 = new ArrayTypeData([[0, 9], [1, 15], [0, 20]], "INTEGER");
        expect(data5.lengthInformation_).toEqual([10, 15, 21]);
        expect(data5.totalLength).toEqual(3150);
    });
    it(`should handle correct inputs`, () => {
        expect(() => new ArrayTypeData([[0, 0]], "CHAR")).not.toThrow();
        expect(() => new ArrayTypeData([[5, 5]], "CHAR")).not.toThrow();
    });
    it(`should handle incorrect inputs`, () => {
        expect(() => new ArrayTypeData([[0, -1]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
        expect(() => new ArrayTypeData([[2, 1]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
        expect(() => new ArrayTypeData([[0, 10.5]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
        expect(() => new ArrayTypeData([[0, 1], [0, 10.5]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
    });
});
describe("parseType", () => {
    for (const { name, input, output } of parseTypeTests) {
        if (output == "error") {
            it(`should not parse ${name} into a valid type`, () => {
                expect(() => parseType(input))
                    .toThrowMatching(t => t instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} as a valid type`, () => {
                expect(parseType(input)).toEqual(output);
            });
        }
    }
});
