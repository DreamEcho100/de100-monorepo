import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

declare global {
	interface ImportMetaEnv {
		[key: string]: string | undefined;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export const env = createEnv({
	clientPrefix: "VITE_APP_PROTO_COOK_",
	client: {
		VITE_APP_PROTO_COOK_SERVER_URL: z.url().optional(),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
