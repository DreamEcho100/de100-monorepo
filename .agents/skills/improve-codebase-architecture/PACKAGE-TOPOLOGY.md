# Package Topology

Package topology rules for scalable TurboRepo workspaces.

Assumes the vocabulary in [`LANGUAGE.md`](LANGUAGE.md).

In a monorepo, package topology is architecture.

The goal is:

- low context switching,
- clear package ownership,
- useful reuse,
- readable public interfaces,
- app-specific flexibility,
- workspace-global stability,
- and AI-navigability.

---

# Core rule

A module should live at the lowest useful scope unless there is clear reuse, stability, public-interface value, or package-family intent.

Moving code outward is not automatically better.

Moving code inward can be the best architecture decision when a module was promoted too early.

---

# Package scopes

Use these scopes.

## Feature-local

Used by one route, page, feature, or workflow.

Example:

```txt
apps/proto-cook-web/src/routes/dashboard/_table/
```

Good for:

- feature-specific utilities,
- feature-specific forms,
- feature-specific table definitions,
- feature-specific query options,
- one-off UI modules,
- local formatting.

## App-local

Shared inside one app only.

Example:

```txt
apps/proto-cook-web/src/shared/
```

Good for:

- app-wide UI helpers,
- app-wide route utilities,
- app-specific layout modules,
- shared app query conventions.

## App-specific package

Reusable across one app’s internal packages.

Example:

```txt
packages/apps/proto-cook/
  api/
  auth/
  cache/
  config/
  db/
  env/
  infra/
  validators/
  worker/
```

Good for:

- backend interface package,
- auth package,
- validators,
- DB package,
- worker package,
- app-specific env/config,
- app-specific cache,
- app-specific deployment docs.

These packages are allowed to know about the app.

Do not automatically move them into workspace-global packages.

## Workspace-global package

Reusable across multiple apps or product areas.

Example:

```txt
packages/
  ui/
  i18n/
  files/
  tooling/
  turbo/
```

Good for:

- design system,
- i18n package family,
- files package family,
- shared tooling,
- reusable runtime utilities,
- headless libraries,
- integrations intended for multiple apps.

A workspace-global package needs a reason to exist outside a specific app.

## Public/package interface

Exported as a stable interface for external or long-lived internal consumers.

Good for:

- public libraries,
- reusable package families,
- stable workspace-global contracts,
- app-specific package interfaces consumed by several internal packages.

---

# Promotion ladder

Evaluate whether a module has been promoted too early or kept too local for too long.

```txt
feature-local
→ app-local shared
→ app-specific package
→ workspace-global package
→ public/exported library interface
```

## Move inward

A module lives at a wider scope than its actual usage, stability, or package intent justifies.

Use this rule:

> Move inward when the current wider scope creates context switching and there is no declared reuse intent, public-interface value, or package-family reason for keeping it wider.

## Promote outward

A module is duplicated or reused enough to justify a wider scope.

Promote outward when:

- the same logic appears in multiple features,
- app and backend interface duplicate schemas,
- several packages need the same invariant,
- a package family wants a stable primitive,
- a public interface would reduce caller knowledge.

Do not promote outward just because a file feels large.

---

# Scope correctness

Each candidate should include:

```txt
Scope correctness: Too local | Correct | Too global | Unclear
```

Explain why.

Judged by:

- current callers,
- expected reuse,
- package-family intent,
- public-interface stability,
- context-switching cost,
- dependency direction,
- test surface,
- onboarding cost.

Examples:

- Dashboard-only helper in `packages/ui` may be too global.
- Duplicated schema in app and backend interface may be too local.
- `packages/files` may be correctly global if it is a reusable package family.
- `packages/apps/proto-cook/auth` may be correct even if only one app uses it.

---

# App-specific package rule

Packages under `packages/apps/<app-name>/` are allowed to be more app-aware than workspace-global packages.

Do not automatically suggest moving app-specific code into workspace-global packages.

Ask:

- Is this shared across the whole workspace?
- Or only across this app’s internal packages?
- Does moving it upward reduce duplication?
- Or does moving it upward increase context switching?
- Is there a declared future reuse intent?
- Is the package README clear about scope?

---

# Workspace-global package rule

Workspace-global packages should have a clear reason to exist outside a specific app.

Good reasons:

- shared across multiple apps,
- intended as a reusable package family,
- stable public interface,
- encapsulates integration with a framework/runtime/external system,
- reduces repeated setup across apps,
- provides common UI, i18n, files, or tooling primitives.

Weak reasons:

- “Maybe another app will need it.”
- One feature uses it today.
- It is a generic utility bucket.
- It was extracted only because the file felt large.
- It exists because root-level imports felt convenient.

---

# Package family convention

When a workspace-global package is really a package family, inspect whether its structure is coherent.

Useful shape when complexity earns it:

```txt
packages/<package-family>/
  core/
  shared/
  client/
  server/
  integrations/
    solidjs/
    orpc/
    tanstack/
    better-auth/
  package.json
  README.md
```

This is not mandatory.

It is a convention to consider when the package family has enough complexity.

## Meanings

- `core` — framework-agnostic logic and stable primitives.
- `shared` — internal shared utilities for the package family.
- `client` — client/runtime-facing package, when separation is useful.
- `server` — server/runtime-facing package, when separation is useful.
- `integrations` — framework/library/runtime-specific packages.
- `domains` — business/domain concepts only, not framework integrations.

---

# `domains` vocabulary warning

If a folder named `domains` contains framework or library integrations such as:

```txt
solidjs
orpc
tanstack
better-auth
fastify
```

flag this as a vocabulary mismatch.

Suggest considering:

```txt
integrations/
```

or:

```txt
adapters/
```

depending on the role.

Use:

- **Integration** for framework/library/runtime packages.
- **Adapter** for concrete implementations behind a seam.
- **Domain** for business concepts.

Good:

```txt
ui/
  core/
  shared/
  integrations/
    solidjs/
```

Potentially confusing:

```txt
ui/
  domains/
    solidjs/
```

Unless the project explicitly defines `domains` differently.

---

# Package README rule

Important packages should have README files strong enough for:

- onboarding,
- returning after time away,
- package-level orientation,
- AI-agent navigation,
- public interface discovery,
- import-rule clarity.

Do not require READMEs for every tiny folder.

For major packages, check whether the README explains:

- purpose,
- intended scope,
- public interface,
- internal modules,
- integration modules,
- common flows,
- testing strategy,
- import rules,
- what not to import,
- known architectural decisions,
- linked ADRs,
- examples of correct usage,
- examples of incorrect usage when useful.

Missing README is architectural when it causes:

- repeated context loading,
- incorrect imports,
- misuse of internals,
- duplicated patterns,
- bad AI-agent edits,
- uncertainty about package scope.

---

# Public export rule

For each important package, inspect public exports.

Classify exports when possible:

```txt
public
internal but accidentally exported
test-only
adapter-only
integration-only
deprecated
unclear
```

Look for:

- `index.ts` exporting too much,
- package `exports` exposing internals,
- public interfaces leaking implementation details,
- integration-specific exports mixed with core exports,
- server-only exports available to client modules,
- unstable internal modules imported by app code,
- barrel files that hide ownership and runtime placement.

Public interface depth matters most for:

- libraries,
- package families,
- workspace-global packages,
- `ui`,
- `i18n`,
- `files`,
- `api`,
- `auth`,
- `db`,
- `validators`.

Do not automatically penalize an export for exposing an internal concept.

First ask whether the concept is intentionally part of the package interface.

---

# Dependency direction

Do not enforce one universal direction rule blindly.

Infer intended direction from package scope and README/ADR/docs.

Typical expectations:

- workspace-global packages should not depend on app-specific packages,
- app-specific packages can depend on workspace-global packages,
- app-specific packages can depend on each other when the relationship is clear,
- `db` should not import transport modules,
- `ui` should not import app-specific auth/db/api modules,
- `validators` can be shared by app/backend/worker when it owns the standard contracts,
- `env` should be the source for environment variable access,
- `infra` should not contain application logic when it is intended as deployment documentation.

Flag dependency direction only when it creates leakage, context switching, runtime risk, or AI-navigation confusion.

---

# Package-specific conventions

## Validators

When an app has an app-specific `validators` package, validation library usage should be concentrated there unless there is a strong reason otherwise.

Preferred rules:

- App/backend/form modules consume exported schemas or validation functions.
- Zod should not be scattered across unrelated packages.
- Zod Mini should be preferred when Zod v4 functionality is needed and the smaller package is enough.
- Validators should export standard schemas for appropriate use.
- Validation exports should preserve the possibility of swapping validation libraries later.
- Callers should not need to know Zod-specific implementation details unless they are inside `validators`.
- Schemas should represent standard app contracts, not random local parsing.

Flag:

- Zod imports outside `validators`,
- duplicated schemas between backend interface and app,
- form validation that diverges from backend validation without a documented reason,
- validators becoming a dumping ground for unrelated parsing, domain policy, and UI-only rules,
- schema names tied to UI modules instead of app contracts or domain concepts,
- exported Zod-specific helpers that make swapping impossible without a reason.

## Env / Config / Infra

Use these meanings unless project docs say otherwise:

```txt
env     = read, parse, validate, and provide environment variables
config  = derived runtime/application configuration, only when useful
infra   = deployment/runtime documentation and infrastructure notes
```

Inspect:

- direct `process.env` reads scattered across packages,
- env parsing duplicated,
- runtime config derived in random modules,
- config package used as a generic dumping ground,
- infra package containing application logic,
- deployment assumptions hidden in app code,
- server/client env leakage.

Do not force config extraction when package-local configuration is clearer.

Avoid context switching unless config is shared, derived, risky, or repeated.

## Auth

Treat auth as a high-value seam.

The concrete library may vary.

For a given app, Better Auth may be used, but do not assume Better Auth everywhere.

Inspect:

- session/user access patterns,
- authorization duplication in oRPC procedures,
- server-only auth imported by client modules,
- UI permission checks diverging from backend authorization,
- role/permission checks scattered across modules,
- auth types leaking into workspace-global packages,
- app-specific auth leaking into generic UI or files packages,
- auth integration placement,
- auth adapter ownership,
- test surface for authorization decisions.

Do not create generic auth abstractions without evidence.

Auth is high-value because bugs are expensive, not because it always needs layers.
