import { TokenType } from "../lexer/lexer-types";
import { Statement } from "./statement";
import { StatementType } from "./statement-types";
export declare const statements: {
    byStartKeyword: Partial<Record<TokenType, (typeof Statement)[]>>;
    byType: Record<StatementType, typeof Statement>;
    irregular: (typeof Statement)[];
};
