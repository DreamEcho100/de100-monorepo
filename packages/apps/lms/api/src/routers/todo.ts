import { todo } from "@de100/apps-lms-db/schema/todo";
import {
	createTodoInputSchema,
	deleteTodoInputSchema,
	todoListOutputSchema,
	todoRecordOutputSchema,
	toggleTodoInputSchema,
} from "@de100/apps-lms-validators/server";
import { appErrorCodes } from "@de100/apps-lms-validators/shared";
import { and, desc, eq } from "drizzle-orm";

import { createAppError, defineAppError } from "../errors";
import { protectedProcedure } from "../index";

const todoRouterBasePath = "/todos";

export const todoRouter = {
	getAll: protectedProcedure
		.output(todoListOutputSchema)
		.route({
			method: "GET",
			path: `${todoRouterBasePath}`,
			summary: "List the signed-in user's todos",
			tags: ["Todos"],
		})
		.handler(async ({ context }) => {
			return await context.db
				.select()
				.from(todo)
				.where(eq(todo.userId, context.session.user.id))
				.orderBy(desc(todo.id));
		}),

	create: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.todo.createFailed),
		})
		.input(createTodoInputSchema)
		.output(todoRecordOutputSchema)
		.route({
			method: "POST",
			path: `${todoRouterBasePath}`,
			summary: "Create a todo for the signed-in user",
			tags: ["Todos"],
		})
		.handler(async ({ context, input }) => {
			const [createdTodo] = await context.db
				.insert(todo)
				.values({
					text: input.text,
					userId: context.session.user.id,
				})
				.returning();

			if (!createdTodo) {
				throw createAppError("INTERNAL_SERVER_ERROR", appErrorCodes.todo.createFailed);
			}

			return createdTodo;
		}),

	toggle: protectedProcedure
		.errors({
			NOT_FOUND: defineAppError(appErrorCodes.todo.notFound),
		})
		.input(toggleTodoInputSchema)
		.output(todoRecordOutputSchema)
		.route({
			method: "PATCH",
			path: `${todoRouterBasePath}/{id}`,
			summary: "Update a todo's completion state",
			tags: ["Todos"],
		})
		.handler(async ({ context, input }) => {
			const [updatedTodo] = await context.db
				.update(todo)
				.set({ completed: input.completed })
				.where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
				.returning();

			if (!updatedTodo) {
				throw createAppError("NOT_FOUND", appErrorCodes.todo.notFound);
			}

			return updatedTodo;
		}),

	delete: protectedProcedure
		.errors({
			NOT_FOUND: defineAppError(appErrorCodes.todo.notFound),
		})
		.input(deleteTodoInputSchema)
		.output(todoRecordOutputSchema)
		.route({
			method: "DELETE",
			path: `${todoRouterBasePath}/{id}`,
			summary: "Delete a todo owned by the signed-in user",
			tags: ["Todos"],
		})
		.handler(async ({ context, input }) => {
			const [deletedTodo] = await context.db
				.delete(todo)
				.where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
				.returning();

			if (!deletedTodo) {
				throw createAppError("NOT_FOUND", appErrorCodes.todo.notFound);
			}

			return deletedTodo;
		}),
};
