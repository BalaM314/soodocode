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
						"SwitchCase"
					]
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
			"prefer-const": "warn",
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
