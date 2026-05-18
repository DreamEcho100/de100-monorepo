import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "#libs/utils";

type LabelProps = ComponentProps<"label">;

const Label = (props: LabelProps) => {
	const [local, others] = splitProps(props, ["class"]);

	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: should be passed from the user, and we can't enforce it in this component
		<label
			class={cn(
				"z-label flex select-none items-center peer-disabled:cursor-not-allowed group-data-[disabled=true]:pointer-events-none",
				local.class,
			)}
			data-slot="label"
			{...others}
		/>
	);
};

export { Label };
