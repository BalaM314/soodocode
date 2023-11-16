import "jasmine";
import { parse, parseStatement } from "../src/parser.js";
const sampleStatements = Object.entries({
    output: [
        [
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
        ],
        {
            type: "output",
            tokens: [
                { text: "OUTPUT", type: "keyword.output" },
                { text: `"amogus"`, type: "string" },
            ]
        }
    ],
    input: [
        [
            { text: "INPUT", type: "keyword.input" },
            { text: `amogus`, type: "name" },
        ],
        {
            type: "input",
            tokens: [
                { text: "INPUT", type: "keyword.input" },
                { text: `amogus`, type: "name" },
            ]
        }
    ],
    declare: [
        [
            { text: "DECLARE", type: "keyword.declare" },
            { text: "amogus", type: "name" },
            { text: ":", type: "punctuation.colon" },
            { text: "NUMBER", type: "name" },
        ],
        {
            type: "declaration",
            tokens: [
                { text: "DECLARE", type: "keyword.declare" },
                { text: "amogus", type: "name" },
                { text: ":", type: "punctuation.colon" },
                { text: "NUMBER", type: "name" },
            ]
        }
    ],
    assign: [
        [
            { text: "amogus", type: "name" },
            { text: `<-`, type: "operator.assignment" },
            { text: "31415", type: "number.decimal" },
        ],
        {
            type: "assignment",
            tokens: [
                { text: "amogus", type: "name" },
                { text: `<-`, type: "operator.assignment" },
                { text: "31415", type: "number.decimal" },
            ]
        }
    ],
    if: [
        [
            { text: "IF", type: "keyword.if" },
            { text: "5", type: "number.decimal" },
            { text: `<`, type: "operator.less_than" },
            { text: "x", type: "name" },
            { text: "THEN", type: "keyword.then" },
        ],
        {
            type: "if",
            tokens: [
                { text: "IF", type: "keyword.if" },
                { text: "5", type: "number.decimal" },
                { text: `<`, type: "operator.less_than" },
                { text: "x", type: "name" },
                { text: "THEN", type: "keyword.then" },
            ]
        }
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
}).map(p => [p[0], p[1][0], p[1][1]]);
const samplePrograms = Object.entries({
    output: [
        [
            { text: "OUTPUT", type: "keyword.output" },
            { text: `"amogus"`, type: "string" },
            { text: "\n", type: "newline" },
        ],
        [{
                type: "output",
                tokens: [
                    { text: "OUTPUT", type: "keyword.output" },
                    { text: `"amogus"`, type: "string" },
                ]
            }]
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
            {
                type: "output",
                tokens: [
                    { text: "OUTPUT", type: "keyword.output" },
                    { text: `"amogus"`, type: "string" },
                ]
            }, {
                type: "input",
                tokens: [
                    { text: "INPUT", type: "keyword.input" },
                    { text: `amogus`, type: "name" },
                ]
            }, {
                type: "declaration",
                tokens: [
                    { text: "DECLARE", type: "keyword.declare" },
                    { text: "amogus", type: "name" },
                    { text: ":", type: "punctuation.colon" },
                    { text: "NUMBER", type: "name" },
                ]
            }, {
                type: "assignment",
                tokens: [
                    { text: "amogus", type: "name" },
                    { text: `<-`, type: "operator.assignment" },
                    { text: "31415", type: "number.decimal" },
                ]
            }
        ]
    ]
}).map(p => [p[0], p[1][0], p[1][1]]);
describe("parseStatement", () => {
    for (const [name, program, output] of sampleStatements) {
        if (output == "error") {
            it(`should parse ${name} into a statement`, () => {
                expect(() => parseStatement(program)).toThrow();
            });
        }
        else {
            it(`should not parse ${name} into a statement`, () => {
                expect(parseStatement(program)).toEqual(output);
            });
        }
    }
});
describe("parse", () => {
    for (const [name, program, output] of samplePrograms) {
        if (output == "error") {
            it(`should parse ${name} into a program`, () => {
                expect(() => parse(program)).toThrow();
            });
        }
        else {
            it(`should not parse ${name} into a program`, () => {
                expect(parse(program)).toEqual(output);
            });
        }
    }
});
