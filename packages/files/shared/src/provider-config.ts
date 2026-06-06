import { z } from "zod/v4";

export const s3ProviderProfileSchema = z.enum([
	"aws-s3",
	"r2",
	"minio",
	"digitalocean-spaces",
	"wasabi",
	"custom-s3",
]);
export type S3ProviderProfile = z.infer<typeof s3ProviderProfileSchema>;

const bucketSetSchema = z.object({
	privateBucket: z.string().min(1),
	publicBucket: z.string().min(1),
});

export const localStorageProviderConfigSchema = z.object({
	root: z.string().min(1),
	type: z.literal("local"),
});

export const s3StorageProviderConfigSchema = z.object({
	accessKeyId: z.string().min(1).optional(),
	buckets: bucketSetSchema,
	endpoint: z.url().optional(),
	forcePathStyle: z.boolean().default(true),
	profile: s3ProviderProfileSchema,
	publicBaseUrl: z.url().optional(),
	region: z.string().min(1),
	secretAccessKey: z.string().min(1).optional(),
	type: z.literal("s3"),
});

export const gcsStorageProviderConfigSchema = z.object({
	buckets: bucketSetSchema,
	projectId: z.string().min(1),
	type: z.literal("gcs"),
});

export const azureStorageProviderConfigSchema = z.object({
	accountName: z.string().min(1),
	containers: bucketSetSchema,
	type: z.literal("azure"),
});

export const customStorageProviderConfigSchema = z.object({
	providerId: z.string().min(1),
	type: z.literal("custom"),
});

export const storageProviderConfigSchema = z.discriminatedUnion("type", [
	localStorageProviderConfigSchema,
	s3StorageProviderConfigSchema,
	gcsStorageProviderConfigSchema,
	azureStorageProviderConfigSchema,
	customStorageProviderConfigSchema,
]);

export type LocalStorageProviderConfig = z.infer<typeof localStorageProviderConfigSchema>;
export type S3StorageProviderConfig = z.infer<typeof s3StorageProviderConfigSchema>;
export type GcsStorageProviderConfig = z.infer<typeof gcsStorageProviderConfigSchema>;
export type AzureStorageProviderConfig = z.infer<typeof azureStorageProviderConfigSchema>;
export type CustomStorageProviderConfig = z.infer<typeof customStorageProviderConfigSchema>;
export type StorageProviderConfig = z.infer<typeof storageProviderConfigSchema>;

export function assertStorageProviderConfig(input: unknown): StorageProviderConfig {
	return storageProviderConfigSchema.parse(input);
}
