/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the object that stores all registered statements.
*/

import type { TokenType } from "../lexer/lexer-types.js";
import type { Statement } from "./statement.js";
import type { StatementType } from "./statement-types.js";

/** Stores all statement constructors. */
export const statements = {
	byStartKeyword: Object.create(null) as Partial<Record<TokenType, (typeof Statement)[]>>,
	byType: Object.create(null) as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};
