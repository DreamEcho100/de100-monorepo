import type {
	CollapsibleContentProps as TCollapsibleContentProps,
	CollapsibleRootProps as TCollapsibleRootProps,
	CollapsibleTriggerProps as TCollapsibleTriggerProps,
} from "@kobalte/core/collapsible";
import { Content as TContent, Root as TRoot, Trigger as TTrigger } from "@kobalte/core/collapsible";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";

type CollapsibleProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	TCollapsibleRootProps<T>
>;

const Collapsible = <T extends ValidComponent = "div">(props: CollapsibleProps<T>) => (
	<TRoot data-slot="collapsible" {...props} />
);

type CollapsibleTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
	T,
	TCollapsibleTriggerProps<T>
>;

const CollapsibleTrigger = <T extends ValidComponent = "button">(
	props: CollapsibleTriggerProps<T>,
) => <TTrigger data-slot="collapsible-trigger" {...props} />;

type CollapsibleContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	TCollapsibleContentProps<T>
>;

const CollapsibleContent = <T extends ValidComponent = "div">(
	props: CollapsibleContentProps<T>,
) => <TContent data-slot="collapsible-content" {...props} />;

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
