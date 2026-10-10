# Feature 11: Task tags and verification levels — "glanced and approved" goes on the record

> [Русская версия](../ru/features/11-task-tags-and-verification.md)

> **Status:** Implemented (stages 1–4) · **Updated:** 2026-10-10
> **Essence:** tasks carry tags (a closed vocabulary + free-form) and a verification level set at closure — five grades: deep / smoke / skim ("glanced over") / delegated / blind, plus none when unstated — each with a date and an actor ([Feature 09](./09-actors-and-roles.md)). At close, the code-intelligence tools ([Feature 10](./10-code-intelligence-clean-room.md)) compute a machine slice of the task's objects (risk / blast / health) and attach auto-tags; `devst audit` then shows "approved without looking — and here is what the tools say today".
> **Key facts:**
> - The honest motivation, the author's words: "I often don't check your work, honestly — or I look at it badly, or I don't really understand how exactly you did it." A closure must record the difference between "checked thoroughly" and "approved without looking" — today the audit trail of both looks identical, and a month later the trust-risk zones are impossible to find.
> - Five grades were the author's call (a reversal of the proposed three): deep (tests run, code read) / smoke (tests run, code not read) / skim (the result was glanced at — "сквозь пальцы") / delegated (verification was delegated — another agent or person verified and reported) / blind (without looking, trusting the agent); none is a legal level that audit highlights.
> - Only a human actor can set a verification level; an agent may only propose candidate tags. No MCP mutations of verification.
> - Auto-tags from the tools at close: `risk-high` (risk ≥ 7/10), `blast-wide` (> 20 files), `health-findings` (≥ 1 finding).
> **Related:** [Feature 04](./04-task-registry.md) (the registry and the close gate this rides on) · [Feature 09](./09-actors-and-roles.md) (the signing actor) · [Feature 10](./10-code-intelligence-clean-room.md) (the slice at close and the audit recomputation) · [ADR-010](../decisions/adr-010-detect-dont-block.md) (detect, don't block) · [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (the registry columns)

## Scenarios

1. An agent finished the work → `task close` → the CLI shows the slice ("objects: src/x.ts — risk 7/10, blast 14 files, 2 health findings") and asks for the grade: `--verified deep|smoke|skim|delegated|blind` (unstated = none — honest).
2. The author glanced at the result: `task close --verified skim` → the task carries the `skim` tag + date + actor; auto-tags were added (`risk-high` at risk ≥ 7).
3. A month later: `devst audit` → "task (skim): the risk is now 9/10, 5 health findings — approved by a glance on 2026-10-09 → re-check".
4. The board: `devst board` shows the tags; MCP `get_board` serves them to agents — an agent knows where the weak-trust zone is.
5. Reminders: blind/skim tasks with fresh tool findings raise a reminder.

## The five grades, as a trust scale

For the audit the scale reads: personally verified (deep/smoke) > glanced (skim) > without looking (blind/none); delegated is a separate category marked "someone else verified". The level is stored with a date and an actor — "approved blind @author 2026-10-09" is a queryable fact, and [Feature 09](./09-actors-and-roles.md) supplies the signature. Agents cannot set the level on themselves or on anyone's task — the CLI `--verified` flag is by definition a human gesture (a human runs the command), and there are no MCP mutations of it.

## Tags: closed vocabulary + free-form

Predefined: `vibe` (written by an agent on trust), `experimental`, `hotfix`, `reviewed`, `debt` — plus the three auto tags; free-form lowercase tags for the task-specific; the linter warns on one-off tags (used exactly once). Agent-proposed tags land as candidates only, with the source actor recorded.

## The retrospective: `devst audit`

Every skim/blind/none task × what the tools say now: a table of "approved X then, the tools say Y today", sorted by degradation, with a reminder hook for blind/skim tasks that have fresh findings. Detection, never blocking ([ADR-010](../decisions/adr-010-detect-dont-block.md)): the audit suggests, the human decides — nothing is downgraded automatically.

## Non-goals

- No blocking of closure without verification: none is a legal level, audit highlights it.
- No agent verification of tasks and no MCP verify mutations.
- No automatic downgrade of levels: the retrospective suggests, the human decides.
- No tags on ADRs/docs — registry tasks only (documents carry headers).
