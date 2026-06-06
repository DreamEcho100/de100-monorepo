import type {
	CreateUploadTargetInput,
	CreateUploadTargetOutput,
	FileRecord,
	FileStatus,
	FilesArtifactGroupRecord,
	FilesArtifactRecord,
	FilesCreateArtifactGroupInput,
	FilesCreateArtifactInput,
	FilesPlaybackEvent,
	FilesSignedHlsPlaybackSession,
	FileVisibility,
	ProcessingJobStatus,
	UploadSessionStatus,
} from "@de100/files-shared";

export type FilesAuthContext = {
	role?: string;
	userId: string | null;
};

export type FilesRequestContext<TAppContext = unknown> = {
	app: TAppContext;
	auth: FilesAuthContext;
	request: Request;
};

export type FilesRepositoryCreateInput = {
	bucketName: string | null;
	contentType: string;
	fileName: string;
	key: string;
	kind: FileRecord["kind"];
	metadata?: Record<string, unknown> | null;
	size: number;
	status: FileStatus;
	userId: string | null;
	visibility: FileVisibility;
};

export type FilesUploadSessionRecord = {
	createdAt: Date;
	expiresAt: Date;
	fileId: string;
	id: string;
	protocol: CreateUploadTargetOutput["protocol"];
	status: UploadSessionStatus;
	updatedAt: Date;
	userId: string | null;
};

export type FilesProcessingJobRecord = {
	attempts: number;
	createdAt: Date;
	error: Record<string, unknown> | null;
	fileId: string;
	id: string;
	input: Record<string, unknown> | null;
	kind: string;
	output: Record<string, unknown> | null;
	runAfter: Date | null;
	status: ProcessingJobStatus;
	updatedAt: Date;
};

export type FilesUploadPartRecord = {
	checksum: string | null;
	createdAt: Date;
	etag: string | null;
	fileId: string;
	id: string;
	partNumber: number;
	sessionId: string;
	size: number;
	updatedAt: Date;
};

export type FilesVariantRecord = {
	bucketName: string | null;
	contentType: string;
	createdAt: Date;
	deletedAt: Date | null;
	fileId: string;
	height: number | null;
	id: string;
	key: string;
	kind: string;
	metadata: Record<string, unknown> | null;
	size: number;
	status: FileStatus;
	updatedAt: Date;
	width: number | null;
};

export type FilesRepository = {
	createFile(input: FilesRepositoryCreateInput): Promise<FileRecord>;
	deleteFile(id: string, context: FilesAuthContext): Promise<FileRecord | null>;
	getFile(id: string, context: FilesAuthContext): Promise<FileRecord | null>;
	getFileByKey(key: string): Promise<FileRecord | null>;
	listFiles(context: FilesAuthContext): Promise<FileRecord[]>;
	updateFileStatus(id: string, status: FileStatus): Promise<FileRecord | null>;
};

export type FileUploadSessionRepository = {
	createSession(input: {
		expiresAt: Date;
		fileId: string;
		id: string;
		protocol: CreateUploadTargetOutput["protocol"];
		status: UploadSessionStatus;
		userId: string | null;
	}): Promise<FilesUploadSessionRecord>;
	getSession(id: string, context: FilesAuthContext): Promise<FilesUploadSessionRecord | null>;
	updateSessionStatus(
		id: string,
		status: UploadSessionStatus,
	): Promise<FilesUploadSessionRecord | null>;
};

export type FileUploadPartRepository = {
	createPart(input: {
		checksum?: string | null;
		etag?: string | null;
		fileId: string;
		id: string;
		partNumber: number;
		sessionId: string;
		size: number;
	}): Promise<FilesUploadPartRecord>;
	listParts(sessionId: string): Promise<FilesUploadPartRecord[]>;
};

export type FileVariantRepository = {
	createVariant(input: {
		bucketName: string | null;
		contentType: string;
		fileId: string;
		height?: number | null;
		id: string;
		key: string;
		kind: string;
		metadata?: Record<string, unknown> | null;
		size: number;
		status: FileStatus;
		width?: number | null;
	}): Promise<FilesVariantRecord>;
	listVariants(fileId: string): Promise<FilesVariantRecord[]>;
	updateVariantStatus(id: string, status: FileStatus): Promise<FilesVariantRecord | null>;
};

