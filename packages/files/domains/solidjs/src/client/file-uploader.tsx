import { For, mergeProps, Show } from "solid-js";

import type { FileUploaderController, FileUploaderControllerOptions } from "./use-file-uploader";
import { createFileUploaderController } from "./use-file-uploader";

export type FileUploaderProps = FileUploaderControllerOptions & {
	accept?: string;
	class?: string;
	controller?: FileUploaderController;
	disabled?: boolean;
	labels?: Partial<FileUploaderLabels>;
	multiple?: boolean;
};

export type FileUploaderLabels = {
	browse: string;
	cancel: string;
	clearCompleted: string;
	dropzone: string;
	empty: string;
	gallery: string;
	pause: string;
	progress: string;
	resume: string;
	retry: string;
	upload: string;
	uploadAll: string;
};

const defaultLabels: FileUploaderLabels = {
	browse: "Choose files",
	cancel: "Cancel",
	clearCompleted: "Clear completed",
	dropzone: "Drop files here",
	empty: "No files queued.",
	gallery: "Uploaded files",
	pause: "Pause",
	progress: "Upload progress",
	resume: "Resume",
	retry: "Retry",
	upload: "Upload",
	uploadAll: "Upload all",
};

export function FileUploader(props: FileUploaderProps) {
	const merged = mergeProps(
		{
			labels: defaultLabels,
			multiple: true,
		},
		props,
	);
	const labels = () => ({ ...defaultLabels, ...merged.labels });
	const controller =
		merged.controller ??
		createFileUploaderController({
			client: merged.client,
			createId: merged.createId,
			metadata: merged.metadata,
			queueStore: merged.queueStore,
			restrictions: {
				...merged.restrictions,
				accept: merged.accept ?? merged.restrictions?.accept,
			},
			routeSlug: merged.routeSlug,
			runtime: merged.runtime,
			validationMessages: merged.validationMessages,
			visibility: () => {
				const visibility = merged.visibility;
				return typeof visibility === "function" ? visibility() : (visibility ?? "private");
			},
			onUploadComplete: merged.onUploadComplete,
		});

	return (
		<section aria-label={labels().browse} class={merged.class} data-slot="files-uploader">
			<FilesDropzone
				accept={merged.accept}
				controller={controller}
				disabled={merged.disabled}
				labels={labels()}
				multiple={merged.multiple}
			/>
			<FilesDashboard controller={controller} disabled={merged.disabled} labels={labels()} />
		</section>
	);
}

export type FilesDropzoneProps = {
	accept?: string;
	controller: FileUploaderController;
	disabled?: boolean;
	labels?: Partial<FileUploaderLabels>;
	multiple?: boolean;
};

export function FilesDropzone(props: FilesDropzoneProps) {
	const labels = () => ({ ...defaultLabels, ...props.labels });
	let inputRef: HTMLInputElement | undefined;
	const addFiles = (files: File[]) => {
		if (props.disabled || files.length === 0) {
			return;
		}

		props.controller.addFiles(files);
	};
	const addFromInput = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		addFiles(Array.from(input.files ?? []));
		input.value = "";
	};

	return (
		<fieldset
			aria-disabled={props.disabled ? "true" : undefined}
			data-slot="files-dropzone"
			disabled={props.disabled}
			onDragOver={(event) => {
				event.preventDefault();
			}}
			onDrop={(event) => {
				event.preventDefault();
				addFiles(Array.from(event.dataTransfer?.files ?? []));
			}}
		>
			<input
				accept={props.accept}
				disabled={props.disabled}
				multiple={props.multiple}
				onChange={addFromInput}
				ref={(element) => {
					inputRef = element;
				}}
				type="file"
			/>
			<button
				disabled={props.disabled}
				onClick={() => inputRef?.click()}
				onKeyDown={(event) => {
					if (shouldOpenFilePickerFromKey(event.key)) {
						event.preventDefault();
						inputRef?.click();
					}
				}}
				type="button"
			>
				{labels().browse}
			</button>
			<span>{labels().dropzone}</span>
		</fieldset>
	);
}

export type FilesDashboardProps = {
	controller: FileUploaderController;
	disabled?: boolean;
	labels?: Partial<FileUploaderLabels>;
};

