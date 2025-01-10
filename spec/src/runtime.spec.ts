/* eslint-disable indent */
import "jasmine";
import { ExpressionAST, ExpressionASTLeafNode, ProgramAST, ProgramASTLeafNode } from "../../core/build/parser/index.js";
import { ArrayVariableType, ClassVariableType, EnumeratedVariableType, FunctionData, PointerVariableType, PrimitiveVariableType, RecordVariableType, Runtime, VariableData, VariableType, VariableValue } from "../../core/build/runtime/index.js";
import { CallStatement, ClassFunctionEndStatement, ClassFunctionStatement, ClassProcedureEndStatement, ClassProcedureStatement, ClassPropertyStatement, ClassStatement, DeclareStatement, ForEndStatement, ForStatement, ForStepStatement, FunctionStatement, ProcedureStatement, ReturnStatement, StatementExecutionResult } from "../../core/build/statements/index.js";
import { SoodocodeError, crash } from "../../core/build/utils/funcs.js";
import { _ExpressionAST, _ExpressionASTLeafNode, _ProgramAST, _ProgramASTLeafNode, _VariableType, anyRange, arrayType, classType, process_ExpressionAST, process_ExpressionASTLeafNode, process_ProgramAST, process_ProgramASTNode, process_Statement, process_VariableType, token } from "./spec_utils.js";

