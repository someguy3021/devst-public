# Architecture overview

> Part of the devst public documentation. English is the source of truth; a Russian
> mirror lives under [docs/ru/](../ru/) (being translated).

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
│  cli · registry-run · integrate-run · bugs-run · visual-run    │
├────────────────────────────────────────────────────────────────┤
│  PURE CORE (strings & lists, no node:* imports):               │
│  util · head · sessions · env · undoc · freeze · scan-ui ·     │
│  req · check · map · status · brief · visual · specgen ·       │
│  png · bugs-core · integrations · scaffold · registry ·        │
│  dirty · remind · sea                                          │
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
| `scaffold.ts` | Truthful-number stubs for `new adr/session/feature/...`, `init` generators |

Shells: `cli.ts` (arguments, FS, output, exit codes), `registry-run.ts` (SQLite WAL,
git helpers), `integrate-run.ts` (live install + doctor smoke), `bugs-run.ts`
(artifact build/obfuscation, ingest), `visual-run.ts` (Playwright orchestration).

## Command pipeline

`init` (scaffold a tier) → `new` (numbered stubs) → the working loop:
`env` (recon / freshness stamp) → `check` (lint, exit 1 for CI) → `map` / `status`
(regeneration) → `hook install` (pre-commit in a target repo). Dedicated circuits
branch off: UI freezing — `freeze --scan/--file/--staged` + `visual`; staging —
`bugs emit/ingest`; harness wiring — `integrations install` + `doctor`; tasks —
`task new/show/start/close` + `board` + `file`.

## Distribution: single binary + sidecar

The CLI compiles into a **Node SEA single binary** (~88 MB, Windows-first): the
canonical integration templates are embedded as assets, so `integrations install`
works from the exe with no repository checkout, and hooks dispatch straight to the
exe without a Node invocation. The Tauri desktop app ships the same exe as a
**sidecar**: task mutations with closure gates from the UI go through the CLI
process — one implementation of the rules, not two.

## Testing

- **Pure-core units** — the bulk of the ~300+ tests; strings in, strings out.
- **Browser E2E** — real Chromium (Playwright) against a vite build of the UI with a
  `MockKernel` adapter standing in for Tauri IPC; every screen covered.
- **Visual regression** — layout snapshots + screen hashes by default, true pixel
  diff (own PNG decoder, `node:zlib`) in the opt-in pixel-perfect mode.

## Decision record (selected ADRs)

- **ADR-001** — TypeScript repo with a pure core instead of a one-file script
- **ADR-015** — Tauri v2 + Vite + Quasar, core executed in the webview
- **ADR-016** — browser E2E with Playwright and a MockKernel instead of tauri-driver
- **ADR-017** — hybrid storage: markdown prose + SQLite registries
- **ADR-018** — distribution as a Node SEA binary with the canon embedded
- **ADR-019** — machine-independent canon: path tokens substituted at install
- **ADR-020** — the SEA binary as the Tauri app's sidecar
- **ADR-021** — reminders as one pipeline over detector providers
- **ADR-022** — parallel agents: staging task journals + idempotent join

Full English translations of all 22 ADRs are being published under
[docs/decisions/](./decisions/) (in progress).
