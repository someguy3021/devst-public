# devst

> [Русская версия](docs/ru/README.md)

**Documentation-first tooling for AI-assisted development** — a zero-dependency CLI
and a Tauri desktop companion that keep your repository's documentation alive when
AI agents write most of the code.

![License: CC BY 4.0](https://img.shields.io/badge/license-CC_BY_4.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.5-339933?logo=nodedotjs&logoColor=white)
![Runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-brightgreen)
![Tests](https://img.shields.io/badge/tests-384-green)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
[![docs-check](https://github.com/someguy3021/devst-public/actions/workflows/docs-check.yml/badge.svg)](https://github.com/someguy3021/devst-public/actions/workflows/docs-check.yml)

![devst desktop companion — environment recon](assets/screenshots/hero.png)

| Now panel | Check list | Close-session gate | Freeze tree |
|---|---|---|---|
| !["Now" panel](assets/screenshots/now.png) | ![Check list, all clean](assets/screenshots/check.png) | ![Session close with gates](assets/screenshots/session.png) | ![Freeze registry tree](assets/screenshots/freeze.png) |

*Screenshots show the desktop companion (English interface, dark theme) working
against a real repository.*

## Why

When an AI coding agent does most of the diffing, in-repo documentation stops being
a courtesy and becomes infrastructure:

- **The spec problem.** The agent reads `AGENTS.md` and `docs/` before every task.
  Stale docs silently steer it wrong — and it will confidently follow.
- **The trail problem.** Agents happily commit work without recording it. Knowledge
  evaporates between sessions; the next session re-derives everything from scratch.
- **The trust problem.** "The code is the docs" fails when nobody — human or model —
  can tell which of three contradictory paragraphs is the current one.

devst answers with conventions enforced by tooling: docs that are scaffolded,
linted, freshness-checked, and wired into the AI harness itself.

## What's inside

| Area | Command | What it does |
|---|---|---|
| Convention linting | `devst check` | Enforces the documentation standard — headers, map, freshness, cross-references; exits non-zero for CI and pre-commit hooks |
| Docs map & "Now" panel | `devst map` · `devst status` | Regenerates the documentation map and a five-second state panel: phase, last session, open work |
| Task registry | `devst task …` · `devst board` | SQLite-backed tasks & questions with links, timers, TTL; **closing runs a gate** that reconciles what the task declared against what the commits show |
| Environment recon | `devst env` | Scans stack manifests (package.json, Cargo.toml, pyproject, Makefile, compose, CI), drafts the Environment table; CI fails when it goes stale |
| UI freeze registry | `devst freeze` | Records frozen UI areas (including a **default-deny** mode), validates staged diffs against the registry, guards edits via hooks |
| Visual baselines | `devst visual` | Layout snapshots + screen hashes; opt-in true pixel diff with a zero-dependency PNG decoder |
| Bug Hunt | `devst bugs emit` · `ingest` | Ships an obfuscated overlay artifact to external testers; ingests their reports into pinpoint `BUG-*` cards mapped to screens and files |
| Reminders | `devst remind` | One reminder pipeline over detector providers: undocumented commits, uncommitted work, stale tasks |
| Harness integrations | `devst integrations install` · `doctor` | Installs skills, slash-commands and hooks into the AI harness from machine-independent canonical templates; `doctor` verifies the wiring |
| Linked repos | `devst links check` · `pin` · `mirror` | Tracks related devst repositories: `id://` cross-links, sha256+HEAD pins, digests of the neighbor's session logs, byte-for-byte mirrors — surfaced in reminders and a desktop tab |
| Desktop companion | `devst-ui` | Tauri v2 app: "Now" panel, check list, freeze tree with drag-and-drop, task board — the same pure core running in the webview |

## How a session flows

```
SessionStart hook ──▶ injects the "Now" panel + reminders + lint status
        │
        ▼
agent reads L0/L1 ──▶ AGENTS.md → docs map → doc headers → work
        │
        ▼
PostToolUse hook ──▶ lints every touched doc, guards frozen UI files
        │
        ▼
session close ──▶ log entry (budget-checked) → task gate (declared vs done)
        │            → devst undocumented → devst check must be green
        ▼
CI ──▶ docs conventions + environment freshness on every push
```

The philosophy underneath is **detect, don't block**: the CLI lints, the skill
teaches, hooks enforce — warnings first, humans always decide. The full methodology
is described in [docs/methodology.md](docs/methodology.md).

### CLI in action

![devst check and devst status — real CLI output](assets/screenshots/terminal.png)

## Architecture in one glance

Pure core (strings & lists, no `node:*` imports) → thin shells (FS, git, SQLite,
processes) → the same core executed in the Tauri webview → a single self-contained
binary (Node SEA) that carries its integration templates as embedded assets and
ships as the desktop app's sidecar.

```
┌──────────────────────────────────────────────────────────┐
│ Desktop UI (Tauri v2) — Vue 3 + Quasar in the webview    │
├──────────────────────────────────────────────────────────┤
│ Delivery — skill, slash-commands, hooks, scaffolding     │
├──────────────────────────────────────────────────────────┤
│ Shells — cli · registry-run · integrate-run · bugs-run   │
├──────────────────────────────────────────────────────────┤
│ Pure core — check · registry · freeze · env · map · …    │
└──────────────────────────────────────────────────────────┘
```

Details and the module map: [docs/architecture/overview.md](docs/architecture/overview.md).

## Documentation

- [The dev-standard methodology](docs/methodology.md) — the conventions devst enforces
- [Architecture overview](docs/architecture/overview.md) — layers, storage, distribution, testing
- [Features](docs/features/) — six feature deep-dives: visual baselines, Bug Hunt, the desktop window, the task registry, reminders, the practice installer
- [Decision records](docs/decisions/) — all 22 ADRs, in English
- [Русская версия](docs/ru/README.md) — полное зеркало документации (английский — источник истины)

## Engineering highlights

- **0 runtime dependencies** — Node stdlib only; strict `tsc` green.
- **384 automated tests**, including real-Chromium E2E of every desktop screen
  (Playwright against a vite build with a `MockKernel` adapter).
- **27 recorded ADRs** — every architectural decision documented, superseded ones
  preserved, never renumbered.
- **One self-contained binary** (Node SEA, ~88 MB) + desktop sidecar: one
  implementation of the rules, not two.

## Download

Prebuilt Windows binaries are attached to
[GitHub Releases](https://github.com/someguy3021/devst-public/releases):

- `devst.exe` — the CLI (self-contained, no Node required)
- `devst-ui.exe` — the desktop companion (needs only WebView2, preinstalled on
  Windows 10/11)

Both are unsigned — SmartScreen will show a warning on first run. The source code
is not published; see [Status & scope](#status--scope).

## Status & scope

devst started as a personal tooling project and this repository exists to show its
documentation, design record and engineering practice. To be explicit about what
that means:

- The **source code is not public**; binaries are provided as-is, without warranty.
- It is not seeking users or contributors: issues may go unanswered, breaking
  changes will be unannounced, support is not promised.
- It is **Windows-first** (SEA binary + Tauri); cross-platform builds are future work.

## License

Documentation and assets are licensed under
[CC BY 4.0](LICENSE) — attribution: *someguy3021 / devst*.
