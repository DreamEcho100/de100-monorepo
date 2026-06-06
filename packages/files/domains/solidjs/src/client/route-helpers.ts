import type { FilesClient } from "@de100/files-client";
import { createFilesClient, createFilesRouteHelpers } from "@de100/files-client";

export function createSolidFilesRouteHelpers<TRoutes extends Record<string, unknown>>(
	client: FilesClient = createFilesClient(),
) {
	return createFilesRouteHelpers<TRoutes>(client);
}
