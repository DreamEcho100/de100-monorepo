import type {
	ContextMenuCheckboxItemProps as ContextMenuPrimitiveContextMenuCheckboxItemProps,
	ContextMenuContentProps as ContextMenuPrimitiveContextMenuContentProps,
	ContextMenuGroupLabelProps as ContextMenuPrimitiveContextMenuGroupLabelProps,
	ContextMenuGroupProps as ContextMenuPrimitiveContextMenuGroupProps,
	ContextMenuItemProps as ContextMenuPrimitiveContextMenuItemProps,
	ContextMenuPortalProps as ContextMenuPrimitiveContextMenuPortalProps,
	ContextMenuRadioGroupProps as ContextMenuPrimitiveContextMenuRadioGroupProps,
	ContextMenuRadioItemProps as ContextMenuPrimitiveContextMenuRadioItemProps,
	ContextMenuRootProps as ContextMenuPrimitiveContextMenuRootProps,
	ContextMenuSeparatorProps as ContextMenuPrimitiveContextMenuSeparatorProps,
	ContextMenuSubContentProps as ContextMenuPrimitiveContextMenuSubContentProps,
	ContextMenuSubProps as ContextMenuPrimitiveContextMenuSubProps,
	ContextMenuSubTriggerProps as ContextMenuPrimitiveContextMenuSubTriggerProps,
	ContextMenuTriggerProps as ContextMenuPrimitiveContextMenuTriggerProps,
} from "@kobalte/core/context-menu";
import {
	CheckboxItem as ContextMenuPrimitiveCheckboxItem,
	Content as ContextMenuPrimitiveContent,
	Group as ContextMenuPrimitiveGroup,
	GroupLabel as ContextMenuPrimitiveGroupLabel,
	Item as ContextMenuPrimitiveItem,
	ItemIndicator as ContextMenuPrimitiveItemIndicator,
	Portal as ContextMenuPrimitivePortal,
	RadioGroup as ContextMenuPrimitiveRadioGroup,
	RadioItem as ContextMenuPrimitiveRadioItem,
	Root as ContextMenuPrimitiveRoot,
	Separator as ContextMenuPrimitiveSeparator,
	Sub as ContextMenuPrimitiveSub,
	SubContent as ContextMenuPrimitiveSubContent,
	SubTrigger as ContextMenuPrimitiveSubTrigger,
	Trigger as ContextMenuPrimitiveTrigger,
} from "@kobalte/core/context-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronRight } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "#libs/utils";

type ContextMenuProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuRootProps
> &
	Pick<ComponentProps<T>, "class">;

const ContextMenu = <T extends ValidComponent = "div">(props: ContextMenuProps<T>) => (
	<ContextMenuPrimitiveRoot {...props} />
);

type ContextMenuTriggerProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuTriggerProps<T>
> & {
	class?: string | undefined;
};

const ContextMenuTrigger = <T extends ValidComponent = "div">(
	props: ContextMenuTriggerProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuTriggerProps, ["class"]);
	return (
		<ContextMenuPrimitiveTrigger
			class={cn("z-context-menu-trigger select-none", local.class)}
			data-slot="context-menu-trigger"
			{...others}
		/>
	);
};

type ContextMenuPortalProps = ContextMenuPrimitiveContextMenuPortalProps;

const ContextMenuPortal = (props: ContextMenuPortalProps) => (
	<ContextMenuPrimitivePortal {...props} />
);

type ContextMenuContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuContentProps<T>
> & {
	class?: string | undefined;
};

const ContextMenuContent = <T extends ValidComponent = "div">(
	props: ContextMenuContentProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuContentProps, ["class"]);
	return (
		<ContextMenuPrimitivePortal>
			<ContextMenuPrimitiveContent
				class={cn(
					"z-50 z-context-menu-content z-menu-target max-h-(--kb-popper-available-height) origin-(--kb-menu-content-transform-origin) overflow-y-auto overflow-x-hidden outline-none",
					local.class,
				)}
				data-slot="context-menu-content"
				{...others}
			/>
		</ContextMenuPrimitivePortal>
	);
};

type ContextMenuGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuGroupProps<T>
> & {
	class?: string | undefined;
};

const ContextMenuGroup = <T extends ValidComponent = "div">(props: ContextMenuGroupProps<T>) => {
	const [local, others] = splitProps(props as ContextMenuGroupProps, ["class"]);
	return (
		<ContextMenuPrimitiveGroup class={local.class} data-slot="context-menu-group" {...others} />
	);
};

type ContextMenuLabelProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuGroupLabelProps<T>
> & {
	class?: string | undefined;
	inset?: boolean;
};

const ContextMenuLabel = <T extends ValidComponent = "div">(props: ContextMenuLabelProps<T>) => {
	const [local, others] = splitProps(props as ContextMenuLabelProps, ["class", "inset"]);
	return (
		<ContextMenuPrimitiveGroupLabel
			class={cn("z-context-menu-label data-inset:pl-8", local.class)}
			data-inset={local.inset}
			data-slot="context-menu-label"
			{...others}
		/>
	);
};

type ContextMenuItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuItemProps<T>
> & {
	class?: string | undefined;
	inset?: boolean;
	variant?: "default" | "destructive";
};

