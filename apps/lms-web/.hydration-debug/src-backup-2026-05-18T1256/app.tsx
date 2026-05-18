import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";

import "./app.css";

import { MetaProvider } from "@solidjs/meta";

import Header from "./components/header";
import Providers from "./components/providers";

export default function App() {
	return (
		<MetaProvider>
			<Providers>
				<Router
					root={(props) => (
						<>
							<Header />
							{props.children}
						</>
					)}
				>
					<FileRoutes />
				</Router>
			</Providers>
		</MetaProvider>
	);
}
