import { describe, expect, it, vi } from "vitest";

import {
	createFilesUppyPluginLoader,
	createFilesUppyProtocolExecutor,
	getFilesUppyProtocolPlugin,
	installFilesUppyPlugins,
} from "./uppy";

describe("files Uppy plugin loader", () => {
	it("loads enabled plugin modules through the injected importer", async () => {
		const loader = createFilesUppyPluginLoader({
			importer: async (specifier) => ({ default: { specifier } }),
		});

		await expect(loader.load("dashboard")).resolves.toEqual({
			default: { specifier: "@uppy/dashboard" },
		});
	});

	it("throws a clear optional dependency error when a plugin is missing", async () => {
		const loader = createFilesUppyPluginLoader({
			importer: async () => {
				throw new Error("missing");
			},
		});

		await expect(loader.load("transloadit")).rejects.toMatchObject({
			code: "files.missing_dependency",
		});
	});

	it("installs requested plugins on an Uppy-compatible instance", async () => {
		const use = vi.fn(function usePlugin() {
			return uppy;
		});
		const uppy = {
			use,
		};
		const loader = createFilesUppyPluginLoader({
			importer: async (specifier) => ({ default: { specifier } }),
		});

		await installFilesUppyPlugins({
			loader,
			plugins: ["dashboard", "xhr-upload"],
			uppy,
		});

		expect(use).toHaveBeenCalledTimes(2);
		expect(use).toHaveBeenCalledWith({ specifier: "@uppy/dashboard" }, undefined);
		expect(use).toHaveBeenCalledWith({ specifier: "@uppy/xhr-upload" }, undefined);
	});

	it("maps files upload protocols to maintained Uppy uploader plugins", () => {
		expect(getFilesUppyProtocolPlugin("tus")).toBe("tus");
		expect(getFilesUppyProtocolPlugin("s3-put")).toBe("aws-s3");
		expect(getFilesUppyProtocolPlugin("s3-multipart")).toBe("aws-s3");
		expect(getFilesUppyProtocolPlugin("xhr")).toBe("xhr-upload");
	});

	it("executes plugin-backed Uppy uploads through lazy plugin loading", async () => {
		const upload = vi.fn(async () => undefined);
		const use = vi.fn(function usePlugin() {
			return uppy;
		});
		const uppy = {
			addFile: vi.fn(),
			close: vi.fn(),
			upload,
			use,
		};
		const executor = createFilesUppyProtocolExecutor({
			createUppy: () => uppy,
			loader: createFilesUppyPluginLoader({
				importer: async (specifier) => ({ default: { specifier } }),
			}),
		});

		await executor({
			file: new File(["video"], "lesson.mp4", { type: "video/mp4" }),
			target: {
				expiresAt: null,
				fields: null,
				headers: null,
				method: "POST",
				protocol: "tus",
				sessionId: "session_1",
				targetId: "target_1",
				uploadUrl: "https://uploads.test/tus/session_1",
			},
		});

		expect(use).toHaveBeenCalledWith(
			{ specifier: "@uppy/tus" },
			expect.objectContaining({
				endpoint: "https://uploads.test/tus/session_1",
			}),
		);
		expect(upload).toHaveBeenCalledOnce();
		expect(uppy.close).toHaveBeenCalledOnce();
	});
});
