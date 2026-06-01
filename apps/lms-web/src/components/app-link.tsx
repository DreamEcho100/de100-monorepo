import { A } from "@solidjs/router";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

type RouterLinkProps = ComponentProps<typeof A>;

export type AppLinkPreloadMode = boolean | "false" | "intent";

export type AppLinkProps = Omit<RouterLinkProps, "preload"> & {
	preload?: AppLinkPreloadMode;
};

export function normalizeAppLinkPreloadMode(
	preload: AppLinkPreloadMode | undefined,
): AppLinkPreloadMode {
	if (preload === false) {
		return "false";
	}

	return preload ?? "intent";
}

export default function AppLink(rawProps: AppLinkProps) {
	const mergedProps = mergeProps(
		{
			preload: "intent" as AppLinkPreloadMode,
		},
		rawProps,
	);
	const [local, others] = splitProps(mergedProps, ["preload"]);
	const preloadMode = normalizeAppLinkPreloadMode(local.preload);

	return <A {...(others as RouterLinkProps)} preload={preloadMode as RouterLinkProps["preload"]} />;
}
