import { signUpFormValidator } from "@de100/apps-lms-validators/client";
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
import { A, useNavigate } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { createSignal, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { localizeAuthError } from "~/libs/auth-errors";
import { localizeValidationErrors } from "~/libs/validation-errors";

import { createLocalizedPath } from "../../i18n/routing";

export default function SignUpForm(props: { onSwitchToSignIn: () => void }) {
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [submitError, setSubmitError] = createSignal<unknown | null>(null);

	const form = createForm(() => ({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			await authClient.signUp.email(
				{
					email: value.email,
					name: value.name,
					password: value.password,
				},
				{
					onError: (error) => {
						setSubmitError(error);
					},
					onSuccess: () => {
						navigate(createLocalizedPath(locale(), "/dashboard"));
					},
				},
			);
		},
		validators: {
			onSubmit: signUpFormValidator,
		},
	}));

	return (
		<Card class="w-full border-border/70 bg-card/95 shadow-black/5 shadow-sm">
			<CardHeader class="grid gap-3">
				<P class="font-semibold text-primary text-xs uppercase tracking-[0.24em]" tone="accent">
					{t("auth.signUp.eyebrow")}
				</P>
				<CardTitle class="text-balance font-semibold text-3xl text-foreground tracking-tight">
					{t("auth.signUp.title")}
				</CardTitle>
				<CardDescription class="text-muted-foreground text-sm leading-6">
					{t("auth.signUp.description")}
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
					<form.Field name="name">
						{(field) => {
							const errorId = `${field().name}-error`;
							const localizedErrors = localizeValidationErrors(field().state.meta.errors, t);

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>{t("auth.signUp.nameLabel")}</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={localizedErrors[0]?.message ? errorId : undefined}
											aria-invalid={field().state.meta.errors.length > 0}
											id={field().name}
											name={field().name}
											onBlur={field().handleBlur}
											onInput={(event) => field().handleChange(event.currentTarget.value)}
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

					<form.Field name="email">
						{(field) => {
							const errorId = `${field().name}-error`;
							const localizedErrors = localizeValidationErrors(field().state.meta.errors, t);

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>{t("auth.signUp.emailLabel")}</FieldLabel>
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

					<form.Field name="password">
						{(field) => {
							const errorId = `${field().name}-error`;
							const localizedErrors = localizeValidationErrors(field().state.meta.errors, t);

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>{t("auth.signUp.passwordLabel")}</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={localizedErrors[0]?.message ? errorId : undefined}
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
											errors={localizedErrors}
											id={errorId}
										/>
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<Show when={submitError()}>
						{(error) => (
							<FieldError class="text-destructive text-sm">
								{localizeAuthError(error(), t) ?? t("errors.auth.requestFailed")}
							</FieldError>
						)}
					</Show>

					<form.Subscribe>
						{(state) => (
							<Button
								class="w-full"
								disabled={!state().canSubmit || state().isSubmitting}
								type="submit"
							>
								{state().isSubmitting ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>

			<CardFooter class="pt-2">
				<div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm">
					<Button
						class="px-0 text-sm"
						onClick={props.onSwitchToSignIn}
						type="button"
						variant="link"
					>
						{t("auth.signUp.switchPrompt")}
					</Button>
					<A
						class="text-primary underline-offset-4 hover:underline"
						href={createLocalizedPath(locale(), "/verify-email")}
					>
						{t("auth.signUp.verifyEmailLink")}
					</A>
				</div>
			</CardFooter>
		</Card>
	);
}