const eleafTests = ((data:Record<string,
	[eleaf:_ExpressionASTLeafNode, type:_VariableType | null, output:[type:_VariableType, value:VariableValue] | ["error"], setup?:(r:Runtime) => unknown]
>) => Object.entries(data).map<[
		name:string,
		eleaf:ExpressionASTLeafNode,
		type:VariableType | null,
		output:[type:VariableType, value:VariableValue] | ["error"],
		setup:(r:Runtime) => unknown
	]>(([k, v]) => [
		k,
		process_ExpressionASTLeafNode(v[0]),
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
			name: "x",
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
			r => {
				r.getCurrentScope().types["amogusType"] = type;
				type.init(r);
			}
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
	add_numeric_literals: [
		["tree", "add", [
			5,
			6
		]],
		"INTEGER",
		["INTEGER", 11]
	],
	subtract_numeric_literals: [
		["tree", "subtract", [
			5,
			6
		]],
		"INTEGER",
		["INTEGER", -1]
	],
	equality_numbers: [
		["tree", "equal_to", [
			5,
			6
		]],
		"BOOLEAN",
		["BOOLEAN", false]
	],
	comparison_numbers: [
		["tree", "greater_than", [
			5,
			6
		]],
		"BOOLEAN",
		["BOOLEAN", false]
	],
	comparison_chars: [
		["tree", "less_than", [
			["char", `'a'`],
			["char", `'b'`]
		]],
		"BOOLEAN",
		["BOOLEAN", true]
	],
	arrayAccess_simple: [
		["tree", ["array access", "amogus"], [
			5,
		]],
		"INTEGER",
		["INTEGER", 18],
		r => {
			r.getCurrentScope().variables["amogus"] = {
				type: arrayType([[1, 10]], PrimitiveVariableType.INTEGER),
				name: "amogus",
				declaration: null!,
				mutable: true,
				value: [0, 0, 0, 0, 18, 0, 0, 0, 0, 0]
			};
		}
	],
	propertyAccess_simple: [
		["tree", "access", [
			"amogus",
			"sus",
		]],
		"INTEGER",
		["INTEGER", 18],
		r => {
			const amogusType = new RecordVariableType(true, "amogusType", {
				sus: [PrimitiveVariableType.INTEGER, [-1, -1]]
			});
			r.getCurrentScope().types["amogusType"] = amogusType;
			r.getCurrentScope().variables["amogus"] = {
				type: amogusType,
				name: "amogus",
				declaration: null!,
				mutable: true,
				value: {
					sus: 18
				}
			};
		}
	],
	propertyAccess_nested: [
		["tree", "access", [
			["tree", "access", [
				"aaa",
				"bbb",
			]],
			"ccc",
		]],
		"INTEGER",
		["INTEGER", 123],
		r => {
			const innerType = new RecordVariableType(true, "innerType", {
				ccc: [PrimitiveVariableType.INTEGER, [-1, -1]]
			});
			const outerType = new RecordVariableType(true, "outerType", {
				bbb: [innerType, [-1, -1]]
			});
			r.getCurrentScope().types["innerType"] = innerType;
			r.getCurrentScope().types["outerType"] = outerType;
			r.getCurrentScope().variables["aaa"] = {
				type: outerType,
				name: "aaa",
				declaration: null!,
				mutable: true,
				value: {
					bbb: {
						ccc: 123
					}
				}
			};
		}
	],
	propertyAccess_nested_array: [
		["tree", "access", [
			["tree", ["array access", "aaa"], [
				2,
			]],
			"ccc",
		]],
		"INTEGER",
		["INTEGER", 124],
		r => {
			const innerType = new RecordVariableType(true, "innerType", {
				ccc: [PrimitiveVariableType.INTEGER, [-1, -1]]
			});
			r.getCurrentScope().types["innerType"] = innerType;
			r.getCurrentScope().variables["aaa"] = {
				type: arrayType([[1, 5]], innerType),
				name: "aaa",
				declaration: null!,
				mutable: true,
				value: [null, {
					ccc: 124
				}, null, null, null]
			};
		}
	],
	propertyAccess_invalid_not_record: [
		["tree", "access", [
			"aaa",
			"bbb",
		]],
		"INTEGER",
		["error"],
		r => {
			r.getCurrentScope().variables["aaa"] = {
				type: PrimitiveVariableType.DATE,
				name: "aaa",
				declaration: null!,
				mutable: true,
				value: Date.now()
			};
		}
	],
	propertyAccess_invalid_nonexistent_property: [
		["tree", "access", [
			"amogus",
			"sussy",
		]],
		"INTEGER",
		["error"],
		r => {
			const amogusType = new RecordVariableType(true, "amogusType", {
				sus: [PrimitiveVariableType.INTEGER, [-1, -1]]
			});
			r.getCurrentScope().types["amogusType"] = amogusType;
			r.getCurrentScope().variables["amogus"] = {
				type: amogusType,
				name: "amogus",
				declaration: null!,
				mutable: true,
				value: {
					sus: 18
				}
			};
		}
	],
	pointerRef1: (() => {
		const intPointer = new PointerVariableType(true, "intPtr", PrimitiveVariableType.INTEGER, [-1, -1]);
		const intVar:VariableData<PrimitiveVariableType<"INTEGER">> = {
			type: PrimitiveVariableType.INTEGER,
			name: "amogus",
			declaration: null!,
			mutable: true,
			value: 19
		};
		return [
			["tree", "pointer_reference", [
				"amogus",
			]],
			intPointer,
			[intPointer, intVar],
			r => {
				r.getCurrentScope().types["intPtr"] = intPointer;
				r.getCurrentScope().variables["amogus"] = intVar;
			}
		];
	})(),
	pointerRef_array_udt: (() => {
		const foo = new EnumeratedVariableType("foo", ["a", "b", "c"]);
		const arrayPointer = new PointerVariableType(true, "intPtr", arrayType([[1, 10]], foo), [-1, -1]);
		const arrayVar:VariableData<ArrayVariableType> = {
			type: arrayType([[1, 10]], foo),
			name: "amogus",
			declaration: null!,
			mutable: true,
			value: Array(10).fill(null)
		};
		return [
			["tree", "pointer_reference", [
				"amogus",
			]],
			null,
			[arrayPointer, arrayVar],
			r => {
				r.getCurrentScope().types["foo"] = foo;
				r.getCurrentScope().types["arrayPointer"] = arrayPointer;
				r.getCurrentScope().variables["amogus"] = arrayVar;
			}
		];
	})(),
	pointerRef_array_udt_invalid: (() => {
		const foo = new EnumeratedVariableType("foo", ["a", "b", "c"]);
		// const arrayPointer = new PointerVariableType(true, "intPtr", arrayType([[1, 10]], foo));
		const arrayVar:VariableData<ArrayVariableType> = {
			type: arrayType([[1, 10]], foo),
			name: "amogus",
			declaration: null!,
			mutable: true,
			value: Array(10).fill(null)
		};
		return [
			["tree", "pointer_reference", [
				"amogus",
			]],
			null,
			["error"],
			r => {
				r.getCurrentScope().types["foo"] = foo;
				// r.getCurrentScope().types["arrayPointer"] = arrayPointer;
				r.getCurrentScope().variables["amogus"] = arrayVar;
			}
		];
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
	// 			5,
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
		const intPointer = new PointerVariableType(true, "intPtr", PrimitiveVariableType.INTEGER, [-1, -1]);
		const intVar:VariableData<PrimitiveVariableType<"INTEGER">> = {
			type: PrimitiveVariableType.INTEGER,
			name: "amogus",
			declaration: null!,
			mutable: true,
			value: 19
		};
		return [
			["tree", "pointer_reference", [
				"sussybaka",
			]],
			intPointer,
			["error"],
			r => {
				r.getCurrentScope().types["intPtr"] = intPointer;
				r.getCurrentScope().variables["amogus"] = intVar;
			}
		];
	})(),
	pointerDeref1: (() => {
		return [
			["tree", "pointer_dereference", [
				"amogusPtr",
			]],
			"INTEGER",
			["INTEGER", 20],
			r => {
				const intPointer = new PointerVariableType(true, "intPtr", PrimitiveVariableType.INTEGER, [-1, -1]);
				const amogusVar:VariableData<PrimitiveVariableType<"INTEGER">> = {
					type: PrimitiveVariableType.INTEGER,
					name: "amogus",
					declaration: null!,
					mutable: true,
					value: 20
				};
				r.getCurrentScope().types["intPtr"] = intPointer;
				r.getCurrentScope().variables["amogus"] = amogusVar;
				r.getCurrentScope().variables["amogusPtr"] = {
					declaration: null!,
					name: "amogusPtr",
					mutable: true,
					type: intPointer,
					value: amogusVar
				};
			}
		];
	})(),
	functionCall_simple: [
		["tree", ["function call", "amogus"], [
		]],
		"INTEGER",
		["INTEGER", 22],
		r => {
			r.functions["amogus"] = process_ProgramASTNode({
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						"keyword.function",
						"amogus",
						"parentheses.open",
						"parentheses.close",
						"keyword.returns",
						"INTEGER",
					]],
					["FunctionEnd"]
				],
				nodeGroups: [[
					[ReturnStatement, [
						"keyword.return",
						22,
					]],
				]]
			}) as FunctionData;
		}
	],
	functionCall_args: [
		["tree", ["function call", "amogus"], [
			["tree", "add", [
				5,
				6
			]]
		]],
		"REAL",
		["REAL", 16],
		r => {
			r.functions["amogus"] = process_ProgramASTNode({
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						"keyword.function",
						"amogus",
						"parentheses.open",
						"arg",
						"punctuation.colon",
						"INTEGER",
						"parentheses.close",
						"keyword.returns",
						"INTEGER",
					]],
					["FunctionEnd"]
				],
				nodeGroups: [[
					[ReturnStatement, [
						"keyword.return",
						["tree", "add", [
							5,
							"arg"
						]],
					]],
				]]
			}) as FunctionData;
		}
	],
	functionCall_invalid_wrong_type: [
		["tree", ["function call", "amogus"], [
		]],
		"DATE",
		["error"],
		r => {
			r.functions["amogus"] = process_ProgramASTNode({
				type: "function",
				controlStatements: [
					[FunctionStatement, [
						"keyword.function",
						"amogus",
						"parentheses.open",
						"parentheses.close",
						"keyword.returns",
						"INTEGER",
					]],
					["FunctionEnd"]
				],
				nodeGroups: [[
					[ReturnStatement, [
						"keyword.return",
						22,
					]],
				]]
			}) as FunctionData;
		}
	],
	class_instantiation_1: (() => {
		const amogusClass = classType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: [PrimitiveVariableType.REAL, {
				varType: token("name", "REAL")
			} as ClassPropertyStatement]
		}, {
			NEW: {
				type: "class_procedure",
				controlStatements: [
					[ClassProcedureStatement, [
						"keyword.class_modifier.public",
						"keyword.procedure",
						"NEW",
						"parentheses.open",
						"parentheses.close",
					]],
					[ClassProcedureEndStatement, [
						"keyword.procedure_end"
					]]
				],
				nodeGroups: [[
				]],
			}
		});
		return [
			["tree", ["class instantiation", "Amogus"], [
			]],
			null,
			[amogusClass, {
				properties: {
					prop: null
				},
				propertyTypes: {},
				type: amogusClass
			}],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
			}
		];
	})(),
	class_instantiation_2: (() => {
		const amogusClass = classType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: [PrimitiveVariableType.REAL, {
				varType: token("name", "REAL")
			} as ClassPropertyStatement]
		}, {
			NEW: {
				type: "class_procedure",
				controlStatements: [
					[ClassProcedureStatement, [
						"keyword.class_modifier.public",
						"keyword.procedure",
						"NEW",
						"parentheses.open",
						"arg",
						"punctuation.colon",
						"INTEGER",
						"parentheses.close",
					]],
					[ClassProcedureEndStatement, [
						"keyword.procedure_end"
					]]
				],
				nodeGroups: [[
					["Assignment", "prop", ["tree", "add", ["arg", 22]]]
				]],
			}
		});
		return [
			["tree", ["class instantiation", "Amogus"], [
				43
			]],
			null,
			[amogusClass, {
				properties: {
					prop: 65
				},
				propertyTypes: {},
				type: amogusClass
			}],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
			}
		];
	})(),
	class_instantiation_invalid_no_constructor: [
		["tree", ["class instantiation", "Amogus"], [
		]],
		null,
		["error"],
		r => {
			r.getCurrentScope().types["Amogus"] = classType({
				name: {
					text: "Amogus"
				}
			} as ClassStatement, {
				prop: [PrimitiveVariableType.REAL, {
					varType: token("name", "REAL")
				} as ClassPropertyStatement]
			});
		}
	],
	class_property_access: (() => {
		const amogusClass = classType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: [PrimitiveVariableType.REAL, {
				varType: token("name", "REAL"),
				accessModifier: "public"
			} as ClassPropertyStatement]
		});
		return [
			["tree", "access", [
				"amogus",
				"prop",
			]],
			null,
			["REAL", 65],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
				r.getCurrentScope().variables["amogus"] = {
					declaration: null!,
					mutable: true,
					type: amogusClass,
					name: "amogus",
					value: {
						properties: {
							prop: 65
						},
						propertyTypes: {},
						type: amogusClass
					}
				} satisfies VariableData<ClassVariableType>;
			}
		];
	})(),
	class_property_access_private: (() => {
		const amogusClass = classType({
			name: {
				text: "Amogus"
			}
		} as ClassStatement, {
			prop: [PrimitiveVariableType.REAL, {
				varType: token("name", "REAL"),
				accessModifier: "private"
			} as ClassPropertyStatement]
		});
		return [
			["tree", "access", [
				"amogus",
				"prop",
			]],
			null,
			["error"],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
				r.getCurrentScope().variables["amogus"] = {
					declaration: null!,
					mutable: true,
					type: amogusClass,
					name: "amogus",
					value: {
						properties: {
							prop: 65
						},
						propertyTypes: {},
						type: amogusClass
					}
				} satisfies VariableData<ClassVariableType>;
			}
		];
	})(),
	class_property_access_private_valid: (() => {
		const amogusClass = classType(process_Statement([ClassStatement, [
			"keyword.class",
			"amogus"
		]]) as ClassStatement, {
			prop: [PrimitiveVariableType.REAL, {
				varType: token("name", "REAL"),
				accessModifier: "private"
			} as ClassPropertyStatement]
		}, {
			access: {
				type: "class_function",
				controlStatements: [
					[ClassFunctionStatement, [
						"keyword.class_modifier.public",
						"keyword.function",
						"access",
						"parentheses.open",
						"parentheses.close",
						"keyword.returns",
						"REAL",
					]],
					[ClassFunctionEndStatement, [
						"keyword.function_end"
					]]
				],
				nodeGroups: [[
					[ReturnStatement, [
						"keyword.return",
						["tree", "access", [
							"amogus",
							"prop",
						]]
					]]
				]],
			}
		});
		return [
			["tree", ["function call", ["tree", "access", [
				"sus",
				"access",
			]]], [
			]],
			null,
			["REAL", 90],
			r => {
				r.getCurrentScope().types["Amogus"] = amogusClass;
				r.getCurrentScope().variables["amogus"] = {
					declaration: null!,
					mutable: true,
					type: amogusClass,
					name: "amogus",
					value: {
						properties: {
							prop: 90
						},
						propertyTypes: {},
						type: amogusClass
					}
				} satisfies VariableData<ClassVariableType>;
				r.getCurrentScope().variables["sus"] = {
					declaration: null!,
					mutable: true,
					type: amogusClass,
					name: "sus",
					value: {
						properties: {
							prop: 1
						},
						propertyTypes: {},
						type: amogusClass
					}
				} satisfies VariableData<ClassVariableType>;
			}
		];
	})(),
	class_method_call: [
		["tree", ["function call", ["tree", "access", [
			"amogus",
			"eject",
		]]], [
		]],
		null,
		["STRING", `amogus was not The Imposter.`],
		r => {
			const amogusClass = classType({
				name: {
					text: "Amogus"
				}
			} as ClassStatement, {
				prop: [PrimitiveVariableType.REAL, {
					varType: token("name", "REAL")
				} as ClassPropertyStatement]
			}, {
				eject: {
					type: "class_function",
					controlStatements: [
						[ClassFunctionStatement, [
							"keyword.class_modifier.public",
							"keyword.function",
							"eject",
							"parentheses.open",
							"parentheses.close",
							"keyword.returns",
							"STRING",
						]],
						[ClassFunctionEndStatement, [
							"keyword.function_end"
						]]
					],
					nodeGroups: [[
						[ReturnStatement, [
							"keyword.return",
							["string", `"amogus was not The Imposter."`],
						]]
					]],
				}
			});
			r.getCurrentScope().types["Amogus"] = amogusClass;
			r.getCurrentScope().variables["amogus"] = {
				declaration: null!,
				mutable: true,
				type: amogusClass,
				name: "amogus",
				value: {
					properties: {
						prop: 65
					},
					propertyTypes: {},
					type: amogusClass
				}
			} satisfies VariableData<ClassVariableType>;
		}
	],
	class_method_call_invalid_wrong_arguments: [
		["tree", ["function call", ["tree", "access", [
			"amogus",
			"eject",
		]]], [
		]],
		null,
		["error"],
		r => {
			const amogusClass = classType({
				name: {
					text: "Amogus"
				}
			} as ClassStatement, {
				prop: [PrimitiveVariableType.REAL, {
					varType: token("name", "REAL")
				} as ClassPropertyStatement]
			}, {
				eject: {
					type: "class_function",
					controlStatements: [
						[ClassFunctionStatement, [
							"keyword.class_modifier.public",
							"keyword.function",
							"eject",
							"parentheses.open",
							"arg",
							"punctuation.colon",
							"INTEGER",
							"parentheses.close",
							"keyword.returns",
							"STRING",
						]],
						[ClassFunctionEndStatement, [
							"keyword.function_end"
						]]
					],
					nodeGroups: [[
						[ReturnStatement, [
							"keyword.return",
							["string", `"amogus was not The Imposter."`],
						]]
					]],
				}
			});
			r.getCurrentScope().types["Amogus"] = amogusClass;
			r.getCurrentScope().variables["amogus"] = {
				declaration: null!,
				mutable: true,
				type: amogusClass,
				name: "amogus",
				value: {
					properties: {
						prop: 65
					},
					propertyTypes: {},
					type: amogusClass
				}
			} satisfies VariableData<ClassVariableType>;
		}
	],
	class_method_call_invalid_procedure_no_return:  [
		["tree", ["function call", ["tree", "access", [
			"amogus",
			"eject",
		]]], [
		]],
		null,
		["error"],
		r => {
			const amogusClass = classType({
				name: {
					text: "Amogus"
				}
			} as ClassStatement, {
				prop: [PrimitiveVariableType.REAL, {
					varType: token("name", "REAL")
				} as ClassPropertyStatement]
			}, {
				eject: {
					type: "class_procedure",
					controlStatements: [
						[ClassProcedureStatement, [
							"keyword.class_modifier.public",
							"keyword.procedure",
							"NEW",
							"parentheses.open",
							"arg",
							"punctuation.colon",
							"INTEGER",
							"parentheses.close",
						]],
						[ClassProcedureEndStatement, [
							"keyword.procedure_end"
						]]
					],
					nodeGroups: [[
						[ReturnStatement, [
							"keyword.return",
							["string", `"amogus was not The Imposter."`],
						]]
					]],
				}
			});
			r.getCurrentScope().types["Amogus"] = amogusClass;
			r.getCurrentScope().variables["amogus"] = {
				declaration: null!,
				mutable: true,
				type: amogusClass,
				name: "amogus",
				value: {
					properties: {
						prop: 65
					},
					propertyTypes: {},
					type: amogusClass
				}
			} satisfies VariableData<ClassVariableType>;
		}
	],
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
		["Declare", ["x"], "DATE"],
		r => {},
		r => expect(r.scopes[0]?.variables?.x).toEqual({
			declaration: jasmine.any(DeclareStatement),
			mutable: true,
			type: PrimitiveVariableType.DATE,
			name: "x",
			value: null
		})
	],
	files_open_nonexistent_for_read: [
		["OpenFile", ["string", `"amogus.txt"`], "READ"],
		r => {},
		"error"
	],
	files_open_nonexistent_for_write: [
		["OpenFile", ["string", `"amogus.txt"`], "WRITE"],
		r => {},
		r => expect(r.openFiles["amogus.txt"]).toEqual({
			name: "amogus.txt",
			mode: "WRITE",
			openRange: anyRange,
			text: "",
		})
	],
	files_open_nonexistent_for_append: [
		["OpenFile", ["string", `"amogus.txt"`], "APPEND"],
		r => {},
		r => expect(r.openFiles["amogus.txt"]).toEqual({
			name: "amogus.txt",
			mode: "APPEND",
			openRange: anyRange,
			text: "",
		})
	],
	files_open_nonexistent_for_random: [
		["OpenFile", ["string", `"amogus.txt"`], "RANDOM"],
		r => {},
		"error"
	],
	files_open_existent_for_read: [
		["OpenFile", ["string", `"amogus.txt"`], "READ"],
		r => r.fs.createFile("amogus.txt"),
		r => expect(r.openFiles["amogus.txt"]).toEqual({
			text: "",
			lines: [],
			openRange: anyRange,
			name: "amogus.txt",
			mode: "READ",
			lineNumber: 0,
		})
	],
	
	// TODO fix these tests
	//running a type statement is no longer valid
	//a new test block needs to be added that checks the return value of createType()
	/*typePointer1: [
		[TypePointerStatement, [
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"operator.pointer",
			"INTEGER",
		]],
		r => {},
		r => {
			expect(r.getType("amogus")).toEqual(new PointerVariableType(true, "amogus", PrimitiveVariableType.INTEGER));
		}
	],
	typePointer_invalid_nonexistent: [
		[TypePointerStatement, [
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"operator.pointer",
			"sussy",
		]],
		r => {},
		"error"
	],
	typeEnum1: [
		[TypeEnumStatement, [
			"keyword.type",
			"amog",
			"operator.equal_to",
			"parentheses.open",
			"amogus",
			"punctuation.comma",
			"sugoma",
			"parentheses.close",
		]],
		r => {},
		r => {
			expect(r.getType("amog"))
				.toEqual(new EnumeratedVariableType("amog", ["amogus", "sugoma"]));
		}
	],
	typeSet1: [
		[TypeSetStatement, [
			"keyword.type",
			"amog",
			"operator.equal_to",
			"keyword.set",
			"keyword.of",
			"INTEGER",
		]],
		r => {},
		r => {
			expect(r.getType("amog"))
				.toEqual(new SetVariableType(true, "amog", PrimitiveVariableType.INTEGER));
		}
	],*/
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
			["Declare", ["x"], "STRING"],
			["Assignment", "x", ["string", `"amogus"`]],
			["Output", "x"],
		],
		`amogus`
	],
	define: [
		[
			["TypeSet", "setofinteger", "INTEGER"],
			["Define", "amogus", [1, 2, 3], "setofinteger"]
		],
		``
	],
	define_invalid_type: [
		[
			["TypeSet", "setofinteger", "INTEGER"],
			["Define", "amogus", [["char", "'c'"]], "setofinteger"]
		],
		["error"]
	],
	case_simple: [
		[
			["Declare", "x", "INTEGER"],
			["Assignment", "x", 2],
			{
				type: "switch",
				controlStatements: [
					["Switch", "x"],
					["CaseBranch", 1],
					["CaseBranch", 2],
					["SwitchEnd"],
				],
				nodeGroups: [
					[],
					[
						["Output", ["string", `"a"`]],
					],
					[
						["Output", ["string", `"b"`]]
					],
				]
			}
		],
		`b`
	],
	case_variable_input_type_mismatch: [
		[
			["Declare", ["x"], "INTEGER"],
			["Assignment", "x", 2],
			{
				type: "switch",
				controlStatements: [
					["Switch", "x"],
					["CaseBranch", ["number.decimal", "2.1"]],
					["SwitchEnd"],
				],
				nodeGroups: [
					[],
					[
						["Output", ["string", `"a"`]],
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
					["Switch", 2],
					["CaseBranch", ["number.decimal", "2.1"]],
					["SwitchEnd"],
				],
				nodeGroups: [
					[],
					[
						["Output", ["string", `"a"`]],
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
					"keyword.for",
					"x",
					"operator.assignment",
					1,
					"keyword.to",
					10,
				]],
				[ForEndStatement, [
					"keyword.for_end",
					"x",
				]]
			],
			nodeGroups: [[
				["Output", "x"],
			]],
		}],
		`1\n2\n3\n4\n5\n6\n7\n8\n9\n10`
	],
	for_step: [
		[{
			type: "for",
			controlStatements: [
				[ForStepStatement, [
					"keyword.for",
					"x",
					"operator.assignment",
					1,
					"keyword.to",
					15,
					"keyword.step",
					2,
				]],
				[ForEndStatement, [
					"keyword.for_end",
					"x",
				]]
			],
			nodeGroups: [[
				["Output", "x"],
			]],
		}],
		`1\n3\n5\n7\n9\n11\n13\n15`
	],
	builtin_function_left: [
		[
			["Output",
				"LEFT",
				"parentheses.open",
				["string", `"amogus sussy"`],
				"punctuation.comma",
				5,
				"parentheses.close",
			]
		],
		`amogu`
	],
	builtin_function_left_invalid_negative: [
		[
			["Output",
				"LEFT",
				"parentheses.open",
				["string", `"amogus sussy"`],
				"punctuation.comma",
				-5,
				"parentheses.close",
			]
		],
		["error"],
	],
	builtin_function_left_invalid_too_large: [
		[
			["Output",
				"LEFT",
				"parentheses.open",
				["string", `"amogus sussy"`],
				"punctuation.comma",
				55,
				"parentheses.close",
			]
		],
		["error"],
	],
	builtin_function_mid: [
		[
			["Output",
				"MID",
				"parentheses.open",
				["string", `"amogus sussy"`],
				"punctuation.comma",
				2,
				"punctuation.comma",
				3,
				"parentheses.close",
			]
		],
		`mog`
	],
	builtin_function_length_string: [
		[
			["Output",
				"LENGTH",
				"parentheses.open",
				["string", `"amogus sussy"`],
				"parentheses.close",
			]
		],
		`12`
	],
	builtin_function_length_array_1d: [
		[
			["Declare", "x", [[[0, 10]], "STRING"]],
			["Output",
				"LENGTH",
				"parentheses.open",
				"x",
				"parentheses.close",
			]
		],
		`11`
	],
	builtin_function_length_array_1d_two: [
		[
			["Declare", "x", [[[4, 10]], "STRING"]],
			["Output",
				"LENGTH",
				"parentheses.open",
				"x",
				"parentheses.close",
			]
		],
		`7`
	],
	builtin_function_to_upper_string: [
		[
			["Declare", ["x"], "STRING"],
			["Assignment", "x",
				["tree", ["function call","TO_UPPER"], [
					["string", `"amogus SUssy"`],
				]]
			],
			["Output", "x"]
		],
		`AMOGUS SUSSY`
	],
	builtin_function_to_upper_char: [
		[
			["Declare", ["x"], "CHAR"],
			["Assignment", "x", ["tree", ["function call", "TO_UPPER"], [
				["char", `'a'`],
			]]],
			["Output", "x"]
		],
		`A`
	],
	builtin_function_num_to_str_literal: [
		[
			["Output",
				"NUM_TO_STR",
				"parentheses.open",
				571,
				"parentheses.close",
			]
		],
		`571`
	],
	builtin_function_num_to_str_integer_string: [
		[
			["Declare", ["x"], "INTEGER"],
			["Assignment", "x", 2],
			["Output",
				"NUM_TO_STR",
				"parentheses.open",
				"x",
				"parentheses.close",
			]
		],
		`2`
	],
	builtin_function_num_to_str_real_string: [
		[
			["Declare", ["x"], "REAL"],
			["Assignment", "x", ["number.decimal", `2.21`]],
			["Output",
				"NUM_TO_STR",
				"parentheses.open",
				"x",
				"parentheses.close",
			]
		],
		`2.21`
	],
	builtin_function_num_to_str_int_char: [
		[
			["Declare", ["x"], "CHAR"],
			["Assignment", "x",
				["tree", ["function call","NUM_TO_STR"], [
					2,
				]],
			],
			["Output", "x"]
		],
		`2`
	],
	builtin_function_str_to_num_char_int: [
		[
			["Declare", ["x"], "INTEGER"],
			["Assignment", "x",
				["tree", ["function call","STR_TO_NUM"], [
					["char", "'2'"],
				]]
			],
			["Output", "x"]
		],
		`2`
	],
	builtin_function_str_to_num_string_real: [
		[
			["Declare", ["x"], "REAL"],
			["Assignment", "x",
				["tree", ["function call","STR_TO_NUM"], [
					["string", `"1.2345"`],
				]],
			],
			["Output", "x"]
		],
		`1.2345`
	],
	builtin_function_str_to_num_string_invalid: [
		[
			["Declare", ["x"], "REAL"],
			["Assignment", "x",
				["tree", ["function call","STR_TO_NUM"], [
					["string", `"amogus"`],
				]],
			],
			["Output", "x"]
		],
		["error"]
	],
	files_eof: [
		[
			["OpenFile", ["string", `"amogus.txt"`], "WRITE"],
			["WriteFile", ["string", `"amogus.txt"`], ["string", `"a"`]],
			["WriteFile", ["string", `"amogus.txt"`], ["string", `"b"`]],
			["WriteFile", ["string", `"amogus.txt"`], ["string", `"c"`]],
			["CloseFile", ["string", `"amogus.txt"`]],
			["OpenFile", ["string", `"amogus.txt"`], "READ"],
			["Declare", ["x"], "STRING"],
			{
				type: "while",
				controlStatements: [
					["While", ["tree", "not", [
						["tree", ["function call", "EOF"], [	
							["string", `"amogus.txt"`],
						]]
					]]],
					["WhileEnd"],
				],
				nodeGroups: [[
					["ReadFile", ["string", `"amogus.txt"`], "x"],
					["Output", "x"]
				]],
			},
			["CloseFile", ["string", `"amogus.txt"`]],
		],
		`a\nb\nc`
	],
	procedure_1: [
		[
			{
				type: "procedure",
				controlStatements: [
					[ProcedureStatement, [
						"keyword.procedure",
						"amogus",
						"parentheses.open",
						"parentheses.close",
					]]
				],
				nodeGroups: [[
					["Output", ["string", `"hi"`]]
				]]
			},
			[CallStatement, [
				"keyword.call",
				["tree", ["function call", "amogus"], [
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
						"keyword.function",
						"amogus",
						"parentheses.open",
						"parentheses.close",
						"keyword.returns",
						"INTEGER"
					]]
				],
				nodeGroups: [[
					["Return", 5]
				]]
			},
			["Output", "amogus", "parentheses.open", "parentheses.close"]
		],
		`5`
	],
	procedure_byval_array: [
		[
			{
				type: "procedure",
				controlStatements: [
					[ProcedureStatement, [
						"keyword.procedure",
						"amogus",
						"parentheses.open",
						"keyword.pass_mode.by_value",
						"arr",
						"punctuation.colon",
						"keyword.array",
						"bracket.open",
						1,
						"punctuation.colon",
						10,
						"bracket.close",
						"keyword.of",
						"INTEGER",
						"parentheses.close",
					]]
				],
				nodeGroups: [[
					["Assignment", ["tree", ["array access", "arr"], [1]], 6],
					["Output", "arr", "bracket.open", 1, "bracket.close"],
				]]
			},
			["Declare", ["foo"], [[
				[1, 10]
			], "INTEGER"]],
			["Assignment",
				["tree", ["array access", "foo"], [
					1,
				]],
				5
			],
			[CallStatement, [
				"keyword.call",
				["tree", ["function call","amogus"], [
					"foo"
				]]
			]],
			["Output", "foo", "bracket.open", 1, "bracket.close"],
		],
		`6\n5`
	],
	procedure_byref_array: [
		[
			{
				type: "procedure",
				controlStatements: [
					[ProcedureStatement, [
						"keyword.procedure",
						"amogus",
						"parentheses.open",
						"keyword.pass_mode.by_reference",
						"arr",
						"punctuation.colon",
						"keyword.array",
						"bracket.open",
						1,
						"punctuation.colon",
						10,
						"bracket.close",
						"keyword.of",
						"INTEGER",
						"parentheses.close",
					]]
				],
				nodeGroups: [[
					["Assignment", ["tree", ["array access", "arr"], [
						1,
					]], 6],
					["Output", "arr", "bracket.open", 1, "bracket.close"],
				]]
			},
			["Declare", ["foo"], [[
				[1, 10]
			], "INTEGER"]],
			["Assignment", ["tree", ["array access", "foo"], [
				1,
			]], 5],
			[CallStatement, [
				"keyword.call",
				["tree", ["function call","amogus"], [
					"foo"
				]]
			]],
			["Output", "foo", "bracket.open", 1, "bracket.close"],
		],
		`6\n6`
	],
});


