# HTML Report Format

The architecture review is rendered as a single self-contained HTML file in the OS temp directory.

Tailwind and Mermaid both come from CDNs.

Mermaid handles graph-shaped diagrams reliably.

Hand-built divs and inline SVG handle editorial visuals:

- mass diagrams,
- cross-sections,
- scope ladders,
- call-graph collapse,
- AI-agent trap cards.

Mix the two. Do not lean on Mermaid for everything.

---

# Output location

Write the report to the OS temp directory.

Do not write the report into the repo.

Resolve the temp directory like this:

- Use `$TMPDIR` when available.
- Fall back to `/tmp` on Linux/macOS.
- Use `%TEMP%` on Windows.

Filename format:

```txt
architecture-review-<timestamp>.html
```

Example:

```txt
/tmp/architecture-review-2026-06-14T09-32-10.html
```

Open it for the user:

- Linux: `xdg-open <path>`
- macOS: `open <path>`
- Windows: `start <path>`

Then tell the user the absolute path.

---

# Scaffold

Use this scaffold unless there is a project-specific reason to adjust it.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({
        startOnLoad: true,
        theme: "neutral",
        securityLevel: "loose",
      });
    </script>
    <style>
      .seam {
        stroke-dasharray: 4 4;
      }

      .leak {
        stroke: #dc2626;
      }

      .deep {
        background: linear-gradient(135deg, #0f172a, #1e293b);
      }

      .scope-ladder-step {
        border-left: 4px solid #cbd5e1;
      }

      .scope-ladder-step.active {
        border-left-color: #4f46e5;
      }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="topology">...</section>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

Only scripts allowed:

- Tailwind CDN,
- Mermaid ESM import.

The report is otherwise static.

---

# Visual style

Lean editorial, not corporate dashboard.

Use:

- generous whitespace,
- stone/slate background,
- sparse color,
- one accent color,
- red for leakage,
- amber for warnings,
- emerald for strong recommendations,
- indigo or slate for structural emphasis.

Candidate diagrams should be around 320px tall when possible.

Before/after diagrams should sit side by side without scrolling.

Use `text-xs uppercase tracking-wider` for schematic labels.

No decorative diagrams. Every diagram must explain structure.

---

# Header

Include:

- repo name,
- review timestamp,
- detected stack,
- whether `CONTEXT.md` was found,
- whether `AGENTS.md` was found,
- number of ADRs read,
- number of packages inspected,
- number of candidates found,
- compact legend:
  - solid box = module,
  - dashed line = seam,
  - red arrow = leakage,
  - thick dark box = deep module.

No long introduction paragraph.

Go straight into topology and candidates.

---

# Package topology overview

The report must include a package topology overview before candidate cards.

Show:

- apps,
- app-specific packages,
- workspace-global packages,
- package families,
- integrations,
- public interfaces,
- suspicious dependency directions,
- missing README/package-doc signals,
- possible too-local or too-global modules.

Use Mermaid when graph-shaped.

Use custom visuals when explaining scope ladders.

Include a short diagnosis.

Example diagnosis:

> The repo has a useful split between app-specific packages and workspace-global packages, but several package families use similar ideas with inconsistent topology. The main risk is not duplication; it is context switching and AI-navigation drift.

---

# Candidate card

Each candidate is one `<article>`.

The diagrams carry the weight.

Prose is sparse, plain, and uses the glossary terms from `LANGUAGE.md`.

Each card includes:

- **Title**
- **Badge row**
  - recommendation strength,
  - candidate type,
  - dependency category.

- **Files/packages**
- **Before / After diagram**
- **Problem**
- **Solution direction**
- **Wins**
- **Score table**
- **ADR callout**, if applicable.
- **Risks**
- **Grilling questions**

---

# Candidate title

Short and names the deepening or topology change.

Good:

```txt
Deepen the Recipe intake module
Clarify the files package topology
Move dashboard-only table helpers inward
```

Bad:

```txt
Refactor utils.ts
Create service layer
```

---

# Badge row

Recommendation strength:

- `Strong` — emerald.
- `Worth exploring` — amber.
- `Speculative` — slate.

Candidate type:

- Deepen module
- Move inward
- Promote outward
- Clarify package topology
- Clarify public exports
- Add package README
- Strengthen seam
- Remove ceremonial seam
- Fix test surface
- Fix AI-navigation trap

Dependency category:

- in-process
- local-substitutable
- remote but owned
- true external
- mixed
- N/A

---

# Files / Packages

Use a monospaced list.

Group when useful:

- callers,
- implementation modules,
- app-specific packages,
- workspace-global packages,
- tests,
- ADRs,
- package READMEs,
- public exports.

---

# Before / After Diagram

Every candidate needs a before/after visual.

Show:

- what callers currently need to know,
- where implementation knowledge is currently spread,
- what becomes deeper after the refactor,
- which seam becomes more meaningful,
- whether adapters are real or hypothetical,
- whether code moves inward or outward,
- which package scope changes.

If the diagram needs a long paragraph to be understood, redraw the diagram.

---

# Problem

One sentence.

Use architecture vocabulary.

Good:

> Recipe intake is shallow — callers still know validation ordering, cache invalidation rules, and persistence error modes.

Bad:

> Recipe intake could be cleaner.

---

# Solution direction

One sentence.

Describe the direction without proposing final interfaces.

Good:

> Concentrate recipe intake validation, normalization, and persistence coordination behind one deeper module.

Bad:

> Create `RecipeIntakeService.processRecipe(input)`.

---

# Wins

Bullets.

Six words or fewer when possible.

Use glossary terms.

Good:

```txt
- locality: rules concentrate
- leverage: one interface
- tests hit behaviour
- fewer scattered imports
- Zod stays in validators
```

Bad:

```txt
- easier to maintain
- cleaner code
```

---

# Score table

Use this table shape:

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

---

# ADR callout

If the candidate contradicts an ADR, include an amber callout.

Shape:

```txt
Contradicts ADR-0007 — worth reopening because <specific friction>.
```

Only include ADR conflicts when friction is real enough to justify reopening the decision.

Do not list every theoretical refactor an ADR forbids.

---

# Diagram patterns

Pick the pattern that fits the candidate.

Mix them.

Do not make every diagram look the same.

## Mermaid graph

Use for dependencies, calls, package topology, and sequences.

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[RecipeForm] --> B[RecipeValidator]
      A --> C[RecipeMutation]
      C --> D[RecipeProcedure]
      D -.leaks.-> E[RecipeRepo]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class D,E leak
  </pre>
</div>
```

## Hand-built boxes-and-arrows

Use when Mermaid layout fights the explanation.

Good for showing:

- one thick deep module,
- greyed-out internals,
- package scope movement,
- hidden implementation.

## Cross-section

Good for layered shallowness.

Before:

```txt
thin module
thin module
thin module
thin module
```

After:

```txt
one deep module
```

## Mass diagram

Good for “interface as wide as implementation.”

Before:

```txt
large interface
large implementation
```

After:

```txt
small interface
large implementation
```

## Call-graph collapse

Good when a scattered call tree becomes internal implementation.

Before:

```txt
caller → helper → mapper → validator → adapter
```

After:

```txt
caller → deep module
          faded internal implementation
```

## Scope ladder

Good for move inward / promote outward candidates.

```txt
feature-local
→ app-local
→ app-specific package
→ workspace-global package
→ public package interface
```

Highlight current scope and proposed scope.

## AI-agent trap card

Good for confusing structure.

Show:

- misleading name,
- likely wrong edit path,
- correct path,
- README/AGENTS.md fix.

---

# Top recommendation section

One larger card.

Include:

- candidate name,
- anchor link to candidate card,
- one sentence explaining why.

Use:

- highest leverage,
- best locality improvement,
- most painful current test surface,
- lowest ADR conflict,
- best scope-correctness improvement,
- best domain-name clarity,
- best AI-navigation payoff,
- best solo-founder speed improvement,
- best team-scale maintainability improvement.

---

# Suggested next action

After top recommendation, include:

```txt
Recommended next action:
<one practical next step>
```

Then ask:

```txt
Which candidate would you like to explore?
```

Do not propose final interfaces yet.

Do not start editing code.

---

# Tone

Plain English.

Concise.

Use architectural nouns from `LANGUAGE.md`.

No hedging.

No throat-clearing.

If a sentence can be a bullet, make it a bullet.

If a bullet can be cut, cut it.

If a term is not in `LANGUAGE.md`, prefer one that is before inventing a new one.
