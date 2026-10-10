# ADR-028: the code-intelligence parser cascade (T0/T1/T2) and embedded assets

> [Русская версия](../ru/decisions/adr-028-parser-cascade-t0-t1-t2.md)

> **Status:** Accepted · **Date:** 2026-10-09
> **Essence:** code-graph accuracy comes from a tier cascade: a T0 scanner (in-house, every language, low confidence) → a T1 LSP bridge (the project's tsserver; a reserved slot, no implementation yet) → T2 — parser assets embedded into the SEA binary (tsc + the @lezer set + php-parser + luaparse + lezer-elixir, ~10 MB total) with version honesty; the index lives in `.devst/graph.db`, outside `docs/`.
> **Rejected:** a T0-only regex scanner (noise from comments/strings, multi-line blocks); full tree-sitter-WASM grammars for now (web-tree-sitter inside SEA is unproven — postponed until a hands-on check); everything in the CLI bundle (the slots could be neither disabled nor skipped); full tsc semantics (a Program with type-checking is not needed for a file graph).
> **Related:** [Feature 10](../features/10-code-intelligence-clean-room.md) (the author's decisions 6-7 behind the cascade) · [ADR-018](./adr-018-sea-binary-distribution.md) (the embedded-assets precedent) · [ADR-023](./adr-023-public-docs-only-release.md) (a docs-only release → permissive licenses only) · [ADR-010](./adr-010-detect-dont-block.md) (feature gates) · [ADR-017](./adr-017-hybrid-storage-md-sqlite.md) (SQLite) · repowise (the public project whose code intelligence inspired the clean room)

## Context

Phase 3.1: the code graph and blast radius for agents. Stage 2a delivered the T0 scanner — regexes cannot tell comments and strings from code ("import x" inside a comment = a false edge), and accuracy plateaus. The author's decisions 6-7 (recorded in [Feature 10](../features/10-code-intelligence-clean-room.md)): a cascade of a scanner fallback, an LSP bridge as the base and embedded compilers, "with version honesty — so that I understand something went wrong at the moment I look at it"; "grab the ones that are light by size; assume from the start that there will be several of them". Constraints: the SEA binary must be self-sufficient (the consumer has no node_modules), zero runtime dependencies, native .node addons do not work in SEA, and only permissive licenses are acceptable (a docs-only release, [ADR-023](./adr-023-public-docs-only-release.md)).

## Options

### A. Everything in the bundle (import from src/, esbuild bundles it)

- Pros: no loader, no assets.
- Cons: a slot can be neither disabled nor absent (no "unavailable" state), the bundle size is always maximal, the parser versions are not separable from the CLI version, and the honesty of "what actually looked at the file" is lost.

### B. tree-sitter + WASM grammars (the repowise way)

- Pros: 40+ languages behind a single runtime.
- Cons: web-tree-sitter inside SEA is unproven (it loads .wasm by path; in SEA — only asset bytes via locateFile/instantiate; the hands-on check has not been done); +0.4 MB of runtime and 0.2-4 MB per grammar.

### C. Embedded CJS assets + a Function-based loader (chosen)

- Pros: every slot is optional and knows its own version; the SEA mechanics already exist ([ADR-018](./adr-018-sea-binary-distribution.md), the canon is embedded the same way); CJS distributions exist for all the packages; loading as text via `new Function` — no data: URLs and no network; the licenses are embedded next to the code (the hygiene of [ADR-023](./adr-023-public-docs-only-release.md)).
- Cons: the exe grows by ~10 MB (an 8 MB precedent was already accepted); the Function loader is a hand-rolled require shim (a map of @lezer/lr+common → the grammars).

## Decision

**Option C.** The cascade: T0 is always on (the base and the fallback, `engine=scanner/confidence=low`); T2 slots per language, when the vendored asset is available and the code-graph feature is not off:

| Tier | What it is | Coverage | engine / confidence |
|---|---|---|---|
| T0 | the in-house pattern scanner over cleaned text | every language | `scanner` / low |
| T1 | an LSP bridge (the project's tsserver) | TS/JS | a reserved slot, the implementation belongs to a later stage |
| T2 | parser assets embedded into the SEA binary | TS/JS (tsc, an exact AST); Python, Go, Java, Rust, C++, Elixir (@lezer, cleaned text); PHP (php-parser, a full AST); Lua (luaparse, a full AST) | `bundled` / high for tsc |

- **tsc (TS/JS):** `ts.createSourceFile` — an honest AST traversal (import / export / require / dynamic import), `engine=bundled/confidence=high`.
- **@lezer/{python,go,java,rust,cpp} + lezer-elixir:** the v0 trick of a "precise lexer" — comments and strings are stripped along the parser tree (lengths preserved), then the T0 patterns run over the clean text; a single traversal implementation serves every Lezer language.
- **php-parser, luaparse:** full ASTs (CJS), the same effect — stripping plus the T0 patterns.
- **Version honesty:** the embedded version (the vendor manifest) is compared against the project's version (`node_modules/typescript/package.json`); a divergence is never a silent skip — a `version-mismatch` status is shouted in `_meta` (degraded), the file is marked parsed-with-mismatch.
- **The cascade merge:** specifiers are deduplicated by (raw, kind); T2 takes priority over T0; an edge carries the engine/confidence of the best tier that produced it.
- **Vendoring:** the slots are vendored by the `pnpm vendor` script (devDependencies → `vendor/parsers/`); the manifest `vendor/parsers/manifest.json` (package / version / license / file / size) is generated, never hand-written; in SEA everything is embedded by a directory walk, like the canon ([ADR-018](./adr-018-sea-binary-distribution.md)).
- **The feature gate:** `features.code-graph = off` — analyze/blast refuse honestly, with the reason (the first live application of the [ADR-010](./adr-010-detect-dont-block.md) feature-gate framework).

## Rationale

- Option C satisfies "there will be several of them" architecturally: the slots are data (a manifest), not code branches; adding a language = a manifest line + an asset file + a stripping branch.
- The version honesty is mechanical: the manifest pins the embedded version, the project's version is read from node_modules, and a divergence becomes a status in `_meta`.
- B is postponed deliberately: a WASM sub-slot is the same slot architecture; the gate is a hands-on SEA check.

## Consequences

**Positive:** analyze stops lying on comments and strings; TS/JS gets an exact AST; the slots are extensible without a release of the core logic (the vendor script); the license hygiene of a docs-only release — the license copies ride inside the assets.

**Negative / risks:** the exe grows by ~10 MB; the Function loader bypasses the import graph — a requirement on the vendored packages: they must be standalone distributions, and the require map exists only for @lezer/*; the Lezer v0 trick ("stripping + T0 patterns") is not a full AST — symbol-level analysis for the non-TS languages will need real traversal implementations.
