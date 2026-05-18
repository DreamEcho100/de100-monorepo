import { appRouter } from "@de100/apps-lms-api/routers/index";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { openApiDocsPath } from "./openapi-routes";

const openApiGenerator = new OpenAPIGenerator({
	schemaConverters: [new ZodToJsonSchemaConverter()],
});

export const generateOpenApiSpec = (request: Request) =>
	openApiGenerator.generate(appRouter, {
		servers: [{ url: new URL(openApiDocsPath, request.url).toString() }],
	});
