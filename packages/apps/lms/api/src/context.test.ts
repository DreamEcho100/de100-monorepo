import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

vi.mock("@de100/apps-lms-auth", () => ({
	auth: {
		api: {
			getSession,
		},
	},
}));

import { createContext } from "./context";

describe("createContext", () => {
	beforeEach(() => {
		getSession.mockReset();
	});

	it("requests the session with the provided headers", async () => {
		const headers = new Headers({ cookie: "session=abc" });
		const session = {
			user: {
				id: "user_123",
			},
		};

		getSession.mockResolvedValue(session);

		await expect(createContext({ headers })).resolves.toEqual({
			auth: null,
			request: null,
			session,
		});
		expect(getSession).toHaveBeenCalledWith({ headers });
	});
});
