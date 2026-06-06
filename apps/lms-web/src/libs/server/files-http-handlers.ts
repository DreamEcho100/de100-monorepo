import { createContext } from "@de100/apps-lms-api/context";
import { createLmsFilesOrpcHandlers } from "@de100/apps-lms-api/files-orpc";
import { createDb } from "@de100/apps-lms-db";

export async function createFilesHttpHandlers(request: Request) {
	const [context, db] = await Promise.all([
		createContext({
			headers: new Headers(request.headers),
			request,
		}),
		createDb(),
	]);

	return createLmsFilesOrpcHandlers({
		context: {
			...context,
			db,
		},
	});
}

export function createFilesJsonResponse(input: unknown, init: ResponseInit = {}) {
	return new Response(JSON.stringify(input), {
		...init,
		headers: {
			"content-type": "application/json",
			...init.headers,
		},
	});
}

export async function readFilesJsonBody<TValue>(request: Request): Promise<TValue> {
	return (await request.json()) as TValue;
}
