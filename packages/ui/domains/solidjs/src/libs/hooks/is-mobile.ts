import type { Accessor } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";

export const DEFAULT_MOBILE_BREAKPOINT = 768;

export type UseIsMobileOptions = {
	breakpoint?: number;
};

const getIsMobile = (breakpoint = DEFAULT_MOBILE_BREAKPOINT) =>
	typeof window !== "undefined" && window.innerWidth < breakpoint;

const useIsMobile = (options: UseIsMobileOptions = {}): Accessor<boolean> => {
	const breakpoint = options.breakpoint ?? DEFAULT_MOBILE_BREAKPOINT;
	const [isMobile, setIsMobile] = createSignal(getIsMobile(breakpoint));

	onMount(() => {
		const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
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
