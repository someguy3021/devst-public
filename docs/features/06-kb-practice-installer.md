# Feature 06: KB practice installer — big practices as skills, per-project, with reminders

> [Русская версия](../ru/features/06-kb-practice-installer.md)

> **Status:** design (protocol collected; development not started) · **Updated:** 2026-09-13
> **Essence:** kb in devst is not a "knowledge base of texts" — it is a manager of big practices: skill-folder packs (SOLID, Clean Architecture, FSD, Micro-frontends, MVC, ts-idioms…) that devst installs into the AI harness as skills, toggles per project via config, reminds the agent of at session start ("we are writing per Clean Architecture"), and points to on violations ("see skill X!"). Plus "linting without an installed linter": small machine checks (secrets/TODO/tests) bundled into the same packs.
> **Key facts:**
> - Killer feature: text + teeth — every practice = text (a checklist/skill) plus optional machine checks, not just a text base.
> - Speed rule: a 1-second ceiling per hook check; a check that does not fit is never cut silently — the agent brings measurements and asks the author "are you sure this will be fine?"; only the author decides.
> - General practices = devst canon (embedded as binary assets, ADR-018); project-specific practice lives in project docs.
> - Warn-only at the start; each check's severity is data, escalation to strict via a self-documenting per-project config.
> - 9 protocol decisions, 7 stages; the first sample pack is **ts-idioms** (Omit/Pick/satisfies/type inference over type duplication).
> **Related:** [Feature 04](./04-task-registry.md) (gates/verdicts) · [Feature 05](./05-reminder-system.md) (the reminder system — the carrier) · [ADR-018](../decisions/adr-018-sea-binary-distribution.md) (canon embedded as assets) · tasks T-10 (umbrella) and T-17 (salvage of the internal dev-standard methodology) · the concept in architecture/01

## 1. Essence and consumers

| Consumer | How they use it |
|---|---|
| Author | "enable FSD and ts-idioms on this project" — devst installs the skills, removes the extras, reminds at SessionStart |
| AI agent | gets small reminders of the active practices + the full texts inside its skills; checks catch violations at edit time |
| A foreign repo without linters | the sanitary minimum (secrets/TODO/tests) arrives with the binary; nothing is installed into the project |

## 2. Scenarios

1. Project setup: `devst kb install clean-architecture ts-idioms` → the skills are in the harness, devst.json remembers the set; `remove` drops what is not needed.
2. Session start: the reminder panel carries the small parts of the active practices — "we write per Clean Architecture" (a one-liner, not the text).
3. Work: the agent sprays duplicate types where a data link exists → a reminder "see skill ts-idioms" (a check → skill mapping).
4. Code edits without tests: a coverage heuristic (smart mapping first — decision 7).
5. Updates: practices evolve constantly — pack updates via the update flow; freshness as data ("Checked" + TTL, a provider in remind).

## 3. Decision protocol

All decisions — 2026-09-12/13, the author's calls (captured verbatim in the session history; paraphrased here).

### 1. Killer feature: text + teeth

The knowledge base must not be "just texts": text + devst hook modifiers + "linting without an installed linter in the project". Decision: every practice = text (a checklist/skill) + optional machine checks; a mandatory stage is the speed-boundary survey (decision 2).

### 2. Speed rule: a 1s ceiling, never cut silently

Cutting more checks means less tool value. The ceiling for a hook check is 1 second; a check that does not fit is NEVER dropped silently — the agent brings measurements (diffs of 10/100/1000 lines) and asks the author "are you sure this will be fine?"; the decision is the author's alone.

### 3. Strictness: hybrid C

Warn-only at the start; each check's severity is data (not code); escalation to strict via a per-project config later. The config self-documents: every key carries a "why and what for" comment (a devst.json template + docs).

### 4. Canon: shared in devst, project-specific in projects; the old repos are outdated

General practices become devst canon (embedded as binary assets, ADR-018); project-specific practice lives in project docs. The internal dev-standard methodology materials and the parking-lot repo for far-future ideas are both considered outdated: salvage what is worth keeping, then delete them — task **T-17** (make the STANDARD_VERSION check machinery self-sufficient inside devst).

### 5. Big practices: skill folders, devst as the installer

A practice = a skill folder (the devst skill format: SKILL.md + files + small checks); `devst kb install/remove/list` installs/uninstalls them in the harness (targets as in integrations); the per-project set lives in devst.json; on violations the checks point at the skill ("see skill X").

### 6. The "linting without a linter" catalog — lowest urgency

A minimal check set (secrets in a diff, TODO without a T-NN, debug leftovers, crude file-length caps) — last in line; all in the same declarative system.

### 7. Tests heuristic: smart mapping first (B)

First try B — a mapping "changed module → covering test" (naming conventions + an import scan of the test catalogs, measured per rule 2); on failure — A (a diff heuristic "src without tests") + C (a `tests` verdict at the task-closure gate, Feature 04); with a standing "still needed later" note: add A+C anyway eventually.

### 8. Delivery: an installer + reminder of skills; `devst kb` as an extra; SessionStart carries the small parts

The main channel is skill install/uninstall + reminders via a remind provider (Feature 05); `devst kb` (list/show) is an extra manual entry; the set is per-project (devst.json); SessionStart carries one-liners of the active practices.

### 9. Pack customization is needed (the pain: AI never uses Omit)

Even the smartest models avoid Omit and other TS niceties and usually spray new types, destroying existing data links. Decision: customization is part of the design — packs live in an accessible place (a catalog of available practices + your own), author-editable; the first sample is the **ts-idioms** pack (Omit/Pick/satisfies/type inference over duplication) as the author's own pack, editable by hand without rebuilding devst.

## 4. Stages

- [ ] 0. The protocol decisions are collected (this document); the T-17 salvage — a parallel task.
- [ ] 1. The pack core: the practice-folder format (SKILL.md + checks + a manifest), the catalog of available practices, `devst kb list/install/remove` (harness targets), the per-project devst.json (self-documenting — decision 3).
- [ ] 2. The reminder: SessionStart one-liners of the active practices + "see skill X" (a remind provider, Feature 05).
- [ ] 3. The tests heuristic B (decision 7) + measurements per rule 2; on failure — A+C.
- [ ] 4. The ts-idioms pack (decision 9) — a sample and immediate value.
- [ ] 5. The "linting without a linter" catalog (decision 6) — lowest urgency.
- [ ] 6. The speed-boundary survey — systematic measurements (diffs of 10/100/1000 lines), an "are you sure this will be fine?" report to the author on every borderline check.

## 5. Non-goals

- Replacing the project's installed linters (ESLint etc.) — devst works where they are absent; conflicts are resolved via kb.off.
- AI-based relevance selection inside devst (the fallow "no AI inside" principle) — selection is mechanical (a per-project config); judgment stays with the agent.
- Trello/Jira integrations — future, separate decisions (the concept, architecture/01).
- Reminder suppression ("seen — don't show") — still out of scope (it requires stored state).
