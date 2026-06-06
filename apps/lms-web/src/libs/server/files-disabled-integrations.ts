export const disabledFilesIntegrationValues = ["companion", "s3-multipart", "transloadit"] as const;

export type DisabledFilesIntegration = (typeof disabledFilesIntegrationValues)[number];

const disabledFilesIntegrations = new Set<string>(disabledFilesIntegrationValues);

export function isDisabledFilesIntegration(
	value: string | undefined,
): value is DisabledFilesIntegration {
	return typeof value === "string" && disabledFilesIntegrations.has(value);
}

export function createDisabledFilesIntegrationResponse(
	integration: DisabledFilesIntegration,
	init: ResponseInit = {},
) {
	return new Response(
		JSON.stringify({
			enabled: false,
			integration,
			message: `Files ${integration} integration is not enabled for this deployment.`,
			reason: "not-configured",
		}),
		{
			...init,
			headers: {
				"content-type": "application/json",
				...init.headers,
			},
			status: init.status ?? 501,
		},
	);
}

export function createUnknownFilesIntegrationResponse(integration: string | undefined) {
	return new Response(
		JSON.stringify({
			enabled: false,
			integration: integration ?? null,
			message: "Unknown files integration.",
			reason: "unknown-integration",
		}),
		{
			headers: {
				"content-type": "application/json",
			},
			status: 404,
		},
	);
}
