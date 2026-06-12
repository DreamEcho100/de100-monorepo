import {
	healthCheckOutputSchema,
	privateDataOutputSchema,
} from "@de100/apps-proto-cook-validators/server";
import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { coursesRouter } from "./courses";
import { filesRouter } from "./files";
import { todoRouter } from "./todo";

export const appRouter = {
	healthCheck: publicProcedure
		.output(healthCheckOutputSchema)
		.route({
			method: "GET",
			path: "/health-check",
			summary: "Check whether the Proto Cook API is reachable",
			tags: ["System"],
		})
		.handler(() => "OK"),
	courses: coursesRouter,
	files: filesRouter,
	privateData: protectedProcedure
		.output(privateDataOutputSchema)
		.route({
			method: "GET",
			path: "/private-data",
			summary: "Read a protected example payload for the signed-in user",
			tags: ["System"],
		})
		.handler(({ context }) => ({
			message: "This is private",
			user: context.session.user,
		})),
	todo: todoRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
