import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { createResource, createSignal, Match, onMount, Switch } from "solid-js";

interface HealthCheckResponse {
	json: string;
}

export default function Home() {
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [healthCheck] = createResource(
		() => (isHydrated() ? true : undefined),
		async () => {
			const response = await fetch("/rpc/healthCheck", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({}),
			});

			if (!response.ok) {
				throw new Error(`Health check failed with ${response.status}`);
			}

			const payload = (await response.json()) as HealthCheckResponse;
			return payload.json;
		},
	);

	onMount(() => {
		setIsHydrated(true);
	});

	return (
		<main class="page-shell" id="main-content">
			<Title>budget-tracker_</Title>
			<section class="hero-card">
				<p class="eyebrow">Unified runtime</p>
				<h1>budget-tracker_</h1>
				<p class="lede">
					This is the active SolidStart app for budget tracking, auth, shared RPC, and deployment
					through the unified monorepo runtime.
				</p>
				<div class="hero-actions">
					<A class="button" href="/login">
						Open auth flow
					</A>
					<A class="button secondary" href="/todos">
						View shared RPC demo
					</A>
				</div>
			</section>

			<section class="status-card">
				<h2>Shared API status</h2>
				<Switch>
					<Match when={!isHydrated() || healthCheck.loading}>
						<p class="status-banner pending" role="status">
							Checking shared oRPC health endpoint...
						</p>
					</Match>
					<Match when={healthCheck.error}>
						<p class="status-banner error" role="alert">
							Current server not reachable from this app.
						</p>
					</Match>
					<Match when={healthCheck()}>
						<p class="status-banner success" role="status">
							Shared API responded with: <strong>{healthCheck()}</strong>
						</p>
					</Match>
				</Switch>
			</section>
		</main>
	);
}
