---
name: typescript-best-practices
description: Use when reading or writing TypeScript or JavaScript files (.ts, .tsx, .js, tsconfig.json).
---

# TypeScript Best Practices

Follows type-first, functional, and error handling patterns from CLAUDE.md. This skill covers language-specific idioms only.

## Pair with React Best Practices

When working with React components (`.tsx`, `.jsx` files or `@react` imports), always load `react-best-practices` alongside this skill. This skill covers TypeScript fundamentals; React-specific patterns (effects, hooks, refs, component design) are in the dedicated React skill.

## Make Illegal States Unrepresentable

Use the type system to prevent invalid states at compile time.

**Discriminated unions for mutually exclusive states:**
```ts
// Good: only valid combinations possible
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Bad: allows invalid combinations like { loading: true, error: Error }
type RequestState<T> = {
  loading: boolean;
  data?: T;
  error?: Error;
};
```

**Branded types for domain primitives:**
```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

// Compiler prevents passing OrderId where UserId expected
function getUser(id: UserId): Promise<User> { /* ... */ }
```

**Const assertions for literal unions:**
```ts
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'

// Array and type stay in sync automatically
function isValidRole(role: string): role is Role {
  return ROLES.includes(role as Role);
}
```

**Exhaustive switch with never check:**
```ts
type Status = "active" | "inactive";

function processStatus(status: Status): string {
  switch (status) {
    case "active":
      return "processing";
    case "inactive":
      return "skipped";
    default: {
      const _exhaustive: never = status;
      throw new Error(`unhandled status: ${_exhaustive}`);
    }
  }
}
```

## Runtime Validation with Zod

- Define schemas as single source of truth; infer TypeScript types with `z.infer<>`. Avoid duplicating types and schemas.
- Use `safeParse` for user input where failure is expected; use `parse` at trust boundaries where invalid data is a bug.
- Compose schemas with `.extend()`, `.pick()`, `.omit()`, `.merge()` for DRY definitions.
- Add `.transform()` for data normalization at parse time (trim strings, parse dates).

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().transform((s) => new Date(s)),
});

type User = z.infer<typeof UserSchema>;

// Strict parsing at trust boundaries — throws if API contract violated
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`fetch user ${id} failed: ${response.status}`);
  }
  return UserSchema.parse(await response.json());
}

// Caller handles both success and error from user input
const result = UserSchema.safeParse(formData);
if (!result.success) {
  setErrors(result.error.flatten().fieldErrors);
  return;
}
```

## Optional: type-fest

For advanced type utilities beyond TypeScript builtins, consider [type-fest](https://github.com/sindresorhus/type-fest):

- `Opaque<T, Token>` - cleaner branded types than manual `& { __brand }` pattern
- `PartialDeep<T>` - recursive partial for nested objects
- `ReadonlyDeep<T>` - recursive readonly for immutable data
- `SetRequired<T, K>` / `SetOptional<T, K>` - targeted field modifications
- `Simplify<T>` - flatten complex intersection types in IDE tooltips

```ts
import type { Opaque, PartialDeep } from 'type-fest';

type UserId = Opaque<string, 'UserId'>;
type UserPatch = PartialDeep<User>;
```

## Package-Grade TypeScript APIs

When editing reusable packages, design the public API around explicit seams. Do not bake application policy into a general package. Prefer injected predicates, adapters, config objects, and narrow interfaces over hardcoded assumptions.

```ts
// Good: package owns mechanics, app owns policy.
type RouterOptions = {
  locales: readonly { code: string }[];
  shouldLocalizePathname?: (pathname: string, segments: readonly string[]) => boolean;
};

// Bad: package assumes every app excludes the same paths.
const EXCLUDED_SEGMENTS = ["api", "_build", "assets"];
```

Use `as const satisfies` for registries that need literal inference and structural validation:

```ts
const messages = {
  common: {
    save: "Save",
    selected: "{count:number} selected",
  },
} as const satisfies I18nMessagesShape;

type MessageKey = DotPath<typeof messages>;
```

For source-registry patterns, keep the source registry as the type authority and let consumers augment package types:

```ts
declare module "@acme/i18n/shared" {
  interface I18nRegister {
    translations: typeof sourceMessages;
    locales: "en" | "ar";
  }
}
```

Non-source registries should usually be shaped by the source registry without requiring identical literal strings:

```ts
const arMessages = {
  common: {
    save: "حفظ",
    selected: "تم تحديد {count:number}",
  },
} satisfies I18nLocaleMessages<typeof sourceMessages>;
```

Use template literal, mapped, and conditional types when they encode a real contract that runtime tests cannot catch:

```ts
type DotPath<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${DotPath<T[K]>}`;
}[keyof T & string];

type ExtractParams<S extends string> =
  S extends `${string}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never;
```

Keep these types bounded. If type-level logic becomes hard to review, split it into named helper types and add type regression tests.

## Type Regression Tests

Use type tests for public API contracts. Prefer small compile-time assertions over runtime tests that only prove imports work.

```ts
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

type Expect<T extends true> = T;

type _KeyCheck = Expect<Equal<DotPath<typeof messages>, "common.save" | "common.selected">>;

// @ts-expect-error missing required param
t("common.selected");
```

Pair this skill with `typescript-advanced-types` when:

- API safety depends on template-literal inference, recursive mapped types, or discriminated unions.
- You are designing framework/package contracts, not just app-local code.
- You need compile-time regression coverage for keys, params, event names, route slugs, or branded identifiers.
- A simpler runtime-only API would leak invalid states to consumers.
