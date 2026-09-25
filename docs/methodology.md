# The dev-standard methodology

> Part of the devst public documentation. English is the source of truth; a Russian
> mirror lives under [docs/ru/](./ru/) (being translated).

devst is the tooling for an internal methodology called **dev-standard**. This page
adapts its core ideas — everything described here is enforced mechanically by devst
commands, hooks and CI; you don't need the private standard document to follow along.

## The premise

Documentation lives in the repository, next to the code it describes — no wikis,
no external services. It is written for two readers at once: humans and AI agents.
When an agent writes most of the diffs, the docs become the spec the agent reads
before every task and the audit trail it leaves behind. Documentation quality stops
being a virtue and becomes infrastructure.

## Reading levels

| Level | What | When |
|---|---|---|
| **L0** | `AGENTS.md` + docs map with the "Now" panel | Before any work, always |
| **L1** | Doc headers, latest session log, open tasks | Enough to start a task |
| **L2** | Full doc bodies, source code | On demand |

Nobody — human or agent — has to guess what to read first. The convention fixes it.

## Doc headers

Every document opens with a machine-lintable header:

```markdown
> **Status:** actual · **Updated:** 2026-09-25
> **Essence:** what this doc is, in one or two sentences.
> **Key facts:** the 3–5 bullets people open this doc for.
> **Related:** ADRs, features, code entry points.
```

`devst check` fails when a header is missing or its date drifts from the file's git
history. Statuses live only in headers, progress only in roadmap checkboxes, open
questions only in the task registry — one place per kind of truth.

## Map and the Now panel

`docs/README.md` is a generated map of every document with a one-line description
(`devst map` regenerates it — it is never hand-edited). Stamped at the top is the
"Now" panel (`devst status`): current phase, last session, open work. A new agent
sees the state of the project in five seconds; the same panel is injected into the
session automatically by a SessionStart hook.

## ADRs: append-only decisions

Architecture decisions are recorded as ADRs (Context → Options → Decision →
Consequences → Rejected option, one line). The registry is append-only: a change of
decision means a new ADR that marks the old one superseded; files are never renamed
or renumbered — holes in numbering are normal and honest. `devst new adr` scaffolds
one with a truthful number and date.

## Session logs with a budget

Every working session ends with one log entry: what was done, the commits, what's
left. Hard budget 200 lines, target 60–80 — a log entry is a durable summary, not a
transcript. `devst undocumented` finds code commits newer than the last log entry
and nudges: did the work — write the record.

## Task registry with closure gates

Tasks and open questions live in a SQLite registry with links to objects (files,
docs), timers and TTL — not in TODO comments and not in someone's head. Closing a
task runs a **gate**: a verdict is required on every linked object, and the gate
report reconciles what the task declared against what the commits actually touched.
Stale tasks surface on the board; "detect, don't block" applies here too.

## Definition of Done

Each repository keeps a fixed DoD checklist: tests green (including E2E), log entry
written, map/status/check clean, ADR if behavior changed, README and map updated if
the change is significant. Hooks remind; CI (`devst env --check`) verifies the
environment table of AGENTS.md is not stale.

## Detect, don't block

The tooling never rewrites your text and never blocks a human commit by default:
the CLI lints, the skill teaches, hooks enforce — warnings first, strict mode is an
explicit opt-in. Docs conventions are changed only through a new ADR, never by a
drive-by edit.

## Tiers

| Tier | Scope |
|---|---|
| **T0** | Draft — one README |
| **T1** | Solo, light — map + decisions |
| **T2** | Solo, serious — full structure: architecture, features, decisions, roadmap, log, registry |
| **T3** | Team / multi-repo — T2 plus a separate docs hub |

`devst init <tier>` scaffolds the chosen tier; when in doubt, take the tier below.

---

devst enforces all of this mechanically — see the [architecture overview](./architecture/overview.md)
for how the pieces are built.
