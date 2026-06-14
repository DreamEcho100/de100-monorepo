---
name: improve-codebase-architecture
description: Find architectural deepening and package-topology opportunities in a scalable TurboRepo codebase. Use when the user wants to improve architecture, reduce shallow modules, consolidate tightly-coupled code, improve testability, clarify package scope, improve SolidStart/oRPC/TanStack architecture, or make a codebase more navigable for humans and AI agents.
---

# Improve Codebase Architecture

Surface **deepening opportunities** and **package-topology improvements** in a scalable codebase.

The goal is not generic “clean architecture.” The goal is:

- solo-founder speed now,
- team-scale maintainability later,
- low context switching,
- clear package ownership,
- useful test surfaces,
- readable public interfaces,
- and strong AI-navigability.

This skill is tuned for projects shaped like:

- TurboRepo monorepos,
- SolidJS / SolidStart apps,
- oRPC backend interfaces,
- TanStack Query/Table/Form usage,
- Zod / Zod Mini validation packages,
- Vitest-based test suites,
- headless UI libraries,
- app-specific packages under `packages/apps/<app-name>/`,
- workspace-global packages such as `ui`, `i18n`, `files`, `tooling`, etc.

Do **not** assume Next.js.

Do **not** force generic layered architecture.

Do **not** optimize for theoretical purity. Optimize for **depth**, **leverage**, **locality**, **scope correctness**, and **navigation**.

---

## Companion files

Read these files when present:

- [`LANGUAGE.md`](LANGUAGE.md) — shared architectural vocabulary.
- [`DEEPENING.md`](DEEPENING.md) — dependency categories, seam discipline, and safe deepening strategy.
- [`PACKAGE-TOPOLOGY.md`](PACKAGE-TOPOLOGY.md) — TurboRepo package scopes, package families, public exports, package README expectations, and promotion rules.
- [`STACK-LENSES.md`](STACK-LENSES.md) — SolidStart, oRPC, TanStack, validators, auth, env/config/infra, DB, worker, UI, files, testing, and AI-navigation lenses.
- [`HTML-REPORT.md`](HTML-REPORT.md) — report scaffold, diagrams, visual style, and candidate-card format.
- [`INTERFACE-DESIGN.md`](INTERFACE-DESIGN.md) — interface exploration after the user chooses a candidate.
- `CONTEXT.md` — project domain language, when present.
- `docs/adr/` — durable architectural decisions, when present.

Use `CONTEXT.md` for business/domain language.

Use package READMEs or `AGENTS.md` for package conventions, import rules, integration conventions, and AI-agent navigation.

---

## Core philosophy

A scalable codebase should let a solo founder move quickly without creating a structure that future team members or AI agents cannot understand.

Preferred default:

> Keep code at the lowest useful scope first. Move it outward only when reuse, stability, public-interface value, or package-family intent justifies it.

This means the review must look in both directions:

- modules that should be deepened,
- modules that should be consolidated,
- modules that were promoted too early and should move inward,
- modules that are duplicated and should move outward,
- package families that need clearer topology,
- packages that need better public exports,
- packages that need onboarding READMEs,
- seams that are missing, leaky, or ceremonial,
- tests that hit the wrong surface,
- and structures that create AI-navigation traps.

Architecture is not only file structure. But in a monorepo, **package topology is architecture**.

---

## Non-goals

During the initial review:

- Do not propose final interfaces.
- Do not rewrite code.
- Do not create ADRs unless the user asks during the grilling loop.
- Do not relitigate ADRs unless real friction justifies reopening one.
- Do not produce a generic best-practices audit.
- Do not reward indirection for its own sake.
- Do not recommend a seam just because it is theoretically clean.
- Do not recommend generic `services`, `utils`, `components`, or root-level buckets without evidence.
- Do not force domain-first folders everywhere.
- Do not force clean architecture layering everywhere.
- Do not optimize for test coverage numbers.
- Do not recommend redundant tests that TypeScript, linting, Zod, or the build already catch.
- Do not assume every large file needs extraction.
- Do not assume every tiny module is bad.
- Do not assume every one-adapter seam is fake.
- Do not assume every global package is premature; some packages are global by design.

