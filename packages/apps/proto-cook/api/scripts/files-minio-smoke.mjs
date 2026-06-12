import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	AbortMultipartUploadCommand,
	CreateBucketCommand,
	CreateMultipartUploadCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

const endpoint = process.env.APP_PROTO_COOK_FILES_S3_ENDPOINT ?? "http://127.0.0.1:9000";
const region = process.env.APP_PROTO_COOK_FILES_S3_REGION ?? "us-east-1";
const accessKeyId = process.env.APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID ?? "minioadmin";
const secretAccessKey = process.env.APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY ?? "minioadmin";
const publicBucket = process.env.APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET ?? "public-files";
const privateBucket = process.env.APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET ?? "private-files";
const keepTemp = process.env.APP_PROTO_COOK_FILES_MINIO_SMOKE_KEEP_TMP === "true";

const s3 = new S3Client({
	credentials: {
		accessKeyId,
		secretAccessKey,
	},
	endpoint,
	forcePathStyle: true,
	region,
});

const runId = `phase13-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
const workDir = join(tmpdir(), `de100-proto-cook-files-minio-smoke-${runId}`);
const hlsDir = join(workDir, "hls");
/** @type {{ bucket: string; key: string }[]} */
const uploadedObjects = [];

try {
	mkdirSync(hlsDir, { recursive: true });

	await ensureBucket(publicBucket);
	await ensureBucket(privateBucket);

	await smokeBasicObjects();
	await smokeMultipartTarget();
	await smokeEncryptedHlsObjects();

	console.log(
		JSON.stringify(
			{
				buckets: {
					private: privateBucket,
					public: publicBucket,
				},
				endpoint,
				objectsUploaded: uploadedObjects.length,
				runId,
				status: "pass",
			},
			null,
			2,
		),
	);
} finally {
	await cleanupUploadedObjects();
	if (!keepTemp) {
		rmSync(workDir, { force: true, recursive: true });
	} else {
		console.log(`kept smoke temp directory: ${workDir}`);
	}
}

/** @param {string} bucket */
async function ensureBucket(bucket) {
	try {
		await s3.send(new CreateBucketCommand({ Bucket: bucket }));
		return;
	} catch (error) {
		if (isBucketExistsError(error)) {
			return;
		}
		throw error;
	}
}

async function smokeBasicObjects() {
	const publicKey = `${runId}/public-health.txt`;
	const privateKey = `${runId}/private-health.txt`;

	await putObject({
		body: "public files smoke",
		bucket: publicBucket,
		contentType: "text/plain; charset=utf-8",
		key: publicKey,
	});
	await putObject({
		body: "private files smoke",
		bucket: privateBucket,
		contentType: "text/plain; charset=utf-8",
		key: privateKey,
	});

	const publicBody = await getObjectText(publicBucket, publicKey);
	const privateBody = await getObjectText(privateBucket, privateKey);

	assert(publicBody === "public files smoke", "public object round trip failed");
	assert(privateBody === "private files smoke", "private object round trip failed");
}

async function smokeMultipartTarget() {
	const key = `${runId}/multipart-init.bin`;
	const output = await s3.send(
		new CreateMultipartUploadCommand({
			Bucket: privateBucket,
			ContentType: "application/octet-stream",
			Key: key,
		}),
	);

	assert(output.UploadId, "multipart upload did not return an upload id");

	await s3.send(
		new AbortMultipartUploadCommand({
			Bucket: privateBucket,
			Key: key,
			UploadId: output.UploadId,
		}),
	);
}

async function smokeEncryptedHlsObjects() {
	const sourcePath = join(workDir, "source.mp4");
	const keyPath = join(hlsDir, "hls.key");
	const keyInfoPath = join(workDir, "keyinfo.txt");
	const manifestPath = join(hlsDir, "master.m3u8");

	run("ffmpeg", [
		"-y",
		"-f",
		"lavfi",
		"-i",
		"testsrc2=duration=3:size=320x180:rate=24",
		"-f",
		"lavfi",
		"-i",
		"sine=frequency=440:duration=3",
		"-c:v",
		"libx264",
		"-preset",
		"ultrafast",
		"-pix_fmt",
		"yuv420p",
		"-c:a",
		"aac",
		"-shortest",
		sourcePath,
	]);

	writeFileSync(keyPath, randomBytes(16));
	writeFileSync(keyInfoPath, `hls.key\n${keyPath}\n`);

	run("ffmpeg", [
		"-y",
		"-i",
		sourcePath,
		"-c:v",
		"libx264",
		"-preset",
		"ultrafast",
		"-c:a",
		"aac",
		"-hls_time",
		"1",
		"-hls_playlist_type",
		"vod",
		"-hls_key_info_file",
		keyInfoPath,
		"-hls_segment_filename",
		join(hlsDir, "segment_%03d.ts"),
		manifestPath,
	]);

	const manifest = readFileSync(manifestPath, "utf8");
	assert(manifest.includes("#EXT-X-KEY:METHOD=AES-128"), "HLS manifest is not encrypted");
	assert(manifest.includes("segment_"), "HLS manifest does not reference a segment");

	const segmentName = readdirSync(hlsDir).find((fileName) => fileName.endsWith(".ts"));
	if (!segmentName) {
		throw new Error("HLS segment was not generated");
	}

	const sourceKey = `${runId}/original/source.mp4`;
	const manifestKey = `${runId}/hls/master.m3u8`;
	const hlsKeyKey = `${runId}/hls/keys/hls.key`;
	const segmentKey = `${runId}/hls/${segmentName}`;

	await putObject({
		body: readFileSync(sourcePath),
		bucket: privateBucket,
		contentType: "video/mp4",
		key: sourceKey,
	});
	await putObject({
		body: readFileSync(manifestPath),
		bucket: privateBucket,
		contentType: "application/vnd.apple.mpegurl",
		key: manifestKey,
	});
	await putObject({
		body: readFileSync(keyPath),
		bucket: privateBucket,
		contentType: "application/octet-stream",
		key: hlsKeyKey,
	});
	await putObject({
		body: readFileSync(join(hlsDir, segmentName)),
		bucket: privateBucket,
		contentType: "video/mp2t",
		key: segmentKey,
	});

	const uploadedManifest = await getObjectText(privateBucket, manifestKey);
	assert(
		uploadedManifest.includes("#EXT-X-KEY:METHOD=AES-128"),
		"uploaded manifest lost AES-128 key reference",
	);

	const keyBytes = await getObjectBytes(privateBucket, hlsKeyKey);
	assert(keyBytes.byteLength === 16, "uploaded HLS key must be 16 bytes");

	const segmentRange = await getObjectBytes(privateBucket, segmentKey, "bytes=0-31");
	assert(segmentRange.byteLength > 0, "range read returned no segment bytes");

	const sourceHead = await s3.send(
		new HeadObjectCommand({
			Bucket: privateBucket,
			Key: sourceKey,
		}),
	);
	assert(
		sourceHead.ContentLength === statSync(sourcePath).size,
		"uploaded source size does not match local source size",
	);
}

/**
 * @param {{
 *   body: Buffer | Uint8Array | string;
 *   bucket: string;
 *   contentType: string;
 *   key: string;
 * }} input
 */
async function putObject(input) {
	await s3.send(
		new PutObjectCommand({
			Body: input.body,
			Bucket: input.bucket,
			ContentType: input.contentType,
			Key: input.key,
		}),
	);
	uploadedObjects.push({ bucket: input.bucket, key: input.key });
}

/**
 * @param {string} bucket
 * @param {string} key
 */
async function getObjectText(bucket, key) {
	const bytes = await getObjectBytes(bucket, key);
	return new TextDecoder().decode(bytes);
}

/**
 * @param {string} bucket
 * @param {string} key
 * @param {string | undefined} [range]
 */
async function getObjectBytes(bucket, key, range) {
	const output = await s3.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			Range: range,
		}),
	);
	if (!output.Body) {
		throw new Error(`object ${bucket}/${key} returned no body`);
	}
	const bytes = await output.Body.transformToByteArray();
	return bytes;
}

async function cleanupUploadedObjects() {
	for (const object of uploadedObjects.reverse()) {
		await s3.send(
			new DeleteObjectCommand({
				Bucket: object.bucket,
				Key: object.key,
			}),
		);
	}
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function run(command, args) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		stdio: "pipe",
	});

	if (result.status === 0) {
		return;
	}

	throw new Error(
		[
			`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`,
			result.stdout,
			result.stderr,
		]
			.filter(Boolean)
			.join("\n"),
	);
}

/** @param {unknown} error */
function isBucketExistsError(error) {
	/** @type {{ name?: string; $metadata?: { httpStatusCode?: number } }} */
	const maybeError = typeof error === "object" && error !== null ? error : {};
	return (
		maybeError?.name === "BucketAlreadyOwnedByYou" ||
		maybeError?.name === "BucketAlreadyExists" ||
		maybeError?.$metadata?.httpStatusCode === 409
	);
}

/**
 * @param {unknown} condition
 * @param {string} message
 */
function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}
