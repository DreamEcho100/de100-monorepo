import { env } from "@de100/apps-lms-env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseDriver } from "./driver";
import { resolveDatabaseDriver } from "./driver";
import * as dbSchema from "./schema";

type CreateDbOptions = {
	databaseUrl?: string;
	driver?: DatabaseDriver;
};

export function createDb_(options: CreateDbOptions = {}) {
	const databaseUrl = options.databaseUrl ?? env.APP_LMS_DATABASE_URL;
	const resolvedDriver = resolveDatabaseDriver({
		databaseUrl,
		driver: options.driver ?? env.APP_LMS_DATABASE_DRIVER,
	});

	switch (resolvedDriver) {
		case "neon-http": {
			const sql = neon(databaseUrl);
			return drizzleNeon(sql, { schema: dbSchema });
		}
		case "postgres": {
			const sql = postgres(databaseUrl, {
				max: process.env.NODE_ENV === "production" ? 10 : 1,
			});
			return drizzlePostgres(sql, { schema: dbSchema });
		}
		default: {
			const exhaustiveDriver: never = resolvedDriver;
			throw new Error(`Unsupported database driver: ${exhaustiveDriver}`);
		}
	}
}

declare global {
	var $db: ReturnType<typeof createDb_> | undefined;
}

const globalForDb = globalThis as typeof globalThis & {
	$db?: ReturnType<typeof createDb_>;
};

export function createDb(mode?: "redeclare" | "keep" | "create-only") {
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
			if (process.env.NODE_ENV === "production") {
				// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to assign to the global $db variable if it's not already set.</explanation>
				return (globalForDb.$db ??= createDb_());
			}

			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation> We want to reassign the global $db variable in development to ensure we have a fresh instance.</explanation>
			return (globalForDb.$db = createDb_());
		}
	}
}

export const db = createDb();

export { dbSchema };
