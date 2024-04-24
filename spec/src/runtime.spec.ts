import "jasmine";
import { Token, token } from "../../build/lexer-types.js";
import { ExpressionAST, ProgramAST, ProgramASTLeafNode } from "../../build/parser-types.js";
import { ArrayVariableType, ClassMethodData, ClassVariableType, EnumeratedVariableType, FunctionData, PointerVariableType, PrimitiveVariableType, PrimitiveVariableTypeName, RecordVariableType, SetVariableType, VariableData, VariableType, VariableValue } from "../../build/runtime-types.js";
import { Runtime } from "../../build/runtime.js";
import { AssignmentStatement, CallStatement, CaseBranchStatement, ClassProcedureEndStatement, ClassProcedureStatement, ClassPropertyStatement, ClassStatement, CloseFileStatement, DeclareStatement, DefineStatement, ForEndStatement, ForStatement, ForStepStatement, FunctionStatement, OpenFileStatement, OutputStatement, ProcedureStatement, ReadFileStatement, ReturnStatement, StatementExecutionResult, SwitchStatement, TypeEnumStatement, TypePointerStatement, TypeSetStatement, WhileStatement, WriteFileStatement, statements } from "../../build/statements.js";
import { SoodocodeError, fail } from "../../build/utils.js";
import { _ExpressionAST, _ProgramAST, _ProgramASTLeafNode, _Token, _VariableType, process_ExpressionAST, process_ProgramAST, process_ProgramASTNode, process_Statement, process_VariableType } from "./spec_utils.js";

