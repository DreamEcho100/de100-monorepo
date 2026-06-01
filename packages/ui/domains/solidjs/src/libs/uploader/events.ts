export type UploaderItemStatus =
	| "idle"
	| "queued"
	| "uploading"
	| "succeeded"
	| "failed"
	| "canceled";

export type UploaderEvent =
	| {
			fileId: string;
			fileName?: string;
			mimeType?: string;
			totalBytes: number;
			type: "file-added";
			visibility?: "private" | "public";
	  }
	| {
			fileId: string;
			type: "upload-started";
	  }
	| {
			bytesUploaded: number;
			fileId: string;
			type: "upload-progress";
	  }
	| {
			fileId: string;
			type: "upload-succeeded";
	  }
	| {
			errorMessage: string;
			fileId: string;
			recoverable: boolean;
			type: "upload-failed";
	  }
	| {
			fileId: string;
			type: "retry-requested";
	  }
	| {
			fileId: string;
			type: "upload-canceled";
	  }
	| {
			completedAt?: Date;
			fileId: string;
			type: "upload-complete";
	  };

export type UploaderItemState = {
	attempts: number;
	bytesUploaded: number;
	canceledAt: Date | null;
	completedAt: Date | null;
	errorMessage: string | null;
	fileId: string;
	isRecoverableFailure: boolean;
	lastEventType: UploaderEvent["type"] | null;
	retries: number;
	status: UploaderItemStatus;
	totalBytes: number;
};

const transitionMap: Record<UploaderItemStatus, UploaderEvent["type"][]> = {
	canceled: ["retry-requested", "upload-complete"],
	failed: ["retry-requested", "upload-canceled", "upload-complete"],
	idle: ["file-added"],
	queued: ["upload-started", "upload-canceled"],
	succeeded: ["upload-complete"],
	uploading: ["upload-progress", "upload-succeeded", "upload-failed", "upload-canceled"],
};

export function createUploaderItemState(fileId: string, totalBytes = 0): UploaderItemState {
	return {
		attempts: 0,
		bytesUploaded: 0,
		canceledAt: null,
		completedAt: null,
		errorMessage: null,
		fileId,
		isRecoverableFailure: false,
		lastEventType: null,
		retries: 0,
		status: "idle",
		totalBytes,
	};
}

export function canApplyUploaderEvent(
	status: UploaderItemStatus,
	eventType: UploaderEvent["type"],
): boolean {
	return transitionMap[status].includes(eventType);
}

function clampProgress(bytesUploaded: number, totalBytes: number) {
	if (bytesUploaded < 0) {
		return 0;
	}

	if (bytesUploaded > totalBytes) {
		return totalBytes;
	}

	return bytesUploaded;
}

export function applyUploaderEvent(
	state: UploaderItemState,
	event: UploaderEvent,
	now = new Date(),
): UploaderItemState {
	if (state.fileId !== event.fileId || !canApplyUploaderEvent(state.status, event.type)) {
		return state;
	}

	switch (event.type) {
		case "file-added": {
			return {
				...state,
				bytesUploaded: 0,
				errorMessage: null,
				isRecoverableFailure: false,
				lastEventType: event.type,
				status: "queued",
				totalBytes: event.totalBytes,
			};
		}
		case "upload-started": {
			return {
				...state,
				attempts: state.attempts + 1,
				errorMessage: null,
				isRecoverableFailure: false,
				lastEventType: event.type,
				status: "uploading",
			};
		}
		case "upload-progress": {
			return {
				...state,
				bytesUploaded: clampProgress(event.bytesUploaded, state.totalBytes),
				lastEventType: event.type,
			};
		}
		case "upload-succeeded": {
			return {
				...state,
				bytesUploaded: state.totalBytes,
				errorMessage: null,
				isRecoverableFailure: false,
				lastEventType: event.type,
				status: "succeeded",
			};
		}
		case "upload-failed": {
			return {
				...state,
				errorMessage: event.errorMessage,
				isRecoverableFailure: event.recoverable,
				lastEventType: event.type,
				status: "failed",
			};
		}
		case "retry-requested": {
			return {
				...state,
				bytesUploaded: 0,
				errorMessage: null,
				isRecoverableFailure: false,
				lastEventType: event.type,
				retries: state.retries + 1,
				status: "queued",
			};
		}
		case "upload-canceled": {
			return {
				...state,
				canceledAt: now,
				lastEventType: event.type,
				status: "canceled",
			};
		}
		case "upload-complete": {
			return {
				...state,
				completedAt: event.completedAt ?? now,
				lastEventType: event.type,
			};
		}
	}
}
