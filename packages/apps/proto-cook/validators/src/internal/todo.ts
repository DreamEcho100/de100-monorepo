import { z } from "zod/v4";

export const todoRecordOutputSchema = z.object({
	completed: z.boolean(),
	id: z.number().int(),
	text: z.string().min(1),
	userId: z.string().min(1),
});

export const todoListOutputSchema = z.array(todoRecordOutputSchema);

export const createTodoInputSchema = z.object({
	text: z.string().min(1),
});

export const toggleTodoInputSchema = z.object({
	completed: z.boolean(),
	id: z.number().int(),
});

export const deleteTodoInputSchema = z.object({
	id: z.number().int(),
});
