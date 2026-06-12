import { expect, test } from "@playwright/test";

test("gates the files lab for unauthenticated users", async ({ page }) => {
	await page.goto("/en/files-lab");

	await expect(page).toHaveURL(/\/en\/login/);
});

test("gates the product files page for unauthenticated users", async ({ page }) => {
	await page.goto("/en/files", { waitUntil: "commit" });

	await expect(page).toHaveURL(/\/en\/login/);
	await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("renders the files lab shell and both approach pages for an authenticated user", async ({
	page,
}) => {
	await page.route("**/api/auth/**", async (route) => {
		await route.fulfill({
			contentType: "application/json",
			json: {
				session: {
					id: "session-browser-lab",
					userId: "user-browser-lab",
				},
				user: {
					email: "browser-lab@proto-cook.test",
					id: "user-browser-lab",
					name: "Browser Lab",
				},
			},
			status: 200,
		});
	});

	await page.goto("/en/files-lab");

	await expect(page.getByText("Files lab", { exact: true })).toBeVisible();
	await expect(page.getByRole("link", { name: "Hybrid lab" })).toBeVisible();
	await expect(page.getByRole("link", { name: "HTTP-native lab" })).toBeVisible();

	await page.goto("/en/files-lab/hybrid");
	await expect(page.getByText("Hybrid files lab", { exact: true })).toBeVisible();
	await page.getByLabel("Track").selectOption("stress");
	await page.getByLabel("Storage profile").selectOption("minio-s3");
	await page.getByLabel("Upload protocol").selectOption("s3-multipart");
	await page.getByLabel("Visibility").selectOption("public");
	await page.getByRole("button", { name: "Generate fixtures" }).click();

	await expect(page.getByText("fixture-image.svg")).toBeVisible();
	await expect(page.getByText("fixture-document.txt")).toBeVisible();
	await expect(page.getByText("fixture-audio.bin")).toBeVisible();
	await expect(page.getByText("fixture-video.bin")).toBeVisible();
	await expect(page.getByText("fixture-generic.json")).toBeVisible();
	await expect(page.getByText("5 file(s) selected.")).toBeVisible();

	await page.goto("/en/files-lab/http");
	await expect(page.getByText("HTTP-native files lab", { exact: true })).toBeVisible();
	await page.getByLabel("Upload protocol").selectOption("xhr");
	await page.getByRole("button", { name: "Generate fixtures" }).click();
	await expect(page.getByText("fixture-image.svg")).toBeVisible();
});

test("renders the course video lab and lesson player shell for an authenticated user", async ({
	page,
}) => {
	await page.route("**/api/auth/**", async (route) => {
		await route.fulfill({
			contentType: "application/json",
			json: {
				session: {
					id: "session-browser-course-video",
					userId: "user-browser-course-video",
				},
				user: {
					email: "browser-course-video@proto-cook.test",
					id: "user-browser-course-video",
					name: "Browser Course Video",
				},
			},
			status: 200,
		});
	});

	await page.goto("/en/files-lab/course-video");

	await expect(page.getByText("Course video lab", { exact: true })).toBeVisible();
	await expect(page.getByLabel("Course slug")).toBeVisible();
	await expect(page.getByLabel("Video file ID")).toBeVisible();
	await expect(page.getByRole("button", { name: "Attach video" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Request playback" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Lesson" })).toBeVisible();

	await page.goto("/en/courses/video-lab-course/intro/hls-preview");

	await expect(page.getByText("hls-preview")).toBeVisible();
	await expect(page.getByText("video-lab-course / intro")).toBeVisible();
	await expect(page.getByRole("button", { name: "Request playback" })).toBeVisible();
});
