# Feature 03: devst UI — Desktop Window (Tauri)

> **Status:** In progress (stages 0–6 done; 3b figma renders remain) · **Updated:** 2026-09-25
> **Essence:** A desktop Tauri window over the docs/ canon, without Chrome: a freeze panel (a file tree × statuses, drag-and-drop, live validation of globals), a check list, an env table, the "Now" panel, and closing a session with a button. The UI is a viewer/editor for the markdown canon — never a second source of truth.
> **Key facts:**
> - Stack: Quasar + Vue 3 + Vite via `@quasar/vite-plugin` (not the Quasar CLI); `@vue-dnd-kit` for drag-and-drop; vue-i18n for localization (ru is the reference, en).
> - Mutations go through a KernelAdapter: pure core transformers turn an action into a list of file writes; writing happens behind the adapter (tauri-plugin-fs with a dynamic scope on the selected repo).
> - Only browser-compatible core modules are bundled into the webview; node:* modules stay out (a WebCrypto implementation behind the adapter if hashing is ever needed).
> - A portable single exe: `tauri build --no-bundle` → one ~11 MB file with the frontend baked in; the only environment requirement is WebView2.
> - The UI's behavioral layer is covered by browser e2e with a MockKernel (vitest + Chromium), not tauri-driver.
> **Related:** [ADR-015: Tauri UI stack](../decisions/adr-015-tauri-ui-stack.md) · [ADR-016: UI e2e with MockKernel](../decisions/adr-016-ui-e2e-mockkernel-playwright.md) · [Feature 01: Baseline screenshots](./01-baseline-screenshots.md) · [Feature 02: Bug Hunt](./02-bug-hunt.md) · roadmap 2.2.1 · the open-questions list ("data storage" — first in the queue)

## 1. Essence and consumers

| Consumer | How they use it |
|---|---|
| The author (daily) | sees "Now"/check without a terminal; maintains the freeze registry by "poking" files; closes sessions with a form |
| Future public users | the same frontend on the web ("for later", roadmap 2.2.1) |

## 2. Scenarios

1. Open a repo → the window shows the "Now" panel, check errors/warnings, and the freshness of the environment's "Verified" stamp.
2. Freeze panel: the project's file tree × registry statuses; drag a file onto 🔒 — a registry row is created, globals are highlighted by live validation; the row inspector — scopes (SFC blocks/file/globals) and exceptions.
3. Closing a session: a form (essence, commits, what's left) → creates a log entry, runs map/status/check — all from the window, without a terminal.
4. (stage 3b) Next to a registry row — a figma-dump render as the reference of intent (the screenshot is the guard of fact; the principle of [Feature 01](./01-baseline-screenshots.md)).

## 3. Decision protocol

| # | Date | Question | Decision |
|---|---|---|---|
| 1 | 2026-09-10 | UI kit | Quasar + vue-dnd-kit/core; Quasar via `@quasar/vite-plugin`, NOT via the Quasar CLI |
| 2 | 2026-09-10 | The first screen (walking skeleton) | "Now" + the check list; the freeze panel second, on the finished skeleton |
| 3 | 2026-09-10 | Mutations | Option 1: the core in the webview + tauri-plugin-fs (a scope on the repo directory); the UI sits behind a KernelAdapter interface (ADR-015) |
| 4 | 2026-09-10 | Repo structure | a pnpm workspace, a ui/ folder with its own package.json; the CLI package stays zero-runtime-deps |
| 5 | 2026-09-10 | Data storage | Not decided here: the question is recorded FIRST in the open-questions list; the author will cover it in a separate session. Until then — only rebuildable derivatives (caches in gitignore) |
| 6 | 2026-09-21 | File binding in the freeze registry | One binding per file: clicking a file in the tree opens a menu of the 5 system status groups (q-menu); a status conflict → a transfer dialog (the core `detach-file`); DnD highlighting — theme primary only |
| 7 | 2026-09-25 | Localization | vue-i18n instead of a fake demo dataset: UI-chrome dictionaries (ru — the reference, en), a switch in the header (localStorage, RU the default); core/kernel-view data (the "Now" panel, check texts, titles, file names) is not translated (task T-26; EN screenshots for the public docs — task T-25, ADR-023) |

## 4. Stages

- [x] 0. Prerequisites and the skeleton (session 7): rustc 1.98 ✓; a pnpm workspace (ui/) + Vite + Vue 3 + TS + `@quasar/vite-plugin` + `@tauri-apps/cli`; tauri.conf v2; capabilities: the static fs-scope is empty, read access is granted by an `allow_root` command on the selected repo directory (a dynamic scope). Criterion met: `tauri dev` opens the window.
- [x] 1. KernelAdapter + the "Now" screen (session 7): DirectKernel (the src/ core is imported into the webview; FS/dialogs via plugins), `panelFromDocs` — a pure panel assembly over the core; the screen shows rows identical to `devst status`; +4 unit tests (tests/ui-panel.test.ts).
- [x] 2. The check list (session 8): `runCheck` over a `RepoSnapshot` (a single snapshot of the repo for all screens), "Now"/"Check" tabs with a problem-count badge, error/warn groups + stats, click a row → reveal the file in the file manager (tauri-plugin-opener, revealItemInDir). No mutations. manifestDrift is not checked in the UI (null — git dates/mtime live behind the adapter; freshness stays with CLI/CI). +7 tests (tests/ui-check.test.ts).
- [x] 3. The freeze panel (session 9): the tree × verdicts (`walk.ts` repo traversal + `buildTree`/`statusesFor`), DnD (`@vue-dnd-kit`) + a "+" button alternative, a row inspector with live token validation (`checkTokens`), a registry draft + an edit counter, the first mutation — `applyFreezeAction` (the core freeze-edit.ts, surgical cell edits) + writing via the fs plugin (`fs:allow-write-text-file` in the dynamic `allow_root` scope), `registrySkeleton` for repos without a registry. Live-checked on a demo repo: a file → "+" on a row → a record → the cell on disk is appended, the other columns intact. +19 tests (freeze-edit 12 + ui-freeze-panel 7). Lesson: the DnD provider tag is `DnDProvider` — a typo in the template isn't caught by vue-tsc and silently kills the panel. 3b (figma renders) — not done, remains.
- [x] 4. The env table (session 10): the "Environment" section of AGENTS.md (a table + notes), a "Verified" stamp with its age, manifest freshness by mtime (`fs:allow-stat` in the dynamic scope; in the UI mtime is an honest signal of a live working copy, the git gate stays in CI `env --check`), drift chips + a warning in the manifest table, an e2e witness (present in the manifests vs mentioned in AGENTS.md). Read-only. A pure core `ui/src/kernel/envView.ts` (parseEnvSection, envView, dateOfMs, daysBetween), `statMtime` in KernelAdapter. +8 tests (tests/ui-env-panel.test.ts). Live-checked: a stale stamp → a drift on 2 manifests; editing the stamp on disk → "Re-read canon" → clean.
- [x] 5. Closing a session with a button (session 12): a "Session" tab — a form (topic/essence/commits/done/left/result) + a preview; the log entry = buildStub + fillSessionLog (a new pure src/session-edit.ts), the map and the "Now" panel in one write = regenerateMap + replaceNowBlock (the equivalents of `devst map` + `devst status`). Mutations go through the kernel (MockKernel in e2e, the fs plugin in Tauri). +4 unit tests (session-edit), an e2e scenario: entry 02 → the map (session-02) → the panel.
- [x] 6. The portable exe (session 13): `tauri build --no-bundle` → a single `ui/src-tauri/target/release/devst-ui.exe` (11.2 MB, the frontend baked in — the webview on `tauri.localhost`, no Node/vite/network). Smoke-tested on the dev machine with vite off: the window, a dialog, canon reading, lint, a freeze mutation written to disk — all from the release exe. The only environment requirement is WebView2 (preinstalled on Win10/11). A smoke test on a clean machine — the author's acceptance (no second machine); the exe is unsigned — SmartScreen will warn. A config file next to the exe — as config appears (roadmap 2.2).
- [x] 7. Freeze-panel UX polish (session 29, decision #6): clicking a file — a q-menu of "blocking categories" (5 system groups, the current one marked, "unbind"); the "one binding per file" invariant — the core `explicitFileBindings`/`conflictingFiles` + a `detach-file` action, a transfer dialog on status conflicts, a conflict banner above the registry, a live warning in the inspector; drop highlighting in theme primary (drop-ready/drop-over, app.scss) instead of a gray bg-blue-1 — it lights up on hover (isDragOver), not on all rows at once (isAllowed); the drag source is dimmed. +5 unit tests, +3 e2e scenarios.

## 5. Non-goals

- An own DB/state as a source of truth (the roadmap 2.2.1 fence; the storage topic is in open-questions, first in the queue).
- Tauri e2e autotests (tauri-driver) — deferred until a stable exe; the UI's behavioral layer is covered by browser e2e with MockKernel ([ADR-016](../decisions/adr-016-ui-e2e-mockkernel-playwright.md)).
- A web version — "for later" (public users).
- Running Playwright suites from the UI (visual stays in the CLI/projects).

## 6. KernelAdapter (the UI ↔ core contract)

- Reads: `snapshot(root)` — pure core functions (status/check/freeze/env) straight in the webview, no IPC.
- Mutations: `apply(action)` — a scenario as a pure transformer "action → a list of file writes {path, text}"; writing is behind the adapter (today tauri-plugin-fs).
- Implementations: DirectKernel (stages 1–5), MockKernel (browser e2e, [ADR-016](../decisions/adr-016-ui-e2e-mockkernel-playwright.md)) → SidecarKernel (the 2.3 sidecar) — swapped without touching the screens; the choice is a factory `ui/src/kernel/index.ts` keyed on the `__TAURI_INTERNALS__` flag.
- Related refactoring: mutation scenarios move from cli.ts into the core — useful for the CLI too (one logic, a thin cli.ts).

## 7. Core constraints for the webview

- Only browser-compatible modules go into the UI bundle (candidates: util, head, sessions, env, check, map, status, brief, freeze, undoc — to be verified at stage 1).
- node:* modules (visual, png, integrations) do not enter the UI; if hashes are ever needed — a WebCrypto implementation behind the adapter.
- A new src/ hygiene rule: pure modules don't pull node:* (to be fixed in AGENTS.md at stage 1).

## 8. Tests / DoD

- Apply transformers — unit tests in tests/ (vitest), like the rest of the core.
- Live validation of globals — an extension of the freeze.ts unit tests.
- Every stage: the window is checked by hand on the devst repo (from stage 3 — also on the guinea-pig repo).
- The behavioral layer (since session 11): browser e2e — vitest + chromium against a vite build with MockKernel, 7 scenarios across all the screens (tests/ui-e2e.test.ts, [ADR-016](../decisions/adr-016-ui-e2e-mockkernel-playwright.md)).
- tauri-driver — a candidate for stage 6 (a stable exe).
