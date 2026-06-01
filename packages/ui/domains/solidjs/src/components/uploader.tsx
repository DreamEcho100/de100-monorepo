import { createMemo, For, mergeProps, onMount, Show, splitProps } from "solid-js";

import type { UploaderRecordVisibility } from "../libs/uploader/adapters";
import type { UploaderConfigInput } from "../libs/uploader/contracts";
import type {
	UploaderControllerDependencies,
	UploaderTrackedItem,
} from "../libs/uploader/use-uploader";
import { useUploader } from "../libs/uploader/use-uploader";
import { Button } from "#components/button";
import { cn } from "#libs/utils";

export type UploaderMode = "dashboard" | "dropzone";

export type UploaderProps = UploaderConfigInput & {
	class?: string;
	controllerDependencies?: UploaderControllerDependencies;
	disabled?: boolean;
	helperText?: string;
	mode?: UploaderMode;
	visibility?: UploaderRecordVisibility;
};

export function shouldOpenFilePickerFromKey(key: string) {
	return key === "Enter" || key === " ";
}

export function extractFilesFromFileList(fileList: Pick<FileList, "item" | "length"> | null) {
	const files: File[] = [];
	if (!fileList) {
		return files;
	}

	for (let index = 0; index < fileList.length; index += 1) {
		const file = fileList.item(index);
		if (file) {
			files.push(file);
		}
	}

	return files;
}

export function extractFilesFromDataTransfer(
	dataTransfer: { files: Pick<FileList, "item" | "length"> | null } | null,
) {
	if (!dataTransfer) {
		return [];
	}

	return extractFilesFromFileList(dataTransfer.files);
}

export function extractFilesFromClipboardEvent(event: ClipboardEvent) {
	const files: File[] = [];
	for (const item of event.clipboardData?.items ?? []) {
		if (item.kind === "file") {
			const file = item.getAsFile();
			if (file) {
				files.push(file);
			}
		}
	}

	return files;
}

export function formatBytes(bytes: number) {
	if (bytes < 1_024) {
		return `${bytes} B`;
	}

	if (bytes < 1_024 * 1_024) {
		return `${(bytes / 1_024).toFixed(1)} KB`;
	}

	if (bytes < 1_024 * 1_024 * 1_024) {
		return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
	}

	return `${(bytes / (1_024 * 1_024 * 1_024)).toFixed(1)} GB`;
}

export function buildUploaderRestrictionsText(maxFiles: number, maxFileBytes: number) {
	return `Up to ${maxFiles} files, ${formatBytes(maxFileBytes)} per file.`;
}

function statusLabel(item: UploaderTrackedItem) {
	if (item.status === "queued") {
		return "Queued";
	}

	if (item.status === "uploading") {
		return "Uploading";
	}

	if (item.status === "succeeded") {
		return "Uploaded";
	}

	if (item.status === "failed") {
		return "Failed";
	}

	return "Canceled";
}

function progressPercent(item: UploaderTrackedItem) {
	return Math.max(0, Math.min(100, Math.round(item.progress * 100)));
}

