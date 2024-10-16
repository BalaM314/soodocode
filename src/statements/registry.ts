import { TokenType } from "../lexer/lexer-types";
import { Statement } from "./statement";
import { StatementType } from "./statement-types";

/** Stores all statement constructors. */

export const statements = {
	byStartKeyword: Object.create(null) as Partial<Record<TokenType, (typeof Statement)[]>>,
	byType: Object.create(null) as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};
