import { useI18n } from "@de100/apps-lms-i18n";
import { Title } from "@solidjs/meta";
import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Match, onMount, Show, Switch } from "solid-js";

import { openApiSpecPath } from "~/libs/apis/openapi-routes";

interface OpenApiSpec {
	info?: OpenApiInfo;
	paths?: Record<string, OpenApiPathItem>;
	servers?: OpenApiServer[];
}

interface OpenApiInfo {
	title?: string;
	version?: string;
}

interface OpenApiServer {
	url?: string;
}

interface OpenApiPathItem {
	[method: string]: OpenApiOperation;
}

interface OpenApiOperation {
	description?: string;
	operationId?: string;
	requestBody?: OpenApiRequestBody;
	responses?: Record<string, OpenApiResponse>;
}

interface OpenApiRequestBody {
	content?: Record<string, unknown>;
	required?: boolean;
}

interface OpenApiResponse {
	description?: string;
}

interface RouteOperation {
	method: string;
	operation: OpenApiOperation;
	path: string;
}

export default function ApiReferencePage() {
	const { t } = useI18n();
	const [isHydrated, setIsHydrated] = createSignal(false);
	const openApiSpecQuery = createQuery(() => ({
		queryFn: fetchOpenApiSpec,
		queryKey: ["openapi-spec"],
		enabled: isHydrated(),
	}));

	onMount(() => {
		setIsHydrated(true);
	});

	const operations = () => flattenOperations(openApiSpecQuery.data);

	return (
		<main
			class="mx-auto grid w-full max-w-7xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>{t("apiReference.metaTitle")}</Title>
			<section class="grid gap-6 rounded-2xl border border-border/70 bg-card p-6 shadow-black/5 shadow-sm">
				<header class="grid gap-3">
					<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
						{t("apiReference.title")}
					</p>
					<h1 class="text-balance font-semibold text-3xl text-foreground tracking-tight">
						{openApiSpecQuery.data?.info?.title ?? t("apiReference.fallbackTitle")}
					</h1>
					<p class="text-muted-foreground text-sm leading-6">
						{t("apiReference.labels.version")} {openApiSpecQuery.data?.info?.version ?? "0.0.0"}{" "}
						{t("apiReference.subtitle")}
					</p>
					<Show when={openApiSpecQuery.data?.servers?.[0]?.url}>
						{(serverUrl) => (
							<p class="text-muted-foreground text-sm leading-6">
								{t("apiReference.labels.server")}: {serverUrl()}
							</p>
						)}
					</Show>
				</header>

				<Switch>
					<Match when={!isHydrated() || openApiSpecQuery.isPending}>
						<p
							class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
							role="status"
						>
							{t("apiReference.status.loading")}
						</p>
					</Match>
					<Match when={openApiSpecQuery.isError}>
						<p
							class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
							role="alert"
						>
							{openApiSpecQuery.error instanceof Error && openApiSpecQuery.error.message
								? `${t("apiReference.status.loadError")} (${openApiSpecQuery.error.message})`
								: t("apiReference.status.loadError")}
						</p>
					</Match>
					<Match when={openApiSpecQuery.data}>
						<div class="grid gap-3">
							<For each={operations()}>
								{(routeOperation) => (
									<article class="grid gap-5 rounded-2xl border border-border/70 bg-muted/20 p-5">
										<div class="flex flex-col gap-3 md:flex-row md:items-start">
											<span class="inline-flex h-fit w-fit rounded-full border border-border/70 bg-background px-3 py-1 font-mono font-semibold text-foreground text-xs uppercase tracking-[0.24em]">
												{routeOperation.method}
											</span>
											<div class="grid gap-3">
												<h2>{routeOperation.operation.operationId ?? routeOperation.path}</h2>
												<p class="font-mono text-muted-foreground text-xs">{routeOperation.path}</p>
												<Show when={routeOperation.operation.description}>
													{(description) => (
														<p class="text-muted-foreground text-sm leading-6">{description()}</p>
													)}
												</Show>
											</div>
										</div>

										<Show when={routeOperation.operation.requestBody?.content}>
											{(requestBody) => (
												<section class="grid gap-3">
													<h3 class="font-semibold text-foreground text-sm">
														{t("apiReference.labels.requestBody")}
													</h3>
													<p class="text-muted-foreground text-sm leading-6">
														{t("apiReference.labels.required")}:{" "}
														{routeOperation.operation.requestBody?.required
															? t("apiReference.labels.yes")
															: t("apiReference.labels.no")}
													</p>
													<pre class="overflow-x-auto rounded-xl border border-border/70 bg-background p-4 text-foreground text-xs leading-6">
														{JSON.stringify(requestBody(), null, 2)}
													</pre>
												</section>
											)}
										</Show>

										<section class="grid gap-3">
											<h3 class="font-semibold text-foreground text-sm">
												{t("apiReference.labels.responses")}
											</h3>
											<ul class="grid gap-3">
												<For each={Object.entries(routeOperation.operation.responses ?? {})}>
													{([statusCode, response]) => (
														<li class="grid gap-1 rounded-xl border border-border/70 bg-background/80 px-4 py-3">
															<strong class="font-mono font-semibold text-foreground text-xs">
																{statusCode}
															</strong>
															<span class="text-muted-foreground text-sm leading-6">
																{response.description ?? t("apiReference.status.noDescription")}
															</span>
														</li>
													)}
												</For>
											</ul>
										</section>
									</article>
								)}
							</For>
						</div>
					</Match>
				</Switch>
			</section>
		</main>
	);
}

const fetchOpenApiSpec = async () => {
	const response = await fetch(openApiSpecPath);

	if (!response.ok) {
		throw new Error(String(response.status));
	}

	return (await response.json()) as OpenApiSpec;
};

const flattenOperations = (spec?: OpenApiSpec): RouteOperation[] => {
	if (!spec?.paths) {
		return [];
	}

	const routeOperations: RouteOperation[] = [];

	for (const [path, pathItem] of Object.entries(spec.paths)) {
		for (const [method, operation] of Object.entries(pathItem)) {
			routeOperations.push({
				method: method.toUpperCase(),
				operation,
				path,
			});
		}
	}

	return routeOperations;
};
