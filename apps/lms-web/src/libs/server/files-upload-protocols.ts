import type { FilesUploadTargetProtocol } from "@de100/files-shared";

const supportedServerProxyProtocols = new Set<FilesUploadTargetProtocol>(["xhr", "tus"]);

export function isSupportedServerProxyProtocol(
	protocol: string | undefined,
): protocol is FilesUploadTargetProtocol {
	return (
		typeof protocol === "string" &&
		supportedServerProxyProtocols.has(protocol as FilesUploadTargetProtocol)
	);
}

export function createUnsupportedFilesProtocolMessage(protocol: string) {
	return `Files upload protocol ${protocol} is not enabled for server-proxy upload.`;
}
