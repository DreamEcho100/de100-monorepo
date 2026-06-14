# Stack Lenses

Stack-specific review lenses for scalable TurboRepo projects using:

- SolidJS,
- SolidStart,
- oRPC,
- TanStack Query,
- TanStack Table,
- TanStack Form,
- Zod / Zod Mini,
- Vitest,
- headless UI libraries,
- app-specific packages,
- workspace-global package families.

Do not assume Next.js.

---

# SolidJS / SolidStart Lens

Inspect SolidStart architecture as a first-class concern.

Look for:

- route modules that know too much,
- server/client module leakage,
- server functions with mixed responsibilities,
- actions that combine transport, validation, authorization, persistence, and UI concerns without a reason,
- loaders or data functions with duplicated query policy,
- client-only modules importing server-only code,
- hydration or runtime placement assumptions hidden in generic modules,
- headless UI primitives leaking app-specific state or styling assumptions,
- Solid resources/stores that combine UI state, server state, form state, and domain policy.

Treat Solid hooks/primitives as modules when they have meaningful interface and implementation.

Do not apply React/Next.js-specific assumptions.

---

# oRPC Lens

Treat oRPC procedures as architectural interfaces when they carry important behaviour.

Default rule:

> Small procedures may keep validation, authorization, and persistence together when the behaviour is simple. Split only when repetition, branching, reuse, testing friction, policy leakage, or package ownership pressure appears.

Look for:

- validation duplicated across procedure and form,
- authorization duplicated across procedures,
- persistence details leaking into transport modules,
- low-level DB errors exposed through interface contracts,
- business rules hidden in transport handlers,
- procedure names that do not match domain language,
- OpenAPI/contract expectations diverging from implementation,
- app-specific interface contracts leaking into workspace-global packages.

When useful, distinguish:

- **transport module** — oRPC procedure or HTTP-facing module.
- **application/use-case module** — coordinates a user-visible operation.
- **domain/policy module** — owns invariants and decisions.
- **persistence adapter** — talks to DB/storage/external persistence.

Do not force this split everywhere.

Use it as an escalation path when complexity earns it.

---

# TanStack Query Lens

Treat query definitions as modules when they encode real behaviour.

Look for:

- query keys scattered across callers,
- invalidation knowledge duplicated in mutations,
- query options encoding domain policy,
- cache policy spread across UI modules,
- server data shape leaking too far into UI,
- optimistic update logic duplicated,
- fetch/error/loading conventions repeated without a seam.

Good candidates often concentrate:

- query keys,
- query options,
- mutation workflows,
- invalidation policy,
- optimistic update policy,
- interface error mapping.

Do not extract every query into a global module.

Keep query definitions near the feature unless shared or policy-heavy.

---

# TanStack Table Lens

Treat table definitions as modules when they encode behaviour.

Look for:

- columns containing business rules,
- permission checks inside cell renderers,
- formatting duplicated across tables,
- table state coupled to route/search params without a clear seam,
- sorting/filtering logic duplicated between UI and backend interface,
- table definitions living too globally for one feature,
- table definitions too local when reused across workflows.

A table module can be deep when it hides:

- columns,
- sorting/filtering mapping,
- display policy,
- row action policy,
- empty/loading/error conventions.

---

# TanStack Form Lens

Treat form definitions as modules when they coordinate real behaviour.

Look for:

- default values scattered,
- validation split awkwardly between form, validators, and backend interface,
- submission logic duplicated,
- mutation and invalidation policy inside UI modules,
- form state coupled to route state without locality,
- Zod imported directly outside validators when validation should be centralized.

A deep form module may concentrate:

- defaults,
- validation schema usage,
- submission workflow,
- mutation,
- error mapping,
- reset behaviour,
- user-visible success/failure behaviour.

Do not over-extract tiny forms.

---

# DB / Persistence Lens

Inspect persistence modules for leaked implementation knowledge.

Look for:

- DB query details in transport modules,
- persistence error modes leaking into UI/backend interface contracts,
- transaction rules duplicated,
- pagination/cursor rules duplicated,
- status transition writes scattered,
- schema assumptions repeated outside DB/persistence modules,
- persistence modules that only forward calls without leverage.

Do not force repository patterns.

A persistence module earns its keep when it improves locality, hides tricky query policy, centralizes transactions, or creates a useful test surface.

---

# Worker / Background Jobs Lens

Inspect workers and background jobs for ownership clarity.

Look for:

