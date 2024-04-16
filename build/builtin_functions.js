/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions defined in the insert.
*/
import { PrimitiveVariableType } from "./runtime.js";
import { fail, fquote } from "./utils.js";
export const builtinFunctions = ((d) => Object.fromEntries(Object.entries(d).map(([name, data]) => [name, {
        args: new Map(data.args.map(a => [a[0], { passMode: "reference", type: (Array.isArray(a[1]) ? a[1] : [a[1]]).map(t => PrimitiveVariableType.get(t)) }])),
        name,
        impl: data.impl,
        returnType: PrimitiveVariableType.get(data.returnType)
    }])))({
    //Source: s23 P22 insert
    LEFT: {
        args: [
            ["ThisString", "STRING"],
            ["x", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, num) {
            if (num < 0)
                fail(`Number ${num} is negative`);
            if (num > str.length)
                fail(`Number ${num} is greater than the length of the string (${str.length})`);
            return str.slice(0, num);
        },
    },
    //source: spec 5.5
    RIGHT: {
        args: [
            ["ThisString", "STRING"],
            ["x", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, num) {
            if (num < 0)
                fail(`Number ${num} is negative`);
            if (num > str.length)
                fail(`Number ${num} is greater than the length of the string (${str.length})`);
            return str.slice(-num);
        },
    },
    //source: spec 5.5
    MID: {
        args: [
            ["ThisString", "STRING"],
            ["x", "INTEGER"],
            ["y", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, start, length) {
            if (start < 1)
                fail(`Start index ${start} is less than 1`);
            if (length < 1)
                fail(`Slice length ${length} is less than 1`);
            if (length + start - 1 > str.length)
                fail(`End of slice (${length} + ${start}) is greater than the length of the string (${str.length})`);
            return str.slice(start - 1, start + length - 1);
        },
    },
    //source: spec 5.5
    LENGTH: {
        args: [
            ["ThisString", "STRING"],
        ],
        returnType: "INTEGER",
        impl(str) {
            return str.length;
        },
    },
    //Source: s23 P22 insert
    TO_UPPER: {
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toUpperCase();
        },
    },
    //Source: s23 P22 insert
    TO_LOWER: {
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toLowerCase();
        },
    },
    //source: spec 5.5
    UCASE: {
        args: [
            ["x", "CHAR"],
        ],
        returnType: "CHAR",
        impl(str) {
            return str.toUpperCase();
        },
    },
    //source: spec 5.5
    LCASE: {
        args: [
            ["x", "CHAR"],
        ],
        returnType: "CHAR",
        impl(str) {
            return str.toLowerCase();
        },
    },
    //Source: s23 P22 insert
    NUM_TO_STR: {
        args: [
            ["x", "REAL"], //real or integer, but ints coerce to reals
        ],
        returnType: "STRING",
        impl(num) {
            return num.toString();
        },
    },
    //Source: s23 P22 insert
    STR_TO_NUM: {
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "REAL",
        impl(str) {
            const out = Number(str);
            if (isNaN(out) || !Number.isFinite(out))
                fail(fquote `Cannot convert ${str} to a number`);
            return out;
        },
    },
    //Source: s23 P22 insert
    IS_NUM: {
        args: [
            ["ThisString", ["STRING", "CHAR"]],
        ],
        returnType: "BOOLEAN",
        impl(str) {
            const out = Number(str);
            return !isNaN(out) && Number.isFinite(out);
        },
    },
    //Source: s23 P22 insert
    ASC: {
        args: [
            ["ThisChar", "CHAR"],
        ],
        returnType: "INTEGER",
        impl(str) {
            return str.charCodeAt(0);
        },
    },
    CHR: {
        args: [
            ["x", "INTEGER"],
        ],
        returnType: "CHAR",
        impl(x) {
            return String.fromCharCode(x);
        },
    },
    //source: spec 5.6
    INT: {
        args: [
            ["x", "REAL"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return Math.trunc(x);
        },
    },
    //source: spec 5.6
    RAND: {
        args: [
            ["x", "INTEGER"],
        ],
        returnType: "REAL",
        impl(x) {
            return Math.random() * x;
        },
    },
    //Source: s23 P22 insert
    DAY: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getDate();
        }
    },
    //Source: s23 P22 insert
    MONTH: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getMonth();
        }
    },
    //Source: s23 P22 insert
    YEAR: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getFullYear();
        }
    },
    //Source: s23 P22 insert
    DAYINDEX: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getDay() + 1;
        }
    },
    //Source: s23 P22 insert
    SETDATE: {
        args: [
            ["Day", "INTEGER"],
            ["Month", "INTEGER"],
            ["Year", "INTEGER"],
        ],
        returnType: "DATE",
        impl(d, m, y) {
            return new Date(y, m, d);
        }
    },
    //Source: s23 P22 insert
    TODAY: {
        args: [],
        returnType: "DATE",
        impl() {
            return new Date();
        }
    },
    //TODO:files EOF()
});