type SeedTodoFixture = {
	id: number;
	text: string;
	completed: boolean;
};

type SeedMediaFixture = {
	id: string;
	fileName: string;
	bucketName: string;
	contentType: string;
	visibility: "public" | "private";
	status: "draft" | "ready";
	keySuffix: string;
	createdAt: Date;
	updatedAt: Date;
	confirmedAt: Date | null;
	deletedAt: Date | null;
};

type SeedUserFixture = {
	email: string;
	name: string;
	password: string;
	description: string;
	todos: SeedTodoFixture[];
	media: SeedMediaFixture[];
};

type DatabaseClient = Awaited<ReturnType<typeof import("@de100/apps-lms-db")["createDb"]>>;

type SeededUserRecord = {
	id: string;
	email: string;
	name: string;
	description: string;
	password: string;
};

const defaultPassword = "SeedDemo123!";

function daysAgo(days: number) {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const seedUsers: SeedUserFixture[] = [
	{
		email: "owner@lms.test",
		name: "Seed Owner",
		password: defaultPassword,
		description: "Primary demo account with mixed todo states and media metadata fixtures.",
		todos: [
			{ id: -101, text: "Review the seeded dashboard state", completed: true },
			{ id: -102, text: "Create a brand new todo from the form", completed: false },
			{ id: -103, text: "Edit one todo and toggle its completed status", completed: false },
			{ id: -104, text: "Delete a todo after checking the loading state", completed: true },
		],
		media: [
			{
				id: "seed-media-owner-ready-public",
				fileName: "course-handbook.txt",
				bucketName: "seed-public-metadata",
				contentType: "text/plain",
				visibility: "public",
				status: "ready",
				keySuffix: "seed/public/course-handbook.txt",
				createdAt: daysAgo(6),
				updatedAt: daysAgo(5),
				confirmedAt: daysAgo(5),
				deletedAt: null,
			},
			{
				id: "seed-media-owner-ready-private",
				fileName: "grading-notes.json",
				bucketName: "seed-private-metadata",
				contentType: "application/json",
				visibility: "private",
				status: "ready",
				keySuffix: "seed/private/grading-notes.json",
				createdAt: daysAgo(4),
				updatedAt: daysAgo(4),
				confirmedAt: daysAgo(4),
				deletedAt: null,
			},
			{
				id: "seed-media-owner-draft-private",
				fileName: "upload-awaiting-review.svg",
				bucketName: "seed-private-metadata",
				contentType: "image/svg+xml",
				visibility: "private",
				status: "draft",
				keySuffix: "seed/private/upload-awaiting-review.svg",
				createdAt: daysAgo(1),
				updatedAt: daysAgo(1),
				confirmedAt: null,
				deletedAt: null,
			},
		],
	},
	{
		email: "viewer@lms.test",
		name: "Seed Viewer",
		password: defaultPassword,
		description: "Secondary account with a smaller dataset for cross-account checks.",
		todos: [
			{ id: -201, text: "Confirm the dashboard only shows this user's data", completed: true },
			{
				id: -202,
				text: "Try creating and deleting a todo from a lighter account",
				completed: false,
			},
		],
		media: [
			{
				id: "seed-media-viewer-draft-public",
				fileName: "shared-syllabus.txt",
				bucketName: "seed-public-metadata",
				contentType: "text/plain",
				visibility: "public",
				status: "draft",
				keySuffix: "seed/public/shared-syllabus.txt",
				createdAt: daysAgo(2),
				updatedAt: daysAgo(2),
				confirmedAt: null,
				deletedAt: null,
			},
		],
	},
	{
		email: "empty@lms.test",
		name: "Seed Empty",
		password: defaultPassword,
		description: "Baseline account with auth only and no todo or media fixtures.",
		todos: [],
		media: [],
	},
];

async function closeDb(db: DatabaseClient) {
	const client = (db as { $client?: { end?: () => Promise<unknown> } }).$client;
	await client?.end?.();
}

function createSeedStorageKey(userId: string, keySuffix: string) {
	return `${userId}/${keySuffix}`;
}

function createSeedMediaBody(fixture: SeedMediaFixture) {
	switch (fixture.contentType) {
		case "application/json":
			return JSON.stringify(
				{
					checklist: [
						"Verify seeded private media routes",
						"Issue a signed URL from the media page",
						"Confirm local storage serves real fixture bodies",
					],
					fileName: fixture.fileName,
					seed: "lms-media-fixture",
					status: fixture.status,
					visibility: fixture.visibility,
				},
				null,
				2,
			);
		case "image/svg+xml":
			return [
				'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320" role="img" aria-labelledby="seed-title seed-desc">',
				`<title id="seed-title">${fixture.fileName}</title>`,
				`<desc id="seed-desc">${fixture.visibility} ${fixture.status} media fixture for local development.</desc>`,
				'<rect width="480" height="320" fill="#0f172a" rx="24" ry="24"/>',
				'<rect x="24" y="24" width="432" height="272" fill="#e2e8f0" rx="18" ry="18"/>',
				'<text x="48" y="112" fill="#0f172a" font-family="system-ui, sans-serif" font-size="24" font-weight="700">LMS seeded media fixture</text>',
				`<text x="48" y="156" fill="#334155" font-family="system-ui, sans-serif" font-size="18">${fixture.fileName}</text>`,
				`<text x="48" y="196" fill="#475569" font-family="system-ui, sans-serif" font-size="16">Visibility: ${fixture.visibility}</text>`,
				`<text x="48" y="228" fill="#475569" font-family="system-ui, sans-serif" font-size="16">Status: ${fixture.status}</text>`,
				"</svg>",
			].join("");
		default:
			return [
				"LMS seeded media fixture",
				`File: ${fixture.fileName}`,
				`Visibility: ${fixture.visibility}`,
				`Status: ${fixture.status}`,
				"This file is written during db:seed so local media routes have real content to serve.",
			].join("\n");
	}
}

function createSeedMediaAsset(fixture: SeedMediaFixture) {
	const body = createSeedMediaBody(fixture);

	return {
		body,
		httpMetadata: {
			cacheControl:
				fixture.visibility === "public"
					? "public, max-age=31536000, immutable"
					: "private, no-store, max-age=0",
			contentDisposition: `inline; filename="${fixture.fileName.replace(/"/g, "")}"`,
			contentType: fixture.contentType,
		},
		size: new TextEncoder().encode(body).byteLength,
	};
}

async function ensureSeedUser(
	db: DatabaseClient,
	auth: ReturnType<typeof import("@de100/apps-lms-auth")["createAuth"]>,
	fixtures: SeedUserFixture,
) {
	const { account, user } = await import("@de100/apps-lms-db/schema/auth");
	const { and, eq } = await import("drizzle-orm");

	let [existingUser] = await db.select().from(user).where(eq(user.email, fixtures.email)).limit(1);

	if (!existingUser) {
		await auth.api.signUpEmail({
			body: {
				email: fixtures.email,
				name: fixtures.name,
				password: fixtures.password,
			},
		});

		[existingUser] = await db.select().from(user).where(eq(user.email, fixtures.email)).limit(1);
	}

	if (!existingUser) {
		throw new Error(`Failed to create or load seeded user ${fixtures.email}.`);
	}

	const [credentialAccount] = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, existingUser.id), eq(account.providerId, "credential")))
		.limit(1);

	if (!credentialAccount?.password) {
		throw new Error(
			`Seeded user ${fixtures.email} exists without a Better Auth credential account. Remove that user and rerun the seed.`,
		);
	}

	if (existingUser.name !== fixtures.name) {
		await db
			.update(user)
			.set({
				name: fixtures.name,
				updatedAt: new Date(),
			})
			.where(eq(user.id, existingUser.id));
	}

	return existingUser;
}

