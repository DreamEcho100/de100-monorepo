import { afterEach, describe, expect, it, vi } from "vitest";

const { getSession, prefetchQuery } = vi.hoisted(() => ({
	getSession: vi.fn(),
	prefetchQuery: vi.fn(),
}));

vi.mock("~/home-page", () => ({ default: () => null }));
vi.mock("~/dashboard-page", () => ({ default: () => null }));
vi.mock("~/media-page", () => ({ default: () => null }));
vi.mock("~/todos-page", () => ({ default: () => null }));
vi.mock("~/api-reference-page", () => ({ default: () => null }));

vi.mock("~/libs/@tanstack/query/query-client.js", () => ({
	getQueryClient: () => ({
		prefetchQuery,
	}),
}));

vi.mock("~/libs/apis/auth-client", () => ({
	authClient: {
		getSession,
	},
}));

vi.mock("~/libs/apis/orpc", () => ({
	orpc: {
		healthCheck: {
			queryOptions: () => ({ queryKey: ["health"] }),
		},
		privateData: {
			queryOptions: () => ({ queryKey: ["private-data"] }),
		},
		todo: {
			getAll: {
				queryOptions: () => ({ queryKey: ["todos"] }),
			},
		},
	},
}));

import { route as dashboardRoute } from "./dashboard";
import { route as homeRoute } from "./index";

afterEach(() => {
	prefetchQuery.mockReset();
	getSession.mockReset();
	vi.unstubAllGlobals();
});

describe("route preload behavior", () => {
	it("prefetches public data on preload intent", async () => {
		prefetchQuery.mockResolvedValue(undefined);

		await homeRoute.preload({ intent: "preload" });

		expect(prefetchQuery).toHaveBeenCalledTimes(1);
	});

	it("skips public prefetch on non-preload intent", async () => {
		prefetchQuery.mockResolvedValue(undefined);

		await homeRoute.preload({ intent: "navigate" });

		expect(prefetchQuery).not.toHaveBeenCalled();
	});

	it("skips gated prefetch when session is unavailable", async () => {
		vi.stubGlobal("window", {});
		getSession.mockResolvedValue({ data: null });

		await dashboardRoute.preload({ intent: "preload" });

		expect(prefetchQuery).not.toHaveBeenCalled();
	});

	it("prefetches gated data when session is available", async () => {
		vi.stubGlobal("window", {});
		getSession.mockResolvedValue({ data: { user: { id: "user-1" } } });
		prefetchQuery.mockResolvedValue(undefined);

		await dashboardRoute.preload({ intent: "preload" });

		expect(prefetchQuery).toHaveBeenCalledTimes(2);
	});
});
