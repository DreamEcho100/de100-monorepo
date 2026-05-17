import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
	return (
		<main class="page-shell" id="main-content">
			<Title>Not Found</Title>
			<HttpStatusCode code={404} />
			<section class="status-card">
				<p class="eyebrow">Missing route</p>
				<h1 class="api-reference-title">Page Not Found</h1>
				<p class="lede">This path is not part of the migrated SolidStart app surface.</p>
				<p class="status-banner empty">
					Visit{" "}
					<a href="https://start.solidjs.com" rel="noopener" target="_blank">
						start.solidjs.com
					</a>{" "}
					to learn more about building SolidStart apps.
				</p>
			</section>
		</main>
	);
}
