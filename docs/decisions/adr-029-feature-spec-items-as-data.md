# ADR-029: feature spec items — requirements as data, verified by a human

> [Русская версия](../ru/decisions/adr-029-feature-spec-items-as-data.md)

> **Status:** Accepted · **Date:** 2026-10-11
> **Essence:** a feature's requirements become machine-readable items with a verbatim source quote and tag-links to tasks; the agent executes by itself, but confirming an item is a human gesture through the verify inbox (reusing [Feature 11](../features/11-task-tags-and-verification.md) + [Feature 13](../features/13-ui-only-verification.md)); three human checkpoints: verify the spec before the start → confirm items along the way → close/reopen.
> **Rejected:** linting the wording's content ("linting is beside the point"); hard-blocking work before ratification ([ADR-010](./adr-010-detect-dont-block.md)); a separate trust scale for items.
> **Related:** [Feature 14](../features/14-spec-items-as-data.md) (the implementation) · [Feature 11](../features/11-task-tags-and-verification.md) · [Feature 13](../features/13-ui-only-verification.md) · [ADR-010](./adr-010-detect-dont-block.md) · [ADR-020](./adr-020-tauri-sidecar.md)

## Context

A real failure produced this decision: vague requirements ("I want it like X") → the
agent wrote the spec "minimal" and marked it done itself → "20% of the reference and
the vision, although everything runs". The post-mortem found two missing gates: (1)
nobody ratified the spec's completeness before the start; (2) "done" was set by the
executor itself — requirements were not entities, so there was nothing to confirm.
A third: manual stage checkboxes rotted in both directions on a finished feature. The
human-verification mechanics already existed at the task level ([Feature 11](../features/11-task-tags-and-verification.md):
trust levels, and [Feature 13](../features/13-ui-only-verification.md): ui-required,
pending inbox) — it just did not cover the requirements level of a feature.

## Options

### A. Lint rules in `check` ("a feature without acceptance = an error")

- Pros: cheap, the engine exists.
- Cons: checks structure, not the author's will; solves neither "wrote the spec
  minimal" nor "marked done itself". Rejected by the author: "linting is beside the point".

### B. A skill ritual (the agent always interviews the author before a feature)

- Pros: zero code.
- Cons: rests on the agent's discipline; does not work outside the devst harness; no
  ratification facts exist — nothing to show as "I signed this requirement".

### C. Requirements as data + the existing human inbox (chosen)

- Pros: carries the proven mechanics (levels, pending, Rust IPC, audit) to the
  requirements level; the truth lives in the canon (the feature doc, git history); the
  agent gets an MCP overview; addresses both pains — a firm spec via source quotes and
  ratification, and along-the-way checking via the inbox.
- Cons: a registry migration + a spec-section parser + an inbox branch in the app; new
  confirmation gestures for the author (mitigated by proxy questionnaires through the
  agent).

## Decision

**Option C**, implemented as [Feature 14](../features/14-spec-items-as-data.md): a
`## Spec` section in the feature doc — items `R1..RN` with IDs (never reused), a
verbatim source quote (otherwise "inferred by the agent") and many-to-many tag-links
to tasks. Two statuses per item: the agent's "done" (proof required) and the human's
"verified" (a trust level, an actor, a date). Three human checkpoints: spec
verification before the first work task (a "verified / needs work" gesture, partial
allowed, work blocking stays soft); per-item confirmation through the inbox; `feature
close` (every item verified/rejected/non-goal, otherwise refused; must debts block,
should/could become follow-up tasks) and `feature reopen` with the fact recorded.
`verifyMode` is a full analogue of tasks (default ui-required — the level is written
only by the desktop app over Rust IPC). Deleting items is forbidden; a meaning change
after ratification requires a new candidate item; author edits go through the agent
with subsequent confirmation.

## Consequences

**Positive:** requirements stop being prose — every item has a source, a status, a
history, links; "done" without a human signature does not count; long features (more
than two sessions) keep continuity — the confirmed slice lives in the registry and
reaches the agent at session start; retro-porting old features produces an honest debt
map (the pilot immediately surfaced the "20%").

**Negative / risks:** a new mandatory ritual (spec verification) risks "bureaucracy
again" — mitigated by proxy questionnaires and soft blocking; two carriers of truth
(markdown + registry) can diverge — mitigated by a bidirectional parser and format
warnings in `check`.
