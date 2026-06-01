import ApiReferencePage from "~/api-reference-page";
import { getQueryClient } from "~/libs/@tanstack/query/query-client.js";
import { openApiSpecPath } from "~/libs/apis/openapi-routes";

export default ApiReferencePage;

export const fetchOpenApiSpec = async () => {
	const response = await fetch(openApiSpecPath);
	if (!response.ok) {
		throw new Error(String(response.status));
	}

	return response.json();
};

async function preloadApiReferenceRoute({ intent }: { intent?: string }) {
	if (intent !== "preload") {
		return;
	}

	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryFn: fetchOpenApiSpec,
		queryKey: ["openapi-spec"],
	});
}

export const route = {
	preload: preloadApiReferenceRoute,
};
