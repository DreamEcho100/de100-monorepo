import { z } from "zod/v4";

import type { FilesUploadProtocolPreference, FileVisibility } from "./constants";
import { fileKindValues, filesUploadProtocolPreferenceValues } from "./constants";
import type { FileSizeInput } from "./size";
import { parseFileSizeToBytes } from "./size";
import type { TimeInput } from "./time";
import { parseTimeToSeconds } from "./time";

export const fileRouteInputKeySchema = z
	.string()
	.min(1)
	.refine(
		(value) =>
			fileKindValues.includes(value as (typeof fileKindValues)[number]) || value.includes("/"),
		{
			message: "Route input keys must be file kinds or MIME patterns.",
		},
	);

export type FileRouteInputKey = z.infer<typeof fileRouteInputKeySchema>;

export type FileRouteRuleInput = {
	access?: FileVisibility;
	contentDisposition?: "attachment" | "inline";
	maxFileCount?: number;
	maxFileSize?: FileSizeInput;
	minFileCount?: number;
	protocols?: FilesUploadProtocolPreference[];
};

export type NormalizedFileRouteRule = {
	access: FileVisibility;
	contentDisposition: "attachment" | "inline";
	maxFileCount: number;
	maxFileSizeBytes: number;
	minFileCount: number;
	protocols: FilesUploadProtocolPreference[];
};

export type FileRouteConfigInput = Record<FileRouteInputKey, FileRouteRuleInput>;
export type NormalizedFileRouteConfig = Record<FileRouteInputKey, NormalizedFileRouteRule>;

export type FileRouteOptionsInput = {
	awaitServerData?: boolean;
	presignedUrlTtl?: TimeInput;
};

export type NormalizedFileRouteOptions = {
	awaitServerData: boolean;
	presignedUrlTtlSeconds: number;
};

export function normalizeFileRouteConfig(input: FileRouteConfigInput): NormalizedFileRouteConfig {
	const entries = Object.entries(input);
	if (entries.length === 0) {
		throw new Error("File route config cannot be empty.");
	}

	return Object.fromEntries(
		entries.map(([key, rule]) => {
			fileRouteInputKeySchema.parse(key);
			const maxFileCount = rule.maxFileCount ?? 1;
			const minFileCount = rule.minFileCount ?? 1;

			if (!Number.isInteger(maxFileCount) || maxFileCount <= 0) {
				throw new Error(`maxFileCount for ${key} must be a positive integer.`);
			}

			if (!Number.isInteger(minFileCount) || minFileCount <= 0) {
				throw new Error(`minFileCount for ${key} must be a positive integer.`);
			}

			if (minFileCount > maxFileCount) {
				throw new Error(`minFileCount for ${key} cannot exceed maxFileCount.`);
			}

			const protocols = rule.protocols ?? ["auto"];
			if (protocols.length === 0) {
				throw new Error(`protocols for ${key} cannot be empty.`);
			}

			for (const protocol of protocols) {
				if (!filesUploadProtocolPreferenceValues.includes(protocol)) {
					throw new Error(`Unsupported upload protocol: ${protocol}`);
				}
			}

			return [
				key,
				{
					access: rule.access ?? "private",
					contentDisposition: rule.contentDisposition ?? "inline",
					maxFileCount,
					maxFileSizeBytes: parseFileSizeToBytes(rule.maxFileSize ?? "4MB"),
					minFileCount,
					protocols: [...protocols],
				} satisfies NormalizedFileRouteRule,
			];
		}),
	);
}

export function normalizeFileRouteOptions(
	input: FileRouteOptionsInput = {},
): NormalizedFileRouteOptions {
	return {
		awaitServerData: input.awaitServerData ?? true,
		presignedUrlTtlSeconds: parseTimeToSeconds(input.presignedUrlTtl ?? "1h"),
	};
}
