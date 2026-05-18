import { auth } from "@de100/apps-lms-auth";

export interface CreateContextOptions {
	headers: Headers;
	request?: Request;
}

export async function createContext({ headers, request }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers,
	});
	return {
		auth: null,
		request: request ?? null,
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
