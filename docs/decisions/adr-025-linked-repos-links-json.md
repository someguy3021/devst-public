# ADR-025: Linked devst repos — docs/links.json, id:// links, links check/pin/mirror

> [Русская версия](../ru/decisions/adr-025-linked-repos-links-json.md)

> **Status:** Accepted (T-29) · **Date:** 2026-10-06
> **Essence:** a mechanism for linking separate devst repos: both sides declare each other in `docs/links.json`; a markdown link to a neighbor's doc is `id://path/doc.md` (linted); sha256+HEAD pins are verified by `links check`; selected neighbor logs are mirrored by `links mirror`; the neighbor's log theses are visible in `links check`. The first test — the pair "a TTRPG side project ↔ a shared AI-pipeline knowledge-base repo".
> **Rejected:** submodules / a monorepo (the repos must stay separate; histories are not interwoven); one-way links without reciprocity (a one-way link silently rots — `check` reports "the neighbor does not declare us"); a hub-centric scheme for now (peer-to-peer works without a hub; §5.8 is a building block for a future hub); mirrors inside the neighbor's `docs/log/` (they break the "Now" panel and the foreign repo's duplicate checks).
> **Related:** [Feature 07](../features/07-linked-repos.md) · the internal methodology repo (dev-standard) §5.8 (v1.8) · T-29

## Context

A TTRPG side project (T2, LLM asset generation) is hard-tied to a shared knowledge-base repo for AI pipelines. The repos are separate; the TTRPG project's docs already contain at least six references to paths inside the knowledge base (bare text, nothing verifies them); the session series 110–115 was in essence knowledge-base campaigns living in the TTRPG project's logs; and the knowledge-base repo was not a devst repo only because there was no linking mechanism. A common mechanism is needed for any future pair of repos: linking docs, logs and research docs, plus protection against loss.

## Decision

- **The `docs/links.json` manifest** in each of the linked repos: `neighbors[]` = {id, name, path (relative!), role (producer/consumer/peer — the neighbor's role relative to us), pins[], mirror[]}. Schema and validation — [Feature 07](../features/07-linked-repos.md).
- **The link syntax** `id://path/doc.md` — the id as in links.json (for example, `kb://workflows-tests/README.md`). Web schemes (`https://` etc.) are not neighbors. The linter: an unknown neighbor or a missing file — `neighbor-link` errors; a broken manifest — `links-invalid`.
- **The commands** (each writes only to its own repo — the neighbor is never touched): `links` (a cheat-sheet), `links check [--json]` (reachability, reciprocity, HEAD/dirty, the neighbor's log theses, commits since the pin date, pin statuses, mirror freshness; non-blocking), `links pin [--id]` (sha256 of a file/directory excluding node_modules/.log + HEAD + date), `links mirror [--id]` (byte-for-byte copies of selected files into one's own `docs/mirror/<id>/`).
- **The domain rule** (the internal methodology repo (dev-standard) §5.8): a session about the neighbor's domain lives with the neighbor; at home — a pointer + a thesis; mirrors are the safety net for what has already been written.

## Rationale

- Symmetry (reciprocity) makes a link observable: a one-way link is a signal, not the norm.
- `id://` instead of bare paths: links become clickable verification machines — the same thing the `broken-link` rule did for internal links.
- Pins via sha256, not only a git HEAD: the neighbor may be a non-git repo (a portable installation), and a dirty worktree is shown separately and honestly ("work is happening there — don't trust the check").
- Mirrors outside the sections: zero special cases in the doc linter; foreign session numbers don't get in the way.

## Consequences

**Positive:** losing either repo of a pair loses no history (mirrors); knowledge drift is visible ("CHANGED since the date"); handoff across repo boundaries (the neighbor's log theses); the knowledge-base repo joined the standard as a full-fledged T2 repo without changing its nature.

**Negative / risks:** pins require a ritual (`links check` + `pin` at the end of a session) — without it they fall behind, but the report shows it; a mirror's `match` is a name regex that can be written too broadly (it mirrors too much) — cured by reviewing a single manifest line.
