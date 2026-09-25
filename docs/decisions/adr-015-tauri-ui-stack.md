# ADR-015: Tauri UI stack — Vite + Quasar webview, KernelAdapter

> [Русская версия](../ru/decisions/adr-015-tauri-ui-stack.md)

> **Status:** Accepted · **Date:** 2026-09-10
> **Essence:** The devst Tauri v2 window: frontend is Vite + Vue 3 + Quasar via `@quasar/vite-plugin` (no Quasar CLI) plus `vue-dnd-kit/core`; the pure `src/` core runs directly in the webview; canon mutations are the core's pure apply-transformers, writes go through `tauri-plugin-fs` scoped to the open repo directory; the UI is decoupled from the core behind a KernelAdapter interface (direct import today, sidecar IPC after stage 2.3 — no screen changes).
> **Rejected:** Quasar CLI (a second build layer on top of Vite); mutations via CLI/sidecar at the start (no sidecar yet, it would require Node — breaks the "single exe"); Rust commands in the backend (rewriting the core in a second language); Electron — fallback plan only (portability).
> **Related:** [Feature 03](../features/03-devst-ui-desktop-window.md) · roadmap 2.2.1 / 2.3 · [ADR-001](adr-001-ts-repo-instead-of-script.md)

## Context

Roadmap 2.2.1 (the author's requirements): registries/check/environment are tabular, visual data — a linear console hurts them; selecting files for a freeze should be "poked", not "typed as globs". No install — a single exe on any drive; Chrome must not be opened for the tool (Tauri = the system WebView2, a separate process that leaves the Chrome session alone); the frontend is Vue ("our stack"); the UI is a view/editor over the markdown canon, not a second source of truth. The `src/` core is already pure (212 tests) — it can run anywhere, including the webview.

## Options

### A. Quasar CLI + Tauri as a wrapper (`beforeDevCommand: quasar dev`)

- Pros: the familiar `quasar dev` loop.
- Cons: two CLI layers, duplicated config (quasar.config + tauri.conf); Tauri guides are built around plain Vite.

### B. Mutations via the CLI `--json` / a sidecar

- Pros: a single mutation entry point; the UI physically cannot drift from the CLI; the sidecar is the same artifact as distribution (2.3).
- Cons: no sidecar yet; until then the UI needs an installed Node (breaks the "single exe"); every call spawns a process (expensive on Windows).

### C. Rust commands in the Tauri backend

- Pros: a strict trust boundary; git2-rs without a system git.
- Cons: the core would have to be rewritten or duplicated in Rust — two languages, 212 tests bypassed, the slowest road to an MVP.

## Decision

**Variant — Vite + the Quasar plugin, the core in the webview, KernelAdapter** (author's decisions, 2026-09-10; protocol in feature 03 §3):

1. Stack: Tauri v2 + Vite + Vue 3 + Quasar (`@quasar/vite-plugin`, NOT Quasar CLI) + `vue-dnd-kit/core` for the freeze-panel DnD.
2. The `src/` core is bundled into the frontend and called as functions; git is the system git via the shell plugin.
3. Mutations: mutation scenarios move out of `cli.ts` into the core as pure apply-transformers ("an action → a list of file writes `{path, text}`"); writes go through `tauri-plugin-fs`, with capabilities scoped to the open repo directory.
4. KernelAdapter — the UI ↔ core contract: DirectKernel (direct import) now, SidecarKernel (stage 2.3) later — screens stay unchanged.
5. Structure: a pnpm workspace with a `ui/` folder and its own package.json; the CLI package stays zero-runtime-deps. Walking skeleton: the "Now" panel screen + the check list.

## Rationale

- Only the "core in the webview + fs plugin" combination satisfies "one exe without Node", "don't touch Chrome", and core reuse at once.
- KernelAdapter insures the combination's main weakness (mutations live in the webview): the sidecar will swap the adapter implementation, not the screens — option B becomes an upgrade path, not a fork.
- The apply-transformer refactor pays off for the CLI too: one mutation logic in the core, a thinner `cli.ts`.

## Consequences

**Positive:**

- Speed: the core runs in the same process — no spawn/IPC for every call; the core's tests keep working.

**Negative / risks:**

- The Rust toolchain: rustc 1.62 (2022) on the author's machine while Tauri v2 requires ≥ 1.77 — stage 0 of feature 03 (rustup update, MSVC Build Tools, WebView2).
- The frontend gets filesystem access — cut down by a scope capability on the repo directory.
- The system git becomes an exe dependency (for exotic setups — git2 in the sidecar).
- Only browser-compatible core modules may enter the UI bundle; some "pure" modules use `node:*` (visual, png, integrations) — the UI doesn't need them, but the hygiene rule "new pure modules without `node:*`" must be written down (feature 03 §7).
