// @ts-check

import { URL, fileURLToPath } from "url";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["core/build/", "spec/build/", "scripts/**.js", "scripts/**.d.ts", "cli/build/", "ui/build/"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: ["./core/tsconfig.json", "./spec/tsconfig.json", "./scripts/tsconfig.json", "./cli/tsconfig.json", "./ui/tsconfig.json"],
				tsconfigRootDir: fileURLToPath(new URL(".", import.meta.url)),
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
						"SwitchCase",
						"ConditionalExpression",
					],
				}
			],
			"linebreak-style": "off",
			"semi": [
				"error",
				"always"
			],
			"no-unused-vars": "off",
			"prefer-const": "warn",
			"no-unexpected-multiline": "off",
			"@typescript-eslint/no-unused-vars": "off",
			// "@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-duplicate-type-constituents": "off",
			"@typescript-eslint/no-unsafe-function-type": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-misused-promises": ["warn", {
				checksVoidReturn: false,
			}]
			// "@typescript-eslint/no-redundant-type-constituents": "off",
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
