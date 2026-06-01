import DashboardPage from "~/dashboard-page";
import { getQueryClient } from "~/libs/@tanstack/query/query-client.js";
import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";

export default DashboardPage;

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

async function preloadDashboardRoute({ intent }: { intent?: string }) {
	if (intent !== "preload") {
		return;
	}

	if (!(await canPreloadAuthenticatedRoute())) {
		return;
	}

	const queryClient = getQueryClient();
	await Promise.allSettled([
		queryClient.prefetchQuery(orpc.privateData.queryOptions()),
		queryClient.prefetchQuery(orpc.todo.getAll.queryOptions()),
	]);
}

export const route = {
	preload: preloadDashboardRoute,
};
