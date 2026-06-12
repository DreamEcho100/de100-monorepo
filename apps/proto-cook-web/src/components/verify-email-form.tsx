import { resendVerificationEmailFormValidator } from "@de100/apps-proto-cook-validators/client";
import { useI18n } from "@de100/i18n-domains-solidjs/client";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
	Input,
	P,
} from "@de100/ui-domains-solidjs";
import { A, useLocation } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { createSignal } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { localizeAuthError } from "~/libs/auth-errors";
import { localizeValidationErrors } from "~/libs/validation-errors";

import { createLocalizedPath } from "../../i18n/routing";

export default function VerifyEmailForm() {
	const location = useLocation();
	const { locale, t } = useI18n();
	const [submitError, setSubmitError] = createSignal<unknown | null>(null);
	const [successMessage, setSuccessMessage] = createSignal<string | null>(
		new URLSearchParams(location.search).get("sent") === "1" ? t("auth.verifyEmail.success") : null,
	);
	const initialEmail = new URLSearchParams(location.search).get("email") ?? "";

	const form = createForm(() => ({
		defaultValues: {
			email: initialEmail,
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			setSuccessMessage(null);

			await authClient.sendVerificationEmail(
				{
					callbackURL: `${new URL(createLocalizedPath(locale(), "/login"), window.location.origin).toString()}?verified=1`,
					email: value.email,
				},
				{
					onError: (error) => {
						setSubmitError(error);
					},
					onSuccess: () => {
						setSuccessMessage(t("auth.verifyEmail.success"));
					},
				},
			);
		},
		validators: {
			onSubmit: resendVerificationEmailFormValidator,
		},
	}));

	return (
		<Card class="w-full border-border/70 bg-card/95 shadow-black/5 shadow-sm">
			<CardHeader class="grid gap-3">
				<P class="font-semibold text-primary text-xs uppercase tracking-[0.24em]" tone="accent">
					{t("auth.verifyEmail.eyebrow")}
				</P>
				<CardTitle class="text-balance font-semibold text-3xl text-foreground tracking-tight">
					{t("auth.verifyEmail.title")}
				</CardTitle>
				<CardDescription class="text-muted-foreground text-sm leading-6">
					{t("auth.verifyEmail.description")}
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form
					class="grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Field name="email">
						{(field) => {
							const errorId = `${field().name}-error`;
							const localizedErrors = localizeValidationErrors(field().state.meta.errors, t);

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>{t("auth.verifyEmail.emailLabel")}</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={localizedErrors[0]?.message ? errorId : undefined}
											aria-invalid={field().state.meta.errors.length > 0}
											id={field().name}
											name={field().name}
											onBlur={field().handleBlur}
											onInput={(event) => field().handleChange(event.currentTarget.value)}
											type="email"
											value={field().state.value}
										/>
										<FieldError
											class="text-destructive text-sm"
											errors={localizedErrors}
											id={errorId}
										/>
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					{submitError() ? (
						<FieldError class="text-destructive text-sm">
							{localizeAuthError(submitError(), t) ?? t("errors.auth.requestFailed")}
						</FieldError>
					) : null}
					{successMessage() ? (
						<P
							class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
							role="status"
							tone="success"
						>
							{successMessage()}
						</P>
					) : null}

					<form.Subscribe>
						{(state) => (
							<Button
								class="w-full"
								disabled={!state().canSubmit || state().isSubmitting}
								type="submit"
							>
								{state().isSubmitting
									? t("auth.verifyEmail.submitting")
									: t("auth.verifyEmail.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>

			<CardFooter class="pt-2">
				<A
					class="text-primary text-sm underline-offset-4 hover:underline"
					href={createLocalizedPath(locale(), "/login")}
				>
					{t("auth.verifyEmail.backToLogin")}
				</A>
			</CardFooter>
		</Card>
	);
}
