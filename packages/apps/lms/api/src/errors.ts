import { appErrorDataSchema } from "@de100/apps-lms-validators/server";
import type { AppErrorCode, AppErrorParams } from "@de100/apps-lms-validators/shared";
import { ORPCError } from "@orpc/server";

type AppProcedureErrorCode = "INTERNAL_SERVER_ERROR" | "NOT_FOUND";

type AppProcedureErrorDefinition = {
	data: typeof appErrorDataSchema;
	message: AppErrorCode;
};

export function defineAppError(code: AppErrorCode): AppProcedureErrorDefinition {
	return {
		data: appErrorDataSchema,
		message: code,
	};
}

export function createAppError(
	errorCode: AppProcedureErrorCode,
	appCode: AppErrorCode,
	params?: AppErrorParams,
) {
	return new ORPCError(errorCode, {
		data: {
			code: appCode,
			...(params ? { params } : {}),
		},
		message: appCode,
	});
}
