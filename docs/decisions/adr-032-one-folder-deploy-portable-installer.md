# ADR-032: one-folder deployment, a portable installer, the standard moves into the monorepo

> [Русская версия](../ru/decisions/adr-032-one-folder-deploy-portable-installer.md)

> **Status:** Accepted · **Date:** 2026-10-26
> **Essence:** the product is a pair of executables deployed side by side (`devst.exe` + `devst-ui.exe`); deployment is a manual copy into a stable per-machine tools folder — no scripts, no personal paths in the repository. The installer embeds the path of the executable it runs from (portable-first: it needs no source checkout), and the legacy `{repo}`/`{external standard}` placeholders are gone — the documentation standard now ships inside the devst monorepo.
> **Related:** [ADR-018](./adr-018-sea-binary-distribution.md) (the SEA binary) · [ADR-019](./adr-019-machine-independent-canon-tokens.md) (canon placeholders; partially superseded by this one)

## Context

"Build" and "deploy" used to be the same file: hooks, the skill and the MCP config
all pointed at the freshly built binary inside the source tree. Rebuilding — or
merely running the build verification — overwrote the binary that a live workflow
was executing (the SEA build even sleeps in retries while a running MCP server
holds the file). The author keeps deployed tools of every project in a stable
per-machine tools folder, one folder per tool, executables side by side.

There was a second, older crack: the installer baked references to a source
checkout into the installed skill — a "for development only, run the CLI from the
repo" fallback and a path to the external documentation-standard repository.
Users have neither, so a fresh install could embed broken links (a known defect
class), and a portable exe outside a checkout degraded to "standard not found".

A reconnaissance pass established the safe ground: the `check` command never reads
the external standard (the expected version is compiled into the CLI and compared
against the checked repo's own stamp), so the external repository existed only to
have its README path baked into the skill text.

## Decision

1. **Build ≠ deploy.** The product is the pair `devst.exe` + `devst-ui.exe`, built
   side by side by one command. Deployment is a manual copy of the pair into a
   stable tools folder of the machine's choosing. No deploy scripts, no default
   personal paths in the repository — the build physically cannot touch a running
   deployment.
2. **The installer is portable.** The installer embeds the path of the executable
   it was launched from; wherever a user puts their exe, the installed skill,
   slash-commands, hooks and MCP config point there. The legacy placeholders and
   the development-only fallback lines were removed from the canon; the default
   CLI path inside hook scripts is now empty until an install wires it, so an
   unwired hook stays silent instead of reaching for paths that do not exist. The
   MCP server entry, unlike a user's own entries, is re-pointed to the current
   binary on every reinstall.
3. **The standard lives in the monorepo.** The documentation standard moved into
   `docs/standard/` (version bumped to 1.11 for the move; a header/footer version
   desync fixed on the way), a guard test pins the CLI's expected version to the
   standard's version footer, and the external repository — along with the
   neighbor entry and its pins — was retired. The `dev-standard vX.Y` stamp that
   target repos carry in their docs header is the standard's *name* and did not
   change.
4. **The desktop gets a repair button.** "Refresh install links" in the Now panel
   re-runs the installer through the sidecar; if `devst.exe` is not next to
   `devst-ui.exe`, a distinct error banner says exactly that (deploy as one
   folder) instead of surfacing raw process errors.

## Consequences

- Rebuilding and build verification can no longer disturb a live pipeline; the
  build no longer fights a running executable for its own output directory.
- A fresh install is clean by construction: only the user's own exe paths are
  embedded — no links to checkouts or external repositories can rot.
- The standard and its CLI now version together, guarded by a test.
- Deployment being manual is deliberate: a "deploy stale" reminder compares the
  canon against the deployed binary (resolved from the install marker) and the
  repair button makes reinstalling a two-click affair.
