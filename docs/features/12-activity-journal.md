# Feature 12: The activity journal — an append-only, indexed history

> [Русская версия](../ru/features/12-activity-journal.md)

> **Status:** Implemented (stages 1-4) · **Updated:** 2026-10-09
> **Essence:** every state change devst makes is appended to an append-only journal, `docs/activity.db` (SQLite, an FTS5 index): freeze set/unset, task create/close/tag/verify, links pin/mirror, integrations install, analyze, session create/close — written automatically by the CLI mutators; manual entries (`devst log add`) cover what no mutator knows — test results, notes. Search: `devst log query` for a human, the MCP `get_history` for an agent.
> **Key facts:**
> - The journal is not state: the registry is editable (`task rm`/`set`), the journal is never edited — append-only.
> - Every CLI mutator writes its own events; a manual entry is also a CLI command.
> - Search by type, date range, file and free text; the agent gets the same filters over MCP.
> - The journal protects against forgetfulness, not against a malicious agent.
> **Related:** [Feature 04](./04-task-registry.md) (the registry whose changes are journalled) · [Feature 11](./11-task-tags-and-verification.md) (the history of verifications) · [Feature 13](./13-ui-only-verification.md) (the pending verification events) · [Feature 03](./03-devst-ui-desktop-window.md) (the freeze history in the panel) · [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (the hybrid storage and the migration pattern)

## Scenarios

1. **"Who unset the ui-freeze — and what happened after?"** — `freeze --unset` appends a `freeze.unset` event `{level, files, actor, ts}`. A week later the tests go red; the author adds `devst log add tests "ui-e2e red after the freeze unset"` — and one query, `devst log query --type freeze.unset --after 2026-10-01`, shows the whole chain.
2. **"An agent reconstructs the context instead of guessing"** — `get_history {q: "freeze", file: "ui/src/App.vue"}` returns every event for the file.
3. **"The history of verifications"** — a task verification appends `task.verify {id, level, actor}` — the audit trail behind [Feature 11](./11-task-tags-and-verification.md).
4. **"The window shows the history of an object"** — the verification panel reads the journal of approvals for the task.

## What gets recorded

- **Automatic** — every CLI mutator: `freeze.set/unset`, `task.create/close/tag/verify`, `links.pin/mirror`, `integrations.install`, `analyze` (HEAD + counters), `session.create/close`.
- **Manual** — `devst log add <type> <text>` (tests, note): the things no mutator knows about.
- **The record shape:** `{id, ts (ISO-8601), actor (git user.name / "author"), type (namespace.verb), payload (JSON), refs (paths)}`; indexes over `ts`, `type`, `refs`, plus an FTS5 virtual table over the payload text.
- **The trust boundary:** the journal guards against *forgetting* (an event cannot be lost), not against a malicious agent (file access = access to everything; cryptography is a non-goal). Only the CLI mutators write — and `log add` is a CLI command too.

## Non-goals

- No protection against a malicious agent — only against forgetfulness.
- No read logging (queries and displays are not recorded) — state changes only.
- No rotation or archival in v0 (a size limit — v1, if ever needed).
- Not distributed: the journal is local; syncing between machines is out of scope.

## Versions

### v1 (stages 1-4, implemented)

- The core: a pure module (the event types, the schema, FTS) plus a thin runner (the database, append, query); journalling in freeze set/unset and task close/verify.
- The remaining mutators (task create/tag, links pin/mirror, integrations install, analyze, session) and the `devst log add` / `devst log query` commands.
- The MCP `get_history`; tags in audit.
- The UI: the journal in the verification panel.
