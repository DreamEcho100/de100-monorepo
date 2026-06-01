import { getQueryClient } from "~/libs/@tanstack/query/query-client.js";
import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";
import MediaPage from "~/media-page";

export default MediaPage;

async function canPreloadAuthenticatedRoute() {
	if (typeof window === "undefined") {
		return false;
	}

	try {
		const session = await authClient.getSession();
		return Boolean(session.data);
	} catch {
		return false;
	}
}

async function preloadMediaRoute({ intent }: { intent?: string }) {
	if (intent !== "preload") {
		return;
	}

	if (!(await canPreloadAuthenticatedRoute())) {
		return;
	}

	const queryClient = getQueryClient();
	await Promise.allSettled([
		queryClient.prefetchQuery(orpc.media.getCapabilities.queryOptions()),
		queryClient.prefetchQuery(orpc.media.getAll.queryOptions()),
	]);
}

export const route = {
	preload: preloadMediaRoute,
};
