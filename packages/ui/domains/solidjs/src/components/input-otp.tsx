import OtpField, { type RootProps as OtpFieldRootProps } from "@corvu/otp-field";
import { Minus } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";

import { cn } from "#libs/utils";

type InputOTPProps = OtpFieldRootProps &
	ComponentProps<"div"> &
	Pick<ComponentProps<"input">, "disabled" | "required"> & {
		containerClass?: string;
	};

const InputOTP = (props: InputOTPProps) => {
	const [local, others] = splitProps(props as InputOTPProps, [
		"class",
		"containerClass",
		"children",
		"id",
		"disabled",
		"required",
		"value",
		"onValueChange",
	]);

	return (
		<OtpField
			class={cn("z-input-otp flex items-center has-disabled:opacity-50", local.containerClass)}
			data-slot="input-otp"
			spellcheck={false}
			{...others}
		>
			<OtpField.Input
				class={cn("z-input-otp-input disabled:cursor-not-allowed", local.class)}
				data-slot="input-otp-input"
				disabled={local.disabled}
				id={local.id}
				onChange={(e) => local.onValueChange?.(e.target.value)}
				required={local.required}
				spellcheck={false}
				value={local.value}
			/>
			{local.children}
		</OtpField>
	);
};

type InputOTPGroupProps = ComponentProps<"div">;

const InputOTPGroup = (props: InputOTPGroupProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<div
			class={cn("z-input-otp-group flex items-center", local.class)}
			data-slot="input-otp-group"
			{...others}
		/>
	);
};

type InputOTPSlotProps = ComponentProps<"div"> & {
	index: number;
};

const InputOTPSlot = (props: InputOTPSlotProps) => {
	const [local, others] = splitProps(props, ["index", "class"]);
	const context = OtpField.useContext();

	const char = () => context.value()[local.index];
	const isActive = () => context.activeSlots().includes(local.index);
	const showCaret = () => isActive() && context.isInserting();

	return (
		<div
			class={cn(
				"relative z-input-otp-slot flex items-center justify-center data-[active=true]:z-10",
				local.class,
			)}
			data-active={isActive()}
			data-slot="input-otp-slot"
			{...others}
		>
			{char()}
			<Show when={showCaret()}>
				<div class="pointer-events-none absolute inset-0 z-input-otp-caret flex items-center justify-center">
					<div class="z-input-otp-caret-line h-4 w-px animate-caret-blink bg-foreground" />
				</div>
			</Show>
		</div>
	);
};

type InputOTPSeparatorProps = ComponentProps<"div">;

const InputOTPSeparator = (props: InputOTPSeparatorProps) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<div
			aria-hidden="true"
			class={cn("z-input-otp-separator flex items-center", local.class)}
			data-slot="input-otp-separator"
			{...others}
		>
			<Minus />
		</div>
	);
};

export {
	InputOTP,
	InputOTPGroup,
	type InputOTPGroupProps,
	type InputOTPProps,
	InputOTPSeparator,
	type InputOTPSeparatorProps,
	InputOTPSlot,
	type InputOTPSlotProps,
};
