# Feature 10: Code intelligence — a clean-room build (dependency graph, blast radius, health)

> [Русская версия](../ru/features/10-code-intelligence-clean-room.md)

> **Status:** Implemented (first scope: scanner cascade, import graph, blast radius, git analytics, health, the UI panel, MCP tools) · **Updated:** 2026-10-10
> **Essence:** devst grows a second column of agent context next to the canon: a code index in a separate `graph.db` — imports and symbols, the blast radius of a diff, git analytics (churn, hotspots, ownership), health findings with a fix-first queue, dead-code candidates with confidence levels. Every answer is served through the MCP tools ([Feature 08](./08-mcp-server.md)) and the dashboards of the Tauri window ([Feature 03](./03-devst-ui-desktop-window.md)), with `_meta` honesty: freshness, coverage and approximations are stated, never hidden. The design is a clean-room build on the ideas of [repowise](https://github.com/repowise-dev/repowise), a public AGPL code-intelligence project: their docs and observed CLI behavior are read, their code is not; the names, formats and architecture are our own.
> **Key facts:**
> - Ideas are legal, code is not: AGPL protects code and texts, not ideas and algorithms — every borrowed idea is recorded as a lineage line "idea → their doc → our module".
> - Zero runtime deps: the parsers of the cascade are vendored into the binary through an asset manifest (`pnpm vendor`), ~9 MB total including `typescript.js`.
> - A separate `graph.db` — rebuildable and disposable; the canon task registry is never touched ([ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md)).
> - If a repo already runs repowise, devst detects it and suggests switching our overlapping subsystems off — detect, don't block ([ADR-010](../decisions/adr-010-detect-dont-block.md)).
> **Related:** [repowise](https://github.com/repowise-dev/repowise) (the idea catalog; attribution and gratitude) · [ADR-028](../decisions/adr-028-parser-cascade-t0-t1-t2.md) (the parser cascade) · [Feature 08](./08-mcp-server.md) (`get_context` / `get_risk` / `get_blast_radius` / `get_overview`) · [Feature 03](./03-devst-ui-desktop-window.md) (the code-intelligence panel) · [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (a separate index DB) · [ADR-023](../decisions/adr-023-public-docs-only-release.md) (license hygiene of the vendored parsers)

## Scenarios

1. **A small local model codes** — the agent asks `get_context(file)` and gets a triage card (signatures, importers, churn, owner) within a character budget; after the edit — `get_blast_radius(diff)`: what the change touches and which tests to run. The map of the repo is served ready-made, not re-derived by expensive trial and error.
2. **A human opens the window** — the code-intelligence panel shows the dependency map, hotspots and the fix-first queue (health × hotspot); a click opens the file dossier with a refactoring plan.
3. **The death-hour cleanup** — dead exports and unreachable code with confidence levels; `safe_to_delete` is only claimed above a high threshold (≥ 0.7 — their culture of honest "rows we lose" becomes our own benchmark honesty).
4. **A repowise neighbor** — the `.repowise/` markers are detected by `devst env`/`doctor`: "repowise detected; consider switching our overlapping code-intel subsystems off so it does not get in the way". The decision stays with the repo author ([ADR-010](../decisions/adr-010-detect-dont-block.md)).

## The parser cascade: T0 / T1 / T2, a family of slots

The tiers complete each other; the origin of every fact is marked, edge confidence grows with the tier, and a precision upgrade does not break the index ([ADR-028](../decisions/adr-028-parser-cascade-t0-t1-t2.md)). T2 is deliberately a **family of per-language slots**, not one parser.

| Tier | Role | Composition / when it runs | Honesty |
|---|---|---|---|
| **T0 — own scanner** | the base and fallback for **all languages**: imports/exports by regex + a bracket scan | always; without it — nothing | low confidence, marked "approximation" |
| **T1 — LSP bridge** | the accuracy base for TS/JS: tsserver from the target repo's node_modules | TS/JS, server available | the project's version = truth; a timeout/dead server → fallback to T0/T2, flagged in `_meta` |
| **T2 — vendored parsers (multi-slot)** | process-free accuracy | TS/JS via `typescript.js` (~8 MB) · Python/Go/Java/Rust/C/C++ via `@lezer/*` · PHP via `php-parser` · Lua via `luaparse` · Elixir via `lezer-elixir` — ~1 MB on top | **version honesty**: the asset knows its own version and sees the project's; a mismatch or a failed parse = `parsed-with-mismatch`/`unparsed` in `_meta`, never a silent pass |
| **T2-WASM — a deferred sub-slot** | extending the set: C#, Kotlin, Swift, Dart, Scala… via `web-tree-sitter` | only after a manual instantiate-from-asset check inside a real SEA binary | the T2 statuses plus an "experimental slot" mark |

Friendship order: T0 always builds the index (cheap, all languages, unreliability marked); per language the best available slot wins — T1 (TS/JS, the project's own version) > a T2 slot > T0. The asset manifest (`engines-meta.ts`) carries slot/language/package/version/license/size; BSD-3 and Apache-2.0 notices ship as copies with the assets.

## Clean-room discipline

- Their **code is never opened** for porting; the idea sources are public docs (README, architecture, benchmarks) and observed CLI behavior.
- No verbatim texts; subsystem and tool names are our own (`devst analyze`, `get_*` are common to the MCP genre anyway).
- Every idea gets a lineage line — "idea → their doc → our module" (the LINEAGE principle, borrowed from their own practice).
- Benchmark honesty as a guide: our approximations are published with numbers, including losses.
- The AGPL memo: ideas, algorithms and facts are not licensed; code and texts are. In doubt about a specific fragment — don't take it, reinvent it.

## Non-goals

- Not a vector DB, not LLM providers, not a serving daemon: the deterministic layers run without a model — the offline principle.
- Not "all 26 languages at once": the exact-slot set is TS/JS + Python/Go/Java/Rust/C/C++/PHP/Lua/Elixir; other languages ride T0; the set grows through the asset manifest (the WASM sub-slot — after the SEA check).
- Not a canon replacement: code intelligence is the second column of context; docs, the registry and the rituals stay the core of devst.
