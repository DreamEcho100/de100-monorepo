import { env } from "@de100/apps-lms-env/server";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o.$config({
	initialOutputValidationIndex:
		env.NODE_ENV === "production" || env.DISABLE_ORPC_OUTPUT_VALIDATION ? Number.NaN : undefined,
});

export function requireAuthenticatedSession(session: Context["session"]) {
	if (!session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}

	return session;
}

const requireAuth = o.middleware(async ({ context, next }) => {
	const session = requireAuthenticatedSession(context.session);

	return next({
		context: {
			session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);
