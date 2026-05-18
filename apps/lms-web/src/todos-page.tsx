import { useI18n } from "@de100/apps-lms-i18n";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
} from "@de100/ui-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { Loader2, Trash2 } from "lucide-solid";
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";

import { createLocalizedPath } from "../i18n/routing";

type TodoItem = {
	id: number;
	userId: string;
	text: string;
	completed: boolean;
};

export default function TodosPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { locale, t } = useI18n();
	const session = authClient.useSession();
	const newTodoInputId = "new-todo";
	const [newTodoText, setNewTodoText] = createSignal("");
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [todoError, setTodoError] = createSignal<string | null>(null);
	const canLoadTodos = () => isHydrated() && !session().isPending && !!session().data;
	const todos = createQuery(() => ({
		...orpc.todo.getAll.queryOptions(),
		enabled: canLoadTodos(),
	}));
	const createTodoMutation = createMutation(() =>
		orpc.todo.create.mutationOptions({
			onError: (error) => {
				setTodoError(error instanceof Error ? error.message : t("todos.status.createError"));
			},
			onSuccess: async () => {
				setNewTodoText("");
				await refreshTodos();
			},
		}),
	);
	const toggleTodoMutation = createMutation(() =>
		orpc.todo.toggle.mutationOptions({
			onError: (error) => {
				setTodoError(error instanceof Error ? error.message : t("todos.status.updateError"));
			},
			onSuccess: async () => {
				await refreshTodos();
			},
		}),
	);
	const deleteTodoMutation = createMutation(() =>
		orpc.todo.delete.mutationOptions({
			onError: (error) => {
				setTodoError(error instanceof Error ? error.message : t("todos.status.deleteError"));
			},
			onSuccess: async () => {
				await refreshTodos();
			},
		}),
	);
	const todoStats = createMemo(() => {
		const items = todos.data ?? [];
		const completed = items.filter((item) => item.completed).length;

		return {
			completed,
			open: items.length - completed,
			total: items.length,
		};
	});

	onMount(() => {
		setIsHydrated(true);
	});

	createEffect(() => {
		const currentSession = session();
		if (currentSession.isPending || currentSession.data) {
			return;
		}

		navigate(createLocalizedPath(locale(), "/login"), { replace: true });
	});

	async function refreshTodos() {
		await queryClient.invalidateQueries({
			queryKey: orpc.todo.getAll.queryKey(),
		});
	}

	function isTodoActionPending(todoId: number) {
		return (
			(toggleTodoMutation.isPending && toggleTodoMutation.variables?.id === todoId) ||
			(deleteTodoMutation.isPending && deleteTodoMutation.variables?.id === todoId)
		);
	}

	async function handleCreateTodo() {
		const text = newTodoText().trim();
		if (!text || !canLoadTodos()) {
			return;
		}

		setTodoError(null);

		try {
			await createTodoMutation.mutateAsync({ text });
		} catch {
			// handled by mutation options
		}
	}

	async function handleToggleTodo(todo: TodoItem) {
		setTodoError(null);

		try {
			await toggleTodoMutation.mutateAsync({
				completed: !todo.completed,
				id: todo.id,
			});
		} catch {
			// handled by mutation options
		}
	}

	async function handleDeleteTodo(todoId: number) {
		setTodoError(null);

		try {
			await deleteTodoMutation.mutateAsync({ id: todoId });
		} catch {
			// handled by mutation options
		}
	}

	return (
		<main
			class="mx-auto grid w-full max-w-4xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>{t("todos.metaTitle")}</Title>
			<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
								{t("todos.page.eyebrow")}
							</p>
							<CardTitle>{t("todos.page.title")}</CardTitle>
							<CardDescription>{t("todos.page.description")}</CardDescription>
						</div>
						<div class="flex gap-2">
							<Badge variant="secondary">
								{todoStats().open} {t("todos.stats.openSuffix")}
							</Badge>
							<Badge variant="outline">
								{todoStats().completed} {t("todos.stats.doneSuffix")}
							</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent class="space-y-6">
					<form
						class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
						onSubmit={async (event) => {
							event.preventDefault();
							await handleCreateTodo();
						}}
					>
						<label class="sr-only" for={newTodoInputId}>
							{t("todos.form.label")}
						</label>
						<Input
							class="w-full"
							disabled={!canLoadTodos() || createTodoMutation.isPending}
							id={newTodoInputId}
							onInput={(event) => setNewTodoText(event.currentTarget.value)}
							placeholder={t("todos.form.placeholder")}
							type="text"
							value={newTodoText()}
						/>
						<Button
							disabled={!canLoadTodos() || createTodoMutation.isPending || !newTodoText().trim()}
							type="submit"
						>
							<Show
								fallback={<span>{t("todos.actions.add")}</span>}
								when={createTodoMutation.isPending}
							>
								<Loader2 class="animate-spin" size={18} />
							</Show>
						</Button>
					</form>

					<Show when={todoError()}>
						{(message) => (
							<p
								class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
								role="alert"
							>
								{message()}
							</p>
						)}
					</Show>

					<Show when={!canLoadTodos() || todos.isPending}>
						<p
							class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
							role="status"
						>
							{t("todos.status.loading")}
						</p>
					</Show>

					<Show when={todos.isError}>
						<p
							class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
							role="alert"
						>
							{todos.error instanceof Error ? todos.error.message : t("todos.status.loadError")}
						</p>
					</Show>

					<Show
						when={canLoadTodos() && !todos.isPending && !todos.isError && todoStats().total === 0}
					>
						<p
							class="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-muted-foreground text-sm leading-6"
							role="status"
						>
							{t("todos.status.empty")}
						</p>
					</Show>

					<Show
						when={canLoadTodos() && !todos.isPending && !todos.isError && todoStats().total > 0}
					>
						<ul class="grid gap-3">
							<For each={todos.data ?? []}>
								{(todo) => (
									<li class="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/25 px-4 py-4">
										<div class="flex min-w-0 items-start gap-3">
											<input
												class="mt-1 h-4 w-4 accent-primary"
												checked={todo.completed}
												disabled={isTodoActionPending(todo.id)}
												id={`todo-${todo.id}`}
												onChange={async () => {
													await handleToggleTodo(todo);
												}}
												type="checkbox"
											/>
											<label
												class="text-foreground text-sm leading-6"
												classList={{
													"line-through text-muted-foreground": todo.completed,
												}}
												for={`todo-${todo.id}`}
											>
												{todo.text}
											</label>
										</div>

										<Button
											aria-label={t("todos.actions.deleteAria")}
											class="shrink-0"
											disabled={isTodoActionPending(todo.id)}
											onClick={async () => {
												await handleDeleteTodo(todo.id);
											}}
											type="button"
											variant="ghost"
										>
											<Trash2 size={16} />
										</Button>
									</li>
								)}
							</For>
						</ul>
					</Show>
				</CardContent>
			</Card>
		</main>
	);
}
