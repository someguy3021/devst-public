# Architecture overview

> [Русская версия](../ru/architecture/overview.md)

> Part of the devst public documentation. English is the source of truth; a Russian
> mirror lives under [docs/ru/architecture/overview.md](../ru/architecture/overview.md).

## The one-paragraph version

devst is a TypeScript CLI with a **pure core and zero runtime dependencies** (Node
stdlib only). Everything that touches the world — file system, git, SQLite, child
processes — lives in thin shells. The same pure core executes inside a Tauri v2
desktop app's webview and inside a Playwright test runner. Distribution is a single
self-contained binary (Node SEA) that carries its integration templates as embedded
assets; the desktop app ships that binary as a sidecar.

## Layers

```
┌────────────────────────────────────────────────────────────────┐
│  DESKTOP UI (Tauri v2): Vue 3 + Quasar in the webview —        │
│  executes the same pure core; FS/dialogs via plugins behind    │
│  a KernelAdapter; task mutations go through a Rust sidecar     │
│  (rusqlite + IPC), not a second implementation                 │
├────────────────────────────────────────────────────────────────┤
│  DELIVERY (outside the core): canonical templates — agent      │
│  skill, slash-commands, hooks, scaffolding, staging overlay    │
├────────────────────────────────────────────────────────────────┤
│  SHELLS (FS / processes / git / node:sqlite):                  │
│  cli · mcp-run · registry-run · activity-run · integrate-run   │
│  bugs-run · links-run · visual-run · collect-run               │
├────────────────────────────────────────────────────────────────┤
│  PURE CORE (strings & lists, no node:* imports):               │
│  util · head · sessions · env · undoc · freeze · scan-ui ·     │
│  req · check · map · status · brief · visual · specgen ·       │
│  png · bugs-core · integrations · links · features ·           │
│  dirty · remind · registry · sea · activity · code-intel       │
└────────────────────────────────────────────────────────────────┘
```

The one architectural rule that makes this work: **core modules are pure functions
over strings and lists and never import `node:*`**. That is what lets the identical
code run in the CLI, in the webview, and in tests — and what keeps `tsc --strict`
green with zero runtime dependencies.

## Storage: markdown prose, SQLite registries

A deliberate hybrid: human prose (architecture, features, ADRs, session logs) stays
in **markdown** — reviewable in pull requests, greppable, diffable. Structured
registries (tasks, UI-freeze verdicts) live in **SQLite** (`docs/registry.db`) via
`node:sqlite`, in WAL mode with a checkpoint on write so the `.db` file itself
commits cleanly. Bridge commands move freeze-registry rows between markdown and the
database, so each format stays the source of truth for its kind of data.

Two more stores complete the picture. The **activity journal** (`docs/activity.db`)
is an append-only SQLite database with an FTS5 index: every state change (freeze
set/unset, task create/close/tag/verify, pins, installs, analyze, sessions) is
recorded automatically by the CLI mutators, plus manual events via `devst log add`.
The journal is history, never state — the registry stays editable, the journal does
not. The **code index** (`.devst/graph.db`) is a derived, disposable cache built by
`devst analyze`: it lives outside `docs/`, can be rebuilt at any time, and carries
no canon.

## Core modules, briefly

| Module | Responsibility |
|---|---|
| `head.ts` | Parses the standard doc header (status/updated/essence/key facts) |
| `check.ts` | The convention lint: headers, map, panel, environment freshness, versions |
| `map.ts` / `status.ts` / `brief.ts` | Documentation map / "Now" panel / one-text summary |
| `env.ts` | Environment recon over stack manifests (package.json, Cargo.toml, pyproject, Makefile, compose, CI) + freshness check for CI |
| `undoc.ts` / `dirty.ts` | Detectors: code commits without a log entry; uncommitted work |
| `registry.ts` | Task registry core: schema, kinds, statuses, timers, links, closure-gate report |
| `freeze.ts` / `scan-ui.ts` | UI-freeze registry: frozen areas, default-deny mode, SFC-block ∩ diff-hunk matching; auto-draft from sources |
| `visual.ts` / `specgen.ts` / `png.ts` | Visual freezing: layout snapshot + screen hash; Playwright spec generation from the freeze registry; zero-dependency PNG decoder + pixel diff |
| `bugs-core.ts` | Bug Hunt: report formats, URL → screen → files, pinpoint BUG-* cards |
| `integrations.ts` | Target specs, token substitution, config merge, hash verification for `integrations install` / `doctor` |
| `remind.ts` | Reminder pipeline: one `Reminder` model over provider detectors |
| `links.ts` / `links-run.ts` | Linked repositories: `links.json` manifest, `id://` cross-links, sha256+HEAD pins, byte-for-byte mirrors |
| `features.ts` / `capabilities.ts` | Feature gates (`features.*` in devst.json): on/off/auto, neighbor-tool detection feeding `env`/`doctor` recommendations |
| `activity.ts` | The append-only journal core: event schema, FTS5 search model |
| `code-intel/` | Code intelligence: parser cascade (own scanner → embedded TypeScript/Lezer/PHP/Lua/Elixir parsers), import graph, blast radius, git analytics, health detectors, symbols, the `audit` revisiting report |
| `mcp.ts` | The MCP server core: 23 read-only tools over the canon, the registry and code intelligence; `_meta` envelopes (freshness, completeness, truncation) |
| `scaffold.ts` | Truthful-number stubs for `new adr/session/feature/research/...`, `init` generators |

