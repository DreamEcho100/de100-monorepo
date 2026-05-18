import { useI18n } from "@de100/apps-lms-i18n";
import { forgotPasswordFormValidator } from "@de100/apps-lms-validators/client";
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
} from "@de100/ui-solidjs";
import { A } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { createSignal, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";

import { createLocalizedPath } from "../../i18n/routing";

export default function ForgotPasswordForm() {
	const { locale, t } = useI18n();
	const [submitError, setSubmitError] = createSignal<string | null>(null);
	const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

	const form = createForm(() => ({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			setSuccessMessage(null);

			await authClient.requestPasswordReset(
				{
					email: value.email,
					redirectTo: new URL(
						createLocalizedPath(locale(), "/reset-password"),
						window.location.origin,
					).toString(),
				},
				{
					onError: (error) => {
						setSubmitError(error.error.message);
					},
					onSuccess: () => {
						setSuccessMessage(t("auth.forgotPassword.success"));
					},
				},
			);
		},
		validators: {
			onSubmit: forgotPasswordFormValidator,
		},
	}));

	return (
		<Card class="w-full border-border/70 bg-card/95 shadow-black/5 shadow-sm">
			<CardHeader class="grid gap-3">
				<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
					{t("auth.forgotPassword.eyebrow")}
				</p>
				<CardTitle class="text-balance font-semibold text-3xl text-foreground tracking-tight">
					{t("auth.forgotPassword.title")}
				</CardTitle>
				<CardDescription class="text-muted-foreground text-sm leading-6">
					{t("auth.forgotPassword.description")}
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

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>{t("auth.forgotPassword.emailLabel")}</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={field().state.meta.errors[0] ? errorId : undefined}
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
											errors={field().state.meta.errors}
											id={errorId}
										/>
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<Show when={submitError()}>
						{(message) => <FieldError class="text-destructive text-sm">{message()}</FieldError>}
					</Show>
					<Show when={successMessage()}>
						{(message) => (
							<p
								class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
								role="status"
							>
								{message()}
							</p>
						)}
					</Show>

					<form.Subscribe>
						{(state) => (
							<Button
								class="w-full"
								disabled={!state().canSubmit || state().isSubmitting}
								type="submit"
							>
								{state().isSubmitting
									? t("auth.forgotPassword.submitting")
									: t("auth.forgotPassword.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>

			<CardFooter class="pt-2">
				<div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm">
					<A
						class="text-primary underline-offset-4 hover:underline"
						href={createLocalizedPath(locale(), "/login")}
					>
						{t("auth.forgotPassword.backToLogin")}
					</A>
					<A
						class="text-primary underline-offset-4 hover:underline"
						href={createLocalizedPath(locale(), "/verify-email")}
					>
						{t("auth.forgotPassword.verifyEmailLink")}
					</A>
				</div>
			</CardFooter>
		</Card>
	);
}
