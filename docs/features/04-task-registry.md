# Feature 04: Task registry — linked task objects, timers, gates, board

> [Русская версия](../ru/features/04-task-registry.md)

> **Status:** Stages 0–6 done (ADR-017; sessions 16–19); stage 7 — registry task T-5 · **Updated:** 2026-09-11
> **Essence:** the canonical task registry of devst: a task is an object with links, timers, and closure gates; the registry absorbs open-questions and TODO bookkeeping, and `devst board` is the live "what needs doing" slice. The answer to systematic doc drift: an audit of an external TTRPG project found 15 stale facts after a single week of active work.
> **Key facts:**
> - 19 protocol decisions (1–10 design + 11–19 storage battery) across 8 stages.
> - Tasks are born in a SQLite registry (`docs/registry.db`); a `docs/tasks/` folder never exists; prose stays md (ADR-017).
> - Default severity is warn (detect, don't block — ADR-010); strict is a deliberate opt-in (ADR-013).
> - Closure gates force a verdict on every linked object (edited this session / explicit refusal / tail task); tails become new tasks, so the system closes on itself.
> - `devst board` (aliases: show-tasks-board, show-tasks-board-short) reads the registry live; maps and the "Now" panel are only pointers.
> **Related:** [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (stage 0; no separate "Task tracker" ADR — decision 19) · [ADR-010](../decisions/adr-010-detect-dont-block.md) / [ADR-013](../decisions/adr-013-default-deny.md) (warn / strict opt-in) · [Feature 03](./03-devst-ui-desktop-window.md) (the board in the UI, DnD, apply-transformers) · [Feature 05](./05-reminder-system.md) (the tasks-rotten reminder provider) · [ADR-015](../decisions/adr-015-tauri-ui-stack.md) · the doc-drift audit on an external TTRPG project (2026-09-11) · roadmap 2.1, 2.2/2.3

## 1. Essence and consumers

| Consumer | How it uses it |
|---|---|
| Author | never writes state by hand in docs: the state of work is visible on `devst board` / the UI board; the gates force record-keeping on their behalf |
| AI agent | the primary writer: chat crystallization → question/tail tasks; work via `task new/close` + `board`; the gates force reconciling statuses and docs |
| Future projects | the same registry on top of the same tool; without the tool — the open-questions.md fallback (tier T1) |

## 2. Scenarios

1. Starting work: `devst board` — stale tasks first, then urgent ones; the agent (or the author in the UI) picks a task and reads its links and the state snapshot.
2. Chat crystallization: planning/analysis happens in an AI chat → afterwards the agent creates question/tail tasks with the author's wording and links to docs — "everything = tasks".
3. Working a task: `task new` records the "part of"/"objects" links and a snapshot of the linked docs' state; commits carry `Closes T-NN`.
4. Closing a task: the gate lists the linked objects and demands a verdict on each — edited this session / explicit refusal with a reason / tail; a tail itself becomes a new task linked to the same object.
5. Closing a session: the gate demands reconciled touched tasks, tails as T-NN or "no tails", and a sweep question about other docs; strict mode complains loudly.
6. A question resolved: closing a question task requires stating where the decision landed (ADR / feature protocol / architecture).

## 3. Decision protocol

All decisions — 2026-09-11, captured from the author's chat; paraphrased for this curated page.

### 1. Diagnosis: todo lists lack a system

The author wanted task tracking "like a Jira system, with statuses and so on". Decision: build the canonical tracker. Analysis: a status board alone does not catch drift either (a card goes stale just like a todo line); the core of Jira that does work is task identity (IDs), a single registry, and coupling to commits. An external tracker is rejected: truth lives outside the canon, agents without an API are blind, and the git history of the registry loses meaning.

### 2. Strictness: timers on everything, the system is the baseline

Drift accumulated over days, not months — so there are no gradual rollout "steps": the system ships whole. Age is a computed property of every object (timers, §7); staleness is data, not opinion. Default warn ([ADR-010](../decisions/adr-010-detect-dont-block.md)); strict is a deliberate opt-in (precedent: [ADR-013](../decisions/adr-013-default-deny.md)).

### 3. Storage: hybrid, the task registry in a DB from birth

Prose (architecture/features/decisions/roadmap/log bodies) stays md; structured registries move to a DB one at a time — freeze → session index → tasks. Tasks are born directly in the DB registry: no `tasks/` md folder exists (no md-header parsing stage). The ritual burden sits fully on the agent and the tool. The author's "lock pain" — DB transactions solve concurrent writes from two chats inside one branch better than file rewrites. Storage framing decided in [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md); the storage battery is decisions 11–19 below.

### 4. Capturing planning from chats: "everything = tasks"

Capture = creating question/tail tasks with the author's wording (long deliberations go into the task body or a linked research doc); "tasks from THIS source" = the task's source field plus filtering by it; "the tool will inevitably demand a 'done'" = the task- and session-closure gates (§7). The originally proposed "discussion docs" type was withdrawn — the dead end is recorded in §5 (non-goals).

### 5. A task is a carrier of links, not a list row

Object schema with "part of"/"objects" fields plus an automatic state snapshot at creation (§6); the flow "understand → record → solve → catch the changes" (§6–7). Task links catch declared drift precisely and by name; lints catch undeclared drift as a net (§7). Todo lists lost links because links lived in heads and prose; a task object stores them machine-readably.

### 6. The board command: a live slice of work

`devst board` — a live slice of the registry, skill-format output (§8). The name was confirmed in decision 15: `devst board`, in the CLI's style (check/status/map/brief); the long `show-tasks-board[-short]` forms are aliases ([ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md)).

### 7. open-questions are tasks too

kind "question"; closing a question task requires stating where the decision landed (ADR / feature protocol / architecture) — the existing "settled knowledge moves with a date" discipline becomes enforced. When the tool is present, OQ.md migrates into the registry; in the standard it remains the fallback for tier T1 / no-tool mode (§10).

### 8. Drift instruments: links + lints

Discussed with the agent, approved by the author ("looks right", 2026-09-11): declared drift is caught by task links (precisely, by name); undeclared drift by doc-rot lints ("metric-without-date", "doc-older-than-code", the sweep question in DoD) — as a net. Gate tails become tasks — the system closes on itself.

### 9. Task file log: attach the touched files

The `touch` field on a task (§6): a brief git-derived log — stat without diffs (diffs belong to git; "don't dig into the commit" = the log gives scale, the hash sits nearby). The closure gate reconciles the declaration ("objects") with the fact (touch) — a mechanical catch of side effects (audit pattern P1). Boundary with the graph: the MVP is pure git and does not wait for roadmap 2.1; the symbol level is the graph's next stage, and the file log is its first consumer (written into roadmap 2.1).

### 10. File dossier: a reverse lookup for every file

`devst file <path>` — a dossier computed on demand from sources of truth (§9): "needed for all files" is served without new entities and without annotations stored next to files. "When to tell the agent" — three integration points (§9): the search protocol, the task lifecycle, the freeze hook. Author approval: the search protocol + task lifecycle pair was called out as "just superb".

### 11. Storage battery #1: UI access to the DB — the Rust side

The registry in the Tauri UI lives on the Rust side (rusqlite + Tauri commands, IPC): no lost updates (a single writer, transactions in one process), the DB file is never held in webview memory. The cost is an addition to [ADR-015](../decisions/adr-015-tauri-ui-stack.md) ("core in the webview without IPC"): a registry IPC edge appears, append-only; prose still goes through the fs plugin; screens via KernelAdapter are unchanged. wasm/sql.js rejected (in-memory + writing the file whole — lost updates between two writers, the exact "lock pain"). The full fork lives in [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md), axis 2.

### 12. Battery #2: root ↔ doc root mapping — doc-repo config; no machine-wide project registry

Default: docs at the project repo root (no mapping needed); a doc repo carries its own config: the project path + placement. devst.json in the project is deliberately not the mechanism (in "no traces" mode it would be a forbidden trace). A machine-wide project registry is not built now — its second consumer (the meta-board) is parked among far-future ideas; revisit when a live meta-board exists. Options in [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md), axis 4.

### 13. Battery #3: migration order confirmed

freeze → session index → tasks — from the most painful (editing an md table, observed in decision 3) to the newest; tasks are born in the DB, no `tasks/` md folder. Reinforces decision 3; recorded in [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md).

### 14. Battery #4: TTL defaults and severity confirmed

30d (task open) / 7d (in progress) / 5d (metric in a doc) / 14d (doc-older-than-code) — as the start (§7); calibration against the median drift age metric (baseline ~8 days, the TTRPG audit) — stage 7. Default severity warn ([ADR-010](../decisions/adr-010-detect-dont-block.md)), strict a deliberate opt-in (precedent [ADR-013](../decisions/adr-013-default-deny.md)); the config — stage 5.

### 15. Battery #5: command name — `devst board` + aliases

`devst board` in the CLI's style (check/status/map/brief); show-tasks-board / show-tasks-board-short remain as aliases, so the original wording of decision 6 keeps working. Fork closed ([ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md)).

### 16. Battery #6: cloud-save — off by default

Pushing a doc repo to a private remote is an explicit per-project author decision (the doc-repo config); a doc repo never lands in the project remote in "no traces" mode — the [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) invariant holds.

### 17. Battery #7: devst migrates onto itself — after stages 1–2

Stage 6 runs as a separate session after stages 1–2: the migration is done by the tool (`task new/close`, `board`), not by hand; creating DB tasks before the commands exist would contradict the spirit of decision 3 ("the ritual burden sits fully on the agent and the tool").

### 18. Battery #8: no other storage pains

The axes of the storage question (parse speed, integrity, upkeep ergonomics) + locks + hosting are covered by decisions 1–10 and 11–19 ([ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md)); the rest surfaces during stage work.

### 19. One ADR-017 instead of a separate ADR-018 "Task tracker" — fork closed

Stage 0 closes a **single** [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md); the storage/hosting/migration forks live in its Options; "why this tracker" is the protocol 1–10 here (the single capture point — a duplicate in a separate ADR would be a second bookkeeping point, the P3 audit pattern, the lesson of the "discussions" dead end). The fork note is duplicated in three visible places: the ADR-017 header (Essence) · the stage-0 row (§4 below) · the session-16 log entry. A standalone tracker ADR appears only for a genuinely future fork, never retroactively.

## 4. Stages

- [x] 0. **DONE (2026-09-11, session 16): stage 0 closed by a single
      [ADR-017 "devst data storage: hybrid md+DB, migration order, hosting"](../decisions/adr-017-hybrid-storage-md-sqlite.md).
      VISIBLE FORK NOTE: no separate ADR-018 "Task tracker" is created — see
      decision 19; the reasoning lives there and in ADR-017's Options.** Standard edits also landed
      (list in §12): version 1.6 + date in its README.
- [x] 1. DONE (2026-09-11, session 17): `src/registry.ts` — the pure core (DDL schema,
      kinds/statuses/timers of §7, board sorting, cards, link validation, the gate report,
      freeze rows↔entries); `src/registry-run.ts` — the node:sqlite shell (WAL + a checkpoint
      on close, CRUD, snapshots, git helpers) + the freeze migration `freeze --to-db/--from-db`
      (md ↔ registry.db, a tombstone, the freeze_canon canon flag). 32 vitest tests.
      The registry lives at `docs/registry.db`; `-wal`/`-shm` are gitignored (ADR-017, axis 5).
- [x] 2. DONE (session 17): `task new` (links with validation, an automatic HEAD+date snapshot
      of the linked objects), `task show [--full]`, `task start`, `task close` (verdicts,
      touch derived from Closes commits, tails → tasks), `devst board` (+aliases) with a
      Closes reconciliation ("the board lagged behind the code"), `devst file <path>` —
      the path-MVP dossier (git --follow + the registry + doc mentions + the freeze verdict +
      an auto-detector for "the file is gone but still mentioned"). The "Now" panel gained
      the pointer line "Tasks: N…".
- [x] 3. DONE (session 18; the warn part in session 17): task closure — verdicts/tails +
      declaration↔fact reconciliation. Session closure: `new session` carries a gate section
      (touched tasks, tails as T-NN or "no tails", a sweep question with a grep hint over the
      touched files) + an auto line "Files: +N/−M across K files" (a diff-stat of undocumented
      commits — the log/ boundary) + a Closes reconciliation warning; the same mechanics in
      Feature 03's session-closure form (diffStats via the Rust side, task/tail fields).
      strict blocking — stage 5.
- [x] 4. DONE (session 18): the board in the Tauri window — a "Board" tab: status columns,
      cards (links, part, URGENT, waiting), TTL badges from the pure core (taskTimer),
      native DnD + a button fallback, "details". The registry in the UI goes through the
      Rust side: rusqlite (bundled) + the `registry_read` / `registry_set_status` /
      `git_diff_stats` commands (IPC; ADR-017 decision 11 — a single writer, no lost updates;
      KernelAdapter extended, MockKernel emulates IPC cloning). The live loop was verified
      via the tauri-devtools MCP: window→Rust→SQLite→CLI and back, no screenshots.
- [x] 5. DONE (2026-09-11, session 19): devst.json at the repo root — the "ttl" slice
      (openDays/workDays/questionIdleDays/tailDays) + "severity" (warn|strict; under strict,
      `task close` without verdicts on the objects is blocked). Core: parseConfig /
      taskTimer(ttl); the CLI and the in-window board read the config. The full devst.json
      (budgets/language/markers) — roadmap 2.2, its own ADRs.
- [x] 6. DONE (session 19): devst on its own registry — T-1/T-2 (questions from OQ),
      T-3/T-4 (architecture 01 TODOs), T-6/T-7 (session-18 tails); stage 7 is T-5.
      OQ.md is a tombstone-pointer (the fallback for repos without the tool — standard §9);
      the TODO section of 01-overview is retired; the "OQ frozen" lint is deliberately not
      implemented (the registry sees age).
- [ ] 7. Effect metric — registry task **T-5**: a re-audit / `rot` — the median drift age
      (baseline: ~8 days, the TTRPG audit) before/after.

## 5. Non-goals

- An external tracker / Jira service: truth outside the canon, agents without an API are blind, the git history of the registry loses meaning.
- A DB for prose: architecture/features/decisions/roadmap/log bodies stay md — diffs, merges and git archaeology (`git log -S`) are a living value of prose specifically (the audit method is built on them).
- A `docs/tasks/` folder is never created: tasks are born in the DB registry.
- A "discussions" doc type — REJECTED (dead end, 2026-09-11): it duplicated capture points (open-questions / the feature protocol / ADR options / research) and added a fourth bookkeeping point on top of an already weak wiring. The author: "You are creating more entities when we have already established that the current wiring works poorly." Chat capture = question/tail tasks + research docs.
- A meta-board of all projects and a machine-wide project registry — separate ideas, not part of this feature.
- A hard default: strict is enabled deliberately; the default is warn (ADR-010).

## 6. The task object: fields and lifecycle

| Field | Carries |
|---|---|
| id | T-NN, repo-wide (the per-doc variant 02-01 was rejected: tasks are not bound to a single doc) |
| kind | work (do) · question (decide) · tail (an auto task of drift, produced by the gates) |
| status | open → in progress → solved (date, commit) / rejected (date); a computed "stale" flag; a "waiting on: …" marker (author/event) |
| urgency | priority for board sorting |
| part | hierarchy: feature NN/stage M, architecture NN, area |
| objects | docs/… documents and src/… code paths whose truth the task changes |
| snapshot | the repo HEAD + the "Updated"/git dates of the linked docs; automatic in `task new`; a closure precondition |
| source | where the task came from: chat (date), feature, OQ migration |
| body | the formulation; long deliberations go to a linked research doc |
| touch | the files the task touched — the fact after the work: a git-derived stat (path · A/M/D · +N/−M · commit); a rebuildable derivative, diffs are not stored |

Lifecycle (the author's flow, decision 5): **understand** (what does the project need) →
**record** (links + a snapshot: "THIS IS THE STATE THEY ARE IN NOW") → **solve**
(commits `Closes T-NN`) → **close** (the gate: catch the changes of every linked entity
and record them). A task without links is allowed — marked "bare" (a soft reminder, not
a warning: links are the main value).

A card in board format:

```
T-14 · work · URGENT · stale (7d/7d)
  Session closure gate: Closes and task-status reconciliation
  part: feature 04/stage 3 · code: src/sessions.ts, cli.ts
```

A card in `task show` (--full):

```
T-12 · question · waiting on the author · age 1d
  Storage: pick the registry migration order (freeze→sessions→tasks)
  source: chat 2026-09-11
  objects: docs/open-questions.md · related: ADR-015
  snapshot: HEAD 1c19837 · open-questions.md updated 2026-09-10
```

## 7. Gates and timers

The task closure gate — a verdict for every linked object:

1. edited in this session (the doc updated, its date newer than the snapshot) — ok;
2. an explicit refusal with a reason ("only the code was touched; the doc has nothing to change because…") — ok;
3. a tail — never lost: it becomes a new task (kind tail) linked to the same object ("doc X does not reflect T-NN").

The declaration ↔ fact reconciliation (§9): touch versus the "objects" links —
undeclared files touched → "side effect" + a dossier of the surfaced file (the agent
chooses: a tail task or an explicit refusal); declared but untouched → "declaration not
confirmed" (wrong task or broken links).

strict: closure without verdicts is blocked.

The session closure gate (the CLI log entry + Feature 03's session-closure form, stage 5):

- the touched tasks are listed; for "solved" — the commit and the updated status;
- tails = T-NN or "no tails";
- an auto session file-log line: "files: +N/−M across K files" (a diff-stat of the session's commits);
- the sweep question: "which facts in other docs does my commit falsify?" + a ready hint `grep -rl <symbol> docs/` over the top symbols of the session diff;
- `Closes T-NN` in commits is reconciled against task statuses (a mismatch in either direction is a warning);
- if the session crystallized a chat — question/tail tasks were created.

Timers (defaults confirmed — decision 14, [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md);
calibration against the drift metric — stage 7):

| Object | Mark | Default | Who sees it |
|---|---|---|---|
| task "open" | creation date | 30 d → warning | board / check |
| task "in progress" | transition date | 7 d → "close it or move it back" | board / check |
| question without movement | last edit | 30 d → "decide or reject it" | board / check |
| tail without an owner | creation | 14 d | board |
| a number/metric in a doc | a (date) next to the number | 5 d | the "metric-without-date" lint |
| a doc header "Updated" | vs the git dates of the mentioned src/ paths | > 14 d | the "doc-older-than-code" lint |
| registry vs git activity | ≥ K commits with 0 task movements | — | "the board lagged behind the code" |

Division of detection labor: task links catch declared drift (precisely); lints and the
sweep question catch undeclared drift (as a net).

## 8. The board command

`devst board` (aliases: show-tasks-board, show-tasks-board-short) — a live slice of the
registry, answering "what needs doing" at the moment of the question. The map and the
"Now" panel are pointers and go stale between sessions; the board reads the registry live.

- the format is skill-like: one line tells you whether to read `task show T-NN`
  (progressive disclosure, standard §5.1);
- sorting: stale → urgency → age;
- the default is the short format; `--full` — bodies, links, snapshots, history;
- its place in the agent contract: standard §5.4 "what to do next" → `devst board`;
  the "Now" panel carries the pointer line "Tasks: N open, M stale — devst board"
  (truth lives in the registry; the panel is pure pointers).

## 9. The task file log and the file dossier: declaration ↔ fact ↔ reverse lookup

Two directions of one machine (decisions 9–10):

**Forward — touch on the task (§6):** the "objects" links are the declaration before the
work; touch is the fact after it; the closure gate reconciles them (§7). A brief log of
"which files did this task touch" — so you don't have to dig into the commit; the hash
sits nearby for details.

**Backward — the file dossier:** `devst file <path>` — "what has ever been connected to
this file?" for any file, including deleted and renamed ones (`git log --follow`). It is
computed on the fly from sources of truth; nothing is stored next to files:

| Source | What it gives | Graph? |
|---|---|---|
| git --follow | history: commits, added/deleted/renamed, +/− over its life | no |
| the task registry | task declarations ("objects", incl. open ones = planned work) + task facts (touch) | no |
| docs | path mentions (grep); mentions of the file's symbols — precisely | paths — no; symbols — yes, 2.1 |
| the ui-freeze registry | the freeze verdict (hard-locked / soft-locked / unknown) — you see the freeze before editing | no |

- a deleted file still mentioned in docs = an automatic drift detector;
- the mirror view of the same machine — "what is happening around this doc" (open tasks
  on its area, the freshness of its facts); together with the board this is nearly the
  `rot` report from the audit;
- a hard rule: the dossier is a read-only computed view; annotations are not stored next
  to files (that would be a fourth bookkeeping point — the "discussions" dead end, §5).

Three integration points — "when exactly to tell the agent" (in rising order of noise):

1. The search protocol (standard §5.4): "you know the file → `devst file`" — replacing
   manual grep archaeology; the ad-hoc "found an old file" scenario. Zero noise.
2. The task lifecycle: at creation — an automatic suggestion of "objects" links from the
   dossier (curing "bare" tasks); at closure — a companion from the reconciliation → the
   dossier of the surfaced file → a deliberate "tail or refusal" choice.
3. The freeze hook ([ADR-011](../decisions/adr-011-ui-freeze.md) /
   [ADR-013](../decisions/adr-013-default-deny.md), the enforcement point already exists):
   on a block/warning it answers with a dossier line — why it is frozen, where the registry
   record is, which task is open. Anti-pattern: do NOT show the dossier on every edit
   (noise and burned context).

Boundary with roadmap 2.1: the path level (everything above) — no graph, not blocked; the
symbol level (mentions of a file's symbols in docs, symbol renames, `devst sweep`) — after
the graph migration; the dossier is its consumer (the customer list is written into
roadmap 2.1).

## 10. The registry absorbs open-questions

- a question = "not decided, must be decided" — the same unit of work: urgency, timers,
  links. The audit showed OQ entries rot like todos (cases 6 and 7 — reality closed the
  question while the entry hung on); the instruments must be shared.
- the question-task closure gate: state where the decision landed (an ADR / a line in a
  feature protocol / an architecture edit).
- long framings and the author's verbatim hot takes — the task body or a linked research
  doc; the registry carries the formulation and the links (big prose bodies stay md).
- OQ.md: with the tool it migrates into the registry and closes as a tombstone-pointer;
  in the standard it remains the fallback for tier T1 / no-tool mode (the standard is
  tool-optional).
- the "OQ frozen" lint from the audit suggestions — deliberately not implemented: the
  registry sees the age of every entry.

## 11. Registry storage

Decided — [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (the storage
battery, decisions 11–19); a summary here.

- the task registry is in a DB from birth (the hybrid: canon prose = md, registries = DB;
  the migration order freeze → session index → tasks — decisions 3 and 13). A `tasks/`
  md folder never exists.
- links and snapshots are relational data (task_links: task → object, link kind, a state
  snapshot); in md this would be another hand-edited table — the P3 anti-pattern from the audit.
- transactions + a single write layer + optimistic concurrency solve concurrent writes from
  two chats inside one branch better than file rewrites (the author's "lock pain");
  WAL discipline: a checkpoint before commit (a hook), `-wal`/`-shm` outside git.
- the CLI — node:sqlite (zero-deps; requires Node ≥ 22.5). UI storage is decided
  (decision 11): the Rust side — rusqlite + IPC; [ADR-015](../decisions/adr-015-tauri-ui-stack.md)
  gained the "registry DB edge"; wasm/sql.js rejected (lost updates when writing the file whole).
- canon hosting — a mode model (ADR-017, axis 3): the project repo (default) / a companion
  doc repo: a sibling `../name.docs/` (default) or nested (`my-docs/`, a placement flag)
  with its own git repo; invisibility via `.git/info/exclude` or global excludes (not
  .gitignore). The "no traces" invariant: docs and AGENTS are not in the project repo's
  history or its push; AGENTS-at-root + gitignore is an opt-in, not the default. The
  root ↔ doc root mapping is decided (decision 12): the "docs at the root" convention +
  the config inside the doc repo itself; no machine-wide project registry. Cloud-save —
  a push to a private remote: off by default, per-project (decision 16).

## 12. Impact on the standard and the tool (standard: done — v1.6, 2026-09-11; tool: stages 1–5)

Edits to the dev-standard methodology (any edit — version + date in its README):

- §1: "what should exist" = the roadmap + the task registry; TODO sections in architecture
  docs are retired (their place is tasks).
- §3: with the tool — "tasks/questions live in the tracker registry"; without —
  open-questions.md (the tier T1 fallback).
- §4.1: the artifact-flow intake is the registry (an idea/question → a question/work task);
  chat crystallization is a capture ritual.
- §4.2 DoD: + "the touched tasks are reconciled"; "tails = T-NN or 'no tails'"; the sweep
  question; chat crystallization recorded.
- §5.3: the "Now" panel — a pointer line to the board; §5.4: "what to do next" →
  `devst board`; "you know the file" → `devst file <path>`.
- §9: no new md templates (the registry is not md); OPEN-QUESTIONS remains the fallback.

The tool (devst):

- scaffold: NewKind += task; the commands `task new/show/close`, `board`,
  `devst file <path>` (the dossier);
- the task touch index (git stat) in the registry core; an auto session file-log line
  ("files: +N/−M") in the session entry;
- check: the Closes reconciliation, link validation (paths/docs exist), the
  declaration ↔ fact reconciliation at task closure;
- doc-rot lints ("metric-without-date", "doc-older-than-code") — roadmap 2.3, a net laid
  over task links.

## 13. Open → resolved ([ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md), 2026-09-11)

- TTL defaults 30/7/5/14 — confirmed as the start (decision 14); calibration against the
  median drift age metric (baseline ~8 days) — stage 7.
- Command name: `devst board` + the show-tasks-board[-short] aliases (decision 15).
- Default severity at tier T2: warn; strict is the author's explicit opt-in (decision 14).
- UI storage: the Rust side — rusqlite + IPC (decision 11); wasm/sql.js rejected (lost
  updates when writing the file whole).
- No separate ADR-018 "Task tracker": stage 0 closed by a single ADR-017 (decision 19;
  the visible fork note — §4, the stage-0 row).
