export const builtinFunctions = ((d) => Object.fromEntries(Object.entries(d).map(([name, data]) => [name, {
        args: new Map(data.args.map(a => [a[0], { passMode: "reference", type: a[1] }])),
        name,
        impl: data.impl,
        returnType: data.returnType
    }])))({
    LEFT: {
        args: [
            ["ThisString", "STRING"],
            ["x", "INTEGER"],
        ],
        returnType: "STRING",
        impl(str, x) {
            return "";
        },
    }
});
