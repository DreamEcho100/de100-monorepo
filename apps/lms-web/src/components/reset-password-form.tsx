import { useI18n } from "@de100/apps-lms-i18n";
import { resetPasswordFormValidator } from "@de100/apps-lms-validators/client";
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
import { A, useLocation, useNavigate } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { createSignal } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";

import { createLocalizedPath } from "../../i18n/routing";

export default function ResetPasswordForm() {
	const location = useLocation();
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [submitError, setSubmitError] = createSignal<string | null>(null);
	const resetToken = new URLSearchParams(location.search).get("token") ?? "";

	const form = createForm(() => ({
		defaultValues: {
			confirmPassword: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);

			if (!resetToken) {
				setSubmitError(t("auth.resetPassword.invalidToken"));
				return;
			}

			await authClient.resetPassword(
				{
					newPassword: value.password,
					token: resetToken,
				},
				{
					onError: (error) => {
						setSubmitError(error.error.message);
					},
					onSuccess: () => {
						navigate(`${createLocalizedPath(locale(), "/login")}?reset=1`, { replace: true });
					},
				},
			);
		},
		validators: {
			onSubmit: resetPasswordFormValidator,
		},
	}));

	return (
		<Card class="w-full border-border/70 bg-card/95 shadow-black/5 shadow-sm">
			<CardHeader class="grid gap-3">
				<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
					{t("auth.resetPassword.eyebrow")}
				</p>
				<CardTitle class="text-balance font-semibold text-3xl text-foreground tracking-tight">
					{t("auth.resetPassword.title")}
				</CardTitle>
				<CardDescription class="text-muted-foreground text-sm leading-6">
					{t("auth.resetPassword.description")}
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
					<form.Field name="password">
						{(field) => {
							const errorId = `${field().name}-error`;

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>
										{t("auth.resetPassword.passwordLabel")}
									</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={field().state.meta.errors[0] ? errorId : undefined}
											aria-invalid={field().state.meta.errors.length > 0}
											id={field().name}
											name={field().name}
											onBlur={field().handleBlur}
											onInput={(event) => field().handleChange(event.currentTarget.value)}
											type="password"
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

					<form.Field name="confirmPassword">
						{(field) => {
							const errorId = `${field().name}-error`;

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>
										{t("auth.resetPassword.confirmPasswordLabel")}
									</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={field().state.meta.errors[0] ? errorId : undefined}
											aria-invalid={field().state.meta.errors.length > 0}
											id={field().name}
											name={field().name}
											onBlur={field().handleBlur}
											onInput={(event) => field().handleChange(event.currentTarget.value)}
											type="password"
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

					{submitError() ? (
						<FieldError class="text-destructive text-sm">{submitError()}</FieldError>
					) : null}

					<form.Subscribe>
						{(state) => (
							<Button
								class="w-full"
								disabled={!state().canSubmit || state().isSubmitting || !resetToken}
								type="submit"
							>
								{state().isSubmitting
									? t("auth.resetPassword.submitting")
									: t("auth.resetPassword.submit")}
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
					{t("auth.resetPassword.backToLogin")}
				</A>
			</CardFooter>
		</Card>
	);
}