async function syncSeedTodos(db: DatabaseClient, userId: string, fixtures: SeedTodoFixture[]) {
	const { inArray } = await import("drizzle-orm");
	const { todo } = await import("@de100/apps-lms-db/schema/todo");

	if (fixtures.length === 0) {
		return;
	}

	await db.delete(todo).where(
		inArray(
			todo.id,
			fixtures.map((fixture) => fixture.id),
		),
	);
	await db.insert(todo).values(
		fixtures.map((fixture) => ({
			completed: fixture.completed,
			id: fixture.id,
			text: fixture.text,
			userId,
		})),
	);
}

async function syncSeedMedia(db: DatabaseClient, userId: string, fixtures: SeedMediaFixture[]) {
	const { inArray } = await import("drizzle-orm");
	const { media } = await import("@de100/apps-lms-db/schema/media");
	const { getConfiguredMediaBucket } = await import("@de100/apps-lms-api/media-storage");

	if (fixtures.length === 0) {
		return 0;
	}

	const seededMediaEntries = fixtures.map((fixture) => ({
		asset: createSeedMediaAsset(fixture),
		fixture,
		key: createSeedStorageKey(userId, fixture.keySuffix),
	}));
	const localBuckets = {
		private: getConfiguredMediaBucket("private"),
		public: getConfiguredMediaBucket("public"),
	} as const;

	for (const entry of seededMediaEntries) {
		await localBuckets[entry.fixture.visibility]?.delete(entry.key);
	}

	await db.delete(media).where(
		inArray(
			media.id,
			fixtures.map((fixture) => fixture.id),
		),
	);

	await db.insert(media).values(
		seededMediaEntries.map(({ asset, fixture, key }) => ({
			bucketName: fixture.bucketName,
			confirmedAt: fixture.confirmedAt,
			contentType: fixture.contentType,
			createdAt: fixture.createdAt,
			deletedAt: fixture.deletedAt,
			fileName: fixture.fileName,
			id: fixture.id,
			key,
			size: asset.size,
			status: fixture.status,
			updatedAt: fixture.updatedAt,
			userId,
			visibility: fixture.visibility,
		})),
	);

	let writtenObjectCount = 0;

	for (const entry of seededMediaEntries) {
		if (entry.fixture.deletedAt) {
			continue;
		}

		const bucket = localBuckets[entry.fixture.visibility];
		if (!bucket) {
			continue;
		}

		await bucket.put(entry.key, entry.asset.body, {
			httpMetadata: entry.asset.httpMetadata,
		});
		writtenObjectCount += 1;
	}

	return writtenObjectCount;
}

