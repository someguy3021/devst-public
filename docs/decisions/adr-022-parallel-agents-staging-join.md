# ADR-022: Parallel agents — staging task registries and join

> [Русская версия](../ru/decisions/adr-022-parallel-agents-staging-join.md)

> **Status:** Accepted · **Date:** 2026-09-25
> **Essence:** Parallel agents write tasks into staging journals `docs/registry-inbox/<session>--<agent>.db` (git-tracked), which are merged into canon by an idempotent join; the task number is allocated from canon at `task new`; staging holds tasks only. The `registry.db` canon is unchanged — an extension of ADR-017 axis 5 (the git level of parallelism it did not cover).
> **Rejected:** a commit queue (the author's pain point verbatim); local IDs renumbered at join (breaks "Closes T-NN"/touch/gate); an md/ndjson journal; SQLite locking as the complete solution.
> **Related:** [ADR-017](adr-017-hybrid-storage-md-sqlite.md) (axis 5) · [Feature 04](../features/04-task-registry.md) (Closes gate §7) · Zen-Shell board design (from a parking-lot repo for far-future ideas) · dev-standard methodology v1.6

## Context

ADR-017 (axis 5) solved two chats writing to **one registry file** simultaneously: transactions, a single write layer, optimistic concurrency. The git level remained a hole:

- **one working copy** — both agents' edits mix in a single `registry.db` and a single working tree; nothing can be committed until both finish;
- **worktrees** — each agent has its own copy of canon; merging branches that both touched a binary file is impossible in principle.

Manifestation (author, 2026-09-25, translated): "you can't commit until both of them finish, otherwise you can't later tell what came from whom."

Author's proposal (2026-09-25, translated): "I see the solution as a temporary, per-task small db (there can be many; essentially temp files) that we then join into the main task registry. Maybe something from ZenShell could be reused there?"

Zen-Shell (a conserved board design, from a parking-lot repo for far-future ideas): no direct join mechanism exists (cards are md sections, not a DB); two practices are reused — "an agent writes only to the inbox" (board/inbox.md) and "every move = a commit" (git as free attribution).

Compatibility constraint: `T-NN` ids are end-to-end and everything hangs on them (feature 04 §7) — `Closes T-NN` in code commits, touch collected by grepping history (`collectTouchForTask`), the session gate cross-checks Closes against registry statuses.

## Options

### Axis 1 — how to separate parallel agents

**A. Commit queue (commit after both finish).** Pros: zero code. Cons: attribution is lost (the author's pain, quoted above); parallelism is fake. Verdict: deadlock.

**B. Local IDs in staging + renumbering at join.** Pros: fully offline; canon not needed until join. Cons: an agent doesn't know the final id at code-commit time → "Closes T-NN" in commit messages, touch-by-grep, and the session gate would all have to be retrained onto staging journals — an expensive rework of a working chain. Verdict: a fallback for multi-machine setups (out of scope), not the default.

**C. Staging journals + join (chosen).** Each agent writes only to its own file; canon is mutated by a single writer — the join operation. Pros: attribution comes free from git (one file = one session of one agent, committed by the same agent); no binary conflicts (files are distinct); the "Closes" chain is untouched (see axis 3). Cons: a new layer (inbox/join) in `registry-run`; join needs conflict reporting.

### Axis 2 — staging format

**A. Schema copy (the same tasks tables).** Pros: SQL reuse. Cons: join merges row snapshots — field-level conflict resolution, loss of operation history.

**B. Append-only operation journal (chosen).** Staging stores mutations (`task new/set/link/status`); join is a deterministic replay, idempotent per (agent, session, seq). Pros: re-joining is safe; the operation history doubles as the session's dossier. Cons: the journal schema is a new entity (alongside the feature 04 tasks).

**C. md/ndjson journal.** Pros: text in diffs. Cons: a second storage format on top of the schema plus hand-rolled replay validation; a staging DB reuses the `registry.ts` core via the same node:sqlite — less code. Verdict: rejected.

### Axis 3 — task numbering

**A. Allocate the number from the canon DB at `task new` (chosen).** A short atomic transaction; on one machine all agents share one canon file — the SQLite lock holds this. Join pours in content under the already-final id: "Closes T-NN", touch, and the gate work as today. Cons: a staging agent must know the canon path (worktree ≠ canon — see Consequences).

**B. Number at join (local IDs)** — see axis 1-B; rejected as the default.

## Decision

**Staging journals + idempotent join; canon unchanged.** The author's battery of answers across the three forks (2026-09-25, translated):

1. The "staging + join" scheme is accepted (answer: "1 — yes, fine"): staging is `docs/registry-inbox/<session>--<agent>.db`, git-tracked; WAL discipline as in ADR-017 axis 5 (checkpoint before commit; `-wal`/`-shm` outside git). Join is an explicit command, an idempotent replay; the conflict "both sides edited one task" is resolved by `updated_at` (latest-wins) plus a warning in `board` — not a silent upsert. A joined file is deleted by the join commit.
2. The task number is allocated from the canon DB at `task new` (answer: "1 — yes, fine") — "Closes T-NN"/touch/gate survive without rework.
3. The staging format is an append-only operation journal, not a schema copy (answer: "2 — yes, good").
4. Staging holds tasks only; freeze (canon `freeze_canon='db'`, rare operations) goes straight to canon (answer: "3 — agreed, tasks only").
5. From Zen-Shell two practices are reused — "an agent writes only to the inbox" and "every move = a commit"; the join mechanism is absent there — not a source.

Flow: code goes through branches/worktrees, the registry through each agent's inbox files, canon through a queue of joins (the order relative to merging doesn't matter). Before a join, `board` shows items "pending in inbox" — visibility into another agent's parallel work, i.e. "tell what came from whom" even before the commit.

## Rationale

- The canon and the rules of feature 04 are unchanged: this extends ADR-017 axis 5, it is not a revision; format/canon changes require an ADR (the roadmap 2.2.1 frame) — honored.
- Attribution ("what and from whom") is solved by git for free: one staging file = one session of one agent; the join commit references the session.
- The `Closes T-NN` → touch → session-gate chain survives intact (axis 3-A).
- Zero-deps preserved: staging is the same node:sqlite, stdlib only.

## Consequences

**Positive:**

- Two agents work in parallel without blocking commits (code — branches; registry — inbox files; canon — a join queue).
- Another session's unjoined work is visible on the board before any commit.
- A session's operation history lives in its staging file (a dossier for incident analysis).

**Negative / risks:**

- ID allocation needs access to the canon DB from a worktree: in-repo — canon lives in the main working copy (a "canonical registry path" mechanism is needed); for a standalone docs repo there is a single canon — fine. Multi-machine is out of scope: there the fallback is axis 1-B (local IDs + renumbering) — a separate fork if the case ever appears.
- A new inbox/join layer in `registry-run` (journal schema, replay, conflict reporting) — implementation as a separate task; until then agents work the old way.
- A task's touch fills in only after the agent's branch merges (Closes commits go to its branch) — between join and merge the gate may show "declaration unconfirmed"; a warning, not a blocker.
