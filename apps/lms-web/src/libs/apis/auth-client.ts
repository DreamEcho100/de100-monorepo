import { env } from "@de100/apps-lms-env/web";
import { createAuthClient } from "better-auth/solid";

export const authClient = createAuthClient(
	env.VITE_SERVER_URL ? { baseURL: env.VITE_SERVER_URL } : {},
);
