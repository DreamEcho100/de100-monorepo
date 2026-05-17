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

export default function SignUpForm(props: { onSwitchToSignIn: () => void }) {
	const navigate = useNavigate();
	const [submitError, setSubmitError] = createSignal<string | null>(null);

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
				name: z.string().min(2, "Name must be at least 2 characters"),
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	}));

	return (
		<Card class="auth-card">
			<CardHeader class="auth-card-header">
				<p class="eyebrow">Create account</p>
				<CardTitle class="auth-title">Start tracking</CardTitle>
				<CardDescription class="auth-description">
					Create an account to manage budgets, categories, and spending trends.
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
					<form.Field name="name">
						{(field) => {
							const errorId = `${field().name}-error`;

							return (
								<Field class="field">
									<FieldLabel for={field().name}>Name</FieldLabel>
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
								{state().isSubmitting ? "Creating account..." : "Sign Up"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>

			<CardFooter class="auth-card-footer">
				<Button
					class="switch-auth"
					onClick={props.onSwitchToSignIn}
					type="button"
					variant="link"
				>
					Already have an account? Sign in
				</Button>
			</CardFooter>
		</Card>
	);
}
