import { describe, expect, it } from "vitest";

import {
	createHlsManifestResponse,
	createHlsSegmentResponse,
	selectReadyArtifact,
	selectReadyArtifactGroup,
} from "./artifact-delivery";

const now = new Date("2026-06-07T00:00:00Z");

describe("artifact delivery helpers", () => {
	it("selects the newest ready artifact group by kind", () => {
		const selected = selectReadyArtifactGroup(
			[
				createGroup({ id: "draft", revision: 3, status: "draft" }),
				createGroup({ id: "old", revision: 1 }),
				createGroup({ id: "new", revision: 2 }),
			],
			{ kind: "hls" },
		);

		expect(selected?.id).toBe("new");
	});

	it("selects ready artifacts by kind and optional rendition", () => {
		const selected = selectReadyArtifact(
			[
				createArtifact({ id: "deleted", deletedAt: now, kind: "hls-segment" }),
				createArtifact({ id: "wrong-rendition", kind: "hls-segment", renditionLabel: "480p" }),
				createArtifact({ id: "selected", kind: "hls-segment", renditionLabel: "720p" }),
			],
			{ kind: "hls-segment", renditionLabel: "720p" },
		);

		expect(selected?.id).toBe("selected");
	});

	it("creates HLS manifest and segment responses with expected content types", () => {
		const manifest = createHlsManifestResponse({
			object: { body: "#EXTM3U" },
			visibility: "public",
		});
		const segment = createHlsSegmentResponse({
			format: "fmp4-cmaf",
			object: { body: "segment" },
			visibility: "public",
		});

		expect(manifest.headers.get("content-type")).toBe("application/vnd.apple.mpegurl");
		expect(segment.headers.get("content-type")).toBe("video/mp4");
	});
});

function createGroup(
	overrides: Partial<
		ReturnType<typeof selectReadyArtifactGroup> & { status: "draft" | "ready" }
	> = {},
) {
	return {
		bucketName: "private-files",
		createdAt: now,
		deletedAt: null,
		fileId: "file_1",
		id: "group",
		kind: "hls",
		metadata: null,
		revision: 1,
		status: "ready",
		storagePrefix: "files/file_1/artifacts/group/rev-1",
		updatedAt: now,
		visibility: "private",
		...overrides,
	} as const;
}

function createArtifact(
	overrides: Partial<NonNullable<ReturnType<typeof selectReadyArtifact>>> = {},
) {
	return {
		bucketName: "private-files",
		contentType: "video/mp2t",
		createdAt: now,
		deletedAt: null,
		durationMs: 4_000,
		fileId: "file_1",
		groupId: "group_1",
		height: 720,
		id: "artifact",
		key: "files/file_1/artifacts/group_1/rev-1/720p/0.ts",
		kind: "hls-segment",
		metadata: null,
		renditionLabel: "720p",
		size: 1024,
		sortOrder: 0,
		status: "ready",
		updatedAt: now,
		width: 1280,
		...overrides,
	} as const;
}
