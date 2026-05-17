import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import "./app.css";

import { Link, Meta, Title } from "@solidjs/meta";

import Header from "./components/header";

export default function App() {
	return (
		<Router
			root={(props) => (
				<>
					<Title>budget-tracker_</Title>
					<Meta content="#0c0c0c" name="theme-color" />
					<Link href="/manifest.webmanifest" rel="manifest" />
					<Link href="/apple-touch-icon-180x180.png" rel="apple-touch-icon" />
					<a class="skip-link" href="#main-content">
						Skip to main content
					</a>
					<Header />
					<Suspense>{props.children}</Suspense>
				</>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
