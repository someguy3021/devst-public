# Feature 07: Linked repositories — a neighbor's canon, logs and mirrors

> [Русская версия](../ru/features/07-linked-repos.md)

> **Status:** Implemented (v1.2) · **Updated:** 2026-10-06
> **Essence:** separate devst repos declare each other in `docs/links.json`; documents are linked via `id://path/doc.md` links (the linter checks them), knowledge — via sha256+HEAD pins, history — via mirrors of selected logs. The anchor scenario: a TTRPG side project (a consumer of AI assets) ↔ its knowledge-base neighbor; in devst itself the declared neighbor is the internal methodology repo (dev-standard).
> **Key facts:**
> - The neighbor declares us back (mutuality is checked).
> - The neighbor is never written to.
> - A neighbor may be a non-devst repo (graceful degradation to git + hashes).
> - Reports never block.
> **Related:** [ADR-025](../decisions/adr-025-linked-repos-links-json.md) (the manifest, `id://` links) · [Feature 05](./05-reminder-system.md) (the links-stale detector) · [ADR-020](../decisions/adr-020-tauri-sidecar.md) (the UI tab rides the CLI sidecar) · the standard's §5.8 · `devst links --help`

## Scenarios

1. **"What was the neighbor doing while I wasn't looking?"** — `devst links check`: theses of the neighbor's latest session logs (file name + the Essence line from the header), its commits since my pin date, HEAD and the dirty counter.
2. **"Is the thing I pinned still current?"** — `links pin` remembers the sha256 of the pinned neighbor directory; `links check` answers `ok / CHANGED since 2026-10-06 / GONE`.
3. **"My doc references the neighbor's material"** — a markdown link like:

   ```markdown
   [testing conclusions](std://docs/checklists/testing.md)
   ```

   is linted as an internal link: the neighbor not declared or the file gone is a `neighbor-link` error.
4. **"Losing a repo must not lose its session history"** — the mirroring side keeps a `mirror` section (a regex over file names) in its manifest; `devst links mirror` puts byte-for-byte copies into its own `docs/mirror/<neighbor-id>/`; `links check` reports "fresh / stale".

## The `docs/links.json` manifest

```json
{
  "version": 1,
  "neighbors": [
    {
      "id": "std", "name": "dev-standard",
      "path": "../dev-standard", "role": "producer",
      "note": "the internal methodology canon",
      "pins": [ { "id": "std-docs", "target": "docs/" } ],
      "mirror": [ { "id": "session-logs", "source": "docs/log/",
                    "match": "^2026-10.*session.*\\.md$" } ]
    }
  ]
}
```

Rules: `id` — `[a-z][\w-]*`, unique; `path` — relative from the repo root (machine-independent); `role` — the role of the **neighbor** relative to us; hashes/dates/HEAD are appended by `links pin`. `match` — a regex over file names; `into` — an optional target directory for the copies (default `docs/mirror/<id>/`).

## Safety rules

- The commands write only into their own repo: `pin` — its own manifest, `mirror` — its own `docs/mirror/`. The neighbor is read (`fs`, `git --no-pager`) but never modified — safe while its own agents are running.
- Directory hashes: Merkle over sorted relative paths, excluding `node_modules/`, `__pycache__/`, `.git/`, `*.log`, `*.pyc`.
- A non-git neighbor: no HEAD / session logs / mutuality — pins and existence checks still work.

## Non-goals

- Nothing is mutated at the neighbor (no "push a mirror" into someone else's repo).
- `links check` is not part of `devst check` and blocks nothing (v1); `--strict` — if ever needed.
- No auto-scan of "every repo nearby" — neighbors are declared by a human (`devst env` suggests candidates).

## v1.1 — closing the ritual loop (reminders)

Stale links come to SessionStart on their own: the `links-stale` remind detector ([Feature 05](./05-reminder-system.md)) counts neighbor problems — a repo not found, a link not mutual, a pin CHANGED/GONE, a mirror stale/not copied — and calls for `devst links check`. It is switched off by a `links-stale` line in the `remind.off` list of devst.json.

## v1.2 — the "Neighbors" tab in devst-ui

The `NeighborsPanel` (the `hub` tab, a badge with the problem count): the `links check --json` report via the CLI sidecar (as remind, [ADR-020](../decisions/adr-020-tauri-sidecar.md)) — the neighbor's status (devst / not devst / NOT FOUND), mutuality, HEAD and the dirty counter, theses of the neighbor's logs, its commits, pins and mirrors. The Check / Re-pin / Mirror buttons call the CLI — they write only into their own repo and never touch the neighbor. The UI ↔ CLI contract is a local copy of the report shape in `kernel/adapter.ts` (the RegistryTask precedent; the UI tsconfig does not pull node modules). Texts — RU/EN dictionaries (T-26). Tests: `tests/ui-links-panel.test.ts` (a pure view: problem counters, kinds, truncation) + a ui-e2e "Neighbors" scenario (the panel from a sidecar fixture, the badge 2→1→0 via the buttons, an empty state without a manifest).
