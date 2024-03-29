/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains all builtin functions defined in the insert.
*/
import { fail } from "./utils.js";
export const builtinFunctions = ((d) => Object.fromEntries(Object.entries(d).map(([name, data]) => [name, {
        args: new Map(data.args.map(a => [a[0], { passMode: "reference", type: a[1] }])),
        name,
        impl: data.impl,
        returnType: data.returnType
    }])))({
    //TODO commit fish-commands type shenanigans and obtain the type of impl's arguments from args
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
    LENGTH: {
        args: [
            ["ThisString", "STRING"],
        ],
        returnType: "INTEGER",
        impl(str) {
            return str.length;
        },
    },
    TO_UPPER: {
        args: [
            ["x", "STRING"],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toUpperCase();
        },
    },
    TO_LOWER: {
        args: [
            ["x", "STRING"],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toLowerCase();
        },
    },
    NUM_TO_STR: {
        args: [
            //TODO proper generics
            ["x", "REAL"],
        ],
        returnType: "STRING",
        impl(num) {
            return num.toString();
        },
    },
    STR_TO_NUM: {
        args: [
            //TODO proper generics
            ["x", "STRING"],
        ],
        returnType: "REAL",
        impl(str) {
            const out = Number(str);
            if (isNaN(out) || !Number.isSafeInteger(out))
                fail(`Cannot convert "${out}" to a number`);
            return out;
        },
    },
    IS_NUM: {
        args: [
            //TODO proper generics
            ["ThisString", "STRING"],
        ],
        returnType: "BOOLEAN",
        impl(str) {
            const out = Number(str);
            return !isNaN(out) && Number.isFinite(out);
        },
    },
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
    INT: {
        args: [
            ["x", "REAL"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return Math.trunc(x);
        },
    },
    RAND: {
        args: [
            ["x", "INTEGER"],
        ],
        returnType: "REAL",
        impl(x) {
            return Math.random() * x;
        },
    },
    DAY: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getDate();
        }
    },
    MONTH: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getMonth();
        }
    },
    YEAR: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getFullYear();
        }
    },
    DAYINDEX: {
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getDay() + 1;
        }
    },
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
    TODAY: {
        args: [],
        returnType: "DATE",
        impl() {
            return new Date();
        }
    },
    //TODO:files EOF()
});
