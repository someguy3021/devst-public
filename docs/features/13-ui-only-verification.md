# Feature 13: Verification only through the UI — an agent cannot self-certify

> [Русская версия](../ru/features/13-ui-only-verification.md)

> **Status:** Implemented (stages 1-2; the agent path is closed by Rust IPC) · **Updated:** 2026-10-09
> **Essence:** a project mode, `devst.json → verifyMode: "ui-required"`: the CLI flag `task close --verified` does not write the level — it creates a pending request; a human confirms it in the Tauri window (a dialog with the task details and the tool slice) — only the UI path (Rust IPC) writes the level. The author's bar: "even the dumbest agent SIMPLY COULD NOT claim that the user had verified it".
> **Key facts:**
> - The default `verifyMode: "open"` — the behavior of [Feature 11](./11-task-tags-and-verification.md), unchanged.
> - The close itself is not blocked ([ADR-010](../decisions/adr-010-detect-dont-block.md)): the task is closed with verify=none; the pending request waits for a human.
> - The level is written only by the Rust `verify_approve` command (Tauri IPC) — out of a shell agent's reach.
> - A barrier against stupidity and forgetfulness — honestly, not against a malicious agent with file access.
> **Related:** [Feature 11](./11-task-tags-and-verification.md) (the hole being closed: `--verified` in the CLI is "a human gesture by definition", but technically an agent can forge it) · [Feature 12](./12-activity-journal.md) (the activity events) · [Feature 03](./03-devst-ui-desktop-window.md) (the window) · [ADR-020](../decisions/adr-020-tauri-sidecar.md) (the UI calls the CLI through the sidecar)

## Scenarios

1. `verifyMode: "ui-required"`; an agent runs `task close 5 --verified skim` → the CLI creates a pending request `{task, level, requested_by, slice}` and answers: "request created (REQ-a1b2) — waiting for confirmation in devst-ui". The task is closed, verify=none — the agent reports honestly instead of pretending.
2. The human opens the window → a pending badge → the dialog: the task details + the tool slice + the level (confirm the proposed one or change it) → Confirm.
3. The Rust `verify_approve` writes the level (and a [Feature 12](./12-activity-journal.md) event) → the pending request is removed.
4. A rejection → verify stays none + an activity `verify.rejected` event.
5. `verifyMode: "open"` (the default) — the [Feature 11](./11-task-tags-and-verification.md) behavior without changes.

## How the barrier works

- `verifyMode: "ui-required"` in the project's devst.json; in this mode the CLI's `--verified` flag creates a pending request in the registry database (a migration) and does not write the level.
- Only the Rust command `verify_approve` (Tauri IPC) writes the level — a shell agent cannot reach it; `verify_list` feeds the pending badge in the window.
- Until confirmed, the task is visible in audit as none — the agent's work is never blocked mid-flight ([ADR-010](../decisions/adr-010-detect-dont-block.md)).

## What the human sees

The dialog shows the task's title, objects and diff-stat plus the machine slice (risk / blast radius / health findings) and the level proposed by the agent; the human confirms the proposed level or changes it. A rejection = verify stays none + an activity event.

## Honest boundaries

The barrier is against stupidity and forgetfulness, not against a malicious agent with file access (the database can be edited by hand) — stated openly in the non-goals, not hidden. The Tauri window is mandatory: without it the mode makes no sense (the doctor warns).

## Non-goals

- No protection against a malicious agent with file access.
- No confirmation through a terminal or chat buttons — the Tauri window only.
- No blocking of `close` and no blocking of the agent's work ([ADR-010](../decisions/adr-010-detect-dont-block.md)).
- No remote confirmation (a phone push, etc.) — a local window.

## Versions

### Implemented (stages 1-2)

- The `verifyMode` config + the pending table (a registry database migration) + the CLI: `close --verified` in ui-required → a pending request + a message.
- The Rust `verify_approve`/`verify_list` + the UI: the pending badge, the confirmation dialog with the details and the slice.

### Ahead (stages 3-4)

- The activity events `verify.approve`/`verify.reject` ([Feature 12](./12-activity-journal.md)); audit takes pending requests into account; the skill: an agent in ui-required reports the pending request instead of waiting.
- Canon sync (skill / README / HELP / fixtures) and a ui-e2e of the dialog.