const tokenTests = ((data:Record<string,
	[token:_Token, type:_VariableType | null, output:[type:_VariableType, value:VariableValue] | ["error"], setup?:(r:Runtime) => unknown]
>) => Object.entries(data).map<[
		name:string,
		token:Token,
		type:VariableType | null,
		output:[type:VariableType, value:VariableValue] | ["error"],
		setup:(r:Runtime) => unknown
	]>(([k, v]) => [
		k,
		token(v[0]),
		process_VariableType(v[1]),
		v[2].length == 1 ? v[2] : [process_VariableType(v[2][0]), v[2][1]],
		v[3] ?? (() => {})
	])
)({
	boolean_true: [
		["boolean.true", "true"],
		"BOOLEAN",
		["BOOLEAN", true]
	],
	boolean_false: [
		["boolean.false", "false"],
		"BOOLEAN",
		["BOOLEAN", false]
	],
	number_int: [
		["number.decimal", "5"],
		"INTEGER",
		["INTEGER", 5]
	],
	number_int2: [
		["number.decimal", "1398403"],
		"INTEGER",
		["INTEGER", 1398403]
	],
	number_real: [
		["number.decimal", "5"],
		"REAL",
		["REAL", 5]
	],
	number_real2: [
		["number.decimal", "1398403"],
		"REAL",
		["REAL", 1398403]
	],
	number_decimal: [
		["number.decimal", "5.2"],
		null,
		["REAL", 5.2]
	],
	number_decimal_int: [
		["number.decimal", "5.2"],
		"INTEGER",
		["error"]
	],
	number_negative: [
		["number.decimal", "-5"],
		"INTEGER",
		["INTEGER", -5]
	],
	number_negative_decimal: [
		["number.decimal", "-5.2"],
		null,
		["REAL", -5.2]
	],
	number_too_large: [
		["number.decimal", "9".repeat(45)],
		"INTEGER",
		["error"]
	],
	number_real_too_large: [
		["number.decimal", "9".repeat(309)],
		"REAL",
		["error"]
	],
	number_negative_too_large: [
		["number.decimal", "-" + "9".repeat(45)],
		"INTEGER",
		["error"]
	],
	variable_number: [
		["name", "x"],
		"INTEGER",
		["INTEGER", 5],
		r => r.getCurrentScope().variables["x"] = {
			mutable: true,
			declaration: null!,
			type: PrimitiveVariableType.INTEGER,
			value: 5
		}
	],
	enum_valid: (() => {
		const type = new EnumeratedVariableType(
			"amogusType",
			["amoma", "sugoma", "amoma", "sugus"]
		);
		return [
			["name", "amoma"],
			type,
			[type, "amoma"],
			r => r.getCurrentScope().types["amogusType"] = type
		];
	})(),
	enum_invalid_different: (() => {
		const type1 = new EnumeratedVariableType(
			"amogusType",
			["amoma", "sugoma", "amoma", "sugus"]
		);
		const type2 = new EnumeratedVariableType(
			"dayOfWeek",
			["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]
		);
		return [
			["name", "amoma"],
			type2,
			["error"],
			r => r.getCurrentScope().types["amogusType"] = type1
		];
	})(),
	enum_invalid_nonexistent: (() => {
		const type = new EnumeratedVariableType(
			"amogusType",
			["amoma", "sugoma", "amoma", "sugus"]
		);
		return [
			["name", "sussybaka"],
			null,
			["error"],
			r => r.getCurrentScope().types["amogusType"] = type
		];
	})(),
});

const expressionTests = ((data:Record<string, [
	expression:_ExpressionAST, type:_VariableType | null,
	output:[type:_VariableType, value:VariableValue] | ["error"],
	setup?:(r:Runtime) => unknown
]>) =>
	Object.entries(data).map<[
	name:string, expression:ExpressionAST, type:VariableType | null,
	output:[type:VariableType, value:VariableValue] | ["error"],
	setup:(r:Runtime) => unknown
]>(([k, v]) => [
	k,
	process_ExpressionAST(v[0]),
	process_VariableType(v[1]),
	v[2].length == 1 ? v[2] : [process_VariableType(v[2][0]), v[2][1]],
	v[3] ?? (() => {})
]))({
	addNumbers: [
		["tree", "add", [
			["number.decimal", "5"],
			["number.decimal", "6"]
		]],
		"INTEGER",
		["INTEGER", 11]
	],
	arrayAccess_simple: [
		["tree", ["array access", ["name", "amogus"]], [
			["number.decimal", "5"],
		]],
		"INTEGER",
		["INTEGER", 18],
		r => {
			r.getCurrentScope().variables["amogus"] = {
				type: new ArrayVariableType([
					[1, 10]
				], PrimitiveVariableType.INTEGER),
				declaration: null!,
				mutable: true,
				value: [0, 0, 0, 0, 18, 0, 0, 0, 0, 0]
			}
		}
	],
	propertyAccess_simple: [
		["tree", "access", [
			["name", "amogus"],
			["name", "sus"],
		]],
		"INTEGER",
		["INTEGER", 18],
		r => {
			const amogusType = new RecordVariableType("amogusType", {
				sus: PrimitiveVariableType.INTEGER
			});
			r.getCurrentScope().types["amogusType"] = amogusType;
			r.getCurrentScope().variables["amogus"] = {
				type: amogusType,
				declaration: null!,
				mutable: true,
				value: {
					sus: 18
				}
			}
		}
	],
	propertyAccess_nested: [
		["tree", "access", [
			["tree", "access", [
				["name", "aaa"],
				["name", "bbb"],
			]],
			["name", "ccc"],
		]],
		"INTEGER",
		["INTEGER", 123],
		r => {
			const innerType = new RecordVariableType("innerType", {
				ccc: PrimitiveVariableType.INTEGER
			});
			const outerType = new RecordVariableType("outerType", {
				bbb: innerType
			});
			r.getCurrentScope().types["innerType"] = innerType;
			r.getCurrentScope().types["outerType"] = outerType;
			r.getCurrentScope().variables["aaa"] = {
				type: outerType,
				declaration: null!,
				mutable: true,
				value: {
					bbb: {
						ccc: 123
					}
				}
			}
		}
	],
	propertyAccess_nested_array: [
		["tree", "access", [
			["tree", ["array access", ["name", "aaa"]], [
				["number.decimal", "2"],
			]],
			["name", "ccc"],
		]],
		"INTEGER",
		["INTEGER", 124],
		r => {
			const innerType = new RecordVariableType("innerType", {
				ccc: PrimitiveVariableType.INTEGER
			});
			r.getCurrentScope().types["innerType"] = innerType;
			r.getCurrentScope().variables["aaa"] = {
				type: new ArrayVariableType([[1, 5]], ["unresolved", "innerType"]),
				declaration: null!,
				mutable: true,
				value: [null, {
					ccc: 124
				}, null, null, null]
			}
		}
	],
	propertyAccess_invalid_not_record: [
		["tree", "access", [
			["name", "aaa"],
			["name", "bbb"],
		]],
		"INTEGER",
		["error"],
		r => {
			r.getCurrentScope().variables["aaa"] = {
				type: PrimitiveVariableType.DATE,
				declaration: null!,
				mutable: true,
				value: Date.now()
			}
		}
	],
	propertyAccess_invalid_nonexistent_property: [
		["tree", "access", [
			["name", "amogus"],
			["name", "sussy"],
		]],
		"INTEGER",
		["error"],
		r => {
			const amogusType = new RecordVariableType("amogusType", {
				sus: PrimitiveVariableType.INTEGER
			});
			r.getCurrentScope().types["amogusType"] = amogusType;
			r.getCurrentScope().variables["amogus"] = {
				type: amogusType,
				declaration: null!,
				mutable: true,
				value: {
					sus: 18
				}
			}
		}
	],
	pointerRef1: (() => {
		const intPointer = new PointerVariableType("intPtr", PrimitiveVariableType.INTEGER);
		const intVar:VariableData<PrimitiveVariableType<"INTEGER">> = {
			type: PrimitiveVariableType.INTEGER,
			declaration: null!,
			mutable: true,
			value: 19
		};
		return [
			["tree", "pointer_reference", [
				["name", "amogus"],
			]],
			intPointer,
			[intPointer, intVar],
			r => {
				r.getCurrentScope().types["intPtr"] = intPointer;
				r.getCurrentScope().variables["amogus"] = intVar;
			}
		]
	})(),
	pointerRef_array_udt: (() => {
		const arrayPointer = new PointerVariableType("intPtr", new ArrayVariableType([
			[1, 10]
		], ["unresolved", "foo"]));
		const foo = new EnumeratedVariableType("foo", ["a", "b", "c"]);
		const arrayVar:VariableData<ArrayVariableType> = {
			type: new ArrayVariableType([
				[1, 10]
			], ["unresolved", "foo"]),
			declaration: null!,
			mutable: true,
			value: Array(10).fill(null)
		};
		return [
			["tree", "pointer_reference", [
				["name", "amogus"],
			]],
			null,
			[arrayPointer, arrayVar],
			r => {
				r.getCurrentScope().types["foo"] = foo;
				r.getCurrentScope().types["arrayPointer"] = arrayPointer;
				r.getCurrentScope().variables["amogus"] = arrayVar;
			}
		]
	})(),
	pointerRef_array_udt_invalid: (() => {
		const arrayPointer = new PointerVariableType("intPtr", new ArrayVariableType([
			[1, 10]
		], ["unresolved", "foo"]));
		const foo = new EnumeratedVariableType("foo", ["a", "b", "c"]);
		const arrayVar:VariableData<ArrayVariableType> = {
			type: new ArrayVariableType([
				[1, 10]
			], ["unresolved", "foo"]),
			declaration: null!,
			mutable: true,
			value: Array(10).fill(null)
		};
		return [
			["tree", "pointer_reference", [
				["name", "amogus"],
			]],
			null,
			["error"],
			r => {
				r.getCurrentScope().types["foo"] = foo;
				//r.getCurrentScope().types["arrayPointer"] = arrayPointer;
				r.getCurrentScope().variables["amogus"] = arrayVar;
			}
		]
	})(),
	// pointerRef_invalid_bad_target: (() => {
	// 	const intPointer = new PointerVariableType("intPtr", "INTEGER");
	// 	const intVar:VariableData<"INTEGER"> = {
	// 		type: "INTEGER",
	// 		declaration: null!,
	// 		mutable: true,
	// 		value: 19
	// 	};
	// 	return [
	// 		["tree", "pointer_reference", [
	// 			["number.decimal", "5"],
	// 		]],
	// 		intPointer,
	// 		["error"],
	// 		r => {
	// 			r.getCurrentScope().types["intPtr"] = intPointer;
	// 			r.getCurrentScope().variables["amogus"] = intVar;
	// 		}
	// 	]
	// })(),
	pointerRef_invalid_undeclared_variable: (() => {
		const intPointer = new PointerVariableType("intPtr", PrimitiveVariableType.INTEGER);
		const intVar:VariableData<PrimitiveVariableType<"INTEGER">> = {
			type: PrimitiveVariableType.INTEGER,
			declaration: null!,
			mutable: true,
			value: 19
		};
		return [
			["tree", "pointer_reference", [
				["name", "sussybaka"],
			]],
			intPointer,
			["error"],
			r => {
				r.getCurrentScope().types["intPtr"] = intPointer;
				r.getCurrentScope().variables["amogus"] = intVar;
			}
		]
	})(),
	pointerDeref1: (() => {
		return [
			["tree", "pointer_dereference", [
				["name", "amogusPtr"],
			]],
			"INTEGER",
			["INTEGER", 20],
			r => {
				const intPointer = new PointerVariableType("intPtr", PrimitiveVariableType.INTEGER);
				const amogusVar:VariableData<PrimitiveVariableType<"INTEGER">> = {
					type: PrimitiveVariableType.INTEGER,
					declaration: null!,
					mutable: true,
					value: 20
				};
				r.getCurrentScope().types["intPtr"] = intPointer;
				r.getCurrentScope().variables["amogus"] = amogusVar;
				r.getCurrentScope().variables["amogusPtr"] = {
					declaration: null!,
					mutable: true,
					type: intPointer,
					value: amogusVar
				};
			}
		]
	})(),
	functionCall_simple: [
		["tree", ["function call", ["name", "amogus"]], [
		]],
		"INTEGER",
		["INTEGER", 22],
		r => {
			r.functions["amogus"] = process_ProgramASTNode({
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						["keyword.function", "FUNCTION"],
						["name", "amogus"],
						["parentheses.open", "("],
						["parentheses.close", ")"],
						["keyword.returns", "RETURNS"],
						["name", "INTEGER"],
					]],
					[statements.byType["function.end"], [
						["keyword.function", "FUNCTION"],
					]],
				],
				nodeGroups: [[
					[ReturnStatement, [
						["keyword.return", "RETURN"],
						["number.decimal", "22"],
					]],
				]]
			}) as FunctionData;
		}
	],
	functionCall_args: [
		["tree", ["function call", ["name", "amogus"]], [
			["tree", "add", [
				["number.decimal", "5"],
				["number.decimal", "6"]
			]]
		]],
		"REAL",
		["REAL", 16],
		r => {
			r.functions["amogus"] = process_ProgramASTNode({
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						["keyword.function", "FUNCTION"],
						["name", "amogus"],
						["parentheses.open", "("],
						["name", "arg"],
						["punctuation.colon", ":"],
						["name", "INTEGER"],
						["parentheses.close", ")"],
						["keyword.returns", "RETURNS"],
						["name", "INTEGER"],
					]],
					[statements.byType["function.end"], [
						["keyword.function", "FUNCTION"],
					]],
				],
				nodeGroups: [[
					[ReturnStatement, [
						["keyword.return", "RETURN"],
						["tree", "add", [
							["number.decimal", "5"],
							["name", "arg"]
						]],
					]],
				]]
			}) as FunctionData;
		}
	],
	functionCall_invalid_wrong_type: [
		["tree", ["function call", ["name", "amogus"]], [
		]],
		"DATE",
		["error"],
		r => {
			r.functions["amogus"] = process_ProgramASTNode({
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						["keyword.function", "FUNCTION"],
						["name", "amogus"],
						["parentheses.open", "("],
						["parentheses.close", ")"],
						["keyword.returns", "RETURNS"],
						["name", "INTEGER"],
					]],
					[statements.byType["function.end"], [
						["keyword.function", "FUNCTION"],
					]],
				],
				nodeGroups: [[
					[ReturnStatement, [
						["keyword.return", "RETURN"],
						["number.decimal", "22"],
					]],
				]]
			}) as FunctionData;
		}
	],
	class_instantiation_1: (() => {
		const amogusClass = new ClassVariableType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: {
				varType: PrimitiveVariableType.REAL
			} as ClassPropertyStatement
		}, {
			NEW: process_ProgramASTNode({
				type: "class_procedure",
				controlStatements: [
					[ClassProcedureStatement, [
						["keyword.class_modifier.public", "PUBLIC"],
						["keyword.procedure", "PROCEDURE"],
						["name", "NEW"],
						["parentheses.open", "("],
						["parentheses.close", ")"],
					]],
					[ClassProcedureEndStatement, [
						["keyword.procedure_end", "ENDPROCEDURE"]
					]]
				],
				nodeGroups: [[
				]],
			}) as ClassMethodData
		});
		return [
			["tree", ["class instantiation", "Amogus"], [
			]],
			null,
			[amogusClass, {
				properties: {
					prop: null
				}
			}],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
			}
		]
	})(),
	class_instantiation_2: (() => {
		const amogusClass = new ClassVariableType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: {
				varType: PrimitiveVariableType.REAL
			} as ClassPropertyStatement
		}, {
			NEW: process_ProgramASTNode({
				type: "class_procedure",
				controlStatements: [
					[ClassProcedureStatement, [
						["keyword.class_modifier.public", "PUBLIC"],
						["keyword.procedure", "PROCEDURE"],
						["name", "NEW"],
						["parentheses.open", "("],
						["name", "arg"],
						["punctuation.colon", ":"],
						["name", "INTEGER"],
						["parentheses.close", ")"],
					]],
					[ClassProcedureEndStatement, [
						["keyword.procedure_end", "ENDPROCEDURE"]
					]]
				],
				nodeGroups: [[
					[AssignmentStatement, [
						["name", "prop"],
						["operator.assignment", "<-"],
						["tree", "add", [
							["name", "arg"],
							["number.decimal", "22"]
						]]
					]]
				]],
			}) as ClassMethodData
		});
		return [
			["tree", ["class instantiation", "Amogus"], [
				["number.decimal", "43"]
			]],
			null,
			[amogusClass, {
				properties: {
					prop: 65
				}
			}],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
			}
		]
	})(),
	class_instantiation_invalid_no_constructor: [
		["tree", ["class instantiation", "Amogus"], [
		]],
		null,
		["error"],
		r => {
			r.getCurrentScope().types["Amogus"] = new ClassVariableType({
				name: {
					text: "Amogus"
				}
			} as ClassStatement, {
				prop: {
					varType: PrimitiveVariableType.REAL
				} as ClassPropertyStatement
			});
		}
	],
	class_property_access: (() => {
		const amogusClass = new ClassVariableType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: {
				varType: PrimitiveVariableType.REAL
			} as ClassPropertyStatement
		});
		return [
			["tree", "access", [
				["name", "amogus"],
				["name", "prop"],
			]],
			null,
			["REAL", 65],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
				r.getCurrentScope().variables["amogus"] = {
					declaration: null!,
					mutable: true,
					type: amogusClass,
					value: {
						properties: {
							prop: 65
						}
					}
				}
			}
		]
	})(),
	class_property_access_private: (() => {
		const amogusClass = new ClassVariableType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: {
				varType: PrimitiveVariableType.REAL,
				accessModifier: token("keyword.class_modifier.private", "PRIVATE")
			} as ClassPropertyStatement
		});
		return [
			["tree", "access", [
				["name", "amogus"],
				["name", "prop"],
			]],
			null,
			["error"],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
				r.getCurrentScope().variables["amogus"] = {
					declaration: null!,
					mutable: true,
					type: amogusClass,
					value: {
						properties: {
							prop: 65
						}
					}
				}
			}
		]
	})(),
	class_method_call:  [
		["tree", ["function call", ["tree", "access", [
			["name", "amogus"],
			["name", "eject"],
		]]], [
		]],
		null,
		["STRING", `amogus was not The Imposter.`],
		r => {
			const amogusClass = new ClassVariableType({
				name: {
					text: "Amogus"
				}
			} as ClassStatement, {
				prop: {
					varType: PrimitiveVariableType.REAL
				} as ClassPropertyStatement
			}, {
				eject: process_ProgramASTNode({
					type: "class_procedure",
					controlStatements: [
						[ClassProcedureStatement, [
							["keyword.class_modifier.public", "PUBLIC"],
							["keyword.procedure", "PROCEDURE"],
							["name", "NEW"],
							["parentheses.open", "("],
							["name", "arg"],
							["punctuation.colon", ":"],
							["name", "INTEGER"],
							["parentheses.close", ")"],
						]],
						[ClassProcedureEndStatement, [
							["keyword.procedure_end", "ENDPROCEDURE"]
						]]
					],
					nodeGroups: [[
						[ReturnStatement, [
							["keyword.return", "RETURN"],
							["string", `"amogus was not The Imposter."`],
						]]
					]],
				}) as ClassMethodData
			});
			r.getCurrentScope().types["Amogus"] = amogusClass;
			r.getCurrentScope().variables["amogus"] = {
				declaration: null!,
				mutable: true,
				type: amogusClass,
				value: {
					properties: {
						prop: 65
					}
				}
			}
		}
	]
});

