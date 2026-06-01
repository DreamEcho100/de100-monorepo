import type { Accessor } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";

const MOBILE_BREAKPOINT = 768;

const getIsMobile = () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

const useIsMobile = (): Accessor<boolean> => {
	const [isMobile, setIsMobile] = createSignal(getIsMobile());

	onMount(() => {
		const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const handleChange = () => {
			setIsMobile(mediaQuery.matches);
		};

		handleChange();
		mediaQuery.addEventListener("change", handleChange);
		onCleanup(() => mediaQuery.removeEventListener("change", handleChange));
	});

	return isMobile;
};

export { useIsMobile };
