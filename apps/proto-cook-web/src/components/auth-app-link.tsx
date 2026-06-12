import { createMemo, splitProps } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";

import AppLink, { type AppLinkPreloadMode, type AppLinkProps } from "./app-link";

type AuthAppLinkProps = AppLinkProps & {
	canPrefetch?: boolean;
	unauthorizedPreload?: AppLinkPreloadMode;
};

export function resolveAuthAppLinkPreloadMode(input: {
	authorizedPreload?: AppLinkPreloadMode;
	canPrefetch: boolean;
	unauthorizedPreload?: AppLinkPreloadMode;
}): AppLinkPreloadMode {
	if (!input.canPrefetch) {
		return input.unauthorizedPreload ?? "false";
	}

	return input.authorizedPreload ?? "intent";
}

export default function AuthAppLink(props: AuthAppLinkProps) {
	const [local, others] = splitProps(props, ["canPrefetch", "preload", "unauthorizedPreload"]);
	const session = authClient.useSession();
	const canPrefetch = createMemo(
		() => local.canPrefetch ?? (!session().isPending && Boolean(session().data)),
	);
	const preloadMode = createMemo<AppLinkPreloadMode>(() => {
		return resolveAuthAppLinkPreloadMode({
			authorizedPreload: local.preload,
			canPrefetch: canPrefetch(),
			unauthorizedPreload: local.unauthorizedPreload,
		});
	});

	return <AppLink {...others} preload={preloadMode()} />;
}