---

# Process

## 1. Load language, decisions, and topology

Before exploring code, read:

1. `LANGUAGE.md`, if present.
2. `DEEPENING.md`, if present.
3. `PACKAGE-TOPOLOGY.md`, if present.
4. `STACK-LENSES.md`, if present.
5. `HTML-REPORT.md`, if present.
6. `INTERFACE-DESIGN.md`, if present.
7. `CONTEXT.md`, if present.
8. `AGENTS.md`, if present.
9. `docs/adr/`, especially ADRs related to the area being reviewed.
10. Package READMEs.
11. Root README.
12. Workspace config files:
    - `turbo.json`
    - `package.json`
    - `pnpm-workspace.yaml`
    - `tsconfig` files
    - package-level `package.json` files.

Extract:

- domain nouns and verbs,
- package ownership,
- app-specific package structure,
- workspace-global package structure,
- package families,
- public exports,
- import rules,
- important invariants,
- existing named concepts,
- ADR constraints,
- existing seams and adapters,
- integration packages,
- runtime placement assumptions,
- testing conventions,
- words the project already uses for important concepts.

If `CONTEXT.md` is missing, continue the review, but mark the report as having weak domain grounding.

If important packages lack README files, continue the review, but mark it as an onboarding and AI-navigation issue when relevant.

---

## 2. Explore the codebase

Use the Agent tool with `subagent_type=Explore`.

Explore organically. Do not blindly scan for patterns. Follow friction.

Track where understanding one change requires bouncing across many packages, modules, and conventions.

Ask internally:

- What did I have to know to understand this?
- Where is the real behaviour?
- Which interface is the test surface?
- Which package owns this concept?
- Is this module too local, correct, or too global?
- Is this a business domain or a framework integration?
- Does this package README explain enough?
- Would a future AI agent edit the wrong file?
- Would deleting this module simplify the system or scatter complexity?
- Which dependency category applies if this module is deepened?

---

## 3. Collect evidence

Every candidate must be evidence-backed.

For each suspected candidate, collect:

- files/modules involved,
- package scope,
- current callers,
- public exports,
- imports/dependency direction,
- tests involved or missing,
- dependency category,
- repeated invariants,
- repeated branching or policy decisions,
- existing seams and adapters,
- integration modules,
- ADRs that constrain the area,
- domain terms from `CONTEXT.md`,
- README/package docs quality,
- one or two concrete examples of friction.

Do not include candidates based only on taste.

A useful candidate should answer:

1. What does the current interface force callers to know?
2. What implementation knowledge is leaking?
3. What concept wants to become deeper?
4. Is this a real seam or a hypothetical seam?
5. What dependency category applies?
6. What would become easier to test?
7. What would become easier to change?
8. What would become easier for an AI agent to navigate?
9. Is the module at the correct scope?
10. Which ADRs support or constrain the move?
11. Is this candidate improving architecture or merely rearranging files?

---

# Friction signals

Use these signals while exploring.

## Concept spread

A single concept requires understanding many small modules.

Examples:

- Recipe creation rules spread across forms, validators, oRPC procedures, DB mappers, and worker jobs.
- Permission logic duplicated in UI, oRPC procedures, and database queries.
- File-processing rules split across client upload code, server handlers, validators, and workers.
- Status transitions represented as string checks in many places.

Architectural smell:

> The concept has no deep module. Callers are carrying implementation knowledge.

## Shallow modules

A module’s interface is almost as complex as its implementation.

Examples:

- A wrapper that forwards every argument to another module.
- A utility with many flags that simply exposes internal branches.
- A helper whose caller must know ordering, defaults, and failure modes anyway.
- A hook that hides little but forces callers to know the same TanStack or SolidStart details.

Apply the deletion test:

