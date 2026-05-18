export const databaseDrivers = ["auto", "postgres", "neon-http"] as const;

export type DatabaseDriver = (typeof databaseDrivers)[number];
export type ResolvedDatabaseDriver = Exclude<DatabaseDriver, "auto">;

type ResolveDatabaseDriverOptions = {
	databaseUrl: string;
	driver?: DatabaseDriver;
};

function isNeonUrl(databaseUrl: string) {
	try {
		const { host } = new URL(databaseUrl);
		return host.includes("neon.tech") || host.includes("neon.build");
	} catch {
		return databaseUrl.includes("neon");
	}
}

export function resolveDatabaseDriver({
	databaseUrl,
	driver = "auto",
}: ResolveDatabaseDriverOptions): ResolvedDatabaseDriver {
	if (driver === "postgres" || driver === "neon-http") {
		return driver;
	}

	return isNeonUrl(databaseUrl) ? "neon-http" : "postgres";
}
