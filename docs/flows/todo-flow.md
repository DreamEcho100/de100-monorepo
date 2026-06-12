# Todo Flow

## Goal

Todos are now user-owned. A signed-in user should only be able to read, create, toggle, and delete their own tasks.

## Request path

1. The Solid route calls the typed oRPC client from `apps/proto-cook-web/src/libs/apis/orpc.ts`.
2. Query-backed reads use TanStack Query option builders like `orpc.todo.getAll.queryOptions()`.
3. Mutations use TanStack Query `createMutation` with builders like `orpc.todo.create.mutationOptions()`.
4. The RPC handler in the app forwards the request into `packages/apps/proto-cook/api`.
5. `protectedProcedure` requires a valid Better Auth session before the todo router runs.
6. The todo router reads `context.session.user.id` and scopes every DB operation to that user.
7. The DB package persists the todo against the `todo.user_id` foreign key.

## Ownership rules

- `getAll` only returns rows where `todo.user_id` matches the current session user
- `create` always writes the current session user into `todo.user_id`
- `toggle` only updates rows owned by the current session user
- `delete` only deletes rows owned by the current session user

If an update or delete targets a row outside the current user scope, the API returns `NOT_FOUND` instead of silently mutating another user's data.

## UI behavior

- the dashboard reads both `privateData` and `todo.getAll` through typed query options
- the todos page redirects anonymous users to the login route
- todo reads are cached with TanStack Query
- todo writes also run through TanStack Query mutation state instead of manual `.call()` wrappers
- todo procedures now declare explicit output schemas and OpenAPI route metadata alongside their auth and ownership rules
- successful writes invalidate the cached `todo.getAll` query so the UI refreshes from the shared API source of truth
