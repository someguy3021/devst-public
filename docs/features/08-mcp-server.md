# Feature 08: MCP server — typed agent access to the canon and the registry

> [Русская версия](../ru/features/08-mcp-server.md)

> **Status:** Read-only surface implemented (23 tools) · **Updated:** 2026-10-10
> **Essence:** the `devst mcp` subcommand runs a local MCP server (stdio JSON-RPC, zero runtime dependencies, on top of the SEA binary) and gives agents of any harness typed access to the canon: the "Now" panel, the task registry, ADRs, the docs map, neighbor links. Read-only was stage one; mutations are a separate stage behind a gate, with mandatory actor attribution ([Feature 09](./09-actors-and-roles.md)).
> **Key facts:**
> - 23 tools cover the agent-facing CLI surface: hygiene/canon (`get_map/brief/reminders/uncommitted/undocumented/features`, `check_docs`), the registry and environment (`get_panel/board/task/decisions/links/env/audit`), code intelligence (`analyze`, `get_overview/context/blast_radius/risk/health/history/symbols/file`).
> - Transport is stdio JSON-RPC 2.0 (newline-delimited); the server lives exactly as long as the harness session — no daemon, no network. Sources of truth (docs/, the registry) are read on every call: no cache, hence nothing to go stale.
> - Every answer carries a `_meta` envelope — freshness/completeness/truncation; a `_meta.stale_warning` hint pushes the agent to re-run `devst analyze`.
> - Zero-deps implementation on Node stdlib (`src/mcp-run.ts`); fact-gathering is shared with the CLI (`src/collect-run.ts`) — one source, no duplication. Wiring: `devst integrations install --mcp` with a `doctor` check.
> **Related:** [ADR-012](../decisions/adr-012-integrations-install-doctor.md) (integrations install + doctor) · [ADR-018](../decisions/adr-018-sea-binary-distribution.md) (the SEA binary) · [ADR-022](../decisions/adr-022-parallel-agents-staging-join.md) (parallel agents — the staging plan for stage 3) · [Feature 09](./09-actors-and-roles.md) (mutations with `actor=@id`) · [Feature 10](./10-code-intelligence-clean-room.md) (the code-intelligence tools) · `devst mcp --help`

## Scenarios

1. An agent starts a task → `get_panel` + `get_board` → it sees the phase, the hot spots and its tasks without hand-reading the README.
2. An agent meets an ADR reference → `get_decisions` → decision headers with dates (and, after [Feature 09](./09-actors-and-roles.md), with signers).
3. An agent finishes work → `check_docs` → a machine-readable lint report with `_meta` freshness against HEAD — instead of parsing colored console output.
4. A session in Claude Code or Codex (not zcode) → the same `devst mcp` from their standard MCP config, installed by `devst integrations install --mcp`. The canon stops being a zcode exclusive.
5. (Stage 3, ahead) An agent closes a task → `close_task` with `actor=@id` — the write goes through the same pure core as the CLI, and a parallel agent never sees "database is locked" (precondition: busy_timeout).

## Design decisions

### stdio, no cache, no daemon

The server lives exactly as long as the harness session. No daemon, no index, no network — the "field tool" principle. Sources of truth are read on every call: there is no cache, so nothing can go stale (the lesson of flaky index-bearing MCP servers). The implementation is stdlib-only; the MCP layer is one more thin adapter next to `cli.ts` — the pure cores are untouched.

### Question-shaped names, strictly read-only first

Tool names follow the `get_*` pattern — a question maps onto one tool (the lesson of an internal research pass over public agent tooling). Stage one was strictly read-only; mutations are a separate stage behind a gate. The name `analyze` intentionally matches the CLI command: `_meta.stale_warning` hints ("the index is stale — run devst analyze") steer agents to call the tool under this very name — real agent sessions showed the hint works. `analyze` is the only mutator among the tools, and it writes only the derived code index (`.devst/graph.db`), never the canon; canon mutations remain behind the stage-3 gate.

## Non-goals

- No SSE/HTTP transport and no network access — local stdio only.
- No MCP resources/prompts surfaces and no LLM enrichment of answers — a lean profile.
- Not a replacement for hooks / the skill / the CLI: session rituals stay human-in-the-loop; MCP is the data layer for agents.
- No distillation/compression of answers — the responses are small.

## Stage 3 (ahead): mutations behind a gate

`new_task`/`close_task` with a mandatory `actor=@id` ([Feature 09](./09-actors-and-roles.md)), serialized writes (busy_timeout), and staging for parallel agents ([ADR-022](../decisions/adr-022-parallel-agents-staging-join.md)).
