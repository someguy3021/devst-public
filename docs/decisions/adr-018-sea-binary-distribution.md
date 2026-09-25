# ADR-018: CLI distribution — a SEA binary with the canon baked in as assets

> **Status:** Accepted · **Date:** 2026-09-12
> **Essence:** The CLI ships as a Node SEA binary (`pnpm build:sea` → `dist/sea/devst.exe`): an esbuild bundle of `src/` is injected into a copy of node.exe, and the install canon (skill/commands/hooks/targets/templates) rides along as SEA assets. `devst.exe integrations install` bakes the **path to the exe** into the hooks — working-tree edits of `src/` no longer touch the live workflow.
> **Rejected:** deno/bun compile — deferred (a foreign runtime against 300 tests; bun needs a `bun:sqlite` adapter); an npm package — a fallback; Electron — the fallback plan of [ADR-015](adr-015-tauri-ui-stack.md).
> **Related:** [ADR-012](adr-012-integrations-install-doctor.md) · [ADR-015](adr-015-tauri-ui-stack.md) · roadmap 2.2 / 2.3 · a standalone-CLI scouting note (2026-09-12) · registry task T-11

## Context

The hooks (SessionStart/PostToolUse) and ZCode call the CLI by the absolute path `…/devst/dist/cli.js` (temporarily, per [ADR-012](adr-012-integrations-install-doctor.md)). Every edit of `src/` without a rebuild means the author's live workflow runs a stale dist — and a broken dist breaks the hooks. The author's decision (2026-09-12): "let's do Node SEA, so that our work-in-progress edits don't kill my current workflow." From the scouting fork, SEA was chosen: the same runtime as in the tests, `node:sqlite` natively, zero changes to the core.

SEA constraints: CJS-only entry (our dist is ESM → an esbuild bundle); no cross-compilation (the first target is Windows, the author's machine); Node's own status is "Active development" (a rebuild on every Node update — accepted, `pnpm build:sea`).

## Options

### A. A SEA binary (chosen)

- Pros: the same Node as in the tests (run semantics pinned by 300 tests); `node:sqlite` builtin; the canon baked in as assets — the exe is self-sufficient; `--build-sea` in Node 25.5+ will simplify the build in the future.
- Cons: no cross-builds; experimental status; the exe is ~80–100 MB; dev commands (`bugs emit`) stay repo-mode only.

### B. deno compile / bun compile

- Pros: cross-compilation from Windows to all targets; bun also has `--bytecode`.
- Cons: a foreign runtime means a compatibility matrix on top of the tests; bun lacks `node:sqlite` (a `bun:sqlite` adapter would be a second sqlite implementation — against the spirit of ADR-017).

### C. An npm package / a copy of dist/

- Pros: zero build-system novelties; agents always have Node.
- Cons: doesn't deliver "a stable artifact on top of src edits" without release discipline; a stale dist is the same pain.

## Decision

**Variant A.** The `pnpm build:sea` pipeline (`scripts/build-sea.mjs`): esbuild-bundle `src/cli.ts` → `dist/sea/cli.cjs` (CJS; externals: esbuild, javascript-obfuscator, html2canvas — devDeps, unavailable inside the binary) → a sea-config with **canon assets** (`skill/`, `integrations/`, `templates/`) → blob → a copy of node.exe → postject.

The integration layer learns SEA mode:

1. `src/sea.ts` — `isSeaRun()` / `seaAssetText()`; reading the canon: SEA — assets, repo — files (a single point in `integrate-run.ts`).
2. `integrations install`/`doctor` from the exe: `cliAbs = process.execPath`, the canon comes from the assets; the hooks get the exe path.
3. The hooks (canon) get a `devst_run` dispatcher: `*.exe` — run directly, otherwise `node` — a hook works with both CLI shapes; `hook install` (pre-commit) picks the shape at install time.
4. `bugs emit` in the binary — a clear "run it from the repo" error (it needs the sources and devDeps).

## Rationale

- The author's requirement — "the workflow is not killed by work-in-progress edits" — is met by the very fact of a stable artifact: the hooks point at the exe, dist rebuilds no longer affect live sessions.
- SEA is the only option without a second sqlite implementation and without a foreign runtime; the cost (no cross-builds) is zero for the current "Windows + agents on this machine" setup.
- The canon in assets makes the exe a real installer (the author's question) — without it, installing from the exe would require a repo next to it.

## Consequences

**Positive:**

- ADR-012's "running from the repo is temporary" is fulfilled for the main scenario; `doctor` smoke-checks the hooks against the exe from now on.
- The Tauri UI sidecar (roadmap 2.3, SidecarKernel of ADR-015) gets a ready-made artifact.

**Negative / risks:**

- A Node update = a binary rebuild; no code signing — SmartScreen warns (same as for the Tauri exe); the canon inside the exe freezes until a rebuild (`integrations install` from the repo remains the canon for developing devst itself).
- Cross-platform (macOS/Linux) is separate work (a CI matrix) — out of scope of this ADR.
