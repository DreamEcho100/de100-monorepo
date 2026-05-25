import { localizeValidationError } from "./validation-errors";

const authErrorTranslationKeys = {
	ACCOUNT_NOT_FOUND: "errors.auth.requestFailed",
	CALLBACK_URL_REQUIRED: "errors.auth.invalidCallback",
	CREDENTIAL_ACCOUNT_NOT_FOUND: "errors.auth.invalidEmailOrPassword",
	EMAIL_ALREADY_VERIFIED: "errors.auth.emailAlreadyVerified",
	EMAIL_NOT_VERIFIED: "errors.auth.emailNotVerified",
	FAILED_TO_CREATE_SESSION: "errors.auth.requestFailed",
	FAILED_TO_CREATE_USER: "errors.auth.requestFailed",
	FAILED_TO_CREATE_VERIFICATION: "errors.auth.requestFailed",
	FAILED_TO_GET_SESSION: "errors.auth.sessionExpired",
	FAILED_TO_GET_USER_INFO: "errors.auth.requestFailed",
	INVALID_CALLBACK_URL: "errors.auth.invalidCallback",
	INVALID_EMAIL: "errors.auth.invalidEmail",
	INVALID_EMAIL_OR_PASSWORD: "errors.auth.invalidEmailOrPassword",
	INVALID_ERROR_CALLBACK_URL: "errors.auth.invalidCallback",
	INVALID_NEW_USER_CALLBACK_URL: "errors.auth.invalidCallback",
	INVALID_PASSWORD: "errors.auth.invalidEmailOrPassword",
	INVALID_REDIRECT_URL: "errors.auth.invalidCallback",
	INVALID_TOKEN: "errors.auth.invalidToken",
	MISSING_FIELD: "errors.auth.requestFailed",
	SESSION_EXPIRED: "errors.auth.sessionExpired",
	TOKEN_EXPIRED: "errors.auth.tokenExpired",
	USER_ALREADY_EXISTS: "errors.auth.userAlreadyExists",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "errors.auth.userAlreadyExists",
	USER_EMAIL_NOT_FOUND: "errors.auth.requestFailed",
	USER_NOT_FOUND: "errors.auth.requestFailed",
	VALIDATION_ERROR: "errors.auth.requestFailed",
	VERIFICATION_EMAIL_NOT_ENABLED: "errors.auth.verificationUnavailable",
} as const;

type AuthErrorCode = keyof typeof authErrorTranslationKeys;
type AuthErrorTranslationKey =
	(typeof authErrorTranslationKeys)[keyof typeof authErrorTranslationKeys];

const knownAuthErrorCodes = new Set<string>(Object.keys(authErrorTranslationKeys));

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isAuthErrorCode(value: unknown): value is AuthErrorCode {
	return typeof value === "string" && knownAuthErrorCodes.has(value);
}

function getNestedError(value: unknown) {
	if (!isRecord(value) || !isRecord(value.error)) {
		return undefined;
	}

	return value.error;
}

function getAuthErrorCode(value: unknown) {
	if (isRecord(value) && isAuthErrorCode(value.code)) {
		return value.code;
	}

	const nestedError = getNestedError(value);

	if (nestedError && isAuthErrorCode(nestedError.code)) {
		return nestedError.code;
	}

	if (isAuthErrorCode(value)) {
		return value;
	}

	return undefined;
}

function getAuthErrorMessage(value: unknown) {
	if (typeof value === "string") {
		return value;
	}

	if (isRecord(value) && typeof value.message === "string") {
		return value.message;
	}

	const nestedError = getNestedError(value);

	if (nestedError && typeof nestedError.message === "string") {
		return nestedError.message;
	}

	return undefined;
}

export function getAuthErrorTranslationKey(error: unknown): AuthErrorTranslationKey | undefined {
	const code = getAuthErrorCode(error);

	return code ? authErrorTranslationKeys[code] : undefined;
}

export function localizeAuthError(error: unknown, t: (key: string) => string) {
	const translationKey = getAuthErrorTranslationKey(error);

	if (translationKey) {
		return t(translationKey);
	}

	const message = getAuthErrorMessage(error);

	return localizeValidationError(message, t) ?? message;
}
