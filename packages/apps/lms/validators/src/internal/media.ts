import { z } from "zod/v4";

export const mediaVisibilitySchema = z.enum(["private", "public"]);
export const mediaStatusSchema = z.enum(["draft", "ready", "deleted"]);
export const mediaStorageDriverSchema = z.enum(["local", "r2"]);

export const mediaCapabilitiesOutputSchema = z.object({
	driver: mediaStorageDriverSchema,
	supportsDirectPublicUrl: z.boolean(),
	supportsSignedDelivery: z.boolean(),
});

export const mediaSignedAccessInputSchema = z.object({
	expiresInSeconds: z
		.number()
		.int()
		.positive()
		.max(60 * 60 * 24 * 7)
		.optional(),
	id: z.string().min(1),
});

export const mediaSignedAccessOutputSchema = z.object({
	expiresAt: z.date(),
	url: z.string().url(),
});

export const mediaRecordOutputSchema = z.object({
	accessUrl: z.string().min(1),
	bucketName: z.string().nullable(),
	confirmedAt: z.date().nullable(),
	contentType: z.string().min(1),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	directUrl: z.string().nullable(),
	fileName: z.string().min(1),
	id: z.string().min(1),
	key: z.string().min(1),
	size: z.number().int().nonnegative(),
	status: mediaStatusSchema,
	updatedAt: z.date(),
	userId: z.string().min(1),
	visibility: mediaVisibilitySchema,
});

export const mediaListOutputSchema = z.array(mediaRecordOutputSchema);

type MediaUploadFile = {
	arrayBuffer: () => Promise<ArrayBuffer>;
	name: string;
	size: number;
	type: string;
};

function isMediaUploadFile(value: unknown): value is MediaUploadFile {
	return (
		typeof value === "object" &&
		value !== null &&
		"arrayBuffer" in value &&
		"name" in value &&
		"size" in value &&
		"type" in value &&
		typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
		typeof (value as { name?: unknown }).name === "string" &&
		typeof (value as { size?: unknown }).size === "number" &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

export const mediaUploadInputSchema = z.object({
	file: z.custom<MediaUploadFile>((value) => isMediaUploadFile(value), {
		message: "Expected a file upload.",
	}),
	visibility: mediaVisibilitySchema.default("private"),
});

export const mediaRecordIdInputSchema = z.object({
	id: z.string().min(1),
});
