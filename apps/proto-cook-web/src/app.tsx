import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import Header from "~/components/header";
import Providers from "~/components/providers";

import "./app.css";

export default function App() {
	return (
		<Providers>
			<Router
				root={(props) => (
					<MetaProvider>
						<Header />
						<Suspense>{props.children}</Suspense>
					</MetaProvider>
				)}
			>
				<FileRoutes />
			</Router>
		</Providers>
	);
}
