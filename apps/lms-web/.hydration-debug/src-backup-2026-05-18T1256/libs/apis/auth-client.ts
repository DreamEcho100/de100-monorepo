import { createAuthClient } from "better-auth/solid";

import { resolveApiRequestInput } from "~/libs/apis/request-url";

export const authClient = createAuthClient({
	customFetchImpl: (input, init) => fetch(resolveApiRequestInput(input), init),
});
