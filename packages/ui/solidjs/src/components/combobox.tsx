import type {
	ComboboxContentProps as ComboboxPrimitiveContentProps,
	ComboboxControlProps as ComboboxPrimitiveControlProps,
	ComboboxInputProps as ComboboxPrimitiveInputProps,
	ComboboxItemProps as ComboboxPrimitiveItemProps,
	ComboboxSectionProps as ComboboxPrimitiveSectionProps,
	ComboboxTriggerProps as ComboboxPrimitiveTriggerProps,
	ComboboxRootProps,
} from "@kobalte/core/combobox";
import {
	Content as ComboboxPrimitiveContent,
	Control as ComboboxPrimitiveControl,
	Icon as ComboboxPrimitiveIcon,
	Input as ComboboxPrimitiveInput,
	Item as ComboboxPrimitiveItem,
	ItemIndicator as ComboboxPrimitiveItemIndicator,
	ItemLabel as ComboboxPrimitiveItemLabel,
	Listbox as ComboboxPrimitiveListbox,
	Portal as ComboboxPrimitivePortal,
	Root as ComboboxPrimitiveRoot,
	Section as ComboboxPrimitiveSection,
	Trigger as ComboboxPrimitiveTrigger,
} from "@kobalte/core/combobox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronsUpDown, X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/input-group";
import { cn } from "@/libs/utils";

// ============================================================================
// Combobox Root
// ============================================================================

type ComboboxProps<O, OptGroup = never, T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ComboboxRootProps<O, OptGroup, T>
> &
	Pick<ComponentProps<T>, "class" | "children">;

const Combobox = <O, OptGroup = never, T extends ValidComponent = "div">(
	props: ComboboxProps<O, OptGroup, T>,
) => {
	const mergedProps = mergeProps(
		{
			sameWidth: true,
			gutter: 8,
			placement: "bottom",
			defaultFilter: "contains",
			triggerMode: "input",
		} as ComboboxProps<O>,
		props,
	);
	return <ComboboxPrimitiveRoot {...mergedProps} />;
};

// ============================================================================
// Combobox Control
// ============================================================================

type ComboboxControlProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ComboboxPrimitiveControlProps<T>
> &
	Pick<ComponentProps<T>, "class" | "children">;

const ComboboxControl = <T extends ValidComponent = "div">(props: ComboboxControlProps<T>) => {
	const [local, others] = splitProps(props as ComboboxControlProps, ["class"]);
	return (
		<ComboboxPrimitiveControl
			class={cn("z-combobox-control", local.class)}
			data-slot="combobox-control"
			{...others}
		/>
	);
};

// ============================================================================
// Combobox Input
// ============================================================================

type ComboboxInputProps<T extends ValidComponent = "input"> = PolymorphicProps<
	T,
	ComboboxPrimitiveInputProps<T>
> &
	Pick<ComponentProps<"input">, "class" | "placeholder" | "disabled" | "id" | "name"> & {
		showTrigger?: boolean;
		showClear?: boolean;
		children?: JSX.Element;
	};

const ComboboxInput = <T extends ValidComponent = "input">(rawProps: ComboboxInputProps<T>) => {
	const props = mergeProps({ showTrigger: true, showClear: false }, rawProps);
	const [local, others] = splitProps(props as ComboboxInputProps, [
		"class",
		"showTrigger",
		"showClear",
		"children",
		"disabled",
	]);

	return (
		<ComboboxPrimitiveControl
			as={InputGroup}
			class={cn("z-combobox-input w-auto", local.class)}
			data-slot="combobox-control"
		>
			{(state) => (
				<>
					{local.children}
					<ComboboxPrimitiveInput
						as={InputGroupInput}
						data-slot="combobox-input"
						disabled={local.disabled}
						{...others}
					/>
					<InputGroupAddon align="inline-end">
						<Show when={local.showTrigger}>
							<ComboboxPrimitiveTrigger
								as={InputGroupButton}
								class="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
								data-slot="combobox-trigger"
								disabled={local.disabled}
								size="icon-xs"
								variant="ghost"
							>
								<ComboboxPrimitiveIcon
									as={ChevronsUpDown}
									class="pointer-events-none z-combobox-trigger-icon"
								/>
							</ComboboxPrimitiveTrigger>
						</Show>
						<Show when={local.showClear && state.selectedOptions().length > 0}>
							<InputGroupButton
								class="z-combobox-clear"
								data-slot="combobox-clear"
								disabled={local.disabled}
								onClick={() => state.clear()}
								size="icon-xs"
								variant="ghost"
							>
								<X class="pointer-events-none z-combobox-clear-icon" />
							</InputGroupButton>
						</Show>
					</InputGroupAddon>
				</>
			)}
		</ComboboxPrimitiveControl>
	);
};

// ============================================================================
// Combobox Trigger (for popup-style combobox)
// ============================================================================

type ComboboxTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
	T,
	ComboboxPrimitiveTriggerProps<T>
> &
	Pick<ComponentProps<T>, "class" | "children"> & {
		size?: "sm" | "default";
	};

