import { useI18n } from "@de100/apps-lms-i18n";
import { Title } from "@solidjs/meta";

import ForgotPasswordForm from "~/components/forgot-password-form";

export default function ForgotPasswordPage() {
	const { t } = useI18n();

	return (
		<main
			class="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-16"
			id="main-content"
		>
			<Title>{t("auth.forgotPassword.title")}</Title>
			<ForgotPasswordForm />
		</main>
	);
}
