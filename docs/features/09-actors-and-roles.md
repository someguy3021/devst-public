# Feature 09: Actors and roles — who decided is recorded on every entity

> [Русская версия](../ru/features/09-actors-and-roles.md)

> **Status:** Design (not yet implemented) · **Updated:** 2026-10-09
> **Essence:** every canon entity carries "who and in which role" — the signer of an ADR, the author and assignee of a task, the designer behind a ui-freeze pin, the source actor of a requirement, the reporter of a bug card. The team roster and roles live in `docs/team.md` (the solo case degenerates gracefully: one actor, stamped automatically). Agents get addressed escalations: not "ask the author" but "pinned by @designer — escalate to the designer".
> **Key facts:**
> - Roles are sources of authority for agents, not an access-control mechanism: enforcement stays with the freeze gates and the registry.
> - Agents are actors too (the "agent" role): a machine's entry is always a candidate or a fact-input until a human signs it — the machine proposes, the human decides.
> - Solo mode pays zero overhead: a single default actor from devst.json is stamped automatically.
> - For a team this becomes the audit trail ("who decided what, and when"), onboarding ("design questions — ask X") and safe departures (a leaving member's decisions light up for review).
> **Related:** [ADR-013](../decisions/adr-013-default-deny.md) (default-deny → addressed escalations) · [ADR-014](../decisions/adr-014-req-reconcile.md) (requirement sources) · [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (the registry columns migration) · [ADR-022](../decisions/adr-022-parallel-agents-staging-join.md) (parallel agents as distinct actors) · [Feature 02](./02-bug-hunt.md) (the bug-card reporter seed) · [Feature 05](./05-reminder-system.md) (target actors for reminders) · [Feature 08](./08-mcp-server.md) (MCP mutations with `actor=@id`)

## Scenarios (intended behavior)

1. An agent edits a file under a ui-freeze pin → the guard answers: "pinned by @designer (Name, 2026-10-02) — escalate to the designer, not to the repo owner".
2. A requirement R-12 in requirements.md carries "source: @designer"; a req-check verdict is signed by whoever ran it (agent or human, with the role).
3. An agent proposes a refactor conflicting with an ADR → the ADR carries "decided by: @author" → the agent escalates instead of silently rewriting.
4. A tester files a bug card → the card carries the reporter @qa → the agent's answer says "fixed — cross-check with @qa".
5. A designer leaves the project → team.md closes their activity period → all pins and decisions by @designer light up needs_review (staleness per actor).
6. Two actors pinned contradicting things (the designer says "this way", the tester says "that way") → no auto-resolution; a question task naming both.

## The design in three moves

Why this is an extension of the concept rather than a feature island: the standard's invariant "decisions are captured verbatim, numbered" already implies a signer — the feature generalizes it from "author = the only one" to "an actor + a role from the team roster".

### The team roster: `docs/team.md`

A new section of the standard: actors with a short latin `@id`, a name, roles (author / designer / tester / customer / observer / agent) and activity periods. Solo — one line; the default actor is taken from devst.json and stamped automatically.

### An agent is an actor — a human signature makes it a decision

Entries made by an agent are always a candidate or a fact-input; they become a governing decision only after a human signature. Parallel agents are distinguished as separate actors ([ADR-022](../decisions/adr-022-parallel-agents-staging-join.md)).

### Compatibility: new header fields are a standard change

"Decided by:", "pinned by @id" and "source: @id" are new header fields → a dev-standard edit (a pair of ADRs, a version bump, the full canon-sync: skill, templates, test fixtures). The task registry gains author/reporter/decider columns in SQLite (the [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) migration).

## Rollout (four stages, all pending)

1. **Data:** `docs/team.md` + the default actor in devst.json; the signer field in ADR headers (`new adr` stamps it); registry columns; `task new --by @id`; the checker knows the fields.
2. **Escalations:** the ui-freeze guard answers with an addressee ([ADR-013](../decisions/adr-013-default-deny.md) gains "whom to ask"); reminders gain a target actor ([Feature 05](./05-reminder-system.md)).
3. **Inputs:** requirements carry "source: @id" ([ADR-014](../decisions/adr-014-req-reconcile.md)); bug cards carry a reporter ([Feature 02](./02-bug-hunt.md)); session logs record "led by: @id (role)".
4. **Roster life:** activity periods; needs_review for a departed actor; agent signatures in MCP mutations ([Feature 08](./08-mcp-server.md), stage 3).

## Non-goals

- Not a rights hierarchy and not an ACL: roles are authority sources for the agent, not a prohibition mechanism (the gates stay with freeze and the registry).
- No auto-resolution of role conflicts — only a question task.
- No HR / corporate-directory sync — `team.md` is written by hand.
