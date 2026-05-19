import { useI18n } from "@de100/i18n-domains-solidjs/client";
import { createSignal, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";

import { createLocalizedPath } from "../../i18n/routing";

export default function UserMenu() {
	const { locale, t } = useI18n();
	const session = authClient.useSession();
	const [isMenuOpen, setIsMenuOpen] = createSignal(false);

	return (
		<div class="relative flex items-center gap-3">
			<Show when={session().isPending}>
				<div aria-hidden="true" class="h-10 w-28 animate-pulse rounded-full bg-muted" />
			</Show>

			<Show when={!(session().isPending || session().data)}>
				<a
					class="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-2 font-medium text-foreground text-sm no-underline transition-colors hover:bg-accent hover:text-accent-foreground"
					href={createLocalizedPath(locale(), "/login")}
				>
					{t("userMenu.signIn")}
				</a>
			</Show>

			<Show when={!session().isPending && session().data}>
				<button
					aria-expanded={isMenuOpen()}
					aria-haspopup="menu"
					class="inline-flex items-center rounded-full border border-border/70 bg-card px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					onClick={() => setIsMenuOpen((open) => !open)}
					type="button"
				>
					{session().data?.user.name}
				</button>

				<Show when={isMenuOpen()}>
					<div
						class="absolute inset-e-0 top-[calc(100%+0.75rem)] grid min-w-56 gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-black/10 shadow-xl"
						role="menu"
					>
						<p class="text-muted-foreground text-sm leading-6">{session().data?.user.email}</p>
						<button
							class="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
							onClick={() => {
								setIsMenuOpen(false);
								authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											window.location.assign(createLocalizedPath(locale(), "/"));
										},
									},
								});
							}}
							type="button"
						>
							{t("userMenu.signOut")}
						</button>
					</div>
				</Show>
			</Show>
		</div>
	);
}
