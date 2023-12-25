import "jasmine";
import { parse, parseFunctionArguments, parseStatement, operators, parseExpression } from "../src/parser.js";
import { AssignmentStatement, DeclarationStatement, DoWhileEndStatement, IfStatement, InputStatement, OutputStatement, ProcedureStatement, statements } from "../src/statements.js";
import { SoodocodeError } from "../src/utils.js";
//copy(tokenize(symbolize(``)).map(t => `{text: "${t.text}", type: "${t.type}"},`).join("\n"))
const sampleExpressions = Object.entries({
    number: [
        [
            { text: "5", type: "number.decimal" },
        ],
        { text: "5", type: "number.decimal" },
    ],
    variable: [
        [
            { text: "x", type: "name" },
        ],
        { text: "x", type: "name" },
    ],
    parens: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "x", type: "name" },
            { text: ")", type: "parentheses.close" },
        ],
        { text: "x", type: "name" },
    ],
    manyparens: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "x", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
        ],
        { text: "x", type: "name" },
    ],
    addition: [
        [
            { text: "x", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "y", type: "name" },
        ],
        {
            operator: operators.add,
            operatorToken: { text: "+", type: "operator.add" },
            nodes: [
                { text: "x", type: "name" },
                { text: "y", type: "name" },
            ]
        },
    ],
    precedence1: [
        [
            { text: "x", type: "name" },
            { text: "-", type: "operator.subtract" },
            { text: "y", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "z", type: "name" },
        ],
        {
            operator: operators.subtract,
            operatorToken: { text: "-", type: "operator.subtract" },
            nodes: [
                { text: "x", type: "name" },
                {
                    operator: operators.multiply,
                    operatorToken: { text: "*", type: "operator.multiply" },
                    nodes: [
                        { text: "y", type: "name" },
                        { text: "z", type: "name" },
                    ]
                },
            ]
        },
    ],
    precedence2: [
        [
            { text: "x", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "y", type: "name" },
            { text: "-", type: "operator.subtract" },
            { text: "z", type: "name" },
        ],
        {
            operator: operators.subtract,
            operatorToken: { text: "-", type: "operator.subtract" },
            nodes: [
                {
                    operator: operators.multiply,
                    operatorToken: { text: "*", type: "operator.multiply" },
                    nodes: [
                        { text: "x", type: "name" },
                        { text: "y", type: "name" },
                    ]
                },
                { text: "z", type: "name" },
            ]
        },
    ],
    precedence3: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "x", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "y", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "-", type: "operator.subtract" },
            { text: "z", type: "name" },
        ],
        {
            operator: operators.subtract,
            operatorToken: { text: "-", type: "operator.subtract" },
            nodes: [
                {
                    operator: operators.multiply,
                    operatorToken: { text: "*", type: "operator.multiply" },
                    nodes: [
                        { text: "x", type: "name" },
                        { text: "y", type: "name" },
                    ]
                },
                { text: "z", type: "name" },
            ]
        },
    ],
    precedence4: [
        [
            { text: "x", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "(", type: "parentheses.open" },
            { text: "y", type: "name" },
            { text: "-", type: "operator.subtract" },
            { text: "z", type: "name" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: operators.multiply,
            operatorToken: { text: "*", type: "operator.multiply" },
            nodes: [
                { text: "x", type: "name" },
                {
                    operator: operators.subtract,
                    operatorToken: { text: "-", type: "operator.subtract" },
                    nodes: [
                        { text: "y", type: "name" },
                        { text: "z", type: "name" },
                    ]
                },
            ]
        },
    ],
    parenbug1: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "x", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "*", type: "operator.multiply" },
            { text: "(", type: "parentheses.open" },
            { text: "y", type: "name" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: operators.multiply,
            operatorToken: { text: "*", type: "operator.multiply" },
            nodes: [
                { text: "x", type: "name" },
                { text: "y", type: "name" },
            ]
        },
    ],
    parenbad1: [
        [
            { text: "(", type: "parentheses.open" },
        ],
        "error"
    ],
    parenbad2: [
        [
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    parenbad3: [
        [
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    parenbad4: [
        [
            { text: ")", type: "parentheses.close" },
            { text: "(", type: "parentheses.open" },
        ],
        "error"
    ],
    parenbad5: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "x", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "(", type: "parentheses.open" },
            { text: "y", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "(", type: "parentheses.open" },
            { text: "-", type: "operator.subtract" },
            { text: "z", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    functioncall1: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: "function call",
            operatorToken: { text: "amogus", type: "name" },
            nodes: []
        }
    ],
    functioncall2: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: "function call",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                { text: "5", type: "number.decimal" },
            ]
        }
    ],
    functioncall3: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "6", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "TRUE", type: "boolean.true" },
            { text: ",", type: "punctuation.comma" },
            { text: `"sussy"`, type: "string" },
            { text: "&", type: "operator.string_concatenate" },
            { text: `"amogus"`, type: "string" },
            { text: ",", type: "punctuation.comma" },
            { text: "0", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: "function call",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                { text: "5", type: "number.decimal" },
                { text: "6", type: "number.decimal" },
                { text: "TRUE", type: "boolean.true" },
                {
                    operator: operators.string_concatenate,
                    operatorToken: { text: "&", type: "operator.string_concatenate" },
                    nodes: [
                        { text: `"sussy"`, type: "string" },
                        { text: `"amogus"`, type: "string" },
                    ]
                },
                { text: "0", type: "number.decimal" },
            ]
        }
    ],
    functioncallnested: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "6", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "sussy", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
            { text: ",", type: "punctuation.comma" },
            { text: "baka", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "sussy", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ",", type: "punctuation.comma" },
            { text: `"sussy"`, type: "string" },
            { text: "&", type: "operator.string_concatenate" },
            { text: `"amogus"`, type: "string" },
            { text: ",", type: "punctuation.comma" },
            { text: "0", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: "function call",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                { text: "5", type: "number.decimal" },
                { text: "6", type: "number.decimal" },
                {
                    operator: "function call",
                    operatorToken: { text: "sussy", type: "name" },
                    nodes: []
                },
                {
                    operator: "function call",
                    operatorToken: { text: "baka", type: "name" },
                    nodes: [
                        {
                            operator: "function call",
                            operatorToken: { text: "sussy", type: "name" },
                            nodes: []
                        },
                    ]
                },
                {
                    operator: operators.string_concatenate,
                    operatorToken: { text: "&", type: "operator.string_concatenate" },
                    nodes: [
                        { text: `"sussy"`, type: "string" },
                        { text: `"amogus"`, type: "string" },
                    ]
                },
                { text: "0", type: "number.decimal" },
            ]
        }
    ],
    functioncallbad1: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
        ],
        "error"
    ],
    functioncallbad2: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ",", type: "punctuation.comma" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    functioncallbad3: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ",", type: "punctuation.comma" },
            { text: "baka", type: "name" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    functioncallbad4: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "baka", type: "name" },
            { text: "baka", type: "name" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    functioncallbad5: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "baka", type: "name" },
            { text: ",", type: "punctuation.comma" },
            { text: "baka", type: "name" },
            { text: ",", type: "punctuation.comma" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    functioncallbad6: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "6", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "sussy", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
            { text: "baka", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "sussy", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: ",", type: "punctuation.comma" },
            { text: `"sussy"`, type: "string" },
            { text: "&", type: "operator.string_concatenate" },
            { text: `"amogus"`, type: "string" },
            { text: ",", type: "punctuation.comma" },
            { text: "0", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    array1: [
        [
            { text: "amogus", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "1", type: "number.decimal" },
            { text: "]", type: "bracket.close" },
        ],
        {
            operator: "array access",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                { text: "1", type: "number.decimal" },
            ]
        }
    ],
    array2: [
        [
            { text: "amogus", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "a", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "b", type: "name" },
            { text: "]", type: "bracket.close" },
        ],
        {
            operator: "array access",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                {
                    operator: operators.add,
                    operatorToken: { text: "+", type: "operator.add" },
                    nodes: [
                        { text: "a", type: "name" },
                        { text: "b", type: "name" },
                    ]
                },
            ]
        }
    ],
    arraynested1: [
        [
            { text: "amogus", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "a", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "sussy", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "b", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "c", type: "name" },
            { text: "]", type: "bracket.close" },
            { text: "]", type: "bracket.close" },
        ],
        {
            operator: "array access",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                {
                    operator: operators.add,
                    operatorToken: { text: "+", type: "operator.add" },
                    nodes: [
                        { text: "a", type: "name" },
                        {
                            operator: "array access",
                            operatorToken: { text: "sussy", type: "name" },
                            nodes: [
                                {
                                    operator: operators.add,
                                    operatorToken: { text: "+", type: "operator.add" },
                                    nodes: [
                                        { text: "b", type: "name" },
                                        { text: "c", type: "name" },
                                    ]
                                },
                            ]
                        }
                    ]
                },
            ]
        }
    ],
    arrayfunction1: [
        [
            { text: "arr", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "a", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "6", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
            { text: "]", type: "bracket.close" },
        ],
        {
            operator: "array access",
            operatorToken: { text: "arr", type: "name" },
            nodes: [
                {
                    operator: operators.add,
                    operatorToken: { text: "+", type: "operator.add" },
                    nodes: [
                        { text: "a", type: "name" },
                        {
                            operator: "function call",
                            operatorToken: { text: "amogus", type: "name" },
                            nodes: [
                                { text: "5", type: "number.decimal" },
                                { text: "6", type: "number.decimal" },
                            ]
                        }
                    ]
                },
            ]
        }
    ],
    arrayfunction2: [
        [
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "a", type: "name" },
            { text: ",", type: "punctuation.comma" },
            { text: "b", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "amogus", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "5", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "6", type: "number.decimal" },
            { text: "]", type: "bracket.close" },
            { text: ")", type: "parentheses.close" },
        ],
        {
            operator: "function call",
            operatorToken: { text: "amogus", type: "name" },
            nodes: [
                { text: "a", type: "name" },
                {
                    operator: operators.add,
                    operatorToken: { text: "+", type: "operator.add" },
                    nodes: [
                        { text: "b", type: "name" },
                        {
                            operator: "array access",
                            operatorToken: { text: "amogus", type: "name" },
                            nodes: [
                                { text: "5", type: "number.decimal" },
                                { text: "6", type: "number.decimal" },
                            ]
                        }
                    ]
                },
            ]
        }
    ],
    arraybad1: [
        [
            { text: "amogus", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "]", type: "bracket.close" },
        ],
        "error"
    ],
    arraybad2: [
        [
            { text: "amogus", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "[", type: "bracket.open" },
            { text: "]", type: "bracket.close" },
            { text: "]", type: "bracket.close" },
        ],
        "error"
    ],
    arrayfunctionbad1: [
        [
            { text: "arr", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "a", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: "6", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
            { text: "]", type: "bracket.close" },
        ],
        "error"
    ],
    arrayfunctionbad2: [
        [
            { text: "arr", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "a", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "5", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "6", type: "number.decimal" },
            { text: "]", type: "bracket.close" },
            { text: ")", type: "parentheses.close" },
        ],
        "error"
    ],
    SussyBaka: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "a", type: "name" },
            { text: ">=", type: "operator.greater_than_equal" },
            { text: "b", type: "name" },
            { text: "-", type: "operator.subtract" },
            { text: "c", type: "name" },
            { text: "MOD", type: "operator.mod" },
            { text: "d", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: "e", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "f", type: "name" },
            { text: "<=", type: "operator.less_than_equal" },
            { text: "g", type: "name" },
            { text: "=", type: "operator.equal_to" },
            { text: "h", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "i", type: "name" },
            { text: "/", type: "operator.divide" },
            { text: "j", type: "name" },
            { text: ">", type: "operator.greater_than" },
            { text: "k", type: "name" },
            { text: "DIV", type: "operator.integer_divide" },
            { text: "l", type: "name" },
            { text: "<>", type: "operator.not_equal_to" },
            { text: "m", type: "name" },
            { text: "OR", type: "operator.or" },
            { text: "n", type: "name" },
            { text: "AND", type: "operator.and" },
            { text: "NOT", type: "operator.not" },
            { text: "o", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "OR", type: "operator.or" },
            { text: "(", type: "parentheses.open" },
            { text: "a", type: "name" },
            { text: ">=", type: "operator.greater_than_equal" },
            { text: "(", type: "parentheses.open" },
            { text: "b", type: "name" },
            { text: "-", type: "operator.subtract" },
            { text: "c", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "MOD", type: "operator.mod" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "d", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: "(", type: "parentheses.open" },
            { text: "e", type: "name" },
            { text: "+", type: "operator.add" },
            { text: "(", type: "parentheses.open" },
            { text: "f", type: "name" },
            { text: "<=", type: "operator.less_than_equal" },
            { text: "g", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "=", type: "operator.equal_to" },
            { text: "h", type: "name" },
            { text: "*", type: "operator.multiply" },
            { text: "i", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "/", type: "operator.divide" },
            { text: "j", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: ">", type: "operator.greater_than" },
            { text: "k", type: "name" },
            { text: "DIV", type: "operator.integer_divide" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "l", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: "<>", type: "operator.not_equal_to" },
            { text: "m", type: "name" },
            { text: "OR", type: "operator.or" },
            { text: "n", type: "name" },
            { text: ")", type: "parentheses.close" },
            { text: "AND", type: "operator.and" },
            { text: "NOT", type: "operator.not" },
            { text: "o", type: "name" },
            { text: ")", type: "parentheses.close" },
        ],
        //this tree is sufficiently colossal to force me to remove the 2846 tabs, 212 newlines, and 276 whitespaces that would be there if I formatted it normally, including TWENTY SIX TABS IN A ROW
        //how to edit it?
        //dont
        {
            operatorToken: { type: "operator.or", text: "OR" }, operator: operators.or, nodes: [{ operatorToken: { type: "operator.or", text: "OR" }, operator: operators.or, nodes: [{ operatorToken: { type: "operator.not_equal_to", text: "<>" }, operator: operators.not_equal_to, nodes: [{ operatorToken: { type: "operator.equal_to", text: "=" }, operator: operators.equal_to, nodes: [{ operatorToken: { type: "operator.less_than_equal", text: "<=" }, operator: operators.less_than_equal, nodes: [{ operatorToken: { type: "operator.less_than", text: "<" }, operator: operators.less_than, nodes: [{ operatorToken: { type: "operator.greater_than_equal", text: ">=" }, operator: operators.greater_than_equal, nodes: [{ type: "name", text: "a" }, { operatorToken: { type: "operator.subtract", text: "-" }, operator: operators.subtract, nodes: [{ type: "name", text: "b" }, { operatorToken: { type: "operator.mod", text: "MOD" }, operator: operators.mod, nodes: [{ type: "name", text: "c" }, { type: "name", text: "d" }] }] }] }, { operatorToken: { type: "operator.add", text: "+" }, operator: operators.add, nodes: [{ type: "name", text: "e" }, { type: "name", text: "f" }] }] }, { type: "name", text: "g" }] }, { operatorToken: { type: "operator.greater_than", text: ">" }, operator: operators.greater_than, nodes: [{ operatorToken: { type: "operator.divide", text: "/" }, operator: operators.divide, nodes: [{ operatorToken: { type: "operator.multiply", text: "*" }, operator: operators.multiply, nodes: [{ type: "name", text: "h" }, { type: "name", text: "i" }] }, { type: "name", text: "j" }] }, { operatorToken: { type: "operator.integer_divide", text: "DIV" }, operator: operators.integer_divide, nodes: [{ type: "name", text: "k" }, { type: "name", text: "l" }] }] }] }, { type: "name", text: "m" }] }, { operatorToken: { type: "operator.and", text: "AND" }, operator: operators.and, nodes: [{ type: "name", text: "n" }, { operatorToken: { type: "operator.not", text: "NOT" }, operator: operators.not, nodes: [{ type: "name", text: "o" }] }] }] }, { operatorToken: { type: "operator.and", text: "AND" }, operator: operators.and, nodes: [{ operatorToken: { type: "operator.greater_than_equal", text: ">=" }, operator: operators.greater_than_equal, nodes: [{ type: "name", text: "a" }, { operatorToken: { type: "operator.mod", text: "MOD" }, operator: operators.mod, nodes: [{ operatorToken: { type: "operator.subtract", text: "-" }, operator: operators.subtract, nodes: [{ type: "name", text: "b" }, { type: "name", text: "c" }] }, { operatorToken: { type: "operator.or", text: "OR" }, operator: operators.or, nodes: [{ operatorToken: { type: "operator.not_equal_to", text: "<>" }, operator: operators.not_equal_to, nodes: [{ operatorToken: { type: "operator.greater_than", text: ">" }, operator: operators.greater_than, nodes: [{ operatorToken: { type: "operator.less_than", text: "<" }, operator: operators.less_than, nodes: [{ type: "name", text: "d" }, { operatorToken: { type: "operator.divide", text: "/" }, operator: operators.divide, nodes: [{ operatorToken: { type: "operator.equal_to", text: "=" }, operator: operators.equal_to, nodes: [{ operatorToken: { type: "operator.add", text: "+" }, operator: operators.add, nodes: [{ type: "name", text: "e" }, { operatorToken: { type: "operator.less_than_equal", text: "<=" }, operator: operators.less_than_equal, nodes: [{ type: "name", text: "f" }, { type: "name", text: "g" }] }] }, { operatorToken: { type: "operator.multiply", text: "*" }, operator: operators.multiply, nodes: [{ type: "name", text: "h" }, { type: "name", text: "i" }] }] }, { type: "name", text: "j" }] }] }, { operatorToken: { type: "operator.integer_divide", text: "DIV" }, operator: operators.integer_divide, nodes: [{ type: "name", text: "k" }, { type: "name", text: "l" }] }] }, { type: "name", text: "m" }] }, { type: "name", text: "n" }] }] }] }, { operatorToken: { type: "operator.not", text: "NOT" }, operator: operators.not, nodes: [{ type: "name", text: "o" }] }] }]
        }
    ],
    SussyBaka2: [
        [
            { text: "(", type: "parentheses.open" },
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "1", type: "number.decimal" },
            { text: "+", type: "operator.add" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "2", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: "-", type: "operator.subtract" },
            { text: "3", type: "number.decimal" },
            { text: "*", type: "operator.multiply" },
            { text: "4", type: "number.decimal" },
            { text: "/", type: "operator.divide" },
            { text: "5", type: "number.decimal" },
            { text: "MOD", type: "operator.mod" },
            { text: "6", type: "number.decimal" },
            { text: "DIV", type: "operator.integer_divide" },
            { text: "7", type: "number.decimal" },
            { text: ">", type: "operator.greater_than" },
            { text: "8", type: "number.decimal" },
            { text: ">", type: "operator.greater_than" },
            { text: "(", type: "parentheses.open" },
            { text: "9", type: "number.decimal" },
            { text: "=", type: "operator.equal_to" },
            { text: "10", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
            { text: "AND", type: "operator.and" },
            { text: "NOT", type: "operator.not" },
            { text: "12", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: `"sus"`, type: "string" },
            { text: ",", type: "punctuation.comma" },
            { text: "x", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "5", type: "number.decimal" },
            { text: "]", type: "bracket.close" },
            { text: ",", type: "punctuation.comma" },
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "arr", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "1", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "5", type: "number.decimal" },
            { text: "]", type: "bracket.close" },
            { text: ",", type: "punctuation.comma" },
            { text: "bigarr", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "sussy", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: ")", type: "parentheses.close" },
            { text: ",", type: "punctuation.comma" },
            { text: "sussier", type: "name" },
            { text: "(", type: "parentheses.open" },
            { text: "37", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "y", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "5", type: "number.decimal" },
            { text: "+", type: "operator.add" },
            { text: "z", type: "name" },
            { text: "[", type: "bracket.open" },
            { text: "0", type: "number.decimal" },
            { text: ",", type: "punctuation.comma" },
            { text: "(", type: "parentheses.open" },
            { text: "(", type: "parentheses.open" },
            { text: "0", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: "]", type: "bracket.close" },
            { text: "]", type: "bracket.close" },
            { text: ")", type: "parentheses.close" },
            { text: "]", type: "bracket.close" },
            { text: ",", type: "punctuation.comma" },
            { text: "5", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
            { text: ")", type: "parentheses.close" },
            { text: "+", type: "operator.add" },
            { text: "0", type: "number.decimal" },
            { text: ")", type: "parentheses.close" },
        ],
        //yet another huge tree
        { operatorToken: { type: "operator.add", text: "+" }, operator: operators.add, nodes: [{ operatorToken: { type: "name", text: "amogus" }, operator: "function call", nodes: [{ operatorToken: { type: "operator.and", text: "AND" }, operator: operators.and, nodes: [{ operatorToken: { type: "operator.greater_than", text: ">" }, operator: operators.greater_than, nodes: [{ operatorToken: { type: "operator.greater_than", text: ">" }, operator: operators.greater_than, nodes: [{ operatorToken: { type: "operator.subtract", text: "-" }, operator: operators.subtract, nodes: [{ operatorToken: { type: "operator.add", text: "+" }, operator: operators.add, nodes: [{ type: "number.decimal", text: "1" }, { type: "number.decimal", text: "2" }] }, { operatorToken: { type: "operator.integer_divide", text: "DIV" }, operator: operators.integer_divide, nodes: [{ operatorToken: { type: "operator.mod", text: "MOD" }, operator: operators.mod, nodes: [{ operatorToken: { type: "operator.divide", text: "/" }, operator: operators.divide, nodes: [{ operatorToken: { type: "operator.multiply", text: "*" }, operator: operators.multiply, nodes: [{ type: "number.decimal", text: "3" }, { type: "number.decimal", text: "4" }] }, { type: "number.decimal", text: "5" }] }, { type: "number.decimal", text: "6" }] }, { type: "number.decimal", text: "7" }] }] }, { type: "number.decimal", text: "8" }] }, { operatorToken: { type: "operator.equal_to", text: "=" }, operator: operators.equal_to, nodes: [{ type: "number.decimal", text: "9" }, { type: "number.decimal", text: "10" }] }] }, { operatorToken: { type: "operator.not", text: "NOT" }, operator: operators.not, nodes: [{ type: "number.decimal", text: "12" }] }] }, { text: "\"sus\"", type: "string" }, { operatorToken: { type: "name", text: "x" }, operator: "array access", nodes: [{ type: "number.decimal", text: "5" }] }, { operatorToken: { type: "name", text: "amogus" }, operator: "function call", nodes: [{ operatorToken: { type: "name", text: "arr" }, operator: "array access", nodes: [{ type: "number.decimal", text: "1" }, { type: "number.decimal", text: "5" }] }, { operatorToken: { type: "name", text: "bigarr" }, operator: "array access", nodes: [{ operatorToken: { type: "name", text: "sussy" }, operator: "function call", nodes: [] }, { operatorToken: { type: "name", text: "sussier" }, operator: "function call", nodes: [{ type: "number.decimal", text: "37" }, { operatorToken: { type: "name", text: "y" }, operator: "array access", nodes: [{ operatorToken: { type: "operator.add", text: "+" }, operator: operators.add, nodes: [{ type: "number.decimal", text: "5" }, { operatorToken: { type: "name", text: "z" }, operator: "array access", nodes: [{ type: "number.decimal", text: "0" }, { type: "number.decimal", text: "0" }] }] }] }] }] }, { type: "number.decimal", text: "5" }] }] }, { type: "number.decimal", text: "0" }] }
    ]
}).map(p => [p[0], p[1][0], p[1][1]]);
const sampleStatements = Object.entries({
    output: [
        [
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
        ],
        new OutputStatement([
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
        ])
    ],
    input: [
        [
            { text: "INPUT", type: "keyword.input" },
            { text: `amogus`, type: "name" },
        ],
        new InputStatement([
            { text: "INPUT", type: "keyword.input" },
            { text: `amogus`, type: "name" },
        ])
    ],
    declare1: [
        [
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ],
        new DeclarationStatement([
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ])
    ],
    declare2: [
        [
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ",", type: "punctuation.comma" },
            { text: "sussy", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ],
        new DeclarationStatement([
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ",", type: "punctuation.comma" },
            { text: "sussy", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ])
    ],
    declareBad1: [
        [
            { text: "DECLARE", type: "keyword.declare" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ],
        "error"
    ],
    declareBad2: [
        [
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ",", type: "punctuation.comma" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ],
        "error"
    ],
    declareBad3: [
        [
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: "sussy", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ],
        "error"
    ],
    assign: [
        [
            { text: "amogus", type: "name" },
            { text: `<-`, type: "operator.assignment" },
            { text: "31415", type: "number.decimal" },
        ],
        new AssignmentStatement([
            { text: "amogus", type: "name" },
            { text: `<-`, type: "operator.assignment" },
            { text: "31415", type: "number.decimal" },
        ])
    ],
    if: [
        [
            { text: "IF", type: "keyword.if" },
            { text: "5", type: "number.decimal" },
            { text: `<`, type: "operator.less_than" },
            { text: "x", type: "name" },
            { text: "THEN", type: "keyword.then" },
        ],
        new IfStatement([
            { text: "IF", type: "keyword.if" },
            {
                operatorToken: { text: `<`, type: "operator.less_than" },
                operator: operators.less_than,
                nodes: [
                    { text: "5", type: "number.decimal" },
                    { text: "x", type: "name" },
                ]
            },
            { text: "THEN", type: "keyword.then" },
        ])
    ],
    until1: [
        [
            { text: "UNTIL", type: "keyword.dowhile_end" },
            { text: "5", type: "number.decimal" },
            { text: `<`, type: "operator.less_than" },
            { text: "x", type: "name" },
        ],
        new DoWhileEndStatement([
            { text: "UNTIL", type: "keyword.dowhile_end" },
            {
                operatorToken: { text: `<`, type: "operator.less_than" },
                operator: operators.less_than,
                nodes: [
                    { text: "5", type: "number.decimal" },
                    { text: "x", type: "name" },
                ]
            },
        ])
    ],
    until2: [
        [
            { text: "UNTIL", type: "keyword.dowhile_end" },
            { text: `NOT`, type: "operator.not" },
            { text: "x", type: "name" },
        ],
        new DoWhileEndStatement([
            { text: "UNTIL", type: "keyword.dowhile_end" },
            {
                operatorToken: { text: `NOT`, type: "operator.not" },
                operator: operators.not,
                nodes: [
                    { text: "x", type: "name" },
                ]
            },
        ])
    ],
    procedure1: [
        [
            { text: "PROCEDURE", type: "keyword.procedure" },
            { text: "func", type: "name" },
            { text: `(`, type: "parentheses.open" },
            { text: `)`, type: "parentheses.close" },
        ],
        new ProcedureStatement([
            { text: "PROCEDURE", type: "keyword.procedure" },
            { text: "func", type: "name" },
            { text: `(`, type: "parentheses.open" },
            { text: `)`, type: "parentheses.close" },
        ])
    ],
    procedure2: [
        [
            { text: "PROCEDURE", type: "keyword.procedure" },
            { text: "func", type: "name" },
            { text: `(`, type: "parentheses.open" },
            { text: "x", type: "name" },
            { type: "punctuation.colon", text: ":" },
            { text: "INTEGER", type: "name" },
            { text: `)`, type: "parentheses.close" },
        ],
        new ProcedureStatement([
            { text: "PROCEDURE", type: "keyword.procedure" },
            { text: "func", type: "name" },
            { text: `(`, type: "parentheses.open" },
            { text: "x", type: "name" },
            { type: "punctuation.colon", text: ":" },
            { text: "INTEGER", type: "name" },
            { text: `)`, type: "parentheses.close" },
        ])
    ],
    empty: [
        [],
        "error"
    ],
    randomjunk1: [
        [
            { text: "31415", type: "number.decimal" },
            { text: "amogus", type: "name" },
            { text: `<-`, type: "operator.assignment" },
        ],
        "error"
    ],
    randomjunk2: [
        [
            { text: "amogus", type: "name" },
            { text: "31415", type: "number.decimal" },
            { text: `OUTPUT`, type: "keyword.output" },
        ],
        "error"
    ],
    incompleteDeclare1: [
        [
            { text: `DECLARE`, type: "keyword.declare" },
        ],
        "error"
    ],
    incompleteDeclare2: [
        [
            { text: `DECLARE`, type: "keyword.declare" },
            { text: "amogus", type: "name" },
        ],
        "error"
    ],
    incompleteDeclare3: [
        [
            { text: `DECLARE`, type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ":", type: "punctuation.colon" },
        ],
        "error"
    ],
    incompleteDeclare4: [
        [
            { text: `DECLARE`, type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: "INTEGER", type: "name" },
        ],
        "error"
    ],
    incompleteOutput: [
        [
            { text: `OUTPUT`, type: "keyword.output" },
        ],
        "error"
    ],
    incompleteIf1: [
        [
            { text: `IF`, type: "keyword.if" },
        ],
        "error"
    ],
    incompleteIf2: [
        [
            { text: `IF`, type: "keyword.if" },
            { text: "amogus", type: "name" },
        ],
        "error"
    ],
    incompleteIf3: [
        [
            { text: `IF`, type: "keyword.if" },
            { text: "amogus", type: "name" },
            { text: "<", type: "operator.less_than" },
        ],
        "error"
    ],
    incompleteIf4: [
        [
            { text: `IF`, type: "keyword.if" },
            { text: "amogus", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: "5", type: "number.decimal" },
        ],
        "error"
    ],
    incompleteIf5: [
        [
            { text: `IF`, type: "keyword.if" },
            { text: `THEN`, type: "keyword.then" },
        ],
        "error"
    ],
    incompleteIf6: [
        [
            { text: `IF`, type: "keyword.if" },
            { text: "<", type: "operator.less_than" },
            { text: `THEN`, type: "keyword.then" },
        ],
        "error"
    ],
    incompleteIf7: [
        [
            { text: `IF`, type: "keyword.if" },
            { text: "amogus", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: `THEN`, type: "keyword.then" },
        ],
        "error"
    ],
    incompleteProcedure1: [
        [
            { text: `PROCEDURE`, type: "keyword.procedure" },
            { text: "amogus", type: "name" },
            { text: "(", type: "parentheses.open" },
        ],
        "error"
    ],
}).map(p => [p[0], p[1][0], p[1][1]]);
const samplePrograms = Object.entries({
    output: [
        [
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
            { text: "\n", type: "newline" },
        ],
        [new OutputStatement([
                { text: "OUTPUT", type: "keyword.output" },
                { text: `"amogus"`, type: "string" },
            ])]
    ],
    outputInputDeclareAssign: [
        [
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
            { text: "\n", type: "newline" },
            { text: "INPUT", type: "keyword.input" },
            { text: `amogus`, type: "name" },
            { text: "\n", type: "newline" },
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
            { text: "\n", type: "newline" },
            { text: "amogus", type: "name" },
            { text: `<-`, type: "operator.assignment" },
            { text: "31415", type: "number.decimal" },
        ],
        [
            new OutputStatement([
                { text: "OUTPUT", type: "keyword.output" },
                { text: `"amogus"`, type: "string" },
            ]),
            new InputStatement([
                { text: "INPUT", type: "keyword.input" },
                { text: `amogus`, type: "name" },
            ]),
            new DeclarationStatement([
                { text: "DECLARE", type: "keyword.declare" },
                { text: "amogus", type: "name" },
                { text: ":", type: "punctuation.colon" },
                { text: "NUMBER", type: "name" },
            ]),
            new AssignmentStatement([
                { text: "amogus", type: "name" },
                { text: `<-`, type: "operator.assignment" },
                { text: "31415", type: "number.decimal" },
            ]),
        ]
    ],
    if: [
        [
            { text: "INPUT", type: "keyword.input" },
            { text: `x`, type: "name" },
            { text: "\n", type: "newline" },
            { text: "IF", type: "keyword.if" },
            { text: "x", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: "5", type: "number.decimal" },
            { text: "THEN", type: "keyword.then" },
            { text: "\n", type: "newline" },
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
            { text: "\n", type: "newline" },
            { text: "ENDIF", type: "keyword.if_end" },
        ],
        [
            new InputStatement([
                { text: "INPUT", type: "keyword.input" },
                { text: `x`, type: "name" },
            ]),
            {
                type: "if",
                controlStatements: [
                    new IfStatement([
                        { text: "IF", type: "keyword.if" },
                        {
                            operatorToken: { text: `<`, type: "operator.less_than" },
                            operator: operators.less_than,
                            nodes: [
                                { text: "x", type: "name" },
                                { text: "5", type: "number.decimal" },
                            ]
                        },
                        { text: "THEN", type: "keyword.then" },
                    ]),
                    new statements.byType["if.end"]([
                        { text: "ENDIF", type: "keyword.if_end" }
                    ])
                ],
                nodeGroups: [[
                        new OutputStatement([
                            { text: "OUTPUT", type: "keyword.output" },
                            { text: `"amogus"`, type: "string" },
                        ]),
                    ]],
            }
        ],
    ],
    nested_if: [
        [
            { text: "INPUT", type: "keyword.input" },
            { text: `x`, type: "name" },
            { text: "\n", type: "newline" },
            { text: "IF", type: "keyword.if" },
            { text: "x", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: "5", type: "number.decimal" },
            { text: "THEN", type: "keyword.then" },
            { text: "\n", type: "newline" },
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"X is less than 5"`, type: "string" },
            { text: "\n", type: "newline" },
            { text: "IF", type: "keyword.if" },
            { text: "x", type: "name" },
            { text: "<", type: "operator.less_than" },
            { text: "2", type: "number.decimal" },
            { text: "THEN", type: "keyword.then" },
            { text: "\n", type: "newline" },
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"X is also less than 2"`, type: "string" },
            { text: "\n", type: "newline" },
            { text: "ENDIF", type: "keyword.if_end" },
            { text: "\n", type: "newline" },
            { text: "ENDIF", type: "keyword.if_end" },
        ],
        [
            new InputStatement([
                { text: "INPUT", type: "keyword.input" },
                { text: `x`, type: "name" },
            ]),
            {
                type: "if",
                controlStatements: [
                    new IfStatement([
                        { text: "IF", type: "keyword.if" },
                        {
                            operatorToken: { text: `<`, type: "operator.less_than" },
                            operator: operators.less_than,
                            nodes: [
                                { text: "x", type: "name" },
                                { text: "5", type: "number.decimal" },
                            ]
                        },
                        { text: "THEN", type: "keyword.then" },
                    ]),
                    new statements.byType["if.end"]([
                        { text: "ENDIF", type: "keyword.if_end" }
                    ]),
                ],
                nodeGroups: [[
                        new OutputStatement([
                            { text: "OUTPUT", type: "keyword.output" },
                            { text: `"X is less than 5"`, type: "string" },
                        ]),
                        {
                            type: "if",
                            controlStatements: [
                                new IfStatement([
                                    { text: "IF", type: "keyword.if" },
                                    {
                                        operatorToken: { text: `<`, type: "operator.less_than" },
                                        operator: operators.less_than,
                                        nodes: [
                                            { text: "x", type: "name" },
                                            { text: "2", type: "number.decimal" },
                                        ]
                                    },
                                    { text: "THEN", type: "keyword.then" },
                                ]),
                                new statements.byType["if.end"]([
                                    { text: "ENDIF", type: "keyword.if_end" }
                                ])
                            ],
                            nodeGroups: [[
                                    new OutputStatement([
                                        { text: "OUTPUT", type: "keyword.output" },
                                        { text: `"X is also less than 2"`, type: "string" },
                                    ]),
                                ]],
                        }
                    ]],
            }
        ],
    ]
}).map(p => [p[0], p[1][0], p[1][1]]);
describe("parseFunctionArguments", () => {
    function process(input) {
        if (input instanceof Map)
            return Object.fromEntries([...input.entries()].map(([k, v]) => [k, [v.type, v.passMode]]));
        else
            return input;
    }
    it("should parse function arguments", () => {
        expect(process(parseFunctionArguments([]))).toEqual({});
        expect(process(parseFunctionArguments([
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
        ]))).toEqual({
            arg: ["INTEGER", jasmine.any(String)],
        });
        expect(process(parseFunctionArguments([
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
        ]))).toEqual({
            arg: ["INTEGER", jasmine.any(String)],
            arg2: ["BOOLEAN", jasmine.any(String)],
        });
        expect(process(parseFunctionArguments([
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg3" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "USERSUPPLIED" },
        ]))).toEqual({
            arg: ["INTEGER", jasmine.any(String)],
            arg2: ["BOOLEAN", jasmine.any(String)],
            arg3: ["USERSUPPLIED", jasmine.any(String)],
        });
    });
    it("should correctly determine byref and byval for function arguments", () => {
        expect(process(parseFunctionArguments([
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
        ]))).toEqual({
            arg: ["INTEGER", "value"],
        });
        expect(process(parseFunctionArguments([
            { type: "keyword.by-reference", text: "BYREF" },
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
        ]))).toEqual({
            arg: ["INTEGER", "reference"],
        });
        expect(process(parseFunctionArguments([
            { type: "keyword.by-value", text: "BYVAL" },
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
        ]))).toEqual({
            arg: ["INTEGER", "value"],
        });
        expect(process(parseFunctionArguments([
            { type: "keyword.by-reference", text: "BYREF" },
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
        ]))).toEqual({
            arg: ["INTEGER", "reference"],
            arg2: ["BOOLEAN", "reference"],
        });
        expect(process(parseFunctionArguments([
            { type: "keyword.by-value", text: "BYVAL" },
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
        ]))).toEqual({
            arg: ["INTEGER", "value"],
            arg2: ["BOOLEAN", "value"],
        });
        expect(process(parseFunctionArguments([
            { type: "keyword.by-value", text: "BYVAL" },
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "keyword.by-value", text: "BYVAL" },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
        ]))).toEqual({
            arg: ["INTEGER", "value"],
            arg2: ["BOOLEAN", "value"],
        });
        expect(process(parseFunctionArguments([
            { type: "keyword.by-reference", text: "BYREF" },
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "keyword.by-value", text: "BYVAL" },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
        ]))).toEqual({
            arg: ["INTEGER", "reference"],
            arg2: ["BOOLEAN", "value"],
        });
        expect(process(parseFunctionArguments([
            { type: "name", text: "arg" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
            { type: "punctuation.comma", text: "," },
            { type: "name", text: "arg3" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "USERSUPPLIED" },
        ]))).toEqual({
            arg: ["INTEGER", jasmine.any(String)],
            arg2: ["BOOLEAN", jasmine.any(String)],
            arg3: ["USERSUPPLIED", jasmine.any(String)],
        });
    });
    it("should throw on invalid function arguments", () => {
        expect(parseFunctionArguments([
            { type: "name", text: "arg2" },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "DATE" },
            { type: "name", text: "arg2" },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "CHAR" },
            { type: "punctuation.comma", text: "," },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "keyword.by-reference", text: "BYREF" },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "INTEGER" },
            { type: "punctuation.comma", text: "," },
            { type: "keyword.by-reference", text: "BYREF" },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "keyword.by-reference", text: "BYREF" },
            { type: "keyword.by-value", text: "BYVAL" },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "BOOLEAN" },
        ])).toEqual(jasmine.any(String));
        expect(parseFunctionArguments([
            { type: "keyword.case", text: "CASE" },
            { type: "name", text: "arg2" },
            { type: "punctuation.colon", text: ":" },
            { type: "name", text: "STRING" },
        ])).toEqual(jasmine.any(String));
    });
});
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
});
describe("parseStatement", () => {
    for (const [name, program, output] of sampleStatements) {
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
    for (const [name, program, output] of samplePrograms) {
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
