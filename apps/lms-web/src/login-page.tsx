import { useI18n } from "@de100/i18n-domains-solidjs/client";
import { Title } from "@solidjs/meta";
import { useLocation } from "@solidjs/router";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";

import SignInForm from "~/components/sign-in-form";
import SignUpForm from "~/components/sign-up-form";

export default function LoginPage() {
	const location = useLocation();
	const { t } = useI18n();
	const [view, setView] = createSignal<"sign-in" | "sign-up">("sign-in");
	const notices = createMemo(() => {
		const searchParams = new URLSearchParams(location.search);
		const nextNotices: string[] = [];

		if (searchParams.get("reset") === "1") {
			nextNotices.push(t("auth.notices.passwordResetSuccess"));
		}

		if (searchParams.get("verified") === "1") {
			nextNotices.push(t("auth.notices.verificationSuccess"));
		}

		return nextNotices;
	});

	return (
		<main
			class="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-16"
			id="main-content"
		>
			<Title>{view() === "sign-in" ? t("auth.signIn.title") : t("auth.signUp.title")}</Title>
			<Show when={notices().length > 0}>
				<div class="grid gap-3">
					{notices().map((message) => (
						<p
							class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
							role="status"
						>
							{message}
						</p>
					))}
				</div>
			</Show>
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
