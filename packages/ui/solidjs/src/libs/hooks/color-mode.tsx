import type { Accessor } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";

type ColorMode = "light" | "dark";

const getColorMode = (): ColorMode => {
	if (typeof document === "undefined") {
		return "dark";
	}

	return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const useColorMode = (): { colorMode: Accessor<ColorMode> } => {
	const [colorMode, setColorMode] = createSignal<ColorMode>(getColorMode());

	onMount(() => {
		const target = document.documentElement;
		const observer = new MutationObserver(() => {
			setColorMode(getColorMode());
		});

		observer.observe(target, {
			attributeFilter: ["class"],
			attributes: true,
		});
		onCleanup(() => observer.disconnect());
	});

	return { colorMode };
};

export { useColorMode };
