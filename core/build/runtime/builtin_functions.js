import { ArrayVariableType, PrimitiveVariableType } from "../runtime/runtime-types.js";
import { f, fail } from "../utils/funcs.js";
function fn(data) {
    return data;
}
let builtinFunctionsCache;
export const getBuiltinFunctions = () => builtinFunctionsCache ?? (builtinFunctionsCache = ((d) => {
    const obj = Object.fromEntries(Object.entries(d).map(([name, data]) => [name, {
            args: new Map(data.args.map(([name, type]) => [name, {
                    passMode: "reference",
                    type: (Array.isArray(type) ? type : [type]).map(t => Array.isArray(t)
                        ? new ArrayVariableType(null, null, t[0] == "ANY" ? null : PrimitiveVariableType.get(t[0]), [-1, -1])
                        : PrimitiveVariableType.get(t)),
                }])),
            aliases: data.aliases ?? [],
            name,
            impl: data.impl,
            returnType: PrimitiveVariableType.get(data.returnType)
        }]));
    Object.values(obj).filter(v => v.aliases && v.aliases.length > 0).forEach(v => {
        v.aliases.forEach(alias => obj[alias] = v);
    });
    return obj;
})(preprocessedBuiltinFunctions));
export const preprocessedBuiltinFunctions = ({
    LEFT: fn({
        args: [
            ["ThisString", "STRING"],
            ["x", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, num) {
            const chars = [...str];
            if (num < 0)
                fail(`Number ${num} is negative`, num);
            if (num > chars.length)
                fail(`Number ${num} is greater than the length of the string (${chars.length})`, num);
            return chars.slice(0, num).join("");
        },
    }),
    RIGHT: fn({
        args: [
            ["ThisString", "STRING"],
            ["x", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, num) {
            const chars = [...str];
            if (num < 0)
                fail(`Number ${num} is negative`, num);
            if (num > chars.length)
                fail(`Number ${num} is greater than the length of the string (${chars.length})`, num);
            return chars.slice(-num).join("");
        },
    }),
    MID: fn({
        args: [
            ["ThisString", "STRING"],
            ["StartIndex", "INTEGER"],
            ["Length", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, start, length) {
            const chars = [...str];
            if (start < 1)
                fail(`Start index ${start} is less than 1`, start);
            if (length < 1)
                fail(`Slice length ${length} is less than 1`, length);
            if (length + start - 1 > chars.length)
                fail(`End of slice (${length} + ${start}) is greater than the length of the string (${chars.length})`, str);
            return chars.slice(start - 1, start + length - 1).join("");
        },
        aliases: ["SUBSTRING"]
    }),
    LENGTH: fn({
        args: [
            ["ThisString", [["ANY"], "STRING"]],
        ],
        returnType: "INTEGER",
        impl(x) {
            if (Array.isArray(x))
                return x.length;
            else
                return [...x].length;
        },
    }),
    TO_UPPER: fn({
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toUpperCase();
        },
    }),
    TO_LOWER: fn({
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "STRING",
        impl(str) {
            return str.toLowerCase();
        },
    }),
    UCASE: fn({
        args: [
            ["x", "CHAR"],
        ],
        returnType: "CHAR",
        impl(str) {
            return str.toUpperCase();
        },
    }),
    LCASE: fn({
        args: [
            ["x", "CHAR"],
        ],
        returnType: "CHAR",
        impl(str) {
            return str.toLowerCase();
        },
    }),
    NUM_TO_STR: fn({
        args: [
            ["x", "REAL"],
        ],
        returnType: "STRING",
        impl(num) {
            return num.toString();
        },
    }),
    STR_TO_NUM: fn({
        args: [
            ["x", ["STRING", "CHAR"]],
        ],
        returnType: "REAL",
        impl(str) {
            const out = Number(str.valueOf());
            if (isNaN(out) || !Number.isFinite(out))
                fail(f.quote `Cannot convert ${str} to a number`, str);
            return out;
        },
    }),
    IS_NUM: fn({
        args: [
            ["ThisString", ["STRING", "CHAR"]],
        ],
        returnType: "BOOLEAN",
        impl(str) {
            const out = Number(str.valueOf());
            return !isNaN(out) && Number.isFinite(out);
        },
    }),
    ASC: fn({
        args: [
            ["ThisChar", "CHAR"],
        ],
        returnType: "INTEGER",
        impl(str) {
            return str.codePointAt(0);
        },
    }),
    CHR: fn({
        args: [
            ["x", "INTEGER"],
        ],
        returnType: "CHAR",
        impl(x) {
            return String.fromCodePoint(x);
        },
    }),
    INT: fn({
        args: [
            ["x", "REAL"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return Math.trunc(x);
        },
    }),
    RAND: fn({
        args: [
            ["x", "INTEGER"],
        ],
        returnType: "REAL",
        impl(x) {
            return Math.random() * x;
        },
    }),
    DAY: fn({
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getDate();
        }
    }),
    MONTH: fn({
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getMonth();
        }
    }),
    YEAR: fn({
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getFullYear();
        }
    }),
    DAYINDEX: fn({
        args: [
            ["ThisDate", "DATE"],
        ],
        returnType: "INTEGER",
        impl(x) {
            return x.getDay() + 1;
        }
    }),
    SETDATE: fn({
        args: [
            ["Day", "INTEGER"],
            ["Month", "INTEGER"],
            ["Year", "INTEGER"],
        ],
        returnType: "DATE",
        impl(d, m, y) {
            return new Date(y, m - 1, d);
        }
    }),
    TODAY: fn({
        args: [],
        returnType: "DATE",
        impl() {
            return new Date();
        },
        aliases: ["NOW"]
    }),
    EOF: fn({
        args: [
            ["Filename", "STRING"]
        ],
        returnType: "BOOLEAN",
        impl(filename) {
            const file = this.getOpenFile(filename, ["READ"], `EOF function`);
            return file.lineNumber >= file.lines.length;
        }
    }),
    ROUND: fn({
        args: [
            ["Value", "REAL"],
            ["Places", "INTEGER"]
        ],
        returnType: "REAL",
        impl(value, places) {
            const mult = 10 ** places;
            return Math.round(value * mult) / mult;
        },
    }),
    POW: fn({
        args: [
            ["Value", "REAL"],
            ["Exponent", "INTEGER"],
        ],
        returnType: "REAL",
        impl(value, exponent) {
            return value ** exponent;
        }
    }),
    EXP: fn({
        args: [
            ["Num", "REAL"]
        ],
        returnType: "REAL",
        impl(value) {
            return Math.exp(value);
        }
    }),
    TIME: fn({
        args: [
            ["Timezone", "INTEGER"]
        ],
        returnType: "INTEGER",
        impl(timezone) {
            return Date.now() + timezone * 36000;
        }
    }),
    DOWNLOADIMAGE: fn({
        args: [
            ["Bytes", [["INTEGER"]]],
            ["Width", "INTEGER"],
            ["Height", "INTEGER"],
            ["Filename", "STRING"],
        ],
        returnType: "STRING",
        impl(bytes, width, height, filename) {
            if (bytes.length != width * height * 4)
                fail(`Incorrect array length: expected width * height * 4 (${width * height * 4}), got ${bytes.length}\nhelp: bytes should contain the image data in RGBA format, 4 bytes for each pixel`, bytes);
            if (typeof ImageData == "undefined" || typeof createImageBitmap == "undefined" || typeof document == "undefined") {
                fail(`DOWNLOADIMAGE is only supported when running in a browser.`, bytes);
            }
            else {
                const data = new ImageData(new Uint8ClampedArray(bytes), width, height);
                createImageBitmap(data).then(bitmap => {
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext("bitmaprenderer").transferFromImageBitmap(bitmap);
                    const el = document.createElement("a");
                    el.setAttribute("href", canvas.toDataURL());
                    el.setAttribute("download", filename);
                    el.style.display = "none";
                    document.body.appendChild(el);
                    el.click();
                    document.body.removeChild(el);
                });
                return `Downloading...`;
            }
        }
    }),
});
