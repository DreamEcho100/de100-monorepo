import { Resend } from "resend";

type AuthEmailUser = {
	email: string;
	name?: string | null;
};

type AuthEmailLinkInput = {
	token: string;
	url: string;
	user: AuthEmailUser;
};

type EmailDriver = "log" | "resend";

type EmailMessage = {
	subject: string;
	text: string;
	to: string;
};

type ResendLikeClient = {
	emails: {
		send: (message: {
			from: string;
			replyTo?: string;
			subject: string;
			text: string;
			to: string;
		}) => Promise<unknown>;
	};
};

type AppEmailSenderDependencies = {
	createResendClient?: (apiKey: string) => ResendLikeClient;
	logger?: Pick<Console, "info">;
};

type AppEmailSenderConfig = {
	driver: EmailDriver;
	from: string;
	replyTo?: string;
	resendApiKey?: string;
};

function formatGreeting(user: AuthEmailUser) {
	return user.name ? `Hi ${user.name},` : "Hi,";
}

function formatVerificationEmailText(input: AuthEmailLinkInput) {
	return [
		formatGreeting(input.user),
		"",
		"Verify your Proto Cook account by opening this link:",
		input.url,
		"",
		"If you did not create this account, you can ignore this email.",
	].join("\n");
}

function formatPasswordResetEmailText(input: AuthEmailLinkInput) {
	return [
		formatGreeting(input.user),
		"",
		"Reset your Proto Cook password by opening this link:",
		input.url,
		"",
		"If you did not request a password reset, you can ignore this email.",
	].join("\n");
}

export function createAppEmailSender(
	config: AppEmailSenderConfig,
	dependencies: AppEmailSenderDependencies = {},
) {
	const createResendClient =
		dependencies.createResendClient ?? ((apiKey: string) => new Resend(apiKey));
	const logger = dependencies.logger ?? console;

	async function send(message: EmailMessage) {
		if (config.driver === "log") {
			logger.info("[de100/apps-proto-cook-auth] auth email", {
				driver: config.driver,
				from: config.from,
				...message,
			});
			return;
		}

		if (!config.resendApiKey) {
			throw new Error(
				"APP_PROTO_COOK_RESEND_API_KEY is required when APP_PROTO_COOK_EMAIL_DRIVER=resend.",
			);
		}

		const resendClient = createResendClient(config.resendApiKey);

		await resendClient.emails.send({
			from: config.from,
			...(config.replyTo ? { replyTo: config.replyTo } : {}),
			subject: message.subject,
			text: message.text,
			to: message.to,
		});
	}

	return {
		sendPasswordResetEmail(input: AuthEmailLinkInput) {
			return send({
				subject: "Reset your Proto Cook password",
				text: formatPasswordResetEmailText(input),
				to: input.user.email,
			});
		},
		sendVerificationEmail(input: AuthEmailLinkInput) {
			return send({
				subject: "Verify your Proto Cook email",
				text: formatVerificationEmailText(input),
				to: input.user.email,
			});
		},
	};
}
