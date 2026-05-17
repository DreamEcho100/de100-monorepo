import { createSignal, Match, Switch } from "solid-js";

import SignInForm from "~/components/sign-in-form";
import SignUpForm from "~/components/sign-up-form";

export default function LoginPage() {
	const [showSignIn, setShowSignIn] = createSignal(true);

	return (
		<main class="auth-shell" id="main-content">
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