const ContextMenuItem = <T extends ValidComponent = "div">(props: ContextMenuItemProps<T>) => {
	const [local, others] = splitProps(props as ContextMenuItemProps, ["class", "inset", "variant"]);
	return (
		<ContextMenuPrimitiveItem
			class={cn(
				"group/context-menu-item relative z-context-menu-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-inset:pl-8 data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				local.class,
			)}
			data-inset={local.inset}
			data-slot="context-menu-item"
			data-variant={local.variant ?? "default"}
			{...others}
		/>
	);
};

type ContextMenuSubProps = ContextMenuPrimitiveContextMenuSubProps;

const ContextMenuSub = (props: ContextMenuSubProps) => <ContextMenuPrimitiveSub {...props} />;

type ContextMenuSubTriggerProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuSubTriggerProps<T>
> & {
	class?: string | undefined;
	children?: JSX.Element;
	inset?: boolean;
};

const ContextMenuSubTrigger = <T extends ValidComponent = "div">(
	props: ContextMenuSubTriggerProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuSubTriggerProps, [
		"class",
		"children",
		"inset",
	]);
	return (
		<ContextMenuPrimitiveSubTrigger
			class={cn(
				"z-context-menu-sub-trigger flex cursor-default select-none items-center outline-hidden data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				local.class,
			)}
			data-inset={local.inset}
			data-slot="context-menu-sub-trigger"
			{...others}
		>
			{local.children}
			<ChevronRight class="ml-auto" />
		</ContextMenuPrimitiveSubTrigger>
	);
};

type ContextMenuSubContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuSubContentProps<T>
> & {
	class?: string | undefined;
};

const ContextMenuSubContent = <T extends ValidComponent = "div">(
	props: ContextMenuSubContentProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuSubContentProps, ["class"]);
	return (
		<ContextMenuPrimitivePortal>
			<ContextMenuPrimitiveSubContent
				class={cn(
					"z-50 z-context-menu-content z-context-menu-subcontent z-menu-target max-h-(--kb-popper-available-height) origin-(--kb-menu-content-transform-origin) overflow-y-auto overflow-x-hidden outline-none",
					local.class,
				)}
				data-slot="context-menu-sub-content"
				{...others}
			/>
		</ContextMenuPrimitivePortal>
	);
};

type ContextMenuCheckboxItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuCheckboxItemProps<T>
> & {
	class?: string | undefined;
	children?: JSX.Element;
};

const ContextMenuCheckboxItem = <T extends ValidComponent = "div">(
	props: ContextMenuCheckboxItemProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuCheckboxItemProps, ["class", "children"]);
	return (
		<ContextMenuPrimitiveCheckboxItem
			class={cn(
				"relative z-context-menu-checkbox-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				local.class,
			)}
			data-slot="context-menu-checkbox-item"
			{...others}
		>
			<span class="pointer-events-none z-context-menu-item-indicator">
				<ContextMenuPrimitiveItemIndicator>
					<Check />
				</ContextMenuPrimitiveItemIndicator>
			</span>
			{local.children}
		</ContextMenuPrimitiveCheckboxItem>
	);
};

type ContextMenuRadioGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuRadioGroupProps<T>
> & {
	class?: string | undefined;
};

const ContextMenuRadioGroup = <T extends ValidComponent = "div">(
	props: ContextMenuRadioGroupProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuRadioGroupProps, ["class"]);
	return (
		<ContextMenuPrimitiveRadioGroup
			class={local.class}
			data-slot="context-menu-radio-group"
			{...others}
		/>
	);
};

type ContextMenuRadioItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuRadioItemProps<T>
> & {
	class?: string | undefined;
	children?: JSX.Element;
};

const ContextMenuRadioItem = <T extends ValidComponent = "div">(
	props: ContextMenuRadioItemProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuRadioItemProps, ["class", "children"]);
	return (
		<ContextMenuPrimitiveRadioItem
			class={cn(
				"relative z-context-menu-radio-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				local.class,
			)}
			data-slot="context-menu-radio-item"
			{...others}
		>
			<span class="pointer-events-none z-context-menu-item-indicator">
				<ContextMenuPrimitiveItemIndicator>
					<Check />
				</ContextMenuPrimitiveItemIndicator>
			</span>
			{local.children}
		</ContextMenuPrimitiveRadioItem>
	);
};

type ContextMenuSeparatorProps<T extends ValidComponent = "hr"> = PolymorphicProps<
	T,
	ContextMenuPrimitiveContextMenuSeparatorProps<T>
> & {
	class?: string | undefined;
};

const ContextMenuSeparator = <T extends ValidComponent = "hr">(
	props: ContextMenuSeparatorProps<T>,
) => {
	const [local, others] = splitProps(props as ContextMenuSeparatorProps, ["class"]);
	return (
		<ContextMenuPrimitiveSeparator
			class={cn("z-context-menu-separator", local.class)}
			data-slot="context-menu-separator"
			{...others}
		/>
	);
};

type ContextMenuShortcutProps = ComponentProps<"span"> & {
	class?: string | undefined;
};

const ContextMenuShortcut = (props: ContextMenuShortcutProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<span
			class={cn("z-context-menu-shortcut", local.class)}
			data-slot="context-menu-shortcut"
			{...others}
		/>
	);
};

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
};
