/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the object that stores all registered statements.
*/

import { TokenType } from "../lexer/lexer-types";
import { Statement } from "./statement";
import { StatementType } from "./statement-types";

/** Stores all statement constructors. */
export const statements = {
	byStartKeyword: Object.create(null) as Partial<Record<TokenType, (typeof Statement)[]>>,
	byType: Object.create(null) as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};
