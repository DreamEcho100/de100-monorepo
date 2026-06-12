import { createAuthClient } from "better-auth/solid";

import { resolveApiRequestInput } from "~/libs/apis/request-url";

export const authClient = createAuthClient({
	fetchOptions: {
		customFetchImpl: (input: string | URL | Request, init?: RequestInit) =>
			fetch(resolveApiRequestInput(input), init),
	},
});
