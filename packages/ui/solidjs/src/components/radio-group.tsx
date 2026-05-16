import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type {
	RadioGroupItemProps as RadioGroupItemPrimitiveProps,
	RadioGroupRootProps,
} from "@kobalte/core/radio-group";
import {
	Item,
	ItemIndicator,
	ItemInput,
	RadioGroup as RadioGroupRoot,
} from "@kobalte/core/radio-group";
import { Circle } from "lucide-solid";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/libs/utils";

type RadioGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	RadioGroupRootProps<T>
> &
	Pick<ComponentProps<T>, "class" | "children">;

const RadioGroup = <T extends ValidComponent = "div">(props: RadioGroupProps<T>) => {
	const [local, others] = splitProps(props as RadioGroupProps, ["class"]);
	return (
		<RadioGroupRoot
			class={cn("z-radio-group w-full", local.class)}
			data-slot="radio-group"
			{...others}
		/>
	);
};

type RadioGroupItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	RadioGroupItemPrimitiveProps<T>
> &
	Pick<ComponentProps<T>, "class" | "children">;

const RadioGroupItem = <T extends ValidComponent = "div">(props: RadioGroupItemProps<T>) => {
	const [local, others] = splitProps(props as RadioGroupItemProps, ["class", "id"]);
	return (
		<Item
			class={cn(
				"group/radio-group-item peer relative z-radio-group-item aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
				local.class,
			)}
			data-slot="radio-group-item"
			{...others}
		>
			<ItemInput class="peer sr-only" data-slot="radio-group-item-input" id={local.id} />
			<ItemIndicator class="z-radio-group-indicator" data-slot="radio-group-indicator">
				<Circle class="z-radio-group-indicator-icon" />
			</ItemIndicator>
		</Item>
	);
};

export { RadioGroup, RadioGroupItem };