- If deleting the module makes the code simpler, it is probably shallow.
- If deleting the module forces several callers to duplicate complexity, it may be deep enough to keep.

## Test surface mismatch

Tests exist, but they target the wrong surface.

Examples:

- Many tests for tiny helpers, but few tests for the module that coordinates real behaviour.
- Mocks mirror implementation details.
- Changing internal call order breaks tests even when behaviour stays correct.
- Important invariants are tested only indirectly through fragile integration tests.
- Tests assert object shape that TypeScript, Zod, linting, or build checks already catch.

Architectural smell:

> The interface is not the real test surface, or the current seam is not where behaviour actually changes.

## Leaky seams

A seam exists, but callers still need implementation knowledge.

Examples:

- Callers know persistence details.
- Callers must pre-normalize input in exactly the right shape.
- Callers must handle low-level error modes from behind the seam.
- Callers know adapter ordering, lifecycle, retries, caching, invalidation, or cleanup rules.
- Client modules know server-only details.
- UI modules know authorization rules that should be enforced in backend/auth modules.

Architectural smell:

> The seam exists syntactically, but it does not provide locality.

## Hypothetical seams

There is an interface with only one adapter and no realistic second adapter.

Architectural smell:

> The seam may be ceremony. It may still be justified, but only if it improves locality, public interface stability, testability, runtime isolation, or future package-family intent.

## Coupled module clusters

Several modules change together, understand each other’s internals, or form a hidden larger module.

Examples:

- Parser, normalizer, validator, and mapper must be edited together.
- A Solid primitive, store, query definition, and effect module are separate files but one conceptual unit.
- Callers must import from three places to perform one domain action.
- A TanStack Form definition, Zod schema, default values, and submission mutation are scattered.

Architectural smell:

> The code has file-level separation without conceptual locality.

## Scope mismatch

A module lives at the wrong scope.

Examples:

- A dashboard-only utility lives in a workspace-global package.
- An app-specific schema is copied into both app and backend interface instead of living in validators.
- A reusable file-processing primitive is trapped inside one app.
- A package-global helper only exists to serve one integration.

Architectural smell:

> The module’s location does not match its reuse, stability, or ownership.

## Package-family inconsistency

Related package families use different structures without a reason.

Example:

