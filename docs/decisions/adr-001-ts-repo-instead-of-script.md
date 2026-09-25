# ADR-001: TypeScript Repo with a Clean Core Instead of a Single Script

> **Status:** Accepted · **Date:** 2026-09-06
> **Essence:** devst is a TypeScript repo (clean core + thin CLI + vitest), not a one-file script.
> **Rejected:** keeping `devst.mjs` (an untestable monolith); a CLI framework with dependencies.
> **Related:** Architecture overview (`docs/architecture/01-overview.md`) · session 0 (pre-T2-tier migration)

## Context

`devst.mjs` had grown from a quick throwaway script into a real tool, and the author wanted
to keep extending it — eventually porting graph tooling from Python to TypeScript.

## Options

- **Keep the script** — simple, but a monolith with no tests; risky to extend.
- **CLI framework (commander et al.)** — dependencies for dependency's sake.
- **TS repo with a clean core** — the core is pure functions over strings and lists of
  names; filesystem access is confined to a thin `cli.ts`.

## Decision

**TS repo:** a clean core plus a thin `cli.ts`; vitest for tests; strict `tsc`;
zero runtime dependencies.

## Consequences

**Positive:** testability; extensibility for future modules (including the graph tooling).
**Negative:** `pnpm build` is required before using the CLI (`dist/cli.js`).