export type FileArtifactGroupRepository = {
	createGroup(input: FilesCreateArtifactGroupInput): Promise<FilesArtifactGroupRecord>;
	getGroup(id: string): Promise<FilesArtifactGroupRecord | null>;
	listGroups(fileId: string): Promise<FilesArtifactGroupRecord[]>;
	updateGroupStatus(id: string, status: FileStatus): Promise<FilesArtifactGroupRecord | null>;
};

export type FileArtifactRepository = {
	createArtifact(input: FilesCreateArtifactInput): Promise<FilesArtifactRecord>;
	listArtifacts(groupId: string): Promise<FilesArtifactRecord[]>;
	updateArtifactStatus(id: string, status: FileStatus): Promise<FilesArtifactRecord | null>;
};

export type FilePlaybackSessionRepository = {
	createSession(input: FilesSignedHlsPlaybackSession): Promise<FilesSignedHlsPlaybackSession>;
	getSessionByToken(token: string): Promise<FilesSignedHlsPlaybackSession | null>;
	updateSessionStatus(
		id: string,
		status: FilesSignedHlsPlaybackSession["status"],
	): Promise<FilesSignedHlsPlaybackSession | null>;
};

export type FilePlaybackEventRepository = {
	createEvent(input: FilesPlaybackEvent): Promise<FilesPlaybackEvent>;
	listEvents(input: { fileId: string; limit?: number }): Promise<FilesPlaybackEvent[]>;
};

export type FileProcessingJobRepository = {
	createJob(input: {
		attempts?: number;
		error?: Record<string, unknown> | null;
		fileId: string;
		id: string;
		input?: Record<string, unknown> | null;
		kind: string;
		output?: Record<string, unknown> | null;
		runAfter?: Date | null;
		status: ProcessingJobStatus;
	}): Promise<FilesProcessingJobRecord>;
	getJob(id: string): Promise<FilesProcessingJobRecord | null>;
	updateJob(
		id: string,
		patch: {
			attempts?: number;
			error?: Record<string, unknown> | null;
			input?: Record<string, unknown> | null;
			output?: Record<string, unknown> | null;
			runAfter?: Date | null;
			status?: ProcessingJobStatus;
		},
	): Promise<FilesProcessingJobRecord | null>;
	updateJobStatus(
		id: string,
		status: ProcessingJobStatus,
	): Promise<FilesProcessingJobRecord | null>;
};

export type FilesTelemetryAdapter = {
	recordPlaybackEvent(event: FilesPlaybackEvent): Promise<void> | void;
};

export type FilesEntitlementAdapter<TAppContext = unknown> = {
	canReadFile(input: {
		context: FilesRequestContext<TAppContext>;
		file: FileRecord;
	}): Promise<boolean> | boolean;
	canReadCourseLesson?: (input: {
		context: FilesRequestContext<TAppContext>;
		courseId: string;
		lessonId: string;
		preview: boolean;
	}) => Promise<boolean> | boolean;
};

export type FilesOperations<TAppContext = unknown> = {
	artifacts?: {
		groups: FileArtifactGroupRepository;
		items: FileArtifactRepository;
		playbackEvents?: FilePlaybackEventRepository;
		playbackSessions?: FilePlaybackSessionRepository;
	};
	createContext(request: Request): Promise<FilesRequestContext<TAppContext>>;
	entitlements?: FilesEntitlementAdapter<TAppContext>;
	files: FilesRepository;
	jobs: FileProcessingJobRepository;
	parts: FileUploadPartRepository;
	sessions: FileUploadSessionRepository;
	telemetry?: FilesTelemetryAdapter;
	variants: FileVariantRepository;
};

export type CreateFilesUploadTarget = (
	input: CreateUploadTargetInput,
	context: FilesRequestContext,
) => Promise<CreateUploadTargetOutput>;
