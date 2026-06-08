import { describe, expect, it } from "vitest";

import {
	assertFilesVideoHlsGeneratedObjects,
	createFilesVideoFfmpegHlsCommands,
	createFilesVideoHlsAes128KeyInfoFile,
	createFilesVideoHlsAes128KeyObject,
	createFilesVideoHlsArtifactInputs,
	createFilesVideoHlsMasterManifest,
	createFilesVideoHlsMetadataObject,
	createFilesVideoHlsPlan,
	createFilesVideoHlsStagingPlan,
	createFilesVideoLocalPreprocessPlan,
	detectFilesVideoInputFormat,
	getFilesHlsSegmentContentType,
	getFilesHlsSegmentExtension,
	promoteFilesVideoHlsGeneratedObjects,
	selectFilesVideoHlsRenditions,
	validateFilesVideoHlsGeneratedObjects,
} from "./index";

describe("video HLS processing planning", () => {
	it("detects accepted course video inputs from content type or extension", () => {
		expect(
			detectFilesVideoInputFormat({ contentType: "video/quicktime", fileName: "clip.bin" }),
		).toBe("mov");
		expect(detectFilesVideoInputFormat({ fileName: "lesson.MKV" })).toBe("mkv");
		expect(detectFilesVideoInputFormat({ fileName: "lesson.txt" })).toBeUndefined();
	});

	it("selects source-aware HLS renditions without upscaling", () => {
		const renditions = selectFilesVideoHlsRenditions({
			preset: {
				renditions: [
					{ bandwidth: 800_000, height: 480, label: "480p", videoBitrate: 700_000, width: 854 },
					{
						bandwidth: 2_800_000,
						height: 720,
						label: "720p",
						videoBitrate: 2_500_000,
						width: 1280,
					},
				],
				segmentDurationSeconds: 4,
				segmentFormat: "mpeg-ts",
				skipRenditionsAboveSource: true,
			},
			sourceMetadata: { height: 540, width: 960 },
		});

		expect(renditions.map((rendition) => rendition.label)).toEqual(["480p"]);
	});

	it("creates fMP4/CMAF plans with init segments and poster/caption locations", () => {
		const plan = createFilesVideoHlsPlan({
			preset: {
				inputFormats: ["mp4"],
				originalRetention: "keep",
				playbackProtection: "signed-session",
				preset: {
					renditions: [
						{
							bandwidth: 2_800_000,
							height: 720,
							label: "720p",
							videoBitrate: 2_500_000,
							width: 1280,
						},
					],
					segmentDurationSeconds: 6,
					segmentFormat: "fmp4-cmaf",
					skipRenditionsAboveSource: true,
				},
			},
			stagingPrefix: "staging/file-1/",
			targetPrefix: "files/file-1/hls/",
		});

		expect(plan).toMatchObject({
			captionPrefix: "files/file-1/hls/captions",
			masterManifestKey: "files/file-1/hls/master.m3u8",
			posterKey: "files/file-1/hls/poster.jpg",
			segmentContentType: "video/mp4",
			segmentDurationSeconds: 6,
			segmentExtension: "m4s",
			segmentFormat: "fmp4-cmaf",
			stagingPrefix: "staging/file-1",
			targetPrefix: "files/file-1/hls",
		});
		expect(plan.renditions[0]?.initSegmentKey).toBe("files/file-1/hls/720p/init.mp4");
		expect(plan.renditions[0]?.segmentKeyPattern).toBe("files/file-1/hls/720p/segment-%05d.m4s");
	});

	it("maps segment formats to delivery details", () => {
		expect(getFilesHlsSegmentExtension("mpeg-ts")).toBe("ts");
		expect(getFilesHlsSegmentContentType("mpeg-ts")).toBe("video/MP2T");
	});

	it("creates staging plans and promotes generated objects back to target keys", () => {
		const plan = createFilesVideoHlsPlan({
			sourceMetadata: { height: 720, width: 1280 },
			stagingPrefix: "files/file-1/staging/job-1/attempt-1/group-1",
			targetPrefix: "files/file-1/artifacts/group-1/rev-1",
		});
		const stagingPlan = createFilesVideoHlsStagingPlan(plan);

		expect(stagingPlan.masterManifestKey).toBe(
			"files/file-1/staging/job-1/attempt-1/group-1/master.m3u8",
		);
		expect(stagingPlan.renditions.map((rendition) => rendition.manifestKey)).toEqual([
			"files/file-1/staging/job-1/attempt-1/group-1/480p/index.m3u8",
			"files/file-1/staging/job-1/attempt-1/group-1/720p/index.m3u8",
		]);

		expect(
			promoteFilesVideoHlsGeneratedObjects({
				objects: [
					{
						key: "files/file-1/staging/job-1/attempt-1/group-1/master.m3u8",
						size: 10,
					},
				],
				plan,
			}),
		).toEqual([
			{
				key: "files/file-1/artifacts/group-1/rev-1/master.m3u8",
				size: 10,
			},
		]);
	});

	it("plans ffmpeg commands and a master manifest for the selected ladder", () => {
		const plan = createFilesVideoHlsPlan({
			sourceMetadata: { height: 720, width: 1280 },
			stagingPrefix: "staging/file-1",
			targetPrefix: "files/file-1/hls",
		});
		const commands = createFilesVideoFfmpegHlsCommands({
			inputPath: "/tmp/source.mp4",
			plan,
		});
		const masterManifest = createFilesVideoHlsMasterManifest(plan);

		expect(commands).toHaveLength(3);
		expect(commands[0]?.args).toContain("files/file-1/hls/poster.jpg");
		expect(commands[1]?.args).toContain("files/file-1/hls/480p/segment-%05d.ts");
		expect(masterManifest).toContain("#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480");
		expect(masterManifest).toContain("480p/index.m3u8");
		expect(masterManifest).toContain("720p/index.m3u8");
	});

	it("plans AES-128 HLS key artifacts and ffmpeg key-info arguments", () => {
		const plan = createFilesVideoHlsPlan({
			encryption: {
				ivHex: "1".repeat(32),
				keyId: "lesson-key",
			},
			preset: {
				inputFormats: ["mp4"],
				originalRetention: "keep",
				playbackProtection: "aes-128",
				preset: {
					renditions: [
						{
							bandwidth: 800_000,
							height: 480,
							label: "480p",
							videoBitrate: 700_000,
							width: 854,
						},
					],
					segmentDurationSeconds: 4,
					segmentFormat: "mpeg-ts",
					skipRenditionsAboveSource: true,
				},
			},
			stagingPrefix: "staging/file-1",
			targetPrefix: "files/file-1/hls",
		});
		const keyObject = createFilesVideoHlsAes128KeyObject({
			keyBytesHex: "a".repeat(32),
			plan,
		});

		expect(plan.encryption).toMatchObject({
			algorithm: "AES-128",
			ivHex: "1".repeat(32),
			keyId: "lesson-key",
			keyKey: "files/file-1/hls/keys/lesson-key.key",
			keyUri: "de100-hls-key://lesson-key",
		});
		expect(createFilesVideoHlsAes128KeyInfoFile({ keyFilePath: "/tmp/key.bin", plan })).toBe(
			"de100-hls-key://lesson-key\n/tmp/key.bin\n11111111111111111111111111111111\n",
		);
		expect(() =>
			createFilesVideoFfmpegHlsCommands({
				inputPath: "/tmp/source.mp4",
				plan,
			}),
		).toThrow("key info file path");
		expect(
			createFilesVideoFfmpegHlsCommands({
				hlsKeyInfoFilePath: "/tmp/key-info.txt",
				inputPath: "/tmp/source.mp4",
				plan,
			})[1]?.args,
		).toContain("/tmp/key-info.txt");
		expect(keyObject).toMatchObject({
			contentType: "application/octet-stream",
			key: "files/file-1/hls/keys/lesson-key.key",
			size: 16,
		});

		const artifactPlan = createFilesVideoHlsArtifactInputs({
			fileId: "file-1",
			groupId: "group-1",
			objects: [
				{ key: plan.masterManifestKey, size: 10 },
				{ key: plan.posterKey, size: 10 },
				{ key: plan.renditions[0]?.manifestKey ?? "", size: 10 },
				{ key: "files/file-1/hls/480p/segment-00001.ts", size: 10 },
				keyObject,
			],
			plan,
			visibility: "private",
		});

		expect(
			validateFilesVideoHlsGeneratedObjects({ objects: artifactPlan.artifacts, plan }),
		).toEqual({
			missing: [],
			ok: true,
		});
		expect(artifactPlan.group).toMatchObject({
			kind: "hls-encrypted",
			metadata: {
				encryption: {
					keyId: "lesson-key",
					keyUri: "de100-hls-key://lesson-key",
				},
				protectionMode: "aes-128",
			},
		});
		expect(artifactPlan.artifacts).toContainEqual(
			expect.objectContaining({
				kind: "hls-key",
				key: "files/file-1/hls/keys/lesson-key.key",
			}),
		);
	});

	it("creates local pre-process command plans for admin and lab workflows", () => {
		const localPlan = createFilesVideoLocalPreprocessPlan({
			binaryPath: "/usr/bin/ffmpeg",
			inputPath: "/videos/source.mp4",
			outputPrefix: "/encoded/course-1/lesson-1",
			sourceMetadata: { height: 480, width: 854 },
		});

		expect(localPlan.plan.targetPrefix).toBe("/encoded/course-1/lesson-1");
		expect(localPlan.stagingPlan.targetPrefix).toBe("/encoded/course-1/lesson-1/.staging");
		expect(localPlan.commands.every((command) => command.binaryPath === "/usr/bin/ffmpeg")).toBe(
			true,
		);
		expect(localPlan.commands.map((command) => command.args.at(-1))).toContain(
			"/encoded/course-1/lesson-1/.staging/480p/index.m3u8",
		);
	});

	it("validates HLS outputs and creates artifact repository inputs", () => {
		const plan = createFilesVideoHlsPlan({
			sourceMetadata: { height: 480, width: 854 },
			stagingPrefix: "staging/file-1",
			targetPrefix: "files/file-1/hls",
		});
		const metadataObject = createFilesVideoHlsMetadataObject({
			plan,
			sourceMetadata: { height: 480, width: 854 },
		});
		const objects = [
			{
				contentType: "application/vnd.apple.mpegurl",
				key: plan.masterManifestKey,
				size: 100,
			},
			{
				contentType: "image/jpeg",
				key: plan.posterKey,
				size: 50,
			},
			{
				contentType: "application/vnd.apple.mpegurl",
				key: plan.renditions[0]?.manifestKey ?? "",
				size: 40,
			},
			{
				contentType: "video/MP2T",
				key: "files/file-1/hls/480p/segment-00001.ts",
				size: 200,
			},
			metadataObject,
		];

		expect(validateFilesVideoHlsGeneratedObjects({ objects, plan })).toEqual({
			missing: [],
			ok: true,
		});
		expect(() => assertFilesVideoHlsGeneratedObjects({ objects: objects.slice(1), plan })).toThrow(
			"master.m3u8",
		);

		const artifactPlan = createFilesVideoHlsArtifactInputs({
			bucketName: "private-files",
			fileId: "file-1",
			groupId: "group-1",
			objects,
			plan,
			visibility: "private",
		});

		expect(artifactPlan.group).toMatchObject({
			bucketName: "private-files",
			fileId: "file-1",
			id: "group-1",
			kind: "hls",
			status: "ready",
			storagePrefix: "files/file-1/hls",
			visibility: "private",
		});
		expect(artifactPlan.artifacts).toMatchObject([
			{
				kind: "hls-master-manifest",
				key: "files/file-1/hls/master.m3u8",
			},
			{
				kind: "poster",
				key: "files/file-1/hls/poster.jpg",
			},
			{
				height: 480,
				kind: "hls-rendition-manifest",
				renditionLabel: "480p",
				width: 854,
			},
			{
				kind: "hls-segment",
				renditionLabel: "480p",
			},
			{
				kind: "metadata",
				key: "files/file-1/hls/metadata.json",
			},
		]);
	});
});