Shells: `cli.ts` (arguments, FS, output, exit codes), `mcp-run.ts` (the stdio
JSON-RPC server process), `registry-run.ts` (SQLite WAL, git helpers),
`activity-run.ts` (the journal database), `collect-run.ts` (fact-gathering shared
by the CLI and MCP — one source, no duplication), `integrate-run.ts` (live install
+ doctor smoke), `bugs-run.ts` (artifact build/obfuscation, ingest), `links-run.ts`
(pin/mirror checks on the live file system), `visual-run.ts` (Playwright
orchestration), plus the code-intel runners (`analyze-run.ts`, `health-run.ts`,
`risk-run.ts`, `symbols-run.ts`… over `graph.db`).

## Command pipeline

`init` (scaffold a tier) → `new` (numbered stubs) → the working loop:
`env` (recon / freshness stamp) → `check` (lint, exit 1 for CI) → `map` / `status`
(regeneration) → `hook install` (pre-commit in a target repo). Dedicated circuits
branch off: UI freezing — `freeze --scan/--file/--staged` + `visual`; staging —
`bugs emit/ingest`; linked repos — `links check/pin/mirror`; harness wiring —
`integrations install` + `doctor`; tasks — `task new/show/start/close` + `board` +
`file`; code intelligence — `analyze` + `blast`; the journal — `log add/query`;
honest bookkeeping — `audit`; agent access — `mcp`.

## Distribution: single binary + sidecar

The CLI compiles into a **Node SEA single binary** (~98 MB, Windows-first): the
canonical integration templates are embedded as assets, so `integrations install`
works from the exe with no repository checkout, and hooks dispatch straight to the
exe without a Node invocation. The code parsers for the intelligence layer are
embedded the same way, each with its version and license in a generated manifest.
The Tauri desktop app ships the same exe as a
**sidecar**: task mutations with closure gates from the UI go through the CLI
process — one implementation of the rules, not two.

## Testing

- **Pure-core units** — the bulk of the ~500 tests; strings in, strings out.
- **Browser E2E** — real Chromium (Playwright) against a vite build of the UI with a
  `MockKernel` adapter standing in for Tauri IPC; every screen covered.
- **Visual regression** — layout snapshots + screen hashes by default, true pixel
  diff (own PNG decoder, `node:zlib`) in the opt-in pixel-perfect mode.

## Decision record (selected ADRs)

- **[ADR-001](../decisions/adr-001-ts-repo-instead-of-script.md)** — TypeScript repo with a pure core instead of a one-file script
- **[ADR-015](../decisions/adr-015-tauri-ui-stack.md)** — Tauri v2 + Vite + Quasar, core executed in the webview
- **[ADR-016](../decisions/adr-016-ui-e2e-mockkernel-playwright.md)** — browser E2E with Playwright and a MockKernel instead of tauri-driver
- **[ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md)** — hybrid storage: markdown prose + SQLite registries
- **[ADR-018](../decisions/adr-018-sea-binary-distribution.md)** — distribution as a Node SEA binary with the canon embedded
- **[ADR-019](../decisions/adr-019-machine-independent-canon-tokens.md)** — machine-independent canon: path tokens substituted at install
- **[ADR-020](../decisions/adr-020-tauri-sidecar.md)** — the SEA binary as the Tauri app's sidecar
- **[ADR-021](../decisions/adr-021-reminder-pipeline.md)** — reminders as one pipeline over detector providers
- **[ADR-022](../decisions/adr-022-parallel-agents-staging-join.md)** — parallel agents: staging task journals + idempotent join
- **[ADR-025](../decisions/adr-025-linked-repos-links-json.md)** — linked repositories: `id://` links, pins, mirrors
- **[ADR-028](../decisions/adr-028-parser-cascade-t0-t1-t2.md)** — the code-intelligence parser cascade (T0/T1/T2) and embedded assets

All 28 decision records are published under [docs/decisions/](../decisions/).
