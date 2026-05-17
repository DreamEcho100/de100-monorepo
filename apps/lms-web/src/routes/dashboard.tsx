import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createEffect, createResource, createSignal, onMount, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";

interface PrivateDataResponse {
	json: {
		message: string;
	};
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [privateData] = createResource(
		() => {
			const currentSession = session();
			if (!isHydrated() || currentSession.isPending || !currentSession.data) {
				return;
			}

			return currentSession.data.user.id;
		},
		async () => {
			const response = await fetch("/rpc/privateData", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({}),
			});

			if (!response.ok) {
				throw new Error(`Private API request failed with ${response.status}`);
			}

			const payload = (await response.json()) as PrivateDataResponse;
			return payload.json;
		},
	);

	onMount(() => {
		setIsHydrated(true);
	});

	createEffect(() => {
		const currentSession = session();
		if (currentSession.isPending || currentSession.data) {
			return;
		}

		navigate("/login", { replace: true });
	});

	return (
		<main class="dashboard-grid" id="main-content">
			<Title>Dashboard</Title>
			<section class="hero-card">
				<p class="eyebrow">Private route</p>
				<h1>Dashboard</h1>
				<Show when={isHydrated() && !session().isPending && session().data}>
					{(currentSession) => (
						<p class="lede">
							Welcome {currentSession().user.name}. This page is now served from SolidStart while
							still consuming the shared auth and API packages.
						</p>
					)}
				</Show>
				<Show when={!isHydrated() || session().isPending}>
					<p class="status-banner pending" role="status">
						Loading your dashboard...
					</p>
				</Show>
			</section>

			<section class="status-card">
				<h2>Private API status</h2>
				<Show when={!isHydrated() || session().isPending || privateData.loading}>
					<p class="status-banner pending" role="status">
						Loading private data...
					</p>
				</Show>
				<Show when={privateData()}>
					{(data) => (
						<p class="status-banner success" role="status">
							{data().message}
						</p>
					)}
				</Show>
				<Show when={isHydrated() && !session().isPending && !!session().data && privateData.error}>
					<p class="status-banner error" role="alert">
						Private API request failed. Sign in first if the session is missing.
					</p>
				</Show>
			</section>
		</main>
	);
}