async function main() {
	process.env.NODE_ENV ??= "production";

	const [{ createAuth }, { createDb }, { getConfiguredMediaStorageDriver }] = await Promise.all([
		import("@de100/apps-lms-auth"),
		import("@de100/apps-lms-db"),
		import("@de100/apps-lms-api/media-storage"),
	]);

	const db = createDb();
	const auth = createAuth();
	const mediaStorageDriver = getConfiguredMediaStorageDriver();

	try {
		const seededUsers: SeededUserRecord[] = [];
		let writtenMediaObjects = 0;

		for (const fixtures of seedUsers) {
			const currentUser = await ensureSeedUser(db, auth, fixtures);
			await syncSeedTodos(db, currentUser.id, fixtures.todos);
			writtenMediaObjects += await syncSeedMedia(db, currentUser.id, fixtures.media);

			seededUsers.push({
				description: fixtures.description,
				email: currentUser.email,
				id: currentUser.id,
				name: currentUser.name,
				password: fixtures.password,
			});
		}

		const { inArray } = await import("drizzle-orm");
		const { todo } = await import("@de100/apps-lms-db/schema/todo");
		const { media } = await import("@de100/apps-lms-db/schema/media");

		const seededTodoIds = seedUsers.flatMap((fixtures) =>
			fixtures.todos.map((todoFixture) => todoFixture.id),
		);
		const seededMediaIds = seedUsers.flatMap((fixtures) =>
			fixtures.media.map((mediaFixture) => mediaFixture.id),
		);

		const persistedTodos =
			seededTodoIds.length > 0
				? await db.select({ id: todo.id }).from(todo).where(inArray(todo.id, seededTodoIds))
				: [];
		const persistedMedia =
			seededMediaIds.length > 0
				? await db.select({ id: media.id }).from(media).where(inArray(media.id, seededMediaIds))
				: [];

		console.log(
			`Seeded ${seededUsers.length} users, ${persistedTodos.length} todos, and ${persistedMedia.length} media metadata records.`,
		);
		console.table(
			seededUsers.map((user) => ({
				description: user.description,
				email: user.email,
				name: user.name,
				password: user.password,
			})),
		);

		if (mediaStorageDriver === "local") {
			console.log(
				`Seeded ${writtenMediaObjects} local media objects under ${process.env.APP_LMS_MEDIA_LOCAL_ROOT || "./.local/media"}.`,
			);
		} else {
			console.log(
				"Media fixtures remain metadata-only when APP_LMS_MEDIA_STORAGE_DRIVER=r2 because db:seed does not run with live runtime bucket bindings.",
			);
		}
	} finally {
		await closeDb(db);
	}
}

await main();
