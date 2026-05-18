import { useI18n } from "@de100/apps-lms-i18n";
import { signInFormValidator } from "@de100/apps-lms-validators/client";
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
import { useNavigate } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { createSignal, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";

import { createLocalizedPath } from "../../i18n/routing";

export default function SignInForm(props: { onSwitchToSignUp: () => void }) {
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const [submitError, setSubmitError] = createSignal<string | null>(null);

	const form = createForm(() => ({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onError: (error) => {
						setSubmitError(error.error.message);
					},
					onSuccess: () => {
						navigate(createLocalizedPath(locale(), "/dashboard"));
					},
				},
			);
		},
		validators: {
			onSubmit: signInFormValidator,
		},
	}));

	return (
		<Card class="w-full border-border/70 bg-card/95 shadow-black/5 shadow-sm">
			<CardHeader class="grid gap-3">
				<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
					{t("auth.signIn.eyebrow")}
				</p>
				<CardTitle class="text-balance font-semibold text-3xl text-foreground tracking-tight">
					{t("auth.signIn.title")}
				</CardTitle>
				<CardDescription class="text-muted-foreground text-sm leading-6">
					{t("auth.signIn.description")}
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
									<FieldLabel for={field().name}>{t("auth.signIn.emailLabel")}</FieldLabel>
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

					<form.Field name="password">
						{(field) => {
							const errorId = `${field().name}-error`;

							return (
								<Field class="grid gap-4">
									<FieldLabel for={field().name}>{t("auth.signIn.passwordLabel")}</FieldLabel>
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

					<Show when={submitError()}>
						{(message) => <FieldError class="text-destructive text-sm">{message()}</FieldError>}
					</Show>

					<form.Subscribe>
						{(state) => (
							<Button
								class="w-full"
								disabled={!state().canSubmit || state().isSubmitting}
								type="submit"
							>
								{state().isSubmitting ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>

			<CardFooter class="pt-2">
				<Button class="px-0 text-sm" onClick={props.onSwitchToSignUp} type="button" variant="link">
					{t("auth.signIn.switchPrompt")}
				</Button>
			</CardFooter>
		</Card>
	);
}