const statementTests = ((data:Record<string, [
	statement:_ProgramASTLeafNode, setup:(r:Runtime) => unknown,
	test:"error" | ((r:Runtime, result:StatementExecutionResult | void, message:string | null) => unknown),
	inputs?:string[]
]>) => Object.entries(data).map<[
	name:string, statement:ProgramASTLeafNode, setup:(r:Runtime) => unknown,
	test:"error" | ((r:Runtime, result:StatementExecutionResult | void, message:string | null) => unknown),
	inputs:string[]
]>(([k, v]) =>
	[k, process_Statement(v[0]), v[1], v[2], v[3] ?? []]
))({
	declare1: [
		[DeclareStatement, [
			["keyword.declare", "DECLARE"],
			["name", "x"],
			["punctuation.colon", ":"],
			["name", "DATE"],
		]],
		r => {},
		r => expect(r.scopes[0]?.variables?.x).toEqual({
			declaration: jasmine.any(DeclareStatement),
			mutable: true,
			type: PrimitiveVariableType.DATE,
			value: null
		})
	],
	typePointer1: [
		[TypePointerStatement, [
			["keyword.type", "TYPE"],
			["name", "amogus"],
			["operator.equal_to", "="],
			["operator.pointer", "^"],
			["name", "INTEGER"],
		]],
		r => {},
		r => {
			expect(r.getType("amogus")).toEqual(new PointerVariableType("amogus", PrimitiveVariableType.INTEGER));
		}
	],
	typePointer_invalid_nonexistent: [
		[TypePointerStatement, [
			["keyword.type", "TYPE"],
			["name", "amogus"],
			["operator.equal_to", "="],
			["operator.pointer", "^"],
			["name", "sussy"],
		]],
		r => {},
		"error"
	],
	typeEnum1: [
		[TypeEnumStatement, [
			["keyword.type", "TYPE"],
			["name", "amog"],
			["operator.equal_to", "="],
			["parentheses.open", "("],
			["name", "amogus"],
			["punctuation.comma", ","],
			["name", "sugoma"],
			["parentheses.close", ")"],
		]],
		r => {},
		r => {
			expect(r.getType("amog"))
				.toEqual(new EnumeratedVariableType("amog", ["amogus", "sugoma"]));
		}
	],
	typeSet1: [
		[TypeSetStatement, [
			["keyword.type", "TYPE"],
			["name", "amog"],
			["operator.equal_to", "="],
			["keyword.set", "SET"],
			["keyword.of", "OF"],
			["name", "INTEGER"],
		]],
		r => {},
		r => {
			expect(r.getType("amog"))
				.toEqual(new SetVariableType("amog", PrimitiveVariableType.INTEGER));
		}
	],
});

