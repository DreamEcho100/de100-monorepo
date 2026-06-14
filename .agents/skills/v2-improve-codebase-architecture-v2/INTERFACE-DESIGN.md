# Interface Design

Use this file only after the user chooses a deepening candidate and wants to explore interface options.

This mode is based on “Design It Twice”: the first idea is unlikely to be the best.

Assumes the vocabulary in [`LANGUAGE.md`](LANGUAGE.md):

- **module**
- **interface**
- **implementation**
- **seam**
- **adapter**
- **depth**
- **leverage**
- **locality**

Also use:

- project domain vocabulary from `CONTEXT.md`,
- dependency categories from [`DEEPENING.md`](DEEPENING.md),
- package scope rules from [`PACKAGE-TOPOLOGY.md`](PACKAGE-TOPOLOGY.md),
- stack-specific constraints from [`STACK-LENSES.md`](STACK-LENSES.md).

---

# Goal

Discover the right interface for a chosen deepening candidate.

Do not invent a prettier wrapper.

A good interface removes caller knowledge.

A good interface makes the module deeper.

A good interface becomes the test surface.

---

# Process

## 1. Frame the problem space

Before spawning sub-agents, write a user-facing explanation of the problem space for the chosen candidate.

Include:

- the current module shape,
- what callers currently need to know,
- what implementation knowledge leaks,
- what constraints any new interface must satisfy,
- the dependencies it relies on,
- dependency categories from `DEEPENING.md`,
- package scope constraints,
- runtime placement constraints,
- test surface constraints,
- public export constraints,
- ADR constraints,
- and a rough illustrative code sketch.

The sketch is not a proposal.

It exists only to make the constraints concrete.

Show this to the user, then proceed to parallel design.

---

## 2. Spawn parallel design agents

Spawn 3+ sub-agents in parallel using the Agent tool.

Each sub-agent must produce a radically different interface for the deepened module.

Prompt each sub-agent with a separate technical brief.

The brief should include:

- file paths,
- coupling details,
- current callers,
- what sits behind the seam,
- dependency category,
- package scope,
- current tests,
- known ADR constraints,
- relevant `LANGUAGE.md` vocabulary,
- relevant `CONTEXT.md` vocabulary,
- stack-specific constraints.

Give each agent a different design constraint.

## Agent 1: Minimal interface

Constraint:

> Minimize the interface. Aim for 1–3 entry points. Maximize leverage per entry point.

Use when:

- callers should know very little,
- the workflow is cohesive,
- the implementation can absorb complexity.

## Agent 2: Flexible interface

Constraint:

> Maximize flexibility. Support multiple use cases and extension points without leaking implementation.

Use when:

- callers have meaningfully different workflows,
- there are multiple adapters,
- the package may become public,
- future extension is likely and documented.

## Agent 3: Common caller interface

Constraint:

> Optimize for the most common caller. Make the default case trivial.

Use when:

- 80% of callers do the same thing,
- current friction comes from repeated setup,
- developer experience matters heavily.

## Agent 4: Ports and adapters interface

Constraint:

> Design around ports and adapters for cross-seam dependencies.

Use when:

- dependency category is remote but owned,
- dependency category is true external,
- production and test adapters both earn their keep,
- transport details should not leak.

## Agent 5: Package public interface

Constraint:

> Optimize for package public interface stability and AI-navigability.

Use when:

- the module is in a workspace-global package,
- the package may become public,
- exports are currently unclear,
- internal modules are accidentally imported.

Use Agent 5 only when relevant.

---

# Sub-agent output

Each sub-agent must output:

1. **Interface**
   - types,
   - methods/functions,
   - params,
   - invariants,
   - ordering,
   - lifecycle,
   - error modes,
   - runtime placement,
   - performance assumptions.

2. **Usage example**
   - show how callers use it,
   - show the common case,
   - avoid implementation-heavy examples.

3. **Hidden implementation**
   - what moves behind the seam,
   - what callers stop knowing.

4. **Dependency strategy**
   - dependency category,
   - adapter strategy,
   - test stand-ins,
   - external provider handling.

5. **Testing strategy**
   - tests through the interface,
   - adapter tests,
   - tests to delete,
   - tests to keep.

6. **Trade-offs**
   - where leverage is high,
   - where leverage is thin,
   - locality impact,
   - public export impact,
   - AI-navigability impact,
   - context-switching impact.

---

# 3. Present and compare

Present designs sequentially.

Then compare them by:

- depth,
- locality,
- seam placement,
- dependency strategy,
- adapter shape,
- package scope,
- test surface,
- public export impact,
- AI-navigability,
- context-switching impact,
- migration risk.

Give a recommendation.

If elements from different designs combine well, propose a hybrid.

Be opinionated.

The user wants a strong read, not a menu.

---

# Comparison table

Use a table like this:

```txt
Design:              Minimal | Flexible | Common Caller | Ports/Adapters
Depth:               High
Locality:            Medium
Interface size:      Small
Adapter fit:         N/A
Test surface:        Strong
Public export risk:  Low
Context switching:   Reduced
Migration risk:      Medium
Best for:            Main app workflow
Weakness:            Less flexible for rare cases
```

Explain each score briefly.

---

# Recommendation shape

Good recommendation:

> I would choose the Common Caller design with the Minimal design’s error model. It gives the highest leverage for current callers, keeps the interface small, and avoids exposing adapter details. The Flexible design is only worth it if this package is intended to become public soon.

Bad recommendation:

> All options are good; choose based on preference.

---

# After selection

Once the user chooses or approves a design, produce a phased implementation plan.

Include:

```txt
Phase 1: Add characterization tests around current behaviour.
Phase 2: Introduce the deeper module internally.
Phase 3: Move one caller at a time.
Phase 4: Delete shallow modules or accidental exports.
Phase 5: Update package README, CONTEXT.md, AGENTS.md, or ADRs.
```

For risky refactors, include:

- rollback strategy,
- test strategy,
- migration order,
- public export compatibility,
- package release impact,
- ADR/doc updates.

Prefer small, reversible steps.
