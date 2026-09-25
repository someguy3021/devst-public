# ADR-016: UI E2E — MockKernel + Playwright in a browser

> [Русская версия](../ru/decisions/adr-016-ui-e2e-mockkernel-playwright.md)

> **Status:** Accepted · **Date:** 2026-09-10
> **Essence:** UI autotests run real Chromium against a Vite build with a MockKernel (an in-memory KernelAdapter); tauri-driver stays deferred until the exe is stable.
> **Rejected:** tauri-driver now (heavyweight, the UI is still migrating); component tests only (they don't cover scenarios); leaving the UI untested altogether (the DnDProvider bug is the counterexample).
> **Related:** [ADR-015](adr-015-tauri-ui-stack.md) (KernelAdapter) · [Feature 03](../features/03-devst-ui-desktop-window.md) · roadmap 2.2.1

## Context

The Tauri window screens (stages 0–4) had no autotests: pure helpers were covered by unit tests, but components and end-to-end scenarios were only checked by hand. The stage-3 regression bug (`<DndProvider>` instead of `DnDProvider`) is caught by neither vue-tsc (Quasar loosens component resolution) nor unit tests — only a behavioral run catches it. An automated behavioral layer is needed now, not after stage 6.

## Options

### A. tauri-driver (WebDriver) against the exe

- Pros: the full stack, including the Tauri shell.
- Cons: WebDriver binaries per platform; the UI is still migrating (stages 5–6) — the tests would need fixing more often than they catch regressions; the exe doesn't exist yet.

### B. Component tests (@vue/test-utils)

- Pros: cheap and fast.
- Cons: mounts components one at a time — scenarios like "open a repo → mutate → it's written" are not covered; a mock adapter is needed anyway.

### C. Playwright in a plain browser + MockKernel

- Pros: a real UI build, real scenarios; Playwright is already in devDeps (visual-e2e); the KernelAdapter contract (ADR-015) exists precisely for swapping implementations — MockKernel slots in next to DirectKernel without touching screens; no Tauri APIs needed at all.
- Cons: the Tauri shell (dialogs, plugins, window) is not covered; MockKernel rides in the bundle (small, disabled by the `__TAURI_INTERNALS__` flag).

## Decision

**Variant C.** A factory in `ui/src/kernel/index.ts`: inside the webview (`__TAURI_INTERNALS__` present) — DirectKernel; in a plain browser — MockKernel (an in-memory FS with root-relative paths, a log of reveal calls). For e2e — a hook `window.__devstMock` (setFiles / getFiles / revealCalls). Scenarios live in `tests/ui-e2e.test.ts` (vitest + Chromium): a Vite dev server on a fixed port, a fixture repo with a deterministic canon (exactly 2 lint errors, a stale env stamp), the page reopened fresh for every test.

## Rationale

- ADR-015 made the adapter the substitution point in advance; SidecarKernel (2.3) will slot into the same factory — a decision built for growth, not a one-off hack.
- E2E caught a real factory-refactor bug (a stale identifier in the `existingPaths` call — the canon was computed without existing paths) earlier than typecheck did.

## Consequences

**Positive:**

- 7 behavioral scenarios covering all screens run in `pnpm test`; the mutating freeze-registry scenario is verified against the mock FS contents.
- The adapter-swap precedent is a straight road to SidecarKernel (2.3).

**Negative / risks:**

- The Tauri shell is not covered — smoke checks stay manual until stage 6 (tauri-driver after that, if ever needed).
- Selectors are tied to Quasar texts/classes — copy edits can break tests (accepted: that copy is the user-facing contract).
