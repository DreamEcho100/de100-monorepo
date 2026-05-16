import { todo } from "@de100/apps-lms-db/schema/todo";
import { eq } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

const getDb = async () => (await import("@de100/apps-lms-db")).db;

export const todoRouter = {
	getAll: publicProcedure.handler(async () => {
		const db = await getDb();

		return await db.select().from(todo);
	}),

	create: publicProcedure
		.input(z.object({ text: z.string().min(1) }))
		.handler(async ({ input }) => {
			const db = await getDb();

			return await db.insert(todo).values({
				text: input.text,
			});
		}),

	toggle: publicProcedure
		.input(z.object({ id: z.number(), completed: z.boolean() }))
		.handler(async ({ input }) => {
			const db = await getDb();

			return await db.update(todo).set({ completed: input.completed }).where(eq(todo.id, input.id));
		}),

	delete: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
		const db = await getDb();

		return await db.delete(todo).where(eq(todo.id, input.id));
	}),
};
