import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { SeparatorRootProps } from "@kobalte/core/separator";
import { Separator as SeparatorPrimitive } from "@kobalte/core/separator";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "#libs/utils";

type SeparatorProps<T extends ValidComponent = "hr"> = PolymorphicProps<T, SeparatorRootProps<T>> &
	Pick<ComponentProps<T>, "class">;

const Separator = <T extends ValidComponent = "hr">(props: SeparatorProps<T>) => {
	const mergedProps = mergeProps({ orientation: "horizontal" } as const, props);
	const [local, others] = splitProps(mergedProps as SeparatorProps, ["class"]);
	return (
		<SeparatorPrimitive
			class={cn(
				"shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
				local.class,
			)}
			data-slot="separator"
			{...others}
		/>
	);
};

export { Separator, type SeparatorProps };
