import { auth } from "@de100/apps-proto-cook-auth";

export interface CreateContextOptions {
	headers: Headers;
	request?: Request;
}

export async function createContext({ headers, request }: CreateContextOptions) {
	const normalizedHeaders = new Headers(headers);
	let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
	try {
		session = await auth.api.getSession({
			headers: normalizedHeaders,
		});
	} catch (error) {
		console.error("[api-context] auth.api.getSession failed", error);
		throw error;
	}
	return {
		auth: null,
		request: request ?? null,
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
