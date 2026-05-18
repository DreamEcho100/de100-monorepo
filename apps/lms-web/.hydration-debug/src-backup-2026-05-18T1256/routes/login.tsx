import { createSignal, Match, Switch } from "solid-js";

import SignInForm from "~/components/sign-in-form";
import SignUpForm from "~/components/sign-up-form";

export default function LoginPage() {
	const [showSignIn, setShowSignIn] = createSignal(true);

	return (
		<main
			class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Switch>
				<Match when={showSignIn()}>
					<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
				</Match>
				<Match when={!showSignIn()}>
					<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
				</Match>
			</Switch>
		</main>
	);
}
