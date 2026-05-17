import { Toaster } from "@de100/ui-solidjs/components/sonner.tsx";
import { createAsync, useParams } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { QueryClientProvider } from "@tanstack/solid-query";
import type { ParentProps } from "solid-js";
import { createEffect, onCleanup, Show, Suspense, untrack } from "solid-js";

import { getQueryClient } from "~/libs/@tanstack/query/query-client.js";

const ClientOnlySolidQueryDevtools = clientOnly(() =>
	import("@tanstack/solid-query-devtools").then((mod) => ({
		default: mod.SolidQueryDevtools,
	})),
);

export default function Providers(props: ParentProps) {
	const queryClient = getQueryClient();

	if (process.env.NODE_ENV === "development") {
		let renderCount = 0;

		createEffect(() => {
			renderCount++;
			if (renderCount > 10) {
				console.error("🔴 Infinite render loop detected in Providers!", {
					renderCount,
				});
			}
		});

		onCleanup(() => {
			console.log("Providers cleanup, renders:", renderCount);
		});
	}

	return (
		<QueryClientProvider client={queryClient}>
			{/* <I18nProviderWrapper> */}
			{/* <SessionProvider /> */}
			{props.children}
			<Toaster />
			{/* </I18nProviderWrapper> */}
			<Suspense>
				{process.env.NODE_ENV === "development" && (
					<ClientOnlySolidQueryDevtools initialIsOpen={false} />
				)}
			</Suspense>
		</QueryClientProvider>
	);
}

/*
import { queryOptions } from '@tanstack/solid-query'

function groupOptions() {
  return queryOptions({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    staleTime: 5 * 1000,
  })
}

useQuery(groupOptions)
queryClient.prefetchQuery(groupOptions())


const data = queryClient.getQueryData(groupOptions().queryKey)
//    ^? const data: Group[] | undefined
*/

/*
<https://tanstack.com/query/latest/docs/framework/solid/quick-start>

Available Functions
Solid Query offers useful primitives and functions that will make managing server state in SolidJS apps easier.

useQuery
createQueries
createInfiniteQueries
createMutation
useIsFetching
useIsMutating
useQueryClient
QueryClient
QueryClientProvider

Important Differences between Solid Query & React Query
Solid Query offers an API similar to React Query, but there are some key differences to be mindful of.

Arguments to solid-query primitives (like useQuery, createMutation, useIsFetching) listed above are functions, so that they can be tracked in a reactive scope.

```tsx
// ❌ react version
useQuery({
  queryKey: ['todos', todo],
  queryFn: fetchTodos,
})

// ✅ solid version
useQuery(() => ({
  queryKey: ['todos', todo],
  queryFn: fetchTodos,
}))
```

Suspense works for queries out of the box if you access the query data inside a <Suspense> boundary.

```tsx
import { For, Suspense } from 'solid-js'

function Example() {
  const query = useQuery(() => ({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  }))
  return (
    <div>
      {/* ✅ Will trigger loading fallback, data accessed in a suspense boundary. * /}
      <Suspense fallback={'Loading...'}>
        <For each={query.data}>{(todo) => <div>{todo.title}</div>}</For>
      </Suspense>
      {/* ❌ Will not trigger loading fallback, data not accessed in a suspense boundary. * /}
      <For each={query.data}>{(todo) => <div>{todo.title}</div>}</For>
    </div>
  )
}
```

Solid Query primitives (createX) do not support destructuring. The return value from these functions is a store, and their properties are only tracked in a reactive context.

```tsx
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/solid-query'
import { Match, Switch } from 'solid-js'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}

function Example() {
  // ❌ react version -- supports destructing outside reactive context
  // const { isPending, error, data } = useQuery({
  //   queryKey: ['repoData'],
  //   queryFn: () =>
  //     fetch('https://api.github.com/repos/tannerlinsley/react-query').then(
  //       (res) => res.json()
  //     ),
  // })

  // ✅ solid version -- does not support destructuring outside reactive context
  const query = useQuery(() => ({
    queryKey: ['repoData'],
    queryFn: () =>
      fetch('https://api.github.com/repos/tannerlinsley/react-query').then(
        (res) => res.json(),
      ),
  }))

  // ✅ access query properties in JSX reactive context
  return (
    <Switch>
      <Match when={query.isPending}>Loading...</Match>
      <Match when={query.isError}>Error: {query.error.message}</Match>
      <Match when={query.isSuccess}>
        <div>
          <h1>{query.data.name}</h1>
          <p>{query.data.description}</p>
          <strong>👀 {query.data.subscribers_count}</strong>{' '}
          <strong>✨ {query.data.stargazers_count}</strong>{' '}
          <strong>🍴 {query.data.forks_count}</strong>
        </div>
      </Match>
    </Switch>
  )
}
```

Signals and store values can be passed in directly to function arguments. Solid Query will update the query store automatically.

```tsx
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/solid-query'
import { createSignal, For } from 'solid-js'

const queryClient = new QueryClient()

function Example() {
  const [enabled, setEnabled] = createSignal(false)
  const [todo, setTodo] = createSignal(0)

  // ✅ passing a signal directly is safe and observers update
  // automatically when the value of a signal changes
  const todosQuery = useQuery(() => ({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    enabled: enabled(),
  }))

  const todoDetailsQuery = useQuery(() => ({
    queryKey: ['todo', todo()],
    queryFn: fetchTodo,
    enabled: todo() > 0,
  }))

  return (
    <div>
      <Switch>
        <Match when={todosQuery.isPending}>
          <p>Loading...</p>
        </Match>
        <Match when={todosQuery.isError}>
          <p>Error: {todosQuery.error.message}</p>
        </Match>
        <Match when={todosQuery.isSuccess}>
          <For each={todosQuery.data}>
            {(todo) => (
              <button onClick={() => setTodo(todo.id)}>{todo.title}</button>
            )}
          </For>
        </Match>
      </Switch>
      <button onClick={() => setEnabled(!enabled())}>Toggle enabled</button>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}
```

Errors can be caught and reset using SolidJS' native ErrorBoundary component. Set throwOnError or the suspense option to true to make sure errors are thrown to the ErrorBoundary

Since Property tracking is handled through Solid's fine grained reactivity, options like notifyOnChangeProps are not needed
*/