const Uploader = (props: UploaderProps) => {
	const mergedProps = mergeProps(
		{
			mode: "dropzone",
			visibility: "private",
		} as const,
		props,
	);
	const [local, config] = splitProps(mergedProps, [
		"class",
		"controllerDependencies",
		"disabled",
		"helperText",
		"mode",
		"visibility",
	]);
	const uploader = useUploader(config, local.controllerDependencies);

	const restrictionsText = createMemo(() => {
		if (local.helperText) {
			return local.helperText;
		}

		return buildUploaderRestrictionsText(
			uploader.restrictions().maxFiles,
			uploader.restrictions().maxFileBytes,
		);
	});

	let fileInputRef: HTMLInputElement | undefined;
	let cameraInputRef: HTMLInputElement | undefined;
	let dashboardRef: HTMLDivElement | undefined;
	let dropzoneRef: HTMLDivElement | undefined;

	const addIncomingFiles = (files: File[]) => {
		if (!files.length || local.disabled) {
			return;
		}

		void uploader.addFiles(files, local.visibility);
	};

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		addIncomingFiles(extractFilesFromDataTransfer(event.dataTransfer));
	};

	const onDragOver = (event: DragEvent) => {
		event.preventDefault();
	};

	const onFileInputChange = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		addIncomingFiles(extractFilesFromFileList(target.files));
		target.value = "";
	};

	const onPaste = (event: ClipboardEvent) => {
		if (!uploader.capture().allowClipboard) {
			return;
		}

		const files = extractFilesFromClipboardEvent(event);
		if (!files.length) {
			return;
		}

		event.preventDefault();
		addIncomingFiles(files);
	};

	onMount(() => {
		if (local.mode === "dashboard" && dashboardRef) {
			void uploader.mountDashboard(dashboardRef);
			return;
		}

		if (dropzoneRef) {
			void uploader.mountDropzone(dropzoneRef);
		}
	});

	return (
		<section
			aria-label={uploader.a11y().regionLabel}
			class={cn("z-uploader flex flex-col gap-4", local.class)}
			data-slot="uploader-region"
			onPaste={onPaste}
		>
			<div aria-atomic="true" aria-live={uploader.a11y().liveRegionMode} class="sr-only">
				{uploader.lastAnnouncement()}
			</div>

			<div class="flex flex-col gap-1">
				<h3 class="font-semibold text-lg">{uploader.a11y().regionLabel}</h3>
				<p class="text-muted-foreground text-sm">{restrictionsText()}</p>
			</div>

			<input
				accept={uploader.restrictions().allowedMimeTypes.join(",")}
				aria-label={uploader.a11y().dropzoneLabel}
				class="sr-only"
				data-slot="uploader-input"
				disabled={local.disabled}
				multiple={uploader.restrictions().maxFiles > 1}
				onChange={onFileInputChange}
				ref={fileInputRef}
				type="file"
			/>

			<Show when={uploader.capture().allowCamera}>
				<input
					accept={uploader.restrictions().allowedMimeTypes.join(",")}
					capture="environment"
					class="sr-only"
					disabled={local.disabled}
					onChange={onFileInputChange}
					ref={cameraInputRef}
					type="file"
				/>
			</Show>

			<Show
				fallback={
					<div
						aria-label={uploader.a11y().dropzoneLabel}
						class="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center"
						data-slot="uploader-dropzone"
						onDragOver={onDragOver}
						onDrop={onDrop}
						ref={dropzoneRef}
						role="group"
					>
						<p class="text-muted-foreground text-sm">{uploader.i18n().dropzoneHint}</p>
						<div class="flex flex-wrap items-center justify-center gap-2">
							<Button
								disabled={local.disabled || !uploader.initialized()}
								onClick={() => fileInputRef?.click()}
								size="sm"
							>
								{uploader.i18n().browseCta}
							</Button>
							<Show when={uploader.capture().allowCamera}>
								<Button
									disabled={local.disabled || !uploader.initialized()}
									onClick={() => cameraInputRef?.click()}
									size="sm"
									variant="outline"
								>
									Capture from camera
								</Button>
							</Show>
						</div>
					</div>
				}
				when={local.mode === "dashboard"}
			>
				<div class="rounded-2xl border p-2" data-slot="uploader-dashboard" ref={dashboardRef} />
			</Show>

			<div class="flex flex-wrap items-center gap-2">
				<Button
					disabled={local.disabled || uploader.isUploading() || uploader.items().length === 0}
					onClick={() => void uploader.uploadAll()}
					size="sm"
				>
					{uploader.isUploading() ? "Uploading..." : "Upload all"}
				</Button>
				<Button
					disabled={uploader.items().length === 0}
					onClick={uploader.clearCompleted}
					size="sm"
					variant="ghost"
				>
					Clear completed
				</Button>
			</div>

			<Show when={uploader.lastError()}>
				<p class="text-destructive text-sm" data-slot="uploader-error" role="alert">
					{uploader.lastError()}
				</p>
			</Show>

			<ul class="flex flex-col gap-2" data-slot="uploader-list">
				<For each={uploader.items()}>
					{(item) => (
						<li class="rounded-xl border p-3" data-file-id={item.fileId} data-status={item.status}>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate font-medium">{item.fileName}</p>
									<p class="text-muted-foreground text-xs">{statusLabel(item)}</p>
								</div>
								<div class="text-muted-foreground text-xs">{progressPercent(item)}%</div>
							</div>

							<progress
								aria-label={`${item.fileName} progress`}
								class="mt-2 h-2 w-full"
								max={100}
								value={progressPercent(item)}
							/>

							<Show when={item.lastError}>
								<p class="mt-2 text-destructive text-xs">{item.lastError}</p>
							</Show>

							<div class="mt-3 flex flex-wrap items-center gap-2">
								<Show when={item.status === "queued" || item.status === "failed"}>
									<Button onClick={() => void uploader.uploadFile(item.fileId)} size="sm">
										Upload
									</Button>
								</Show>

								<Show when={item.status === "uploading"}>
									<Button
										onClick={() => void uploader.pauseFile(item.fileId)}
										size="sm"
										variant="outline"
									>
										Pause
									</Button>
								</Show>

								<Show when={item.status === "failed"}>
									<Button
										onClick={() => void uploader.retryFile(item.fileId)}
										size="sm"
										variant="secondary"
									>
										Retry
									</Button>
								</Show>

								<Show when={item.status === "failed"}>
									<Button
										onClick={() => void uploader.resumeFile(item.fileId)}
										size="sm"
										variant="ghost"
									>
										Resume
									</Button>
								</Show>

								<Show when={item.status !== "succeeded" && item.status !== "canceled"}>
									<Button
										onClick={() => void uploader.cancelFile(item.fileId)}
										size="sm"
										variant="ghost"
									>
										Cancel
									</Button>
								</Show>
							</div>
						</li>
					)}
				</For>
			</ul>
		</section>
	);
};

export { Uploader };
