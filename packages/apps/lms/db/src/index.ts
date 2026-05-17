import { env } from "@de100/apps-lms-env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as dbSchema from "./schema";

export function createDb_() {
	const sql = neon(env.DATABASE_URL);
	return drizzle(sql, { schema: dbSchema });
}

declare global {
	var $db: ReturnType<typeof createDb_> | undefined;
}

export function createDb(mode?: "redeclare" | "keep" | "create-only") {
	switch (mode) {
		case "redeclare": {
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to reassign the global $db variable in this case.</explanation>
			return ($db = createDb_());
		}
		case "keep": {
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to assign to the global $db variable if it's not already set.</explanation>
			return ($db ??= createDb_());
		}
		case "create-only": {
			return createDb_();
		}
		default: {
			if (process.env.NODE_ENV === "production") {
				// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to assign to the global $db variable if it's not already set.</explanation>
				return ($db ??= createDb_());
			}

			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to reassign the global $db variable in development to ensure we have a fresh instance.</explanation>
			return ($db = createDb_());
		}
	}
}

export const db = createDb();

export { dbSchema };
