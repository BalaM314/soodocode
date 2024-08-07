// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["build/", "spec/build/"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: ["./src/tsconfig.json", "./spec/tsconfig.json", "./scripts/tsconfig.json"],
				tsconfigRootDir: import.meta.dirname,
			}
		},
		rules: {
			"indent": [
				"warn",
				"tab",
				{
					ignoredNodes: [
						"* > TemplateLiteral",
						"TemplateLiteral ~ *",
						"SwitchCase"
					],
					flatTernaryExpressions: true
				}
			],
			"linebreak-style": [
				"error",
				"windows"
			],
			"semi": [
				"error",
				"always"
			],
			"no-unused-vars": "off",
			"prefer-const": "warn",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-duplicate-type-constituents": "off",
			// "@typescript-eslint/no-redundant-type-constituents": "off",
			"@typescript-eslint/ban-types": [
				"error",
				{
					extendDefaults: true,
					types: {
						"Symbol": false,
						"{}": false,
						"Function": false,
					}
				}
			]
			// "@typescript-eslint/no-non-null-assertion": "off",
			// "@typescript-eslint/no-inferrable-types": "off",
			// "@typescript-eslint/no-namespace": "off"
		},
	},
	{
		files: ["eslint.config.js"],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
