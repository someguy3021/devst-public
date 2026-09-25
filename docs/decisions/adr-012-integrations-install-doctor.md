# ADR-012: Integrations install / doctor (stage 1); running from the repo checkout is explicitly temporary

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** `devst integrations install [--only …]` places the skill, commands, hooks, and config into their harness locations (target specs in `integrations/targets/*.json`; stage 1 targets ZCode); `devst doctor` verifies the whole chain and catches drift of installed copies. Running the CLI with node from the repo folder is explicitly marked as a TEMPORARY arrangement (stage 0 of distribution).
> **Rejected:** "fork per harness" — replaced by three portability layers (truth / knowledge / enforcement) with git pre-commit as the portable enforcement layer; also rejected: install without doctor (five surfaces would drift apart).
> **Related:** [ADR-003](./adr-003-harness-integrations.md)

## Context

Five installation surfaces were copied by hand and drifted from the canon; hooks carry a hard-wired absolute CLI path that breaks when the repo moves; a user may believe the tool is "installed" like an npm package while it actually runs on node straight from the repo folder.

## Decision

1. **Target specs** (JSON): `{home}`/`{zcode}` placeholders with defaults, a `--zcode` flag, and the `DEVST_HOME` env var; `--only skill|commands|hooks|config` (selectivity was an explicit author requirement).
2. **install:** copies of the canon; hooks get the current CLI path patched in (`patchHookDefault`); the config is merged idempotently (no duplicate events, `.bak-devst` backup); a stamp file `{zcode}/devst.json` (repo + CLI + date) — groundwork for npm/binary distribution once the CLI can live apart from the repo.
3. **doctor:** environment (node/git/python), dist presence, hash comparison of installed copies against the canon (missing/drift), config registration, and smoke runs of synthetic payloads through the INSTALLED hooks (valid JSON). Drift is healed by re-running install.
4. **Temporariness:** README/HELP state plainly "node from the repo folder — stage 0"; the endgame is npm/binary distribution, tied to the Tauri UI sidecar.

## Consequences

Dogfooding: a real install placed 10 artifacts; doctor reported 8✅/0✖; an artificially induced drift (an edited skill copy) was caught and healed with `install --only skill`. Contract tests for hooks (`tests/hooks.test.ts`) pin the ZCode payload shapes — a whole class of transport bugs is now caught by `pnpm test` instead of in production.
