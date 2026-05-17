import { Title } from "@solidjs/meta";
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
	const [openApiSpec, setOpenApiSpec] = createSignal<OpenApiSpec>();
	const [errorMessage, setErrorMessage] = createSignal<string>();
	const [isLoading, setIsLoading] = createSignal(true);

	const operations = () => flattenOperations(openApiSpec());

	onMount(async () => {
		try {
			setOpenApiSpec(await fetchOpenApiSpec());
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Unable to load API reference.");
		} finally {
			setIsLoading(false);
		}
	});

	return (
		<main class="page-shell api-reference-shell" id="main-content">
			<Title>API Reference</Title>
			<section class="status-card api-reference-card">
				<header class="api-reference-heading">
					<p class="eyebrow">OpenAPI reference</p>
					<h1 class="api-reference-title">{openApiSpec()?.info?.title ?? "Shared API surface"}</h1>
					<p class="status-line">
						Version {openApiSpec()?.info?.version ?? "0.0.0"} from the same-origin OpenAPI spec.
					</p>
					<Show when={openApiSpec()?.servers?.[0]?.url}>
						{(serverUrl) => <p class="status-line">Server: {serverUrl()}</p>}
					</Show>
				</header>

				<Switch>
					<Match when={isLoading()}>
						<p class="status-banner pending" role="status">
							Loading API reference...
						</p>
					</Match>
					<Match when={errorMessage()}>
						{(message) => (
							<p class="status-banner error" role="alert">
								{message()}
							</p>
						)}
					</Match>
					<Match when={openApiSpec()}>
						<div class="api-reference-list">
							<For each={operations()}>
								{(routeOperation) => (
									<article class="api-operation-card">
										<div class="api-operation-header">
											<span class="api-method-badge">{routeOperation.method}</span>
											<div class="api-operation-copy">
												<h2>{routeOperation.operation.operationId ?? routeOperation.path}</h2>
												<p class="api-operation-path">{routeOperation.path}</p>
												<Show when={routeOperation.operation.description}>
													{(description) => <p class="status-line">{description()}</p>}
												</Show>
											</div>
										</div>

										<Show when={routeOperation.operation.requestBody?.content}>
											{(requestBody) => (
												<section class="api-operation-section">
													<h3>Request body</h3>
													<p class="status-line">
														Required:{" "}
														{routeOperation.operation.requestBody?.required ? "yes" : "no"}
													</p>
													<pre class="api-operation-code">
														{JSON.stringify(requestBody(), null, 2)}
													</pre>
												</section>
											)}
										</Show>

										<section class="api-operation-section">
											<h3>Responses</h3>
											<ul class="api-response-list">
												<For each={Object.entries(routeOperation.operation.responses ?? {})}>
													{([statusCode, response]) => (
														<li>
															<strong>{statusCode}</strong>
															<span>{response.description ?? "No description"}</span>
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
		throw new Error(`Unable to load API reference (${response.status})`);
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
