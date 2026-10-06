# ADR-023: Public docs-only release — devst-public: sources stay closed, EN+RU, binaries in Releases

> [Русская версия](../ru/decisions/adr-023-public-docs-only-release.md)

> **Status:** Accepted · **Date:** 2026-09-25
> **Essence:** the public artifact of devst is a separate repository, `devst-public`, with a clean history: curated documentation (internal mechanics included) in English with a Russian mirror, plus binaries in GitHub Releases. Source code is never published; the private repo remains the single home of development.
> **Rejected:** opening the current private repo (sources and personal data sit in git history); npm distribution of sources (roadmap phase 2.2 in its old wording).
> **Related:** task T-25 (registry: `devst task show T-25`) · roadmap phase 2.2 (release and scale) · [ADR-018](adr-018-sea-binary-distribution.md) (SEA) · [ADR-020](adr-020-tauri-sidecar.md) (sidecar)

## Context

- The goal is a resume: public, outsider-readable evidence of engineering work
  (architecture, decisions, testing culture) — not tool distribution. The author's
  priority: "looking good" beats "everything works".
- The GitHub repository is private (an anonymous API request returns 404, verified
  2026-09-25); the sources have never been exposed. Full code and backup branches sit
  in history.
- Roadmap phase 2.2 was written for npm distribution with sources; the author's
  decision (chat, 2026-09-25) changes the strategy: sources stay closed, only the
  documentation is public.
- A leak scan (2026-09-25): machine-specific personal paths in at least 4 files;
  ~15 mentions of a closed TTRPG side project across the docs; links pointing into
  the closed adjacent methodology repo — mechanically publishing anything from the
  current docs is unsafe.

## Options

### A. Open the current `devst` repo

- Pros: zero transfer work; stars and issues land on the code immediately.
- Cons: full sources in history (backup branches included); personal paths and
  closed-project names in the docs and `registry.db`; rewriting history for this is
  risk without payoff; contradicts the author's "we do not release sources".

### B. A separate public docs-only repo (clean history) — chosen

- Pros: zero leak risk (only what is placed by hand ever reaches the public repo);
  clean history; resume value — translated ADRs and feature pages demonstrate
  engineering culture without code; sources stay private forever, no caveats.
- Cons: two stores of truth — public texts are a manual derivative of the private
  docs and will drift; a sanitization pass and stop-pattern checks are required as
  a safety net.

### C. GitHub Pages from the private repo (Pro plan)

- Pros: a "site" looks dressier than a repo.
- Cons: delivers none of the primary resume artifact (a link to the repository
  itself); drags in a build stack; Pages visibility depends on the plan. Deferred,
  not rejected: Pages can be added later on top of the same `devst-public` content.

## Decision

**Option B.** A public repository `devst-public` (created by the author personally),
clean git history. Composition and rules:

1. **A curated corpus (not a mirror of the private docs):** an EN landing page
   (README); an adaptation of the dev-standard methodology — the text is rewritten
   in place, links to the closed adjacent repo removed; an architecture overview;
   6 features as feature pages; all 22 ADRs translated. NOT published: `docs/log/`,
   the task registry, `open-questions.md`, `docs/research/`, `AGENTS.md`,
   `fixtures/`, `_drift/`, `src/`, `tests/`, `ui/` code, `integrations/`.
2. **Sanitization — curated transfer plus a stop-pattern check.** Public texts are
   written anew in English (translating a private text = a new edition; private
   files are never copied mechanically); before every push a grep invariant:
   personal machine paths, closed-project codenames — zero occurrences. Closed
   projects are named neutrally in public texts ("a TTRPG side project"), no repo
   names or paths.
3. **Languages:** English is the source of truth, at the repo root; Russian is a
   mirror under `docs/ru/` translating the EN edition (not the private original);
   every page header carries a sync date.
4. **License — CC BY 4.0:** texts and assets only; no code license needed.
5. **Binaries — in GitHub Releases:** `devst.exe` (SEA, [ADR-018](adr-018-sea-binary-distribution.md))
   and `devst-ui.exe` (sidecar, [ADR-020](adr-020-tauri-sidecar.md)); the README
   states explicitly: unsigned (SmartScreen will warn), a demo project for a resume,
   no support promised.
6. **CI of the public repo** — a light workflow: a markdown link check plus a
   stop-pattern check ("nothing private leaked"). No badge from the private repo —
   private-repo badges do not render publicly.
7. **First release** — tag `v0.5.0`, in sync with the version in the private repo's
   README.

## Rationale

- For a resume, the story of "how I design and run a documentation culture" matters
  more than code: ADRs, features, and methodology show it better than diffs.
- Curated transfer is cheaper and safer than filtering: what was never copied cannot
  leak. Stop-patterns are a safety net against human error, not the primary
  mechanism.
- Binaries in Releases give a "Download" button without opening sources (the SEA
  binary is self-contained, [ADR-018](adr-018-sea-binary-distribution.md)) —
  publishing binaries does not reveal source code.

## Consequences

**Positive:**

- Sources and personal data physically never enter the public repo; the leak risk
  reduces to "forgetting it in a translated text" and is covered by stop-patterns
  plus review before every push.
- Clean history and full control over the public narrative.

**Negative / risks:**

- Drift: public texts are a manual derivative; the rule — private-doc changes that
  affect the public corpus go through a task updating the mirror (as with T-25).
- The RU mirror lags the EN by construction; the acceptable lag is tracked by sync
  dates in page headers.
- Binaries in Releases mean an obligation to answer issues about them; the README
  states explicitly: "a demo project, no support promised".
