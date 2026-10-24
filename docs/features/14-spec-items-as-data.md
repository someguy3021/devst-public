# Feature 14: spec items as data — the human ratifies the spec, the agent cannot self-certify it

> [Русская версия](../ru/features/14-spec-items-as-data.md)

> **Status:** Implemented (stages 1–6: data model, CLI, the inbox in the desktop app, MCP access, reminders; per-item human confirmation in progress) · **Updated:** 2026-10-24
> **Essence:** a feature's requirements live as machine-readable items in a `## Spec` section of the feature doc: an ID (`R1..RN`, never reused), a verbatim source quote (a paraphrase is explicitly marked "inferred by the agent") and tag-links to tasks. The agent does the work and marks items "done" — with mandatory proof; **confirming an item is a human gesture**, through the same verification inbox as tasks ([Feature 11](./11-task-tags-and-verification.md), [Feature 13](./13-ui-only-verification.md)). Three human checkpoints: verify the spec before the first work task → confirm items along the way → close/reopen.
> **Key facts:**
> - Born from a real failure (told in [Feature 10](./10-code-intelligence-clean-room.md)): vague requirements → the agent wrote the spec "minimal" and marked it done itself → "20% of the reference and the vision, although everything runs".
> - Two statuses per item: `agent: done` (set by the executor, proof required) and `human: <level> @actor date` (set only by a human) — confirming "in advance", before any work, is allowed and shown separately.
> - `devst feature close` refuses while any item is outside {verified, rejected, non-goal}; must-priority debts block the close, should/could become follow-up tasks.
> - Deleting items is forbidden; a meaning change after ratification sends the item back through the candidate cycle. The strictness is mandatory for all new features; older ones go through a retrospective.
> **Related:** [Feature 11](./11-task-tags-and-verification.md) (the trust levels reused verbatim) · [Feature 13](./13-ui-only-verification.md) (ui-required: the level is written only by the desktop app) · [Feature 12](./12-activity-journal.md) (the status history) · [Feature 05](./05-reminder-system.md) (the "feature stale with unconfirmed items" reminder) · [ADR-010](../decisions/adr-010-detect-dont-block.md) (soft blocking) · [ADR-020](../decisions/adr-020-tauri-sidecar.md) (UI mutations through the sidecar)

## Scenarios

1. **Spec verification (checkpoint 1).** The author says "I want it like X" → the agent splits the source into items R1..RN with verbatim quotes or "inferred by the agent" marks → a pending request lands in the inbox → the author edits the wording (usually through the agent, by questionnaire) and signs "verified". Only then do the feature's work tasks open — softly: a reminder and a skill rule, not a hard ban.
2. **Along the way (checkpoint 2).** The agent closed the tasks of an item and marked it "done" with proof (a commit / a test / a doc) → the item lands in the inbox (batches allowed) → the human opens it, sees the source quote and the tooling slice, picks a trust level → "Verified", or "Not what was asked" (back to work, the agent's mark resets, the event is recorded).
3. **Close (checkpoint 3).** `devst feature close 14` — refused while any item is outside {verified, rejected, non-goal}; unconfirmed must items block, should/could are offered as follow-up tasks linked to their items.
4. **Reopen.** `devst feature reopen 14` with a reason → the fact itself is recorded; verified items keep their status, rejected ones do not resurrect (a return is only possible as a new candidate item), new or changed items go through the cycle again.
5. **An agent's session start.** The session brief and the MCP tool `get_feature_items` show, per feature, which items are verified, which await confirmation and which were rejected — the agent works exactly that slice and never re-does confirmed work.

## The data model

- The truth is hybrid, as everywhere in devst: wording and source live in the feature doc (markdown, reviewed in git); statuses and links live in the registry database — an additive migration with a many-to-many `item ↔ task` table ("like tags", late fixes included).
- Priorities per item: must / should / could; must blocks the close.
- `verifyMode` works exactly as for tasks: `open` writes the level directly, the default `ui-required` only creates a pending request that the desktop app resolves ([Feature 13](./13-ui-only-verification.md)).
- A rejected item ("not what was asked") returns to work with a comment and a journal event; the feature can be reopened with the fact on record.

## What the human sees

The inbox shows spec items with a "feature spec item" badge next to task requests; the confirmation dialog shows the wording, the verbatim source, the linked tasks, the agent's proofs and the tooling slice; the human picks one of the same trust levels (deep / smoke / skim / delegated / blind / manual — [Feature 11](./11-task-tags-and-verification.md)). Per-feature progress — verified X/N, confirmed Y/M — is visible in the board and the desktop app. A reminder fires when a feature in work sits with unconfirmed items for more than N days (default 3). Format problems of the section (no spec section, a must item without a source) are warnings in `devst check`, never errors.

## Non-goals

- No linting of the wording's content — only the structure of the section.
- Not applied to single tasks outside features.
- No separate trust scale for items — the project's one scale is reused.
- No deleting items (only "rejected" or "moved to non-goals", with a reason) and no backdating of status history.
- No hard blocking of work before verification ([ADR-010](../decisions/adr-010-detect-dont-block.md)).