- worker tasks duplicating backend validation,
- job payload contracts not shared with validators,
- retry/error policy scattered,
- file-processing logic split between app, backend interface, and worker,
- queue/provider details leaking into domain modules,
- worker package depending on app UI/client modules,
- missing README for job lifecycle and failure modes.

Worker modules often need deep interfaces because bugs happen across time, retries, and external systems.

---

# UI / Headless Library Lens

Inspect UI and headless packages for public interface depth.

Look for:

- public modules exposing internal state machinery,
- Solid-specific integration mixed with framework-agnostic core,
- design-system primitives importing app-specific modules,
- headless primitives leaking styling assumptions,
- too many public exports,
- unclear package seams between `ui/core`, `ui/shared`, and `ui/integrations/solidjs`,
- duplicated accessibility or interaction logic,
- shallow wrappers around third-party primitives with no leverage.

Do not penalize a wrapper if it standardizes important behaviour, styling, accessibility, or interface consistency.

---

# Files / Processing Package Lens

For package families like `files`, inspect whether processing modules have coherent topology.

Possible shape:

```txt
files/
  core/
  shared/
  client/
  server/
  integrations/
    solidjs/
  processing/
    image/
    video/
    audio/
    document/
```

Alternative shape:

```txt
files/
  core/
  shared/
  client/
  server/
  processing-image/
  processing-video/
  processing-audio/
  processing-document/
```

Do not enforce one shape blindly.

Evaluate:

- import clarity,
- package seam clarity,
- shared processing primitives,
- client/server separation,
- runtime dependency isolation,
- public exports,
- onboarding cost,
- package README quality,
- whether processing modules are siblings by design or scattered accidentally.

---

# Testing Lens

Use a value-based testing philosophy.

Preferred tools and patterns:

- Vitest for package/library logic.
- Integration tests for app user flows when useful.
- Contract tests around backend interface seams when useful.
- Type-level tests only for TypeScript libraries with complex public types.
- Avoid redundant tests for what type checking, linting, Zod validation, or builds already catch.

Core rule:

> Test behaviour at the interface where bugs would survive type checking.

Testing strategy for deepening:

- Replace old shallow-module tests with tests at the deepened module’s interface.
- Delete old unit tests once they become waste.
- Assert observable outcomes through the interface.
- Do not assert internal state unless the state is part of the interface.
- Tests should survive internal refactors.
- If a test must change when the implementation changes but behaviour stays the same, it is testing past the interface.

A test is valuable when it catches behaviour that would not already be caught by:

- TypeScript,
- linting,
- formatting,
- Zod/schema validation,
- build failures,
- obvious runtime smoke tests.

Flag low-value tests:

- tests that only assert static object shape,
- tests that mirror implementation line-by-line,
- tests that mock every internal module,
- tests that fail on harmless internal reordering,
- tests that exist mainly to improve coverage numbers.

Coverage can be a signal.

Do not optimize for coverage.

For each architecture candidate, identify:

- current fragile tests,
- missing behaviour tests,
- better interface test surface,
- tests that should survive the refactor,
- tests that should be deleted or rewritten,
- whether characterization tests are needed before refactoring,
- dependency category and adapter strategy for tests.

---

# AI-Navigability Lens

Inspect whether the codebase is easy for a future AI agent or human maintainer to navigate.

Look for:

- clear file/module names,
- clear public exports,
- fewer scattered conventions,
- domain glossary alignment,
- ADR discipline where useful,
- readable folder shape,
- README per major module/package,
- fewer tiny pass-through files unless justified,
- clear package scopes,
- clear integration naming,
- deprecated code that is still easy to import,
- similarly named modules with different meanings,
- hidden architectural rules,
- missing “do not import this” guidance,
- root-level dumping grounds.

Identify agent traps.

Agent traps are places where an AI agent is likely to make the wrong edit.

Examples:

- old and new auth modules both present,
- `domains/solidjs` actually means integration, not business domain,
- a package exports internal modules accidentally,
- validation should go through `validators`, but Zod is imported everywhere,
- package-local utilities look global,
- global utilities are actually feature-specific,
- server-only modules are importable from client modules.

When useful, recommend updating or creating:

- package README,
- `AGENTS.md`,
- `CONTEXT.md`,
- ADRs,
- import rules,
- public export docs.

Do not create or update these files during the initial report unless the user explicitly asks for implementation mode.

During the grilling loop, update docs when decisions crystallize and the user agrees.
