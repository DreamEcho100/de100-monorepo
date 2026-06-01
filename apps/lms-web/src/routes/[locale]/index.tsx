import HomePage from "~/home-page";
import { getQueryClient } from "~/libs/@tanstack/query/query-client.js";
import { orpc } from "~/libs/apis/orpc";

export default HomePage;

async function preloadHomeRoute({ intent }: { intent?: string }) {
	if (intent !== "preload") {
		return;
	}

	const queryClient = getQueryClient();
	await queryClient.prefetchQuery(orpc.healthCheck.queryOptions());
}

export const route = {
	preload: preloadHomeRoute,
};