export function FilesDashboard(props: FilesDashboardProps) {
	const labels = () => ({ ...defaultLabels, ...props.labels });

	return (
		<div data-slot="files-dashboard">
			<div data-slot="files-uploader-actions">
				<FilesUploadButton
					controller={props.controller}
					disabled={props.disabled}
					labels={labels()}
				/>
				<button
					disabled={props.controller.items().length === 0}
					onClick={() => void props.controller.clearCompleted()}
					type="button"
				>
					{labels().clearCompleted}
				</button>
			</div>
			<FilesProgress controller={props.controller} labels={labels()} />
			<FilesList controller={props.controller} disabled={props.disabled} labels={labels()} />
		</div>
	);
}

export type FilesUploadButtonProps = {
	controller: FileUploaderController;
	disabled?: boolean;
	labels?: Partial<FileUploaderLabels>;
};

export function FilesUploadButton(props: FilesUploadButtonProps) {
	const labels = () => ({ ...defaultLabels, ...props.labels });

	return (
		<button
			disabled={props.disabled || props.controller.items().length === 0}
			onClick={() => void props.controller.uploadAll()}
			type="button"
		>
			{labels().uploadAll}
		</button>
	);
}

export type FilesProgressProps = {
	controller: FileUploaderController;
	labels?: Partial<FileUploaderLabels>;
};

export function FilesProgress(props: FilesProgressProps) {
	const labels = () => ({ ...defaultLabels, ...props.labels });
	const aggregate = () => props.controller.aggregateProgress();

	return (
		<fieldset aria-label={labels().progress} data-slot="files-progress">
			<progress max={100} value={aggregate().progress} />
			<span>{aggregate().progress}%</span>
		</fieldset>
	);
}

export type FilesListProps = {
	controller: FileUploaderController;
	disabled?: boolean;
	labels?: Partial<FileUploaderLabels>;
};

export function FilesList(props: FilesListProps) {
	const labels = () => ({ ...defaultLabels, ...props.labels });

	return (
		<>
			<Show when={props.controller.rejections().length > 0}>
				<ul data-slot="files-rejections">
					<For each={props.controller.rejections()}>
						{(rejection) => <li role="alert">{rejection.message}</li>}
					</For>
				</ul>
			</Show>
			<Show when={props.controller.items().length > 0} fallback={<p>{labels().empty}</p>}>
				<ul data-slot="files-list">
					<For each={props.controller.items()}>
						{(item) => (
							<li data-file-id={item.id} data-status={item.status}>
								<span>{item.file.name}</span>
								<progress max={100} value={item.progress} />
								<Show when={item.error}>{(error) => <span role="alert">{error()}</span>}</Show>
								<button
									disabled={props.disabled || item.status === "uploading"}
									onClick={() => void props.controller.uploadFile(item.id)}
									type="button"
								>
									{labels().upload}
								</button>
								<button
									disabled={props.disabled || item.status !== "uploading"}
									onClick={() => void props.controller.pauseFile(item.id)}
									type="button"
								>
									{labels().pause}
								</button>
								<button
									disabled={props.disabled || item.status !== "paused"}
									onClick={() => void props.controller.resumeFile(item.id)}
									type="button"
								>
									{labels().resume}
								</button>
								<button
									disabled={props.disabled || item.status !== "failed"}
									onClick={() => void props.controller.retryFile(item.id)}
									type="button"
								>
									{labels().retry}
								</button>
								<button onClick={() => void props.controller.cancelFile(item.id)} type="button">
									{labels().cancel}
								</button>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</>
	);
}

export type FilesGalleryProps = {
	controller: FileUploaderController;
	labels?: Partial<FileUploaderLabels>;
};

export function FilesGallery(props: FilesGalleryProps) {
	const labels = () => ({ ...defaultLabels, ...props.labels });

	return (
		<ul aria-label={labels().gallery} data-slot="files-gallery">
			<For each={props.controller.items().filter((item) => item.record?.kind === "image")}>
				{(item) => (
					<li data-file-id={item.id}>
						<Show when={item.record?.accessUrl}>
							{(accessUrl) => <img alt={item.file.name} src={accessUrl()} />}
						</Show>
					</li>
				)}
			</For>
		</ul>
	);
}

export function shouldOpenFilePickerFromKey(key: string) {
	return key === "Enter" || key === " ";
}
