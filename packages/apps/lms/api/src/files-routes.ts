import {
	createFilesRouteBuilder,
	createFilesRouter,
	extractFilesRouterConfig,
} from "@de100/files-server/router";

const f = createFilesRouteBuilder;

const courseVideoRoute = f(
	{
		video: {
			access: "private",
			maxFileCount: 1,
			maxFileSize: "2GB",
			protocols: ["auto", "s3-multipart", "s3-put", "tus", "xhr"],
			requiresResumable: true,
		},
	},
	{
		awaitServerData: true,
		presignedUrlTtl: "1h",
	},
).onUploadComplete(({ file }) => ({
	fileId: file.id,
	kind: "course-video",
}));

export const lmsFilesRouter = createFilesRouter({
	avatar: f({
		image: {
			access: "private",
			maxFileCount: 1,
			maxFileSize: "8MB",
			protocols: ["auto", "xhr"],
		},
	}).onUploadComplete(({ file }) => ({
		fileId: file.id,
		kind: "avatar",
	})),
	"course-video": courseVideoRoute,
	"lesson-video": courseVideoRoute,
	"lms-library": f({
		audio: {
			access: "private",
			maxFileCount: 4,
			maxFileSize: "256MB",
			protocols: ["auto", "tus", "xhr"],
		},
		document: {
			access: "private",
			maxFileCount: 8,
			maxFileSize: "64MB",
			protocols: ["auto", "xhr"],
		},
		file: {
			access: "private",
			maxFileCount: 8,
			maxFileSize: "64MB",
			protocols: ["auto", "xhr"],
		},
		image: {
			access: "private",
			maxFileCount: 8,
			maxFileSize: "16MB",
			protocols: ["auto", "xhr"],
		},
		video: {
			access: "private",
			maxFileCount: 2,
			maxFileSize: "512MB",
			protocols: ["auto", "tus", "xhr"],
		},
	}).onUploadComplete(({ file }) => ({
		fileId: file.id,
		kind: "library-file",
	})),
});

export const lmsFilesRouteConfig = extractFilesRouterConfig(lmsFilesRouter);