const ComboboxTrigger = <T extends ValidComponent = "button">(
	rawProps: ComboboxTriggerProps<T>,
) => {
	const props = mergeProps({ size: "default" }, rawProps);
	const [local, others] = splitProps(props as ComboboxTriggerProps, ["class", "children", "size"]);

	return (
		<ComboboxPrimitiveControl>
			<ComboboxPrimitiveTrigger
				class={cn(
					"z-combobox-trigger z-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=combobox-value]:line-clamp-1 *:data-[slot=combobox-value]:flex *:data-[slot=combobox-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
					local.class,
				)}
				data-size={local.size}
				data-slot="combobox-trigger"
				{...others}
			>
				{local.children}
				<ComboboxPrimitiveIcon
					as={ChevronsUpDown}
					class="pointer-events-none z-combobox-trigger-icon"
				/>
			</ComboboxPrimitiveTrigger>
		</ComboboxPrimitiveControl>
	);
};

// ============================================================================
// Combobox Content
// ============================================================================

type ComboboxContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ComboboxPrimitiveContentProps<T>
> &
	Pick<ComponentProps<T>, "class">;

const ComboboxContent = <T extends ValidComponent = "div">(props: ComboboxContentProps<T>) => {
	const [local, others] = splitProps(props as ComboboxContentProps, ["class"]);
	return (
		<ComboboxPrimitivePortal>
			<ComboboxPrimitiveContent
				class={cn(
					"relative isolate z-50 z-combobox-content z-menu-target max-h-(--kb-popper-available-height) min-w-32 origin-(--kb-combobox-content-transform-origin) overflow-y-auto overflow-x-hidden",
					local.class,
				)}
				data-slot="combobox-content"
				{...others}
			>
				<ComboboxPrimitiveListbox class="z-combobox-listbox m-0 p-1" />
			</ComboboxPrimitiveContent>
		</ComboboxPrimitivePortal>
	);
};

// ============================================================================
// Combobox Section (Group)
// ============================================================================

type ComboboxSectionProps<T extends ValidComponent = "li"> = PolymorphicProps<
	T,
	ComboboxPrimitiveSectionProps<T>
> &
	Pick<ComponentProps<T>, "class">;

const ComboboxSection = <T extends ValidComponent = "li">(props: ComboboxSectionProps<T>) => {
	const [local, others] = splitProps(props as ComboboxSectionProps, ["class"]);
	return (
		<ComboboxPrimitiveSection
			class={cn("z-combobox-section", local.class)}
			data-slot="combobox-section"
			{...others}
		/>
	);
};

// ============================================================================
// Combobox Section Label
// ============================================================================

type ComboboxSectionLabelProps = ComponentProps<"span"> & {
	class?: string;
};

const ComboboxSectionLabel = (props: ComboboxSectionLabelProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<span
			class={cn("z-combobox-section-label z-select-label", local.class)}
			data-slot="combobox-section-label"
			{...others}
		/>
	);
};

// ============================================================================
// Combobox Item
// ============================================================================

type ComboboxItemProps<T extends ValidComponent = "li"> = PolymorphicProps<
	T,
	ComboboxPrimitiveItemProps<T>
> &
	Pick<ComponentProps<T>, "class"> & {
		children?: JSX.Element;
	};

const ComboboxItem = <T extends ValidComponent = "li">(props: ComboboxItemProps<T>) => {
	const [local, others] = splitProps(props as ComboboxItemProps, ["class", "children"]);
	return (
		<ComboboxPrimitiveItem
			class={cn(
				"relative z-combobox-item z-select-item flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				local.class,
			)}
			data-slot="combobox-item"
			{...others}
		>
			<ComboboxPrimitiveItemLabel class="z-combobox-item-label z-select-item-text shrink-0 whitespace-nowrap">
				{local.children}
			</ComboboxPrimitiveItemLabel>
			<ComboboxPrimitiveItemIndicator
				as="span"
				class="z-combobox-item-indicator z-select-item-indicator"
			>
				<Check class="pointer-events-none z-combobox-item-indicator-icon z-select-item-indicator-icon" />
			</ComboboxPrimitiveItemIndicator>
		</ComboboxPrimitiveItem>
	);
};

// ============================================================================
// Combobox Empty
// ============================================================================

type ComboboxEmptyProps = ComponentProps<"div"> & {
	class?: string;
};

const ComboboxEmpty = (props: ComboboxEmptyProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<div
			class={cn("z-combobox-empty py-6 text-center text-sm", local.class)}
			data-slot="combobox-empty"
			{...others}
		/>
	);
};

// ============================================================================
// Combobox Separator
// ============================================================================

type ComboboxSeparatorProps<T extends ValidComponent = "hr"> = ComponentProps<T> & {
	class?: string;
};

const ComboboxSeparator = <T extends ValidComponent = "hr">(
	props: PolymorphicProps<T, ComboboxSeparatorProps<T>>,
) => {
	const [local, others] = splitProps(props as ComboboxSeparatorProps, ["class"]);
	return (
		<hr
			class={cn("pointer-events-none z-combobox-separator z-select-separator", local.class)}
			data-slot="combobox-separator"
			{...others}
		/>
	);
};

export {
	Combobox,
	ComboboxContent,
	ComboboxControl,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxSection,
	ComboboxSectionLabel,
	ComboboxSeparator,
	ComboboxTrigger,
};
