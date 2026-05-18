import { describe, expect, it, vi } from "vitest";

import { createAppEmailSender } from "./email";

describe("createAppEmailSender", () => {
	it("logs auth emails when the local log driver is active", async () => {
		const info = vi.fn();
		const sender = createAppEmailSender(
			{
				driver: "log",
				from: "LMS Starter <noreply@lms.local>",
			},
			{
				logger: { info },
			},
		);

		await sender.sendVerificationEmail({
			token: "verify-token",
			url: "http://127.0.0.1:3000/verify?token=verify-token",
			user: {
				email: "owner@lms.test",
				name: "Owner",
			},
		});

		expect(info).toHaveBeenCalledWith(
			"[de100/apps-lms-auth] auth email",
			expect.objectContaining({
				driver: "log",
				from: "LMS Starter <noreply@lms.local>",
				subject: "Verify your LMS email",
				text: expect.stringContaining("http://127.0.0.1:3000/verify?token=verify-token"),
				to: "owner@lms.test",
			}),
		);
	});

	it("uses the Resend client when the resend driver is active", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sender = createAppEmailSender(
			{
				driver: "resend",
				from: "LMS Starter <noreply@example.com>",
				resendApiKey: "re_test_key",
			},
			{
				createResendClient: () => ({
					emails: { send },
				}),
			},
		);

		await sender.sendPasswordResetEmail({
			token: "reset-token",
			url: "http://127.0.0.1:3000/reset-password?token=reset-token",
			user: {
				email: "owner@lms.test",
				name: "Owner",
			},
		});

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "LMS Starter <noreply@example.com>",
				subject: "Reset your LMS password",
				text: expect.stringContaining("http://127.0.0.1:3000/reset-password?token=reset-token"),
				to: "owner@lms.test",
			}),
		);
	});

	it("requires a Resend API key when the resend driver is active", async () => {
		const sender = createAppEmailSender({
			driver: "resend",
			from: "LMS Starter <noreply@example.com>",
		});

		await expect(
			sender.sendPasswordResetEmail({
				token: "reset-token",
				url: "http://127.0.0.1:3000/reset-password?token=reset-token",
				user: {
					email: "owner@lms.test",
				},
			}),
		).rejects.toThrow("APP_LMS_RESEND_API_KEY is required when APP_LMS_EMAIL_DRIVER=resend.");
	});
});
