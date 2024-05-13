import { ArrayVariableType, PrimitiveVariableType } from "./runtime-types.js";
import { fail, f } from "./utils.js";
export const builtinFunctions = ((d) => Object.fromEntries(Object.entries(d).map(([name, data]) => [name, {
        args: new Map(data.args.map(([name, type]) => [name, {
                passMode: "reference",
                type: (Array.isArray(type) ? type : [type]).map(t => Array.isArray(t)
                    ? new ArrayVariableType(null, t[0] == "ANY" ? null : PrimitiveVariableType.get(t[0]))
                    : PrimitiveVariableType.get(t))
            }])),
        name,
        impl: data.impl,
        returnType: PrimitiveVariableType.get(data.returnType)
    }])))({
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
            ["ThisString", [["ANY"], "STRING"]],
        ],
        returnType: "INTEGER",
        impl(str) {
            return str.length;
        },
    },
    TO_UPPER: {
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toUpperCase();
        },
    },
    TO_LOWER: {
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toLowerCase();
        },
    },
    UCASE: {
        args: [
            ["x", "CHAR"],
        ],
        returnType: "CHAR",
        impl(str) {
            return str.toUpperCase();
        },
    },
    LCASE: {
        args: [
            ["x", "CHAR"],
        ],
        returnType: "CHAR",
        impl(str) {
            return str.toLowerCase();
        },
    },
    NUM_TO_STR: {
        args: [
            ["x", "REAL"],
        ],
        returnType: "STRING",
        impl(num) {
            return num.toString();
        },
    },
    STR_TO_NUM: {
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "REAL",
        impl(str) {
            const out = Number(str);
            if (isNaN(out) || !Number.isFinite(out))
                fail(f.quote `Cannot convert ${str} to a number`);
            return out;
        },
    },
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
    EOF: {
        args: [
            ["Filename", "STRING"]
        ],
        returnType: "BOOLEAN",
        impl(filename) {
            const file = this.getOpenFile(filename, ["READ"], `EOF function`);
            return file.lineNumber >= file.lines.length;
        }
    }
});
