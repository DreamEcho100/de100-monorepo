import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import type { ButtonProps } from "@/components/button";
import { Button } from "@/components/button";
import { cn } from "@/libs/utils";

type PaginationProps = ComponentProps<"nav">;

const Pagination = (props: PaginationProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<nav
			aria-label="pagination"
			class={cn("z-pagination mx-auto flex w-full justify-center", local.class)}
			data-slot="pagination"
			{...others}
		/>
	);
};

type PaginationContentProps = ComponentProps<"ul">;

const PaginationContent = (props: PaginationContentProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<ul
			class={cn("z-pagination-content flex items-center", local.class)}
			data-slot="pagination-content"
			{...others}
		/>
	);
};

type PaginationItemProps = ComponentProps<"li">;

const PaginationItem = (props: PaginationItemProps) => (
	<li data-slot="pagination-item" {...props} />
);

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<ButtonProps, "size"> &
	ComponentProps<"a">;

const PaginationLink = (props: PaginationLinkProps) => {
	const mergedProps = mergeProps({ size: "icon" } as PaginationLinkProps, props);
	const [local, others] = splitProps(mergedProps, ["class", "isActive", "size"]);
	return (
		<Button
			aria-current={local.isActive ? "page" : undefined}
			as="a"
			class={cn("z-pagination-link", local.class)}
			data-active={local.isActive}
			data-slot="pagination-link"
			size={local.size}
			variant={local.isActive ? "outline" : "ghost"}
			{...others}
		/>
	);
};

type PaginationPreviousProps = ComponentProps<typeof PaginationLink>;

const PaginationPrevious = (props: PaginationPreviousProps) => {
	const [local, others] = splitProps(props, ["class", "children"]);
	return (
		<PaginationLink
			aria-label="Go to previous page"
			class={cn("z-pagination-previous", local.class)}
			size="default"
			{...others}
		>
			<ChevronLeft data-icon="inline-start" />
			<span class="z-pagination-previous-text hidden sm:block">Previous</span>
		</PaginationLink>
	);
};

type PaginationNextProps = ComponentProps<typeof PaginationLink>;

const PaginationNext = (props: PaginationNextProps) => {
	const [local, others] = splitProps(props, ["class", "children"]);
	return (
		<PaginationLink
			aria-label="Go to next page"
			class={cn("z-pagination-next", local.class)}
			size="default"
			{...others}
		>
			<span class="z-pagination-next-text hidden sm:block">Next</span>
			<ChevronRight data-icon="inline-end" />
		</PaginationLink>
	);
};

type PaginationEllipsisProps = ComponentProps<"span">;

const PaginationEllipsis = (props: PaginationEllipsisProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<span
			aria-hidden
			class={cn("z-pagination-ellipsis flex items-center justify-center", local.class)}
			data-slot="pagination-ellipsis"
			{...others}
		>
			<Ellipsis />
			<span class="sr-only">More pages</span>
		</span>
	);
};

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
