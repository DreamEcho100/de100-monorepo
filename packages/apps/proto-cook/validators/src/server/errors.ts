import { z } from "zod/v4";

import { appErrorCodeValues } from "../shared/errors";

const appErrorParamValueSchema = z.union([z.string(), z.number()]);

export const appErrorParamsSchema = z.record(z.string(), appErrorParamValueSchema);

export const appErrorDataSchema = z.object({
	code: z.enum(appErrorCodeValues),
	params: appErrorParamsSchema.optional(),
});

export type AppErrorData = z.infer<typeof appErrorDataSchema>;
