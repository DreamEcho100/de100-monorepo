import { z } from "zod/v4";

import {
	fileKindValues,
	fileStatusValues,
	filesApiApproachValues,
	filesDeliveryStrategyValues,
	filesProcessingModeValues,
	filesStorageBackendValues,
	filesUploadIntegrationValues,
	filesUploadProtocolPreferenceValues,
	filesUploadProtocolValues,
	filesUploadTargetProtocolValues,
	fileVisibilityValues,
	processingJobStatusValues,
	uploadSessionStatusValues,
} from "./constants";
import { storageProviderConfigSchema } from "./provider-config";

export const fileKindSchema = z.enum(fileKindValues);
export const fileVisibilitySchema = z.enum(fileVisibilityValues);
export const fileStatusSchema = z.enum(fileStatusValues);
export const uploadSessionStatusSchema = z.enum(uploadSessionStatusValues);
export const processingJobStatusSchema = z.enum(processingJobStatusValues);
export const filesApiApproachSchema = z.enum(filesApiApproachValues);
export const filesUploadProtocolSchema = z.enum(filesUploadProtocolValues);
export const filesUploadTargetProtocolSchema = z.enum(filesUploadTargetProtocolValues);
export const filesUploadProtocolPreferenceSchema = z.enum(filesUploadProtocolPreferenceValues);
export const filesDeliveryStrategySchema = z.enum(filesDeliveryStrategyValues);
export const filesUploadIntegrationSchema = z.enum(filesUploadIntegrationValues);
export const filesProcessingModeSchema = z.enum(filesProcessingModeValues);
export const filesStorageBackendSchema = z.enum(filesStorageBackendValues);

export const fileRecordSchema = z.object({
	accessUrl: z.string().min(1).nullable(),
	bucketName: z.string().nullable(),
	contentType: z.string().min(1),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	fileName: z.string().min(1),
	id: z.string().min(1),
	key: z.string().min(1),
	kind: fileKindSchema,
	metadata: z.record(z.string(), z.unknown()).nullable(),
	size: z.number().int().nonnegative(),
	status: fileStatusSchema,
	updatedAt: z.date(),
	userId: z.string().min(1).nullable(),
	visibility: fileVisibilitySchema,
});

export const createUploadTargetInputSchema = z.object({
	contentType: z.string().min(1),
	fileName: z.string().min(1),
	fileSize: z.number().int().nonnegative(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	protocol: filesUploadProtocolPreferenceSchema,
	routeSlug: z.string().min(1),
	visibility: fileVisibilitySchema.default("private"),
});

export const createUploadTargetOutputSchema = z.object({
	expiresAt: z.date().nullable(),
	fields: z.record(z.string(), z.string()).nullable(),
	headers: z.record(z.string(), z.string()).nullable(),
	method: z.enum(["POST", "PUT"]),
	protocol: filesUploadTargetProtocolSchema,
	sessionId: z.string().min(1),
	targetId: z.string().min(1),
	uploadUrl: z.string().min(1),
});

export const filesUploadPlanSchema = z.object({
	approach: filesApiApproachSchema,
	deliveryStrategy: filesDeliveryStrategySchema,
	integrations: z.array(filesUploadIntegrationSchema),
	processingMode: filesProcessingModeSchema,
	protocol: filesUploadProtocolSchema,
	reason: z.string().min(1),
	storageBackend: filesStorageBackendSchema,
});

export const filesPlatformConfigSchema = z.object({
	storage: storageProviderConfigSchema,
});

export type FileRecord = z.infer<typeof fileRecordSchema>;
export type CreateUploadTargetInput = z.infer<typeof createUploadTargetInputSchema>;
export type CreateUploadTargetOutput = z.infer<typeof createUploadTargetOutputSchema>;
export type FilesPlatformConfig = z.infer<typeof filesPlatformConfigSchema>;
