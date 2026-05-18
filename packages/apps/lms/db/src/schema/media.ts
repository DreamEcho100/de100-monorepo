import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const mediaVisibilityEnum = pgEnum("media_visibility", ["public", "private"]);
export const mediaStatusEnum = pgEnum("media_status", ["draft", "ready", "deleted"]);

export const media = pgTable(
	"media",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		fileName: text("file_name").notNull(),
		key: text("storage_key").notNull().unique(),
		bucketName: text("bucket_name"),
		contentType: text("content_type").notNull(),
		size: integer("size").notNull(),
		visibility: mediaVisibilityEnum("visibility").notNull(),
		status: mediaStatusEnum("status").default("draft").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
		confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("media_user_id_idx").on(table.userId),
		index("media_status_idx").on(table.status),
		index("media_visibility_idx").on(table.visibility),
	],
);
