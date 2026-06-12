import { boolean, index, pgTable, serial, text } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const todo = pgTable(
	"todo",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		text: text("text").notNull(),
		completed: boolean("completed").default(false).notNull(),
	},
	(table) => [index("todo_user_id_idx").on(table.userId)],
);
