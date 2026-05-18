import { useI18n } from "@de100/apps-lms-i18n";
import { Title } from "@solidjs/meta";
import { createSignal, Match, Switch } from "solid-js";

import SignInForm from "~/components/sign-in-form";
import SignUpForm from "~/components/sign-up-form";

export default function LoginPage() {
	const { t } = useI18n();
	const [view, setView] = createSignal<"sign-in" | "sign-up">("sign-in");

	return (
		<main
			class="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-16"
			id="main-content"
		>
			<Title>{view() === "sign-in" ? t("auth.signIn.title") : t("auth.signUp.title")}</Title>
			<Switch>
				<Match when={view() === "sign-in"}>
					<SignInForm onSwitchToSignUp={() => setView("sign-up")} />
				</Match>
				<Match when={view() === "sign-up"}>
					<SignUpForm onSwitchToSignIn={() => setView("sign-in")} />
				</Match>
			</Switch>
		</main>
	);
}
