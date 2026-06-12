import { describe, expect, it } from "vitest";

import { resolveDatabaseDriver } from "./driver";

describe("resolveDatabaseDriver", () => {
	it("prefers an explicit postgres override", () => {
		expect(
			resolveDatabaseDriver({
				databaseUrl: "postgresql://user:pass@ep-cool-neon.us-east-1.aws.neon.tech/db",
				driver: "postgres",
			}),
		).toBe("postgres");
	});

	it("detects Neon URLs when driver is auto", () => {
		expect(
			resolveDatabaseDriver({
				databaseUrl: "postgresql://user:pass@ep-cool-neon.us-east-1.aws.neon.tech/db",
			}),
		).toBe("neon-http");
	});

	it("defaults to postgres for local Docker-style URLs", () => {
		expect(
			resolveDatabaseDriver({
				databaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/de100_proto_cook",
			}),
		).toBe("postgres");
	});
});
