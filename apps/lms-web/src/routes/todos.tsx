import { Title } from "@solidjs/meta";
import { Loader2, Trash2 } from "lucide-solid";
import { createResource, createSignal, For, onMount, Show } from "solid-js";

interface TodoItem {
	id: number;
	text: string;
	completed: boolean;
}

interface RpcEnvelope<TJson> {
	json: TJson;
}

async function callTodoRpc<TJson>(path: string, input?: unknown): Promise<TJson> {
	const response = await fetch(path, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify(input === undefined ? {} : { json: input }),
	});

	if (!response.ok) {
		throw new Error(`Todo RPC request failed with ${response.status}`);
	}

	const payload = (await response.json()) as RpcEnvelope<TJson>;
	return payload.json;
}

export default function TodosPage() {
	const newTodoInputId = "new-todo";
	const [newTodoText, setNewTodoText] = createSignal("");
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [todoError, setTodoError] = createSignal<string | null>(null);
	const [isCreating, setIsCreating] = createSignal(false);
	const [pendingTodoId, setPendingTodoId] = createSignal<number | null>(null);
	const [todos, { refetch: refetchTodos }] = createResource(
		() => (isHydrated() ? true : undefined),
		() => callTodoRpc<TodoItem[]>("/rpc/todo/getAll"),
	);

	onMount(() => {
		setIsHydrated(true);
	});

	async function refreshTodos() {
		setTodoError(null);
		await refetchTodos();
	}

	async function handleCreateTodo() {
		const text = newTodoText().trim();
		if (!text) {
			return;
		}

		setIsCreating(true);
		setTodoError(null);

		try {
			await callTodoRpc("/rpc/todo/create", { text });
			setNewTodoText("");
			await refreshTodos();
		} catch (error) {
			setTodoError(error instanceof Error ? error.message : "Failed to create todo.");
		} finally {
			setIsCreating(false);
		}
	}

	async function handleToggleTodo(todo: TodoItem) {
		setPendingTodoId(todo.id);
		setTodoError(null);

		try {
			await callTodoRpc("/rpc/todo/toggle", {
				completed: !todo.completed,
				id: todo.id,
			});
			await refreshTodos();
		} catch (error) {
			setTodoError(error instanceof Error ? error.message : "Failed to update todo.");
		} finally {
			setPendingTodoId(null);
		}
	}

	async function handleDeleteTodo(todoId: number) {
		setPendingTodoId(todoId);
		setTodoError(null);

		try {
			await callTodoRpc("/rpc/todo/delete", { id: todoId });
			await refreshTodos();
		} catch (error) {
			setTodoError(error instanceof Error ? error.message : "Failed to delete todo.");
		} finally {
			setPendingTodoId(null);
		}
	}

	return (
		<main class="todo-grid" id="main-content">
			<Title>Todos</Title>
			<section class="status-card">
				<p class="eyebrow">Shared RPC demo</p>
				<h2>Todos</h2>
				<form
					class="todo-form"
					onSubmit={async (event) => {
						event.preventDefault();
						await handleCreateTodo();
					}}
				>
					<label class="visually-hidden" for={newTodoInputId}>
						Add a new task
					</label>
					<input
						class="input"
						disabled={!isHydrated() || isCreating()}
						id={newTodoInputId}
						onInput={(event) => setNewTodoText(event.currentTarget.value)}
						placeholder="Add a new task"
						type="text"
						value={newTodoText()}
					/>
					<button
						class="button"
						disabled={!isHydrated() || isCreating() || !newTodoText().trim()}
						type="submit"
					>
						<Show fallback={<span>Add</span>} when={isCreating()}>
							<Loader2 class="spin-icon" size={18} />
						</Show>
					</button>
				</form>

				<Show when={todoError()}>
					{(message) => (
						<p class="status-banner error" role="alert">
							{message()}
						</p>
					)}
				</Show>

				<Show when={!isHydrated() || todos.loading}>
					<p class="status-banner pending" role="status">
						Loading todos...
					</p>
				</Show>

				<Show when={isHydrated() && !todos.loading && todos()?.length === 0}>
					<p class="status-banner empty" role="status">
						No todos yet. Add one above.
					</p>
				</Show>

				<Show when={isHydrated() && !todos.loading && !!todos()?.length}>
					<ul class="todo-list">
						<For each={todos()}>
							{(todo) => (
								<li class="todo-item">
									<div class="todo-main">
										<input
											checked={todo.completed}
											disabled={pendingTodoId() === todo.id}
											id={`todo-${todo.id}`}
											onChange={async () => {
												await handleToggleTodo(todo);
											}}
											type="checkbox"
										/>
										<label
											classList={{
												"todo-text": true,
												"is-complete": todo.completed,
											}}
											for={`todo-${todo.id}`}
										>
											{todo.text}
										</label>
									</div>

									<button
										aria-label="Delete todo"
										class="ghost-button"
										disabled={pendingTodoId() === todo.id}
										onClick={async () => {
											await handleDeleteTodo(todo.id);
										}}
										type="button"
									>
										<Trash2 size={16} />
									</button>
								</li>
							)}
						</For>
					</ul>
				</Show>
			</section>
		</main>
	);
}
