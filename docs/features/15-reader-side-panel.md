# Feature 15: the reader — a side panel for reading files in the desktop app

> [Русская версия](../ru/features/15-reader-side-panel.md)

> **Status:** Implemented (the core and all main entry points; two spec items pending: lazy heavy-content rendering, the freeze-tree entry point) · **Updated:** 2026-10-24
> **Essence:** a right-hand reader panel in the devst desktop app: every path shown in the UI — task objects, check-list rule files, journal references, feature spec docs — is clickable and opens on the right, without leaving the screen. Markdown renders, code renders with line numbers, images and PDFs render immediately. The goal: **a human verifies by reading the actual documents, not by file names.**
> **Key facts:**
> - Built for [Feature 14](./14-spec-items-as-data.md): confirming a spec item without reading what was actually produced is exactly the failure mode the reader removes.
> - A content router: `.md` → rendered markdown; text/code → monospace with line numbers; png/jpg/gif/svg/webp/pdf → rendered via data-URLs; anything else → a stub with "copy path" and "open in editor".
> - Files over ~400 KB show the first 2000 lines with a "shown partially" banner.
> - Read-only by decision; the header has "copy path" and "open in editor" (reveal).
> **Related:** [Feature 03](./03-devst-ui-desktop-window.md) (the desktop window it lives in) · [Feature 14](./14-spec-items-as-data.md) (the main consumer: spec-item verification) · [ADR-016](../decisions/adr-016-ui-e2e-mockkernel-playwright.md) (the browser E2E covering it)

## Scenarios

1. **Verification (the main one).** A feature item is marked "done" → in the inbox card the human clicks the object or the feature doc → the reader renders the markdown on the right → they pick a trust level without leaving the screen.
2. **Check list.** A failed convention shows the rule's file → a click opens it in the reader at the right spot.
3. **Tasks and journal.** Task objects/related files and journal references are clickable chips; relative `.md` links inside opened markdown navigate in the same reader — a small doc graph by clicking.
4. **A binary file** (png, pdf) renders immediately; the unfamiliar gets "open in editor" plus "copy path".

## Behavior details

- The splitter: 240 px minimum, 65 % of the window maximum; the width persists across restarts; `Esc` closes the panel.
- Navigation: a back/forward stack with breadcrumbs, so verifying a chain of documents does not lose the path.
- The panel and the app scroll independently — scrolling the task list never scrolls the reader.
- The reader reuses the same pure core in the webview ([ADR-015](../decisions/adr-015-tauri-ui-stack.md)); the browser E2E suite covers rendering, internal links and the navigation history on a `MockKernel` fixture.

## Non-goals

- No editing (read-only + "open in editor" instead).
- No file search and no file-tree browser inside the reader.
- No office-format or PDF annotation, no diff views — possible later, on demand.
- Two spec items are honestly pending: heavy content renders eagerly (no lazy mounting while the panel is collapsed or resizing), and the freeze tree opens its menu rather than the reader.
