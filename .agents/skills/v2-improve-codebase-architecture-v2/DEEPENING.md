# Deepening

How to deepen a cluster of shallow modules safely, given its dependencies.

Assumes the vocabulary in [`LANGUAGE.md`](LANGUAGE.md):

- **module**
- **interface**
- **implementation**
- **depth**
- **deep**
- **shallow**
- **seam**
- **adapter**
- **leverage**
- **locality**

---

# Goal

A deepening refactor moves scattered implementation knowledge behind a smaller, more useful interface.

A good deepening refactor:

- reduces caller knowledge,
- improves locality,
- increases leverage,
- creates a better test surface,
- avoids ceremonial seams,
- and preserves solo-founder speed.

Deepening does not mean adding layers.

Deepening does not mean inventing an interface before understanding what callers should stop knowing.

---

# Dependency categories

When assessing a candidate for deepening, classify its dependencies.

The dependency category determines how the deepened module should be tested across its seam.

---

## 1. In-process

Pure computation, in-memory state, no I/O.

Examples:

- parsing,
- normalization,
- formatting,
- in-memory state transitions,
- local policy checks,
- pure validation logic,
- TanStack table definitions without I/O,
- form default-value derivation.

Recommendation:

- Always deepenable when locality improves.
- Merge shallow modules when the interface shrinks.
- Test directly through the new interface.
- No adapter needed.

Report phrasing:

> Dependency category: in-process. Deepen directly and test through the new interface.

---

## 2. Local-substitutable

Dependencies that have local test stand-ins.

Examples:

- PGLite for Postgres,
- in-memory filesystem,
- local cache fake,
- local queue fake,
- local storage emulator,
- fake clock,
- test-local worker runner.

Recommendation:

- Deepenable if the stand-in exists.
- Test the deepened module with the stand-in running in the test suite.
- Keep the seam internal when possible.
- Do not expose a port through the external interface only for tests.

Report phrasing:

> Dependency category: local-substitutable. Test the deepened module with a local stand-in; keep the seam internal unless callers need it.

---

## 3. Remote but owned

Your own services across a network or process seam.

Examples:

- internal HTTP services,
- internal oRPC services,
- internal queues,
- internal workers,
- owned file-processing services,
- owned image-processing service,
- owned notification service.

Recommendation:

- Define a port at the seam.
- Keep the logic in the deep module.
- Inject transport as an adapter.
- Use an in-memory adapter in tests.
- Use HTTP, oRPC, queue, worker, or process adapter in production.

Recommendation shape:

> Define a port at the seam, implement a production adapter and an in-memory adapter for tests, so the logic sits in one deep module even though it crosses a network seam.

Report phrasing:

> Dependency category: remote but owned. The seam is real because production and in-memory adapters both earn their keep.

---

## 4. True external

Third-party services you do not control.

Examples:

- Stripe,
- Twilio,
- Resend,
- S3-compatible external provider,
- external auth provider,
- external AI API,
- analytics provider,
- payment provider.

Recommendation:

- The deep module takes the external dependency as an injected port.
- Production uses the external adapter.
- Tests use a mock adapter or fake adapter.
- Do not let third-party error modes leak across the interface unless they are intentionally part of the caller contract.

Report phrasing:

> Dependency category: true external. Hide provider details behind a seam; expose app-level outcomes, not provider-specific failure modes unless intentional.

---

## 5. Mixed

A candidate may include several dependency categories.

Example:

- validation is in-process,
- DB is local-substitutable,
- payment provider is true external,
- worker queue is remote but owned.

Recommendation:

- Split the analysis by dependency.
- Avoid one giant seam just because dependencies differ.
- Keep simple in-process logic internal.
- Use adapters only where variation or hard I/O justifies them.
- Test through the deep module’s interface with appropriate stand-ins.

Report phrasing:

> Dependency category: mixed. The validation path is in-process, DB is local-substitutable, and the external payment provider needs an adapter.

---

# Seam discipline

## One adapter means a hypothetical seam. Two adapters means a real seam.

Do not introduce a seam unless something actually varies across it.

Common valid pairs:

- production adapter + in-memory test adapter,
- external provider adapter + fake adapter,
- HTTP adapter + in-process adapter,
- filesystem adapter + memory adapter,
- Better Auth adapter + test auth adapter.

A single-adapter seam is usually indirection.

A single-adapter seam may still be valid when it improves:

- locality,
- runtime safety,
- public interface stability,
- package-family clarity,
- or test value against a hard dependency.

But it must justify itself.

---

## Internal seams vs external seams

A deep module can have internal seams.

Internal seams are private to the implementation.

They may be used by the module’s own tests.

Do not expose internal seams through the external interface just because tests use them.

Callers and tests should cross the same external seam.

---

## Ports and adapters are not default architecture

Use ports and adapters when the dependency category earns them.

Use them for:

- remote but owned dependencies,
- true external dependencies,
- local-substitutable dependencies when the seam is useful beyond tests,
- public package interfaces that need stability.

Do not use them for:

- simple in-process logic,
- one-call pass-through wrappers,
- hypothetical future providers,
- ceremony.

---

# Testing strategy: replace, don’t layer

Old unit tests on shallow modules become waste once tests at the deepened module’s interface exist.

Preferred strategy:

1. Add characterization tests at the current behaviour seam if needed.
2. Introduce the deepened module.
3. Write tests through the deepened module’s interface.
4. Move callers.
5. Delete shallow-module tests that now duplicate interface tests.
6. Keep adapter tests only where adapter behaviour matters.

Tests should assert:

- observable outcomes,
- app-level errors,
- state transitions,
- persistence effects,
- emitted jobs/events,
- cache invalidation outcomes,
- user-visible behaviour.

Tests should not assert:

- internal call order,
- private module state,
- implementation-only helper outputs,
- object shape already enforced by TypeScript,
- Zod shape already covered by validation,
- lint/build constraints.

Core rule:

> The interface is the test surface.

If a test must change when implementation changes but behaviour stays the same, it is testing past the interface.

---

# Deepening candidate checklist

Before recommending a deepening candidate, answer:

1. What caller knowledge disappears?
2. What implementation knowledge moves behind the interface?
3. What dependency category applies?
4. Does the seam need adapters?
5. Are adapters real or hypothetical?
6. What tests move to the new interface?
7. Which tests become waste?
8. What risks does the deeper module introduce?
9. Could the module become a dumping ground?
10. Does the refactor improve locality and leverage?

---

# Red flags

Do not recommend deepening when:

- the new module would know too many unrelated concepts,
- the interface would expose many flags and lifecycle steps,
- tests would need more mocks than before,
- the seam exists only for possible future variation,
- the refactor only renames files,
- the current module is small, local, stable, and harmless,
- the dependency category does not justify adapter ceremony,
- the change increases context switching without leverage.

---

# Good recommendation shapes

## In-process

> Deepen this in-process policy cluster into one module. Callers should submit the app-level input and receive the app-level outcome; parsing, normalization, and decision rules become implementation.

## Local-substitutable

> Deepen this module around the behaviour interface and test it with PGLite. Keep DB details behind the implementation; do not expose a repository seam unless callers need it.

## Remote but owned

> Define a port at the seam. Use the production oRPC adapter in the app and an in-memory adapter in tests. Keep orchestration in the deep module.

## True external

> Hide the provider behind an adapter and expose app-level outcomes. Tests use a fake adapter. Provider-specific failures should not leak unless callers can act on them.
