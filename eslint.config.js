// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: ["./src/tsconfig.json", "./spec/tsconfig.json"],
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
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					"args": "all",
					"argsIgnorePattern": "^_",
					"caughtErrors": "all",
					"caughtErrorsIgnorePattern": "^_",
					"destructuredArrayIgnorePattern": "^_",
					"varsIgnorePattern": "^_",
					"ignoreRestSiblings": true
				}
			],
			"@typescript-eslint/unbound-method": "off",
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
