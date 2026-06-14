# Language

Shared vocabulary for every suggestion this skill makes.

Use these terms exactly. Consistent language is the point.

Do not casually substitute “component,” “service,” “API,” or “boundary.”

---

# Terms

## Module

Anything with an interface and an implementation.

Scale-agnostic. Applies to:

- function,
- class,
- package,
- package family,
- route module,
- Solid primitive,
- TanStack query definition,
- TanStack table definition,
- TanStack form definition,
- worker task,
- oRPC procedure group,
- tier-spanning slice.

Avoid:

- unit,
- component,
- service.

Use framework terms like `component` only when literally discussing a UI framework component.

---

## Interface

Everything a caller must know to use the module correctly.

Includes:

- type signature,
- invariants,
- ordering constraints,
- error modes,
- required configuration,
- lifecycle,
- runtime placement,
- side effects,
- performance characteristics,
- import path,
- public export status.

Avoid:

- API,
- signature.

Those are too narrow.

The TypeScript `interface` keyword is not what this term means.

---

## Implementation

What is inside a module.

Distinct from **adapter**.

A thing can be:

- a small adapter with a large implementation,
- a large adapter with a small implementation,
- or an implementation that contains internal seams.

Use **implementation** when the internal code is the topic.

Use **adapter** when the seam role is the topic.

---

## Depth

Leverage at the interface.

A module is **deep** when a large amount of behaviour sits behind a small interface.

A module is **shallow** when the interface is nearly as complex as the implementation.

Depth is not a line-count ratio.

Depth is about what callers get per unit of interface they must learn.

---

## Seam

A place where behaviour can be altered without editing in that place.

The location where a module’s interface lives.

Choosing where to put the seam is a design decision, distinct from what goes behind it.

Avoid:

- boundary.

Boundary is overloaded with DDD bounded context language.

Use **seam** or **interface** instead.

---

## Adapter

A concrete thing that satisfies an interface at a seam.

Describes role, not substance.

Examples:

- in-memory adapter,
- HTTP adapter,
- oRPC adapter,
- filesystem adapter,
- Postgres adapter,
- Better Auth adapter,
- storage adapter.

---

## Integration

Framework, runtime, platform, or library-specific code.

Examples:

- SolidJS integration,
- SolidStart integration,
- oRPC integration,
- TanStack Query integration,
- TanStack Form integration,
- Better Auth integration,
- Fastify integration,
- storage provider integration.

Use **integration** for framework/library/runtime packages.

Use **adapter** for concrete implementations behind a seam.

Use **domain** for business concepts.

---

## Leverage

What callers get from depth.

More capability per unit of interface they have to learn.

One implementation pays back across many call sites and tests.

---

## Locality

What maintainers get from depth.

Change, bugs, knowledge, and verification concentrate in one place instead of spreading across callers.

Fix once, fixed everywhere.

---

## Scope correctness

Whether a module lives at the right level of the repo.

A module can be:

- too local,
- correct,
- too global,
- unclear.

Scope correctness is judged by:

- actual callers,
- expected reuse,
- package-family intent,
- public-interface stability,
- context-switching cost,
- and ownership.

---

## Package topology

How packages, package families, subpackages, and dependency directions are arranged.

In a monorepo, package topology is architecture.

---

## AI-navigability

How easily a future AI agent or human can:

- find the right module,
- understand its purpose,
- avoid deprecated paths,
- follow import rules,
- respect public interfaces,
- and avoid editing the wrong place.

---

# Principles

## Depth is a property of the interface, not the implementation

A deep module can be internally composed of smaller modules.

A deep module can have internal seams.

Those internal seams do not need to be exposed through the external interface.

---

## The deletion test

Imagine deleting the module.

If complexity vanishes, the module was probably pass-through.

If complexity reappears across many callers, the module was earning its keep.

---

## The interface is the test surface

Callers and tests cross the same seam.

If tests must reach past the interface, the module may be the wrong shape.

---

## One adapter means a hypothetical seam. Two adapters means a real seam.

Do not introduce a seam unless something actually varies across it.

A single-adapter seam can still be valid when it improves:

- locality,
- public interface stability,
- runtime safety,
- package-family clarity,
- or test value against a hard dependency.

But it must justify itself.

---

## Move inward is architecture too

Architecture is not only extracting shared modules.

A module living too globally can reduce locality and increase context switching.

Moving code inward can improve architecture when wider scope is not justified.

---

# Relationships

- A **module** has one external **interface**.
- A module may contain internal modules.
- A module may contain internal seams.
- **Depth** is a property of a module measured against its interface.
- A **seam** is where a module’s interface lives.
- An **adapter** sits at a seam and satisfies the interface.
- **Depth** produces **leverage** for callers.
- **Depth** produces **locality** for maintainers.
- **Scope correctness** describes whether the module lives at the right repo level.

---

# Rejected framings

## Depth as implementation-lines divided by interface-lines

Rejected because it rewards padding the implementation.

Use depth-as-leverage.

## Interface as TypeScript `interface`

Rejected because it is too narrow.

The interface includes every fact a caller must know.

## Boundary

Rejected because it is overloaded.

Use seam or interface.

## Service layer

Rejected as default architecture vocabulary.

Use module.

Only use service when the project literally uses that term.

## Generic root utilities

Rejected as default organization.

Prefer locality-first placement.

Promote outward only when reuse, stability, public-interface value, or package-family intent justifies it.