describe("runtime's token evaluator", () => {
	for(const [name, eleaf, requestedType, output, setup] of eleafTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => crash(`Cannot input`), () => crash(`Cannot output`));
			runtime.scopes.push({
				statement: "global",
				opaque: true,
				variables: {},
				types: {}
			});
			setup(runtime);
			if(output[0] == "error"){
				expect(() => runtime.evaluateExprLeaf(eleaf, requestedType ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError);
			} else {
				const {type, value} = runtime.evaluateExprLeaf(eleaf, requestedType ?? undefined);
				expect(type).toEqual(output[0]);
				expect(value).toEqual(output[1]);
			}
		});
	}
});

type expect_ = <T>(actual: T) => jasmine.Matchers<T>;
describe("runtime's expression evaluator", () => {
	for(const [name, expression, requestedType, output, setup] of expressionTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => crash(`Cannot input`), () => crash(`Cannot output`));
			runtime.scopes.push({
				statement: "global",
				opaque: true,
				variables: {},
				types: {}
			});
			setup(runtime);
			if(output[0] == "error"){
				(expect as expect_)(() => runtime.evaluateExpr(expression, requestedType ?? undefined))
					.toThrowMatching(e => e instanceof SoodocodeError);
			} else {
				const {type, value} = runtime.evaluateExpr(expression, requestedType ?? undefined);
				expect(type).toEqual(output[0]);
				expect(value).toEqual(output[1]);
			}
		});
	}
});

describe("runtime's statement executor", () => {
	for(const [name, statement, setup, test, inputs] of statementTests){
		it(`should produce the expected output for ${name}`, () => {
			let output:string | null = null;
			const runtime = new Runtime(
				() => inputs.shift() ?? crash(`Program required input, but none was available`),
				message => output = message.map(x => x.asString()).join("")
			);
			runtime.scopes.push({
				statement: "global",
				opaque: true,
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
			const outputs:string[] = [];
			const runtime = new Runtime(
				() => inputs.shift() ?? crash(`Program required input, but none was available`),
				values => outputs.push(values.map(x => x.asString()).join(""))
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
