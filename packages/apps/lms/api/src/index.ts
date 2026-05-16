import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

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
