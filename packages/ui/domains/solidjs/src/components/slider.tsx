import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type {
	SliderFillProps,
	SliderRootProps,
	SliderThumbProps,
	SliderTrackProps,
} from "@kobalte/core/slider";
import { Slider as SliderPrimitive, useSliderContext } from "@kobalte/core/slider";
import type { ComponentProps, ValidComponent } from "solid-js";
import { createMemo, For, mergeProps, splitProps, untrack } from "solid-js";

import { cn } from "#libs/utils";

type SliderProps<T extends ValidComponent = "div"> = PolymorphicProps<T, SliderRootProps<T>> &
	Pick<ComponentProps<T>, "class">;

const Slider = <T extends ValidComponent = "div">(rawProps: SliderProps<T>) => {
	const props = mergeProps({ minValue: 0, maxValue: 100 } as SliderProps<T>, rawProps);
	const [local, others] = splitProps(props as SliderProps, ["class", "defaultValue", "value"]);

	const values = createMemo(() => {
		if (Array.isArray(untrack(() => local.value))) {
			return untrack(() => local.value);
		}
		if (Array.isArray(local.defaultValue)) {
			return local.defaultValue;
		}
		return [others.minValue, others.maxValue];
	});

	return (
		<SliderPrimitive
			class={cn(
				"relative z-slider flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-disabled:opacity-50",
				local.class,
			)}
			data-slot="slider"
			defaultValue={local.defaultValue}
			value={local.value}
			{...others}
		>
			<SliderTrack>
				<SliderFill />
			</SliderTrack>
			<For each={values()}>{() => <SliderThumb />}</For>
		</SliderPrimitive>
	);
};

type SliderTrackComponentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	SliderTrackProps<T>
> &
	Pick<ComponentProps<T>, "class" | "children">;

const SliderTrack = <T extends ValidComponent = "div">(props: SliderTrackComponentProps<T>) => {
	const [local, others] = splitProps(props as SliderTrackComponentProps, ["class", "children"]);
	const context = useSliderContext();
	return (
		<SliderPrimitive.Track
			class={cn("relative z-slider-track grow select-none overflow-hidden", local.class)}
			data-orientation={context.state.orientation()}
			data-slot="slider-track"
			{...others}
		>
			{local.children}
		</SliderPrimitive.Track>
	);
};

type SliderFillComponentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	SliderFillProps<T>
> &
	Pick<ComponentProps<T>, "class">;

const SliderFill = <T extends ValidComponent = "div">(props: SliderFillComponentProps<T>) => {
	const [local, others] = splitProps(props as SliderFillComponentProps, ["class"]);
	const context = useSliderContext();
	return (
		<SliderPrimitive.Fill
			class={cn(
				"absolute z-slider-range data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
				local.class,
			)}
			data-orientation={context.state.orientation()}
			data-slot="slider-range"
			{...others}
		/>
	);
};

type SliderThumbComponentProps<T extends ValidComponent = "span"> = PolymorphicProps<
	T,
	SliderThumbProps<T>
> &
	Pick<ComponentProps<T>, "class">;

const SliderThumb = <T extends ValidComponent = "span">(props: SliderThumbComponentProps<T>) => {
	const [local, others] = splitProps(props as SliderThumbComponentProps, ["class"]);
	return (
		<SliderPrimitive.Thumb
			class={cn(
				"z-slider-thumb block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50",
				local.class,
			)}
			data-slot="slider-thumb"
			{...others}
		>
			<SliderPrimitive.Input />
		</SliderPrimitive.Thumb>
	);
};

export { Slider };
