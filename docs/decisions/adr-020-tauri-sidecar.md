# ADR-020: devst sidecar in the Tauri UI — task mutations from the window via the CLI

> [Русская версия](../ru/decisions/adr-020-tauri-sidecar.md)

> **Status:** Accepted · **Date:** 2026-09-12
> **Essence:** The Tauri window ships the SEA binary with itself (`externalBin: binaries/devst`): the board gains "+ task" and "✓ closing gate" actions — mutations are executed by the CLI sidecar (`task new` / `task close`, cwd = the open repo), and closing gates are not duplicated in the window. SidecarKernel is a targeted extension of `KernelAdapter` (`taskNew`/`taskClose`), not a full replacement of DirectKernel.
> **Rejected:** a full SidecarKernel replacement (webview-kernel reads already work — ADR-015); gates on the Rust side (a second implementation bypassing 319 tests); wasm/sql.js (ADR-017 rev. 11).
> **Related:** [ADR-015](adr-015-tauri-ui-stack.md) · [ADR-017](adr-017-hybrid-storage-md-sqlite.md) (rev. 11) · [ADR-018](adr-018-sea-binary-distribution.md) · T-12 · roadmap 2.3

## Context

The board in the window could only change task status via Rust/rusqlite; creating and closing tasks was CLI-only. The closing gates (verdicts on objects, "declaration ↔ fact" reconciliation, Closes verification) live in the CLI kernel with tests — porting them to Rust would mean a second implementation. After ADR-018 there is a self-contained exe, so the objection "a sidecar requires Node" (option B in ADR-015) is gone.

## Options

### A. Sidecar for task mutations, everything else as is (chosen)

- Pros: one set of gates, in the CLI (the existing test registry now covers the window too); the window stays a "viewer/editor of canon"; the build is two files (UI exe + CLI exe side by side).
- Cons: a process spawn per mutation (~50–150 ms — acceptable for a button); two SQLite writers for the registry (see Decision, item 2).

### B. Full SidecarKernel (all methods via the CLI)

- Pros: one channel, maximum uniformity.
- Cons: read/lint/freeze in the webview kernel already work without IPC; every call becomes a process; rewriting DirectKernel for no gain. Reserved for a hypothetical future where the webview kernel drifts from the CLI.

### C. Gates on the Rust side

- Pros: one process, one writer.
- Cons: a second implementation of the domain, bypassing 319 tests; two languages for one piece of logic — directly against ADR-015.

## Decision

1. **Sidecar**: `externalBin: ["binaries/devst"]` + the shell plugin (`shell:allow-execute`, restricted to this sidecar); `pnpm ui:build` = `build:sea` → `scripts/sidecar-copy.mjs` (triple from rustc) → `tauri build --no-bundle`. The deliverable is a folder with two exes.
2. **Two registry writers, both honest**: fast status operations of the board (DnD, move buttons) stay in Rust/rusqlite (ADR-017 rev. 11); `task new`/`close` go through the sidecar (node:sqlite). Revision of rev. 11: its "one writer" motive targeted the wasm scheme of holding the whole file in memory (lost updates); two full SQLite writers with transactions and WAL do not produce lost updates. Tasks with gates go through the CLI only; candidates for moving to the sidecar later: status operations (if they grow gates of their own).
3. **KernelAdapter**: `taskNew(TaskNewInput)` / `taskClose(id, TaskCloseInput)` → `TaskOpResult { ok, output }`; DirectKernel spawns the sidecar (cwd = the repo), MockKernel performs in-memory mutations of the fixture plus a call log (for e2e).

## Rationale

- The T-12 goal of "two exes as a single unit" is met with minimal new code: UI dialogs (~60 lines) + a spawn shell (~30) — all domain logic already lives in the tested CLI.
- ADR-015 option B ("mutations via the CLI") is applied where it has real value — the gates — without its downsides (Node is no longer required).

## Consequences

**Positive:**

- The window is a full workstation for tasks: create, manage, close with a gate.
- One source of domain rules (the CLI) for both the agent and the window.

**Negative / risks:**

- The distribution got heavier: a ~92 MB sidecar lives next to the UI exe.
- Two registry writers — WAL discipline must be watched (checkpoint before commit is the CLI hook's job; the Rust side writes in short transactions).
- A spawn per mutation — Windows Defender may add latency on cold starts.
