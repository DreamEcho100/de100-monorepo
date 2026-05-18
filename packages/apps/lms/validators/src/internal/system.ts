import { z } from "zod/v4";

export const healthCheckOutputSchema = z.string();

export const privateSessionUserOutputSchema = z
	.object({
		email: z.string().email(),
		id: z.string().min(1),
		image: z.string().nullable().optional(),
		name: z.string().min(1),
	})
	.passthrough();

export const privateDataOutputSchema = z.object({
	message: z.string().min(1),
	user: privateSessionUserOutputSchema,
});
