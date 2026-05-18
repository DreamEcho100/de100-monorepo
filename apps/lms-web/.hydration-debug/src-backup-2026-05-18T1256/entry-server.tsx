// @refresh reload
import { MetaProvider } from "@solidjs/meta";
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

import { createThemeBootstrapScript, getServerAppI18nState } from "../i18n/server";

function AppDocument() {
	const request = getRequestEvent()?.request;
	const { initialSnapshot } = getServerAppI18nState(request);
	const themeBootstrapScript = createThemeBootstrapScript(initialSnapshot.themePreference);

	return (
		<StartServer
			document={({ assets, children, scripts }) => (
				<html
					class={initialSnapshot.resolvedTheme === "dark" ? "dark" : undefined}
					data-locale={initialSnapshot.locale}
					data-resolved-theme={initialSnapshot.resolvedTheme}
					data-theme-preference={initialSnapshot.themePreference}
					dir={initialSnapshot.dir}
					lang={initialSnapshot.locale}
				>
					<head>
						<meta charset="utf-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1" />
						<link rel="icon" href="/favicon.ico" />
						<script innerHTML={themeBootstrapScript} />
						{assets}
					</head>
					<body>
						<div id="app">{children}</div>
						{scripts}
					</body>
				</html>
			)}
		/>
	);
}

export default createHandler(() => (
	<MetaProvider>
		<AppDocument />
	</MetaProvider>
));
