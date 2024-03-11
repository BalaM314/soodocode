/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains unit tests for the lexer.
*/
import "jasmine";
import { symbolize, tokenize } from "../src/lexer.js";
import { symbol, token } from "../src/lexer-types.js";
import { SoodocodeError } from "../src/utils.js";
const symbolTests = Object.entries({
    number_single1: [
        "5",
        [
            ["numeric_fragment", "5"]
        ]
    ],
    number_single2: [
        "12345",
        [
            ["numeric_fragment", "12345"]
        ]
    ],
    number_multi1: [
        "12345 54321",
        [
            ["numeric_fragment", "12345"],
            ["space", " "],
            ["numeric_fragment", "54321"]
        ]
    ],
    number_decimal1: [
        "12345.54321",
        [
            ["numeric_fragment", "12345"],
            ["punctuation.period", "."],
            ["numeric_fragment", "54321"]
        ]
    ],
    number_decimal_half1: [
        "12345.",
        [
            ["numeric_fragment", "12345"],
            ["punctuation.period", "."],
        ]
    ],
    number_decimal1_half2: [
        ".54321",
        [
            ["punctuation.period", "."],
            ["numeric_fragment", "54321"],
        ]
    ],
    word1: [
        "a",
        [
            ["word", "a"]
        ]
    ],
    word2: [
        "amogus",
        [
            ["word", "amogus"]
        ]
    ],
    word3: [
        "amogus sussy imposter",
        [
            ["word", "amogus"],
            ["space", " "],
            ["word", "sussy"],
            ["space", " "],
            ["word", "imposter"]
        ]
    ],
    symbols1: [
        "X <- 5",
        [
            ["word", "X"],
            ["space", " "],
            ["operator.assignment", "<-"],
            ["space", " "],
            ["numeric_fragment", "5"]
        ]
    ],
    symbols2: [
        "WHILE Index < 501 AND NOT PastLast",
        [
            ["word", "WHILE"],
            ["space", " "],
            ["word", "Index"],
            ["space", " "],
            ["operator.less_than", "<"],
            ["space", " "],
            ["numeric_fragment", "501"],
            ["space", " "],
            ["operator.and", "AND"],
            ["space", " "],
            ["operator.not", "NOT"],
            ["space", " "],
            ["word", "PastLast"],
        ]
    ],
    invalidChars: [
        `OUTPUT "!@#$%^&*()_+", amogus, 😀βγδ😀`,
        [
            ["word", "OUTPUT"],
            ["space", " "],
            ["quote.double", `"`],
            ["unknown", "!"],
            ["unknown", "@"],
            ["unknown", "#"],
            ["unknown", "$"],
            ["unknown", "%"],
            ["operator.pointer", "^"],
            ["operator.string_concatenate", "&"],
            ["operator.multiply", "*"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
            ["word", "_"],
            ["operator.add", "+"],
            ["quote.double", `"`],
            ["punctuation.comma", ","],
            ["space", " "],
            ["word", "amogus"],
            ["punctuation.comma", ","],
            ["space", " "],
            ["unknown", "😀"],
            ["unknown", "β"],
            ["unknown", "γ"],
            ["unknown", "δ"],
            ["unknown", "😀"],
        ]
    ],
}).map(([name, [input, output]]) => [name, input, output == "error" ? output : output.map(symbol)]);
const tokenizerTests = Object.entries({
    simple: [
        [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ], [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["number.decimal", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ]
    ],
    removeWhitespace: [
        [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["space", " "],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["space", " "],
            ["space", " "],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ], [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.and", "AND"],
            ["number.decimal", "501"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ]
    ],
    removeSingleLineComments: [
        [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["comment.singleline", "//"],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["newline", "\n"],
            ["parentheses.close", ")"],
        ], [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["number.decimal", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["newline", "\n"],
            ["parentheses.close", ")"],
        ]
    ],
    removeMultilineComments: [
        [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["comment.multiline_open", "/*"],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["comment.multiline_close", "*/"],
            ["parentheses.close", ")"],
        ], [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["number.decimal", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["parentheses.close", ")"],
        ]
    ],
    strings: [
        [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["numeric_fragment", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["quote.single", "'"],
            ["parentheses.open", "("],
            ["quote.single", "'"],
            ["operator.not_equal_to", "<>"],
            ["quote.double", `\"`],
            ["operator.and", "AND"],
            ["space", " "],
            ["numeric_fragment", "501"],
            ["quote.double", `\"`],
            ["parentheses.close", ")"],
        ], [
            ["punctuation.semicolon", ";"],
            ["newline", "\n"],
            ["operator.less_than", "<"],
            ["operator.and", "AND"],
            ["number.decimal", "501"],
            ["bracket.close", "]"],
            ["parentheses.open", "("],
            ["char", "'('"],
            ["operator.not_equal_to", "<>"],
            ["string", `"AND 501"`],
            ["parentheses.close", ")"],
        ]
    ],
    numbers1: [
        [
            ["numeric_fragment", "12345"],
            ["punctuation.period", "."],
            ["numeric_fragment", "54321"],
        ], [
            ["number.decimal", "12345.54321"]
        ]
    ],
    numbers2: [
        [
            ["numeric_fragment", "12345"],
        ], [
            ["number.decimal", "12345"]
        ]
    ],
    numbers3: [
        [
            ["numeric_fragment", "12345"],
            ["punctuation.period", "."],
        ],
        "error"
    ],
    numbers4: [
        [
            ["numeric_fragment", "12345"],
            ["numeric_fragment", "12345"],
            ["punctuation.period", "."],
        ],
        "error"
    ],
    numbers5: [
        [
            ["punctuation.period", "."],
            ["numeric_fragment", "12345"],
            ["numeric_fragment", "12345"],
        ],
        "error"
    ],
    keywords: [
        [
            ["word", "WHILE"],
            ["space", " "],
            ["word", "Index"],
            ["space", " "],
            ["operator.less_than", "<"],
            ["space", " "],
            ["numeric_fragment", "501"],
            ["space", " "],
            ["operator.and", "AND"],
            ["space", " "],
            ["quote.double", `"`],
            ["word", "sussy"],
            ["space", " "],
            ["word", "PROCEDURE"],
            ["quote.double", `"`],
        ], [
            ["keyword.while", "WHILE"],
            ["name", "Index"],
            ["operator.less_than", "<"],
            ["number.decimal", "501"],
            ["operator.and", "AND"],
            ["string", `"sussy PROCEDURE"`],
        ]
    ]
}).map(([name, [input, output]]) => [name, { program: null /* SPECNULL */, symbols: input.map(symbol) }, output == "error" ? "error" : output.map(token)]);
describe("symbolizer", () => {
    for (const [name, input, output] of symbolTests) {
        if (output == "error") {
            it(`should not parse ${name} into symbols`, () => {
                expect(() => symbolize(input)).toThrowMatching(e => e instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} into symbols`, () => {
                const { program, symbols } = symbolize(input);
                expect(symbols.map(s => s.clearRange())).toEqual(output);
                expect(program).toBe(input);
            });
        }
    }
});
describe("tokenizer", () => {
    for (const [name, input, output] of tokenizerTests) {
        if (output == "error") {
            it(`should not parse ${name} into tokens`, () => {
                expect(() => tokenize(input)).toThrowMatching(e => e instanceof SoodocodeError);
            });
        }
        else {
            it(`should parse ${name} into symbols`, () => {
                const { program, tokens } = tokenize(input);
                expect(tokens.map(t => t.clearRange())).toEqual(output);
            });
        }
    }
});