```txt
files/
  client/
  server/
  shared/
  processing-image/

i18n/
  core/
  domains/
    solidjs/

ui/
  domains/
    solidjs/
  shared/
````

Architectural smell:

> Similar package families use similar ideas but different topology, increasing onboarding and AI-navigation cost.

## AI-navigation drag

The code is hard for an agent to navigate because intent is not concentrated.

Examples:

* Similar filenames with unclear ownership.
* Important behaviour hidden in generic utilities.
* Domain concepts named after technical mechanisms.
* Callers encode the “why” while modules encode only the “how.”
* Deprecated modules are still importable.
* Important package rules exist only in someone’s head.
* `domains` means integrations in one package and business concepts in another.
* A future agent would likely edit the wrong file.

Architectural smell:

> The codebase lacks navigable conceptual seams.

---

# Candidate types

Use these candidate types when appropriate.

## Deepen module

A shallow or scattered concept should become a deeper module.

## Move inward

A module lives too globally and should move closer to its actual consumers.

## Promote outward

A module is duplicated or reused enough to justify moving to a wider scope.

## Clarify package topology

A package family has inconsistent or confusing structure.

## Clarify public exports

A package exposes internals or hides the true public interface.

## Add package README

A major package lacks onboarding and import-rule documentation.

## Strengthen seam

A seam exists but callers still need too much implementation knowledge.

## Remove ceremonial seam

An interface or package exists but adds no leverage or locality.

## Fix test surface

Tests target implementation details rather than the durable interface.

## Fix AI-navigation trap

The structure or naming is likely to mislead future agents.

---

# Candidate strength

Each candidate gets one recommendation strength.

## Strong

Use when most of these are true:

* The same concept is spread across multiple modules.
* Multiple callers duplicate policy or ordering knowledge.
* Tests are fragile or miss the real behaviour.
* A deepened module would remove meaningful caller knowledge.
* A move inward would substantially reduce context switching.
* A package topology issue is causing real navigation or import friction.
* The candidate aligns with existing ADRs or only mildly challenges them.
* The likely refactor has clear locality and leverage.

## Worth exploring

Use when:

* The friction is real, but the right shape is not obvious yet.
* There may be competing domain names or package ownership.
* The current seam may be justified, but needs grilling.
* The benefit is plausible, but not proven from code evidence alone.
* The topology issue may be intentional but undocumented.
* The scope correctness is unclear.

## Speculative

Use when:

* The opportunity is interesting but weakly evidenced.
* The code may not change often enough to justify refactoring.
* The seam would currently have only one adapter.
* The candidate may be premature abstraction.
* More product/domain context is needed.
* The benefit is mainly consistency, not current friction.

Do not hide weak candidates. Mark them honestly.

---

# Candidate score table

Each candidate should include this score table:

```txt
Depth gain:          Low | Medium | High
Locality gain:       Low | Medium | High
Test value:          Low | Medium | High
Refactor risk:       Low | Medium | High
Context switching:   Reduced | Neutral | Increased
Scope correctness:   Too local | Correct | Too global | Unclear
AI navigability:     Low | Medium | High
Effort:              Small | Medium | Large
Confidence:          Low | Medium | High
Dependency category: In-process | Local-substitutable | Remote but owned | True external | Mixed | N/A
```

Every score must include a short reason.

Do not provide scores without explanation.

Effort estimates must explain what they are based on:

* number of packages touched,
* number of callers,
* test migration needed,
* dependency category,
* adapter work,
* public export changes,
* ADR conflicts,
* runtime/server-client risk,
* migration complexity,
* documentation work.

---

# Report

Write the report using [`HTML-REPORT.md`](HTML-REPORT.md).

The report must include:

* package topology overview,
* candidate cards,
* before/after visuals for every candidate,
* score table with reasons,
* dependency category,
* top recommendation,
* recommended next action,
* and the question: “Which candidate would you like to explore?”

Do not propose final interfaces yet.

Do not edit code.

---

# Grilling loop

Once the user chooses a candidate, switch into design-grilling mode.

Use a mixed style:

* Socratic for load-bearing unknowns.
* Consultant-like when the design space is clear.
* Avoid asking ten questions when two are enough.
* Offer 2–3 design options once the real constraints are known.

Ask:

* What concept is this module really named after?
* Is this a business domain, integration, adapter, or package utility?
* What should callers stop knowing?
* What invariants belong behind the seam?
* What error modes should the interface expose?
* What runtime placement should the interface protect?
* What ordering/lifecycle knowledge should be hidden?
* Which existing modules are adapters?
* Which modules are integrations?
* Which dependency category applies?
* Is this a real seam or a hypothetical seam?
* Is this feature-local, app-local, app-specific, workspace-global, or public?
* Which tests should define the interface?
* Which tests should disappear because they tested implementation?
* What ADRs constrain the design?
* What would make this refactor not worth doing?

Do not rush into a final interface.

A deep module is discovered by removing caller knowledge, not by inventing a prettier wrapper.

---

# Interface design mode

Only enter this mode when the user chooses a candidate and wants interface options.

Use [`INTERFACE-DESIGN.md`](INTERFACE-DESIGN.md).

---

# Documentation updates during grilling

## If a new domain concept appears

If the deepened module needs a business/domain name that is not in `CONTEXT.md`, add it after user agreement or when the decision crystallizes.

Use `CONTEXT.md` for business/domain language.

Do not add generic technical terms.

## If an integration concept appears

If the decision clarifies a framework/library integration, prefer documenting it in the relevant package README or `AGENTS.md`, not necessarily `CONTEXT.md`.

Examples:

* SolidJS integration package.
* oRPC transport integration.
* Better Auth adapter.
* TanStack Query conventions.

## If a fuzzy term gets sharpened

Update the right doc after the user agrees:

* `CONTEXT.md` for domain terms.
* package README for package purpose/import rules,
* `AGENTS.md` for AI-agent navigation rules,
* ADR for durable architectural decisions.

## If the user rejects a candidate

Ask why.

If the reason is load-bearing for future reviews, offer to record it as an ADR.

Good ADR reasons:

* The team intentionally accepts duplication for deployment isolation.
* A seam was rejected because only one adapter will ever exist.
* A package is intentionally workspace-global because it is a future public package.
* A domain concept is owned by another system.
* Runtime constraints prevent centralizing the behaviour.
* The current shape is required by a migration plan.
* Package topology is intentionally inconsistent because runtime dependencies differ.

Bad ADR reasons:

* “Not worth it right now.”
* “We are busy.”
* “Maybe later.”
* “I do not like the name.”

Offer:

```txt
Want me to record this as an ADR so future architecture reviews do not re-suggest it?
```

## If the user wants implementation steps

After the design is selected, produce a phased implementation plan.

Example:

```txt
Phase 1: Add characterization tests around current behaviour.
Phase 2: Introduce the deeper module internally.
Phase 3: Move one caller at a time.
Phase 4: Delete shallow modules or accidental exports.
Phase 5: Update package README, CONTEXT.md, AGENTS.md, or ADRs.
```

Prefer small, reversible steps.

For risky refactors, include:

* rollback strategy,
* test strategy,
* migration order,
* public export compatibility,
* package release impact if relevant.

---

# Quality bar

A good review feels like this:

* It understands the repo’s package scopes.
* It uses the project’s domain language.
* It distinguishes business domains from framework integrations.
* It finds concepts, not just files.
* It distinguishes shallow modules from deep modules.
* It classifies dependencies before proposing deepening.
* It shows why a seam earns its keep.
* It identifies modules that are too global or too local.
* It explains how tests improve without chasing coverage.
* It avoids interface design until the user picks a candidate.
* It is visual enough to understand quickly.
* It is technical enough to be used as a reference.
* It is honest about speculative candidates.
* It respects ADRs without being trapped by them.
* It improves AI-navigability.
* It protects solo-founder speed.
* It prepares the project for future team scale.

A weak review feels like this:

* It lists generic refactors.
* It suggests “services” everywhere.
* It proposes interfaces before understanding caller knowledge.
* It rewards indirection.
* It ignores dependency category.
* It ignores package topology.
* It ignores app-specific vs workspace-global scope.
* It ignores ADRs.
* It ignores domain language.
* It uses React/Next.js assumptions in a SolidStart project.
* It focuses on file organization instead of locality and leverage.
* It says “improve separation of concerns” without explaining what knowledge moves where.
* It recommends root `utils` or root `services` buckets.
* It treats coverage as the goal.
* It creates decorative diagrams instead of explanatory diagrams.

---

# Report tone

Be direct and evidence-based.

Prefer:

> This module is shallow — callers still know validation ordering, cache invalidation rules, and persistence error modes. The deletion test suggests it is not earning its keep.

Avoid:

> This could be cleaner and more maintainable.

Prefer:

> A deeper recipe intake module would improve locality by concentrating normalization, validation, and status transition policy behind one seam.

Avoid:

> We should create a service layer.

Prefer:

> This helper appears too global: every caller is inside the dashboard route tree, and the package README does not declare a wider reuse intent.

Avoid:

> Move this to shared because it is reusable.

Prefer:

> `domains/solidjs` is likely an integration, not a business domain. Renaming this convention to `integrations/solidjs` would improve AI-navigability.

Avoid:

> Rename folders for consistency.

No hedging.

No throat-clearing.

If a sentence can be a bullet, make it a bullet.

If a bullet can be cut, cut it.

If a term is not in `LANGUAGE.md`, prefer one that is before inventing a new one.