const programTests = ((data:Record<string,
	[program:_ProgramAST, output:string | ["error"], inputs?:string[]]
>) => Object.entries(data).map<
	[name:string, program:ProgramAST, output:string | ["error"], inputs:string[]]
>(([k, v]) =>
	[k, process_ProgramAST(v[0]), v[1], v[2] ?? []]
))({
	declare_assign_output: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "STRING"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["string", `"amogus"`],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]],
		],
		`amogus`
	],
	define: [
		[
			[TypeSetStatement, [
				["keyword.type", "TYPE"],
				["name", "setofinteger"],
				["operator.equal_to", "="],
				["keyword.set", "SET"],
				["keyword.of", "OF"],
				["name", "INTEGER"],
			]],
			[DefineStatement, [
				["keyword.define", "DEFINE"],
				["name", "amogus"],
				["parentheses.open", "("],
				["number.decimal", "1"],
				["punctuation.comma", ","],
				["number.decimal", "2"],
				["punctuation.comma", ","],
				["number.decimal", "3"],
				["parentheses.close", ")"],
				["punctuation.colon", ":"],
				["name", "setofinteger"],
			]]
		],
		``
	],
	define_invalid_type: [
		[
			[TypeSetStatement, [
				["keyword.type", "TYPE"],
				["name", "setofinteger"],
				["operator.equal_to", "="],
				["keyword.set", "SET"],
				["keyword.of", "OF"],
				["name", "INTEGER"],
			]],
			[DefineStatement, [
				["keyword.define", "DEFINE"],
				["name", "amogus"],
				["parentheses.open", "("],
				["char", "'c'"],
				["parentheses.close", ")"],
				["punctuation.colon", ":"],
				["name", "setofinteger"],
			]]
		],
		["error"]
	],
	case_simple: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "INTEGER"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["number.decimal", `2`],
			]],
			{
				type: "switch",
				controlStatements: [
					[SwitchStatement, [
						["keyword.case", "CASE"],
						["keyword.of", "OF"],
						["name", "x"],
					]],
					[CaseBranchStatement, [
						["number.decimal", "1"],
						["punctuation.colon", ":"],
					]],
					[CaseBranchStatement, [
						["number.decimal", "2"],
						["punctuation.colon", ":"],
					]],
					[statements.byType["switch.end"], [
						["keyword.case_end", "ENDCASE"],
					]],
				],
				nodeGroups: [
					[],
					[
						[OutputStatement, [
							["keyword.output", "OUTPUT"],
							["string", `"a"`],
						]],
					],
					[
						[OutputStatement, [
							["keyword.output", "OUTPUT"],
							["string", `"b"`],	
						]]
					],
				]
			}
		],
		`b`
	],
	case_variable_input_type_mismatch: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "INTEGER"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["number.decimal", `2`],
			]],
			{
				type: "switch",
				controlStatements: [
					[SwitchStatement, [
						["keyword.case", "CASE"],
						["keyword.of", "OF"],
						["name", "x"],
					]],
					[CaseBranchStatement, [
						["number.decimal", "2.1"],
						["punctuation.colon", ":"],
					]],
					[statements.byType["switch.end"], [
						["keyword.case_end", "ENDCASE"],
					]],
				],
				nodeGroups: [
					[],
					[
						[OutputStatement, [
							["keyword.output", "OUTPUT"],
							["string", `"a"`],
						]],
					],
				]
			}
		],
		["error"]
	],
	case_literal_input_type_mismatch: [
		[
			{
				type: "switch",
				controlStatements: [
					[SwitchStatement, [
						["keyword.case", "CASE"],
						["keyword.of", "OF"],
						["number.decimal", "2"],
					]],
					[CaseBranchStatement, [
						["number.decimal", "2.1"],
						["punctuation.colon", ":"],
					]],
					[statements.byType["switch.end"], [
						["keyword.case_end", "ENDCASE"],
					]],
				],
				nodeGroups: [
					[],
					[
						[OutputStatement, [
							["keyword.output", "OUTPUT"],
							["string", `"a"`],
						]],
					],
				]
			}
		],
		``
	],
	for_simple: [
		[{
			type: "for",
			controlStatements: [
				[ForStatement, [
					["keyword.for", "FOR"],
					["name", "x"],
					["operator.assignment", "<-"],
					["number.decimal", "1"],
					["keyword.to", "TO"],
					["number.decimal", "10"],
				]],
				[ForEndStatement, [
					["keyword.for_end", "NEXT"],
					["name", "x"],
				]]
			],
			nodeGroups: [[
				[OutputStatement, [
					["keyword.output", "OUTPUT"],
					["name", "x"],
				]],
			]],
		}],
		`1\n2\n3\n4\n5\n6\n7\n8\n9\n10`
	],
	for_step: [
		[{
			type: "for",
			controlStatements: [
				[ForStepStatement, [
					["keyword.for", "FOR"],
					["name", "x"],
					["operator.assignment", "<-"],
					["number.decimal", "1"],
					["keyword.to", "TO"],
					["number.decimal", "15"],
					["keyword.step", "STEP"],
					["number.decimal", "2"],
				]],
				[ForEndStatement, [
					["keyword.for_end", "NEXT"],
					["name", "x"],
				]]
			],
			nodeGroups: [[
				[OutputStatement, [
					["keyword.output", "OUTPUT"],
					["name", "x"],
				]],
			]],
		}],
		`1\n3\n5\n7\n9\n11\n13\n15`
	],
	builtin_function_left: [
		[
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "LEFT"],
				["parentheses.open", "("],
				["string", `"amogus sussy"`],
				["punctuation.comma", ","],
				["number.decimal", "5"],
				["parentheses.close", ")"],
			]]
		],
		`amogu`
	],
	builtin_function_left_invalid_negative: [
		[
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "LEFT"],
				["parentheses.open", "("],
				["string", `"amogus sussy"`],
				["punctuation.comma", ","],
				["number.decimal", "-5"],
				["parentheses.close", ")"],
			]]
		],
		["error"],
	],
	builtin_function_left_invalid_too_large: [
		[
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "LEFT"],
				["parentheses.open", "("],
				["string", `"amogus sussy"`],
				["punctuation.comma", ","],
				["number.decimal", "55"],
				["parentheses.close", ")"],
			]]
		],
		["error"],
	],
	builtin_function_mid: [
		[
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "MID"],
				["parentheses.open", "("],
				["string", `"amogus sussy"`],
				["punctuation.comma", ","],
				["number.decimal", "2"],
				["punctuation.comma", ","],
				["number.decimal", "3"],
				["parentheses.close", ")"],
			]]
		],
		`mog`
	],
	builtin_function_to_upper_string: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "STRING"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["tree", ["function call",["name", "TO_UPPER"]], [
					["string", `"amogus SUssy"`],
				]]
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]]
		],
		`AMOGUS SUSSY`
	],
	builtin_function_to_upper_char: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "CHAR"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["tree", ["function call", ["name", "TO_UPPER"]], [
					["char", `'a'`],
				]]
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]]
		],
		`A`
	],
	builtin_function_num_to_str_literal: [
		[
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "NUM_TO_STR"],
				["parentheses.open", "("],
				["number.decimal", "571"],
				["parentheses.close", ")"],
			]]
		],
		`571`
	],
	builtin_function_num_to_str_integer_string: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "INTEGER"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["number.decimal", `2`],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "NUM_TO_STR"],
				["parentheses.open", "("],
				["name", "x"],
				["parentheses.close", ")"],
			]]
		],
		`2`
	],
	builtin_function_num_to_str_real_string: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "REAL"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["number.decimal", `2.21`],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "NUM_TO_STR"],
				["parentheses.open", "("],
				["name", "x"],
				["parentheses.close", ")"],
			]]
		],
		`2.21`
	],
	builtin_function_num_to_str_int_char: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "CHAR"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["tree", ["function call",["name", "NUM_TO_STR"]], [
					["number.decimal", "2"],
				]],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]]
		],
		`2`
	],
	builtin_function_str_to_num_char_int: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "INTEGER"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["tree", ["function call",["name", "STR_TO_NUM"]], [
					["char", "'2'"],
				]],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]]
		],
		`2`
	],
	builtin_function_str_to_num_string_real: [
		[
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "REAL"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["tree", ["function call",["name", "STR_TO_NUM"]], [
					["string", `"1.2345"`],
				]],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]]
		],
		`1.2345`
	],
	files_eof: [
		[
			[OpenFileStatement, [
				["keyword.open_file", "OPENFILE"],
				["string", `"amogus.txt"`],
				["keyword.for", "FOR"],
				["keyword.file_mode.write", "WRITE"],
			]],
			[WriteFileStatement, [
				["keyword.write_file", "WRITEFILE"],
				["string", `"amogus.txt"`],
				["punctuation.comma", ","],
				["string", `"a"`],
			]],
			[WriteFileStatement, [
				["keyword.write_file", "WRITEFILE"],
				["string", `"amogus.txt"`],
				["punctuation.comma", ","],
				["string", `"b"`],
			]],
			[WriteFileStatement, [
				["keyword.write_file", "WRITEFILE"],
				["string", `"amogus.txt"`],
				["punctuation.comma", ","],
				["string", `"c"`],
			]],
			[CloseFileStatement, [
				["keyword.close_file", "CLOSEFILE"],
				["string", `"amogus.txt"`],
			]],
			[OpenFileStatement, [
				["keyword.open_file", "OPENFILE"],
				["string", `"amogus.txt"`],
				["keyword.for", "FOR"],
				["keyword.file_mode.write", "READ"],
			]],
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "STRING"],
			]],
			{
				type: "while",
				controlStatements: [
					[WhileStatement, [
						["keyword.while", "WHILE"],
						["tree", "not", [
							["tree", ["function call",["name", "EOF"]], [	
								["string", `"amogus.txt"`],
							]]
						]]
					]],
					[statements.byType["while.end"], [
						["keyword.while_end", "ENDWHILE"],
					]]
				],
				nodeGroups: [[
					[ReadFileStatement, [
						["keyword.read_file", "READFILE"],
						["string", `"amogus.txt"`],
						["punctuation.comma", ","],
						["name", "x"],
					]],
					[OutputStatement, [
						["keyword.output", "OUTPUT"],
						["name", "x"],
					]],
				]],
			},
			[CloseFileStatement, [
				["keyword.close_file", "CLOSEFILE"],
				["string", `"amogus.txt"`],
			]],
		],
		`a\nb\nc`
	],
	procedure_1: [
		[
			{
				type: "procedure",
				controlStatements: [
					[ProcedureStatement, [
						["keyword.procedure", "PROCEDURE"],
						["name", "amogus"],
						["parentheses.open", "("],
						["parentheses.close", ")"],
					]]
				],
				nodeGroups: [[
					[OutputStatement, [
						["keyword.output", "OUTPUT"],
						["string", `"hi"`]
					]]
				]]
			},
			[CallStatement, [
				["keyword.call", "CALL"],
				["tree", ["function call", ["name", "amogus"]], [
				]]
			]]
		],
		`hi`
	],
	function_1: [
		[
			{
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						["keyword.function", "FUNCTION"],
						["name", "amogus"],
						["parentheses.open", "("],
						["parentheses.close", ")"],
						["keyword.returns", "RETURNS"],
						["name", "INTEGER"]
					]]
				],
				nodeGroups: [[
					[ReturnStatement, [
						["keyword.return", "RETURN"],
						["number.decimal", "5"]
					]]
				]]
			},
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "amogus"],
				["parentheses.open", "("],
				["parentheses.close", ")"],
			]]
		],
		`5`
	],
	procedure_byval_array: [
		[
			{
				type: "procedure",
				controlStatements: [
					[ProcedureStatement, [
						["keyword.procedure", "PROCEDURE"],
						["name", "amogus"],
						["parentheses.open", "("],
						["keyword.pass_mode.by_value", "BYVAL"],
						["name", "arr"],
						["punctuation.colon", ":"],
						["keyword.array", "ARRAY"],
						["bracket.open", "["],
						["number.decimal", "1"],
						["punctuation.colon", ":"],
						["number.decimal", "10"],
						["bracket.close", "]"],
						["keyword.of", "OF"],
						["name", "INTEGER"],
						["parentheses.close", ")"],
					]]
				],
				nodeGroups: [[
					[AssignmentStatement, [
						["tree", ["array access", ["name", "arr"]], [
							["number.decimal", "1"],
						]],
						["operator.assignment", "<-"],
						["number.decimal", "6"]
					]],
					[OutputStatement, [
						["keyword.output", "OUTPUT"],
						["name", "arr"],
						["bracket.open", "["],
						["number.decimal", "1"],
						["bracket.close", "]"],
					]],
				]]
			},
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "foo"],
				["punctuation.colon", ":"],
				[[
					[1, 10]
				], ["name", "INTEGER"]]
			]],
			[AssignmentStatement, [
				["tree", ["array access", ["name", "foo"]], [
					["number.decimal", "1"],
				]],
				["operator.assignment", "<-"],
				["number.decimal", "5"]
			]],
			[CallStatement, [
				["keyword.call", "CALL"],
				["tree", ["function call",["name", "amogus"]], [
					["name", "foo"]
				]]
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "foo"],
				["bracket.open", "["],
				["number.decimal", "1"],
				["bracket.close", "]"],
			]],
		],
		`6\n5`
	],
	procedure_byref_array: [
		[
			{
				type: "procedure",
				controlStatements: [
					[ProcedureStatement, [
						["keyword.procedure", "PROCEDURE"],
						["name", "amogus"],
						["parentheses.open", "("],
						["keyword.pass_mode.by_reference", "BYREF"],
						["name", "arr"],
						["punctuation.colon", ":"],
						["keyword.array", "ARRAY"],
						["bracket.open", "["],
						["number.decimal", "1"],
						["punctuation.colon", ":"],
						["number.decimal", "10"],
						["bracket.close", "]"],
						["keyword.of", "OF"],
						["name", "INTEGER"],
						["parentheses.close", ")"],
					]]
				],
				nodeGroups: [[
					[AssignmentStatement, [
						["tree", ["array access", ["name", "arr"]], [
							["number.decimal", "1"],
						]],
						["operator.assignment", "<-"],
						["number.decimal", "6"]
					]],
					[OutputStatement, [
						["keyword.output", "OUTPUT"],
						["name", "arr"],
						["bracket.open", "["],
						["number.decimal", "1"],
						["bracket.close", "]"],
					]],
				]]
			},
			[DeclareStatement, [
				["keyword.declare", "DECLARE"],
				["name", "foo"],
				["punctuation.colon", ":"],
				[[
					[1, 10]
				], ["name", "INTEGER"]]
			]],
			[AssignmentStatement, [
				["tree", ["array access", ["name", "foo"]], [
					["number.decimal", "1"],
				]],
				["operator.assignment", "<-"],
				["number.decimal", "5"]
			]],
			[CallStatement, [
				["keyword.call", "CALL"],
				["tree", ["function call",["name", "amogus"]], [
					["name", "foo"]
				]]
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "foo"],
				["bracket.open", "["],
				["number.decimal", "1"],
				["bracket.close", "]"],
			]],
		],
		`6\n6`
	],
});


