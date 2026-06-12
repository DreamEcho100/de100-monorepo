import { describe, expect, it } from "vitest";

import {
	createUnsupportedFilesProtocolMessage,
	isSupportedServerProxyProtocol,
} from "./files-upload-protocols";

describe("files server-proxy upload protocols", () => {
	it("enables only XHR and Tus for app-server proxy uploads", () => {
		expect(isSupportedServerProxyProtocol("xhr")).toBe(true);
		expect(isSupportedServerProxyProtocol("tus")).toBe(true);
		expect(isSupportedServerProxyProtocol("s3-put")).toBe(false);
		expect(isSupportedServerProxyProtocol("s3-multipart")).toBe(false);
		expect(isSupportedServerProxyProtocol("companion")).toBe(false);
		expect(isSupportedServerProxyProtocol("transloadit")).toBe(false);
		expect(isSupportedServerProxyProtocol(undefined)).toBe(false);
	});

	it("keeps disabled-provider responses explicit", () => {
		expect(createUnsupportedFilesProtocolMessage("s3-multipart")).toContain("s3-multipart");
	});
});
