# ADR-017: devst data storage — hybrid md + SQLite, migration order, hosting

> [Русская версия](../ru/decisions/adr-017-hybrid-storage-md-sqlite.md)

> **Status:** Accepted · **Date:** 2026-09-11
> **Essence:** The canon becomes a hybrid: prose stays markdown in git; registries move to SQLite (`node:sqlite`, zero-deps) one at a time — freeze → sessions index → tasks; tasks are born in the DB; the UI reaches the registry through the Rust side (rusqlite + IPC, an addendum to [ADR-015](adr-015-tauri-ui-stack.md)). Hosting is mode-based: the project repo by default, a companion doc repo for no-trace repos (docs and AGENTS never appear in the project repo's git history). **Stage 0 of feature 04 is closed by this ADR — no separate task-tracker ADR is opened.**
> **Rejected:** a DB for the prose too (would revise git archaeology — a non-goal of feature 04 §5); wasm/sql.js (lost updates); `devst.json` as the only mapping (a trace in no-trace mode); a machine-wide project registry for now; an external tracker.
> **Related:** [Feature 04](../features/04-task-registry.md) (protocol #1–19) · [ADR-015](adr-015-tauri-ui-stack.md) · [ADR-010](adr-010-detect-dont-block.md) / [ADR-013](adr-013-default-deny.md) · a doc-drift audit of a TTRPG side project (2026-09-11) · dev-standard v1.6

## Context

A ⭐-question from the open-questions list (the author, 2026-09-10, session 6): improving how devst stores and works with its data. The axes: parsing speed on large repos · integrity (drift between copies) · editing convenience (the freeze registry as a table). Proof of urgency — a doc-drift audit of a TTRPG side project: 15 stale facts within one week of active work (median age ≈ 8 days), patterns P1–P4. The design answer already existed — [feature 04](../features/04-task-registry.md) (protocol #1–10); starting its stages only needed the storage decision closed: engine, UI access, migration order, canon hosting (disclosed by the author 2026-09-11), mapping, WAL, parameters.

The author's pains (feature 04 protocol #3): locks — "the main pain was locks; there's a UI now, we'll check it in real use" — and hand-editing ("I haven't edited the docs by hand at all so far"): parallel writes from two chat sessions plus manual editing of md tables.

The frame from the earlier scoping (roadmap 2.2.1 / ADR-015): "the markdown canon is the single source of truth; UI caches are rebuildable derivatives; changing the format of part of the canon or introducing a DB — only via an ADR." This ADR is exactly such a change of frame: the source of truth becomes two-part (prose = md, registries = DB).

## Options

### Axis 1 — where structured registries live (freeze, sessions index, tasks)

**A. Status quo: md tables/lists in the docs.**

- Pros: nothing to build; readable without the tool.
- Cons: editing an md table is painful (the author's observation, feature 04 decision #3); audit pattern P3 — the same fact tracked three times (open question + TODO + roadmap checkbox); file-level replacement = locks with two chat sessions; parsing md task headers.
- Verdict: the deadlock behind the whole effort (the audit).

**B. A DB as the source of the entire canon (prose included).**

- Pros: one format, fast queries.
- Cons: revises the main value of md — portability, agent readability without the tool, git archaeology (`git log -S`, diffs, merges of prose); the audit method is built on it.
- Verdict: rejected (a non-goal of feature 04 §5).

**C. Hybrid: prose = md, registries = SQLite (chosen).** Engine for the CLI — `node:sqlite`:

- Pros: zero-deps (the project invariant — stdlib, not dependencies); Node on the machine is v24.14.1 (requirement ≥ 22.5 met; `engines` in package.json is currently `>=18` — raise at stage 1); transactions, relations, indexes; age becomes a computed property (feature 04 §7 timers).
- Cons: a binary file in git — diffs unreadable (registry history = state snapshots; causality lives in `Closes T-NN` and the log/); the registry CLI features need Node ≥ 22.5 (without the tool the md fallback keeps working).

### Axis 2 — UI access to the DB (stage 4, the board in the Tauri window)

**A. wasm/sql.js in the webview (in-memory + whole-file writes through the fs plugin).**

- Pros: the ADR-015 setup untouched (core in the webview, no IPC).
- Cons: lost updates with two writers (a CLI chat in parallel with the UI) — exactly the lock pain the DB move is for; the whole file rewritten on every mutation; transactions cannot cross the webview boundary.

**B. The Rust side: rusqlite in the Tauri backend + IPC commands (chosen).**

- Pros: no lost updates — a single writer (the backend process), WAL and transactions in one process; the DB file not held in webview memory.
- Cons: amends the ADR-015 setup ("the core in the webview without IPC") — an IPC edge appears for the registry; the Rust side grows.
- Mitigation: KernelAdapter (feature 03) absorbs the change of source — screens don't know where data comes from; the 2.3 sidecar fork leads to the same boundary anyway.

### Axis 3 — canon hosting

The author's disclosure (2026-09-11): "not every repo allows keeping docs next to the code — there are repos that forbid leaving traces (no writes into the repo at all, .gitignore included)."

**A. The project repo only (the status quo of dev-standard §3).**

- Pros: docs versioned with the code; DoD/gates/undocumented checks work in the same repo.
- Cons: inapplicable to no-trace repos.

**B. Always an external doc repo.**

- Pros: one mechanism for every case.
- Cons: complicates the default; for ordinary repos, living next to the code is real value.

**C. A mode-based model (chosen).**

- Default — the project repo.
- "No traces" — a companion doc repo: a sibling `../name.docs/` (default) or nested `project/my-docs/` (a placement flag); its own git repo: docs/ (canon prose) + registry.db (the hybrid's registries) + config. **Mode invariant: docs and AGENTS are invisible anywhere in the project repo's git history and are never pushed to its remote.**
- Invisibility without touching the project: `.git/info/exclude` (service-local, never committed) or a global `core.excludesFile` — NOT `.gitignore` (editing the project = a trace).
- Nested-placement pitfalls: an explicit `git add` creates a gitlink (fixed with `rm --cached`; the doctor must catch it); `git clean` removes the nested `.git` only with `-ff`; blank-copy snapshots of the working tree (archives, docker context, artifacts) and scanners notice a nested doc repo more easily — hence the sibling is the default.
- AGENTS modes: (a) "no traces" (the default for flagged repos) — AGENTS lives in the doc repo; the agent entry point is the skill/mapping; (b) "outside history" (not a default, opt-in) — AGENTS.md physically in the root "as usual" + a .gitignore line for typical agents that only look for AGENTS in the root (the .gitignore line here is an accepted trace; it too can be hidden via per-project info/exclude).
- Cloud save: pushing the doc repo to the author's own private remote (backup, multi-machine) — off by default, enabled per project (decision #6 below); in "no traces" mode it never reaches the project remote.
- Boundary: if even local notes about the code are forbidden — the standard does not apply to that repo; we do not design policy workarounds.

### Axis 4 — mapping project root ↔ doc root

**A. `devst.json` in the project (the roadmap 2.2 plan).**

- Pros: config next to the project; natural for the default mode.
- Cons: in no-trace mode a file in the project is a forbidden trace; only works as a default-mode variant — so not a single mechanism.

**B. A machine-wide project registry (global, outside repos).**

- Pros: one mechanism for all modes; prepares a meta-board.
- Cons: global state and a new entity ahead of a second consumer (the meta-board is parked in a parking-lot repo for far-future ideas; a non-goal of feature 04 §5).

**C. Convention + doc-repo config (chosen):** the default is docs in the project repo root (no mapping needed); the doc repo itself carries the config (project path, placement). No machine-wide project registry now — revisit when a meta-board is live.

### Axis 5 — parallel writes

- File-level replacement of md registries: locks and drift between two chat sessions — the registry deadlock (the author's pain, feature 04 protocol #3).
- Chosen: DB transactions + a single write layer (feature 03 apply-transformers; after stage 4 both the CLI and the UI write through the same layer — the UI via the Rust-side IPC) + record-level optimistic concurrency. WAL discipline when git tracks the DB file: checkpoint before commit (a hook), `-wal`/`-shm` outside git (.gitignore / the doc repo's excludes) — otherwise a commit goes out without the fresh transactions.

## Decision

**Variant — hybrid md + SQLite, the UI through the Rust side, mode-based hosting.** The author's answers (storage battery, 2026-09-11 — feature 04 protocol #11–19):

1. Hybrid: canon prose stays md in git; registries move to SQLite one at a time — freeze → sessions index → tasks (order confirmed, #13). Engine — `node:sqlite`, Node ≥ 22.5 (v24.14.1 — fine; raise `engines` at stage 1). Tasks are born in the DB. The registry is the source of truth for registry data, md for prose; the map/panel are pointers, the board reads the registry live.
2. UI (stage 4): the registry through the Rust side — rusqlite + Tauri commands (#11); ADR-015 gains the "DB edge for the registry" (append-only), prose keeps going through the fs plugin; screens stay unchanged behind KernelAdapter.
3. Hosting: the mode-based model (axis 3-C) — the project repo by default; "no traces" — a companion doc repo with the invisibility invariant; the AGENTS modes; cloud save off by default, per project (#16). dev-standard edits (principle #3, §3) — v1.6.
4. Mapping: the "docs in the root" convention + config in the doc repo; no machine-wide project registry (#12).
5. Parallel writes: transactions + a single write layer + optimistic concurrency; WAL discipline (axis 5).
6. Tracker parameters: TTL defaults 30/7/5/14 to start, calibrated against the median drift-age metric (baseline ≈ 8 days); default severity warn, strict is a deliberate opt-in (#14); the command name `devst board`, aliases show-tasks-board / show-tasks-board-short (#15); no other storage pains (#18).
7. Migrating devst onto itself (feature 04 stage 6) — a separate session after stages 1–2 (`task new/close` and `board` are needed: the migration is performed by the tool, not by hand) (#17).
8. **A visible fork marker:** a separate task-tracker ADR is deliberately NOT opened — stage 0 of feature 04 closes entirely with this ADR: the storage/hosting/migration forks are here, in Options; "why this tracker" is already captured by protocol #1–10 in feature 04 (capture is the single place of record — otherwise duplication = audit pattern P3). The author's answer (#19): "Do your Recommended, but clearly mark this fork somewhere in a VISIBLE PLACE in the doc." The marker is duplicated in three visible places: this ADR's header (Essence) · feature 04 §4 (the stage-0 line) · the session-16 log entry. A standalone tracker ADR — only as a NEW ADR after an actual future fork.

## Rationale

- The hybrid keeps the value of both forms: git archaeology and prose readability + registry transactions, relations, and timers (axis 1-C against A's deadlock and B's revision).
- Axis 2's criterion is the lock pain: the wasm variant reproduces it at file level; the Rust side eliminates it with a single writer; the cost (an IPC edge) is insured by KernelAdapter.
- The no-traces invariant outranks any convenience: invisibility in project history and pushes is not compromised even by a .gitignore line without the author's explicit opt-in.
- Zero-deps preserved: `node:sqlite` is Node stdlib, not a dependency.

## Consequences

**Positive:**

- Registries gain transactions/relations/indexes; parallel writes from two chat sessions are solved; the md freeze tables and manual triple bookkeeping go away as migration proceeds (freeze → sessions → tasks).
- No-trace repos are covered by the standard without compromising the invariant.
- Questions/tasks with timers and relations catch drift by name (feature 04 §7–9).

**Negative / risks:**

- registry.db in git — binary snapshots; `git log -S` over the registry doesn't work — causality only via `Closes T-NN` and the log/ (accepted deliberately).
- Node ≥ 22.5 for the registry CLI features; projects on older Node stay on the md fallback.
- ADR-015 gains an IPC edge: prose and registry take different write paths — the rule "canon mutations through apply-transformers" must cover both.
- The doc repo is a second git clone: branch/remote sync is on the author; nested mode — the gitlink/clean-ff pitfalls, the doctor is obliged to catch them.
- WAL discipline requires a hook checkpoint: without it a commit carries the DB without the fresh transactions (a silent loss of the tail).
