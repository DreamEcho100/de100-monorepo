import { useI18n } from "@de100/i18n-domains-solidjs/client";
import { Title } from "@solidjs/meta";

import ResetPasswordForm from "~/components/reset-password-form";

export default function ResetPasswordPage() {
	const { t } = useI18n();

	return (
		<main
			class="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-16"
			id="main-content"
		>
			<Title>{t("auth.resetPassword.title")}</Title>
			<ResetPasswordForm />
		</main>
	);
}