describe("runtime's token evaluator", () => {
	for(const [name, token, type, output, setup] of tokenTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
			runtime.scopes.push({
				statement: "global",
				variables: {},
				types: {}
			});
			setup(runtime);
			if(output[0] == "error")
				expect(() => runtime.evaluateToken(token, type ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError)
			else
				expect(runtime.evaluateToken(token, type ?? undefined)).toEqual(output);
		});
	}
});

type expect_ = <T>(actual: T) => jasmine.Matchers<T>;
describe("runtime's expression evaluator", () => {
	for(const [name, expression, type, output, setup] of expressionTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
			runtime.scopes.push({
				statement: "global",
				variables: {},
				types: {}
			});
			setup(runtime);
			if(output[0] == "error")
				(expect as expect_)(() => runtime.evaluateExpr(expression, type ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError)
			else
				(expect as expect_)(runtime.evaluateExpr(expression, type ?? undefined)).toEqual(output);
		});
	}
});

describe("runtime's statement executor", () => {
	for(const [name, statement, setup, test, inputs] of statementTests){
		it(`should produce the expected output for ${name}`, () => {
			let output:string | null = null;
			const runtime = new Runtime(
				() => inputs.shift() ?? fail(`Program required input, but none was available`),
				message => output = message
			);
			runtime.scopes.push({
				statement: "global",
				variables: {},
				types: {}
			});
			setup(runtime);
			if(test == "error"){
				expect(() => statement.run(runtime)).toThrowMatching(e => e instanceof SoodocodeError);
			} else {
				const result = statement.run(runtime);
				test(runtime, result, output);
			}
		});
	}
});

describe("runtime's program execution", () => {
	for(const [name, program, output, inputs] of programTests){
		it(`should produce the expected output for ${name}`, () => {
			let outputs:string[] = [];
			const runtime = new Runtime(
				() => inputs.shift() ?? fail(`Program required input, but none was available`),
				str => outputs.push(str)
			);
			if(Array.isArray(output)){
				expect(() => runtime.runProgram(program.nodes)).toThrowMatching(e => e instanceof SoodocodeError);
			} else {
				runtime.runProgram(program.nodes);
				expect(outputs.join("\n")).toEqual(output);
			}
		});
	}
});
