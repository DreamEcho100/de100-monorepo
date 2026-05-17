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
} from "@budget-tracker_/ui";
import { useNavigate } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { createSignal, Show } from "solid-js";
import z from "zod";

import { authClient } from "~/lib/auth-client";

export default function SignInForm(props: { onSwitchToSignUp: () => void }) {
	const navigate = useNavigate();
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
						navigate("/dashboard");
					},
				}
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	}));

	return (
		<Card class="auth-card">
			<CardHeader class="auth-card-header">
				<p class="eyebrow">Authentication</p>
				<CardTitle class="auth-title">Welcome back</CardTitle>
				<CardDescription class="auth-description">
					Sign in to review budgets, transactions, and recent account activity.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form
					class="auth-form"
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
								<Field class="field">
									<FieldLabel for={field().name}>Email</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={
												field().state.meta.errors[0] ? errorId : undefined
											}
											aria-invalid={field().state.meta.errors.length > 0}
											id={field().name}
											name={field().name}
											onBlur={field().handleBlur}
											onInput={(event) =>
												field().handleChange(event.currentTarget.value)
											}
											type="email"
											value={field().state.value}
										/>
										<FieldError
											class="helper-error"
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
								<Field class="field">
									<FieldLabel for={field().name}>Password</FieldLabel>
									<FieldContent>
										<Input
											aria-describedby={
												field().state.meta.errors[0] ? errorId : undefined
											}
											aria-invalid={field().state.meta.errors.length > 0}
											id={field().name}
											name={field().name}
											onBlur={field().handleBlur}
											onInput={(event) =>
												field().handleChange(event.currentTarget.value)
											}
											type="password"
											value={field().state.value}
										/>
										<FieldError
											class="helper-error"
											errors={field().state.meta.errors}
											id={errorId}
										/>
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<Show when={submitError()}>
						{(message) => (
							<FieldError class="helper-error">{message()}</FieldError>
						)}
					</Show>

					<form.Subscribe>
						{(state) => (
							<Button
								class="w-full"
								disabled={!state().canSubmit || state().isSubmitting}
								type="submit"
							>
								{state().isSubmitting ? "Signing in..." : "Sign In"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>

			<CardFooter class="auth-card-footer">
				<Button
					class="switch-auth"
					onClick={props.onSwitchToSignUp}
					type="button"
					variant="link"
				>
					Need an account? Sign up
				</Button>
			</CardFooter>
		</Card>
	);
}
