import { describe, expect, it, vi } from "vitest";

import { createAppEmailSender } from "./email";

describe("createAppEmailSender", () => {
	it("logs auth emails when the local log driver is active", async () => {
		const info = vi.fn();
		const sender = createAppEmailSender(
			{
				driver: "log",
				from: "Proto Cook Starter <noreply@proto-cook.local>",
			},
			{
				logger: { info },
			},
		);

		await sender.sendVerificationEmail({
			token: "verify-token",
			url: "http://127.0.0.1:3000/verify?token=verify-token",
			user: {
				email: "owner@proto-cook.test",
				name: "Owner",
			},
		});

		expect(info).toHaveBeenCalledWith(
			"[de100/apps-proto-cook-auth] auth email",
			expect.objectContaining({
				driver: "log",
				from: "Proto Cook Starter <noreply@proto-cook.local>",
				subject: "Verify your Proto Cook email",
				text: expect.stringContaining("http://127.0.0.1:3000/verify?token=verify-token"),
				to: "owner@proto-cook.test",
			}),
		);
	});

	it("uses the Resend client when the resend driver is active", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sender = createAppEmailSender(
			{
				driver: "resend",
				from: "Proto Cook Starter <noreply@example.com>",
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
				email: "owner@proto-cook.test",
				name: "Owner",
			},
		});

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "Proto Cook Starter <noreply@example.com>",
				subject: "Reset your Proto Cook password",
				text: expect.stringContaining("http://127.0.0.1:3000/reset-password?token=reset-token"),
				to: "owner@proto-cook.test",
			}),
		);
	});

	it("requires a Resend API key when the resend driver is active", async () => {
		const sender = createAppEmailSender({
			driver: "resend",
			from: "Proto Cook Starter <noreply@example.com>",
		});

		await expect(
			sender.sendPasswordResetEmail({
				token: "reset-token",
				url: "http://127.0.0.1:3000/reset-password?token=reset-token",
				user: {
					email: "owner@proto-cook.test",
				},
			}),
		).rejects.toThrow(
			"APP_PROTO_COOK_RESEND_API_KEY is required when APP_PROTO_COOK_EMAIL_DRIVER=resend.",
		);
	});
});
