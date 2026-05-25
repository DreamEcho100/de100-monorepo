import { env } from "@de100/apps-lms-env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as dbSchema from "./schema";

function createDb_() {
	switch (env.database.type) {
		case "neon-http": {
			const sql = neon(env.database.url);
			return drizzleNeon(sql, { schema: dbSchema });
		}
		case "postgres": {
			const sql = postgres(env.database.url, {
				max: env.NODE_ENV === "production" ? 10 : 1,
			});
			return drizzlePostgres(sql, { schema: dbSchema });
		}
	}
}

export type DbInstance = ReturnType<typeof createDb_>;

declare global {
	var $db: DbInstance | undefined;
}

const globalForDb = globalThis as typeof globalThis & {
	$db?: DbInstance;
};

export function createDb(mode: "redeclare" | "keep" | "create-only" = "keep") {
	switch (mode) {
		case "redeclare": {
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to reassign the global $db variable in this case.</explanation>
			return (globalForDb.$db = createDb_());
		}
		case "keep": {
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to assign to the global $db variable if it's not already set.</explanation>
			return (globalForDb.$db ??= createDb_());
		}
		case "create-only": {
			return createDb_();
		}
		default: {
			throw new Error(`Unsupported createDb mode: ${mode}`);
		}
	}
}

export const db = createDb();

export { dbSchema };
