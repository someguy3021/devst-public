# Feature 02: Bug Hunt — Pinpoint Reports from Designer-Testers

> [Русская версия](../ru/features/02-bug-hunt.md)

> **Status:** Implemented for "Testing Staged" (S1–S4; the S5 live run remains) · **Updated:** 2026-09-09
> **Essence:** Two products on a shared codebase — **Testing Staged** (a snippet on staging; covers 80% of the "styles/image look wrong" cases with zero installation) and **Testing Extra** (Tauri, heavyweight access: console/network/CDP for hard bugs). They share the report format, the ingest pipeline, and the AI-facing bug card — generalized exactly where a developer-plus-agent picks up the work. The tester pins an element + comments, or leaves a free comment without an element; the output is machine-processable data.
> **Key facts:**
> - The key insight: devst already has the translation dictionary — the freeze registry (URL ↔ screen ↔ files), anchor selectors, scan-ui, baselines, figma-dump — so "it's crooked here" becomes "fix these files".
> - W3C Web Annotation JSON as the report format (CssSelector / TextQuote / Fragment) — interoperable by design.
> - `devst bugs --ingest` turns a JSON report into a self-sufficient markdown card: selector + files + screenshot of fact vs the design reference.
> - Frontend-only constraint: no backend anywhere — storage in IndexedDB on the tester's side, delivery as one self-contained JSON file via any messenger.
> - Capture layer options compared (snippet / bookmarklet / MV3 extension / Tauri); v1 is a snippet on staging, Tauri is the analysis window, not the tester's browser.
> **Related:** [Feature 01: Baseline screenshots](./01-baseline-screenshots.md) · [ADR-011: UI freeze](../decisions/adr-011-ui-freeze.md) · [Feature 03: devst UI desktop window](./03-devst-ui-desktop-window.md) · figma-dump

## 1. Problem

Designer-testers don't know component or file names. Today their report is a sticky note + a screenshot without context. The developer (or the agent) burns time on "find where this is". Without pinpoint info, AI does just as badly.

## 2. Key insight: devst already has the translation dictionary

| What devst has | What it gives a bug report |
|---|---|
| UI-freeze registry (URL ↔ screen ↔ files) | URL from the report → screen → affected files |
| anchors.ts (screen → selectors) | selector from the report → anchor verification/proximity |
| scan-ui (components → files) | selector → component → files |
| baseline (--verify) | a fresh screenshot of fact at the right viewport |
| figma-dump | the design reference for the same screen |

The tester says "it's crooked here" in the language of screens; the tool translates it into the language of files.

## 3. Pipeline

```
TESTER (on the site)               DEVELOPER                   AGENT
─────────────────────              ─────────────────           ──────
bookmarklet → click an element     docs/bugs/inbox/*.json      reads the card:
→ form (text, severity)          → devst bugs --ingest      →  selector+files+
→ JSON to clipboard/download      (URL→screen→files;          screenshot fact vs design
                                   re-screenshot;              → fixes by pinpoint
                                   figma render;
                                   .md card)
```

### Layer 1 — capture (bookmarklet, zero installation)

A bookmarklet on any page: activates an overlay → the tester clicks an element → highlight + a form (text, severity: blocker/looks-off/nit) → a JSON is generated:

```jsonc
{
  "@context": "http://www.w3.org/ns/anno.jsonld",  // W3C Web Annotation
  "body": { "text": "the pay button is misaligned", "severity": "looks-off" },
  "target": {
    "source": "https://site/orders?page=2",
    "selector": [
      { "type": "CssSelector", "value": ".order-list > li:nth(3) .btn-pay" },
      { "type": "TextQuoteSelector", "exact": "Pay" },   // text-quote anchor
      { "type": "FragmentSelector", "value": "xywh=pixel:512,340,88,36" }
    ]
  },
  "viewport": { "width": 375, "height": 812 },
  "userAgent": "...", "capturedAt": "2026-09-09T14:20:00Z"
}
```

The selector is built greedily toward stability: `[data-testid]` → `#id` → a text quote + the path from the nearest semantic ancestor. A screenshot is optional (see layer 2) — but can come from `getDisplayMedia` or a manual attach.

**Layer 1 alternative (richer):** `devst bugs --hunt` — opens the site in headed Playwright with the same overlay: Playwright-engine selector quality; console and network errors go into the report automatically. Downside: it means running Node on the tester's machine.

### Layer 2 — ingest (`devst bugs --ingest`)

1. Reads `docs/bugs/inbox/*.json` (or stdin/file).
2. **Translation**: URL → screen (the registry); selector → component (scan-ui + anchors); screen → files (the Files column).
3. **Screenshot of fact**: Playwright opens `source` at the `viewport`, waits for the selector, captures the element + the full page → `docs/bugs/evidence/<id>/`.
4. **Design reference**: renders the screen from figma-dump (the frame from the Layout column).
5. Generates the card `docs/bugs/BUG-<date>-<n>.md`:

```markdown
# BUG-2026-09-09-01: pay button misaligned (looks-off)

> **Essence:** [tester] "the pay button is misaligned" on /orders?page=2 @375x812
> **Translation:** Orders screen → src/pages/Orders.vue, src/components/orders/**;
> element `.btn-pay` (text "Pay")
> **Evidence:** fact (element+page screenshots) | reference (figma v23)
> **Status:** new

## What the tester saw
(screenshot of fact, embedded as a link to evidence/)

## Reference
(figma render)
```

6. The inbox files are deleted; the cards enter the docs map (`devst map`).

### Layer 3 — agent

The card is a self-sufficient pinpoint: selector + files + fact vs reference. The agent reads it, opens the files, fixes, closes the status (closing → a line in the session log). Possible auto-linking: an element under 🔒🔒 freeze → the card is automatically flagged "frozen — coordinate with the author".

## 4. References (survey, 2026-09-09)

| Tool | What it is | What we take |
|---|---|---|
| [Marker.io](https://marker.io/), [BugHerd](https://bugherd.com/) | the commercial benchmark of the genre: a pin on the page + a CSS selector in the report | the click→pin→describe UX pattern |
| [Crikket](https://github.com/redpangilinan/crikket) | open source, self-hosted, a Jam.dev analog: screenshot+metadata | the metadata format, the self-hosted approach |
| [BugPin](https://github.com/aranticlabs/bugpin) | open source: annotations+screenshots, GitHub integration | the general idea — though our report lands in the repo, which is already better |
| [Webvizio](https://webvizio.com/) | annotations on live sites + Figma | the "fact vs design" bridge — figma-dump covers it for us |
| Jam.dev | commercial: the full tech context (console, network) in one click | the metadata checklist for --hunt |
| W3C Web Annotation | the annotation format standard (CssSelector, TextQuote, Fragment) | **the JSON report format** — interoperability |
| rrweb / OpenReplay | session recording (heavy) | NOT taken: our case is pinpoint pins, not replay |

The key difference from all of them: their reports go to Jira/a tracker; ours go **into the repo as canonical markdown**, straight into the agent's loop, with automatic translation into files.

## 4a. User flows of the references (survey, 2026-09-09)

The full path "a tester's clean PC → a report at the AI", for each:

| Tool | Step 1: what the tester installs/does | Mobile | Local/requirements |
|---|---|---|---|
| **BugHerd** (the onboarding benchmark) | NOTHING, if the developer embedded the JS snippet in the site: the tester opens a link — the sidebar is already there, pin → text → done. No account (guest). Without the snippet — a Chrome extension from the Web Store (2 clicks) | Works in mobile browsers via the snippet (web-only, no native apps) | SaaS ~$42+/mo; no own server |
| **Marker.io** | A Chrome extension from the Web Store OR a widget snippet on the site. Invitation by email from the developer | Via a mobile SDK (embedded in the app/site) | SaaS from $39/mo; pageview caps |
| **Jam.dev** | Extension only (Chrome/Firefox/Edge), free for the tester. One button → everything captured → share a link | The extension is desktop-only; no mobile (on their roadmap) | SaaS; $12.4M raised, 75k+ users |
| **Crikket** (open source) | Own instance (Docker) → an extension for the tester | no data | Self-hosted: a Docker server, Node+DB; hundreds of MB, the server must stay up |
| **BugPin** (open source) | Own instance (Docker) → a widget | web | Self-hosted: Docker, same idea |

**The key market pattern:** the lowest entry barrier is "a JS snippet embedded in the site" (BugHerd): the tester downloads NOTHING, it works even on a phone. An extension is the fallback. A separate server (open source) is the highest barrier.

## 4b. Our user flow (goal: a lower barrier than BugHerd, with zero servers)

**Person 1 — the designer-tester (a clean PC / phone):**
- The "snippet on staging" option (recommended): the developer adds ONE line, `<script src="/bug-hunt.js">`, to staging (the file lives in the project repo, served by the dev server; absent in production). The tester: opens the link → a "bug" button is already there → clicks an element → types text → "download report" → the JSON file goes to the developer via messenger. Zero installation, works natively on phone and tablet.
- The "bookmarklet" option (for other people's/production sites): drag the button to the bookmarks bar once → click it on any site → the same overlay.
- Tester machine requirements: a browser. That's all. Nothing to install, no accounts.

**Person 2 — the developer:**
- Receives the JSON → drops it into `docs/bugs/inbox/` → `devst bugs --ingest` (Node ≥ 18 + Playwright-Chromium ~280 MB, already present for the visual freeze; the screenshot of fact is captured here) → a card in docs/bugs/.

**Person 3 — the AI agent:** reads the card (selector+files+fact vs design) → fixes it.

The total weight of local infrastructure: zero servers; on the dev side — the already-present devst+Playwright. bug-hunt.js weighs a few KB and lives in the repo.

## 4c. Author requirements + capture setup comparison (2026-09-09)

**Requirements:** near-zero demands on the tester's environment (plug-and-play), the footprint must NOT be "gigabytes", installation/use must be brain-dead for the tester (sparing the programmer is desirable). The target scenario is PC; the perspective — a Tauri app or a browser extension. **Critical:** the app state AT THE MOMENT of the bug (an error disappears on re-render — capture only at click time, no re-shooting at ingest).

### Capture setup comparison

| Criterion | Snippet on staging | Bookmarklet | Extension (MV3) | Tauri "browser" |
|---|---|---|---|---|
| Installation by the tester | **NONE** (already on the page) | drag to bookmarks (non-obvious) | a link → "Add to Chrome" (2 clicks; needs an unlisted store publication) | download an exe (~15 MB), paste a URL |
| Mobile | **yes, natively** | painful | no (except FF Android) | no |
| Any site (prod/client) | only where embedded | yes | **yes** | yes |
| Screenshot at the moment | getDisplayMedia: 1 permission per session → exact frames; html2canvas as fallback | the same, but CSP may block it | **captureVisibleTab — perfect, zero friction** | a CDP screenshot — perfect |
| DOM at the moment | **yes, same-origin: the element's outerHTML (passwords masked)** | yes, if CSP allows | yes (content script) | yes (CDP) |
| Console/network | yes (console/fetch/XHR wrappers from snippet load) | yes | yes | **yes, natively** |
| The tester's own browser | **yes** (bookmarks, passwords, habits) | yes | yes | **NO — a foreign window** |
| Maintenance burden for us | a JS file in the repo (KB) | a JS file in the repo | a separate project, the store | an entire browser shell |

### Decision (recommendation, pending approval)

- **v1 — a snippet on staging**: covers the main scenario (internal staging testing, PC+mobile), zero installation, zero software of our own. Screenshots: activating "bug mode" opens a getDisplayMedia stream (one permission per session, the "this tab" choice) → every report is an exact frame of the moment; html2canvas as fallback. A DOM snapshot of the element is a mandatory field.
- **v2 — an MV3 extension** (unlisted in the store, a link for testers): any site including prod/client, captureVisibleTab with no friction.
- **Tauri — NOT the tester's browser but the ANALYSIS window for the author** (part of the devst UI plan): browsing cards "fact vs design", statuses. The argument against Tauri capture: the tester loses their own browser (passwords/bookmarks/habits) — per-session friction bigger than a one-time extension install; the CDP upside is already covered by the dev-mode `--hunt`.
- The heavyweight `--hunt` mode stays: the programmer reproduces from the card, console/network at maximum fidelity.

### The report payload (by the author's bug archetypes)

| Archetype | What we capture |
|---|---|
| "the layout is wrong / the image is broken / wrong background" | the selector + a screenshot of the moment + screen→figma reference at ingest |
| "the error message is in the wrong language" | **a DOM snapshot (outerHTML) at the moment** (the error text byte-for-byte) + a screenshot |
| "wrong field validation" | the field selector + DOM (attributes/aria) + the note text |

Common to all: URL+route, viewport, timestamp, note, severity; screenshots JPEG(q80, viewport) as base64 inside the JSON — a single file, sent via any messenger.

## 4d. Two products (the author's framing, 2026-09-09)

Not versions of one tool but two products on a shared codebase:

| | **Testing Staged** | **Testing Extra** |
|---|---|---|
| Codename | `staged` | `extra` |
| What it is | the bug-hunt.js snippet in the project repo (one line on staging) | a Tauri app (part of devst UI as a mode) |
| The case | 80% of frontend bugs: "the image is off, the styles are wrong" | the hard stuff: console, network, non-reproducible |
| Tester | their own browser, zero installation, PC+mobile | a separate window (a conscious price for CDP) |
| Capture | DOM+selector+screenshot (a getDisplayMedia session) | CDP: perfect screenshots, console, network |

**Shared by both (the generalization point):** the report format (W3C Web Annotation JSON, a single schema), `devst bugs --ingest` (the URL→screen→files translation, the card), card statuses, the agent surface. The products differ ONLY in the capture layer.

### The MVP tester surface (the minimal set, defined by the author)

1. **Point at an element + a comment** (a pin).
2. **A free comment WITHOUT an element** (about the page: "the background here looks off in general", "the signup form doesn't open at all").
3. That's it. Severity levels / a screenshot button — layered on top, not MVP blockers.

A free comment is a W3C annotation with target = URL and no selector (the model supports this natively); the card has no element section but carries the screen/page facts.

### The machine-processing contract (what the AI gets)

A BUG-NN card carries: the note (verbatim), the time, URL+viewport → a registry screen → files; with a pin — the selector, the text quote, a DOM snapshot of the moment, a screenshot of the moment; at ingest — the screen's figma reference. Every field is either machine-processed (selector→files) or ready for agent consumption (DOM, screenshot). Free comments are grouped by screen and enter the same feed.

## 4e. Storage on the tester's side and delivery (a hard constraint: frontend-only, no backend)

### Storage: an IndexedDB session, not localStorage

localStorage (~5 MB, strings) won't fit images. **IndexedDB**: hundreds of MB, native blobs, survives reloads/navigations (one origin of staging = one session). After a reload the overlay restores: "you have N unsent reports" — nothing is lost. One active session per origin, with a timestamp.

### Screenshots: html2canvas by default, getDisplayMedia optional

The key insight: html2canvas renders the **live DOM at pin time** — the state hasn't escaped yet (the error is on screen, the form is filled), i.e. it is an honest "screenshot of the moment", just approximate on exotic CSS. In exchange:
- **zero permission dialogs** (the brain-dead requirement!);
- **works on mobile** — including iOS Safari, where getDisplayMedia doesn't exist;
- same-origin staging → no CORS tainting of images.

getDisplayMedia (perfect pixels) — an opt-in "exact screenshots" toggle on desktop (one permission per session). Plus a manual "attach screenshot" button is always available (file input → the mobile gallery: testers already take screenshots with buttons anyway).

### Delivery: one file bundle, by hand, no server

1. At the end of a session the tester hits "Collect reports" → **one self-contained .json** (all the session's reports, screenshots inside as base64 JPEG; 15 pins ≈ 2–3 MB).
2. Desktop: a download. Mobile: the **Web Share API** (`navigator.share({files})`) — the system share sheet → Telegram/email the tester already knows. Fallback — a download.
3. The file reaches the developer via any messenger.
4. Dev: the file into `docs/bugs/inbox/` → `devst bugs --ingest` (base64 unpack → `docs/bugs/evidence/`, the cards). After a successful ingest — "clear the session" (the tester confirms).

Optionally (if the frontend ever gets its own edge endpoint, e.g. serverless next to the hosting): a `window.__BUG_HUNT__.endpoint` flag — an auto-POST. Not a requirement; the base path is the file.

## 4f. Distribution: clean TS inside, obfuscation for outside repos (an author requirement)

**Principle:** source and artifact are separated. bug-hunt is written in readable TS (`src/bug-hunt/` in the devst repo, with doc comments — our quality invariant). Only the built `bug-hunt.js` ships to a target repo; the build mode is a flag at emit time:

```
devst bugs --emit [--readable] [--domain staging.example.com] [path]
# the default is obfuscate; --readable is an explicit opt-in for own repos
```

- **`--obfuscate` is the DEFAULT** (author decision, 2026-09-09): javascript-obfuscator at maximum — the goal: whoever receives the file thinks "not worth it, whatever" or suffers for a long time. Profile: control-flow flattening, string-array RC4 + shuffles, dead-code injection, renaming everything, number expressions, string splitting, self-defending (breaks on beautify).
- `--readable` (an explicit flag for own/pet repos where we want to debug): an esbuild bundle + terser minify.
- `--domain` (recommended always): **domainLock** — the script only runs on the client's domain: protection against extraction + a per-client binding of the artifact.

**An honest threat model:** client-side JS is always reversible — the goal is not "impossible" but "expensive": from a readable file an AI restores the logic in minutes; from an obfuscated one (flattening + RC4 strings) it's hours of manual work even with AI help. That discourages the client's team.

**The correctness contract (stage S4):** the same e2e suite runs against BOTH builds — obfuscation is not allowed to change behavior (aggressive options sometimes break things; hence the test double is a mandatory gate).

**Caveats:** (1) size ×3–5 and a slowdown — acceptable for a staging overlay; (2) never a source map in the obfuscated build; (3) if the devst repo goes public, the bug-hunt source either stays in the private part, or we accept that the protection targets the receiving client, not the world; (4) some enterprise contracts FORBID obfuscated deliveries — check the client's contract before --obfuscate.

## 5. Decision protocol

| # | Question | Status |
|---|---|---|
| 1 | Capture: **a snippet v1 + an extension v2, Tauri = the analysis window** (the recommendation above) | pending approval |
| 2 | Severities: tester words (blocker/looks-off/nit) vs a P0–P3 scale? | waiting |
| 3 | Delivery: one JSON file via a messenger (the recommendation) | pending approval |
| 4 | ~~A screenshot of fact at ingest~~ → resolved by the "state at the moment" requirement: the screenshot travels in the payload, re-shooting is optional for diffing | resolved |

## 6. Stages

**Testing Staged (MVP):**
- [x] S1. bug-hunt.js: the overlay (pin+comment, a free comment), a stable-selector generator, a DOM snapshot (password masking), a getDisplayMedia screenshot session, a single-JSON export
- [x] S2. `bugs --ingest`: URL→screen→files (registry+scan-ui), screenshot unpacking, the figma reference, the .md card (a pin and a free comment — two templates)
- [x] S3. Card statuses (new → fixing → closed + a log line); the map section — with S5, together with the real cards
- [x] S4. Tests: unit tests of the translation (registry/selector/payload fixtures), an ingest e2e (a fixture server + a report JSON → a card)
- [ ] S5. The first live run with a designer-tester → an ADR

**Testing Extra (after Staged settles):**
- [ ] E1. A Tauri "testing" mode in devst UI: an embedded browser + CDP capture
- [ ] E2. The same report format (the contract is verified by both products)

## 6a. The fixture fortress — built (a Quasar workspace, 2026-09-09)

**Problem:** the staging fixture was hand-made HTML: 1–2 classes, no nesting, no UI-kit wrappers. A real frontend (Quasar and peers) is div-hell: 5–8 levels of nesting, 10–20 classes per element (`q-btn q-btn--outline q-btn--rectangle bg-primary text-white q-hoverable q-clickable …`), mixin wrappers, teleports (QMenu/QDialog into body), SSR hydration attributes. Our selector generator and html2canvas must prove themselves on THIS.

### Built (author decision: a pnpm workspace, NOT a CDN)

1. **`fixtures/staging-app/`** — a real Quasar frontend in the pnpm workspace (`@devst/staging-app`, a Vite build → dist/spa, zero CDN). Screens: signup (q-form/q-input with rules = real validation), orders (q-table/q-list/q-btn), profile (q-card/q-avatar), and a q-dialog with an error (archetype #2 — a hardcoded wrong-language error inside a teleported popup). This provides: real div-hell, q-* classes, teleports, ::before/::after.
   - Register: q-form + q-input :rules (lazy-rules = real validation), q-select, q-toggle, a teleported q-dialog with an English error
   - Orders: q-table with slots + q-chip/q-badge/q-btn inside cells, q-linear-progress, q-pagination, q-expansion-item
   - Profile: q-card horizontal, q-avatar, q-tabs + q-tab-panels, q-slider, q-banner
   - App: q-layout/q-header/q-drawer/q-footer, material icons locally (@quasar/extras)
   - Hash routing (createWebHashHistory) — exercises the ingest's matchScreen
2. **What the fortress gate checks exactly** (tests/bug-hunt-quasar.test.ts):
   - the selector generator: on a q-btn without data-testid, the path through nth-of-type stays ≤ 6 levels and doesn't collapse on a 20-class element;
   - the DOM snapshot: the teleported dialog is captured whole (not empty);
   - html2canvas: q-prefixed gradients/icons don't turn the screenshot into mush (the known pain: webfonts/flex/filters);
   - ingest mapping: Quasar hash-routed URLs (#/orders) → a registry screen.
3. Findings made during construction (all valuable — the fortress has already proven its worth):
   - the hash URL `#/register` didn't map → matchScene learned SPA routes
   - Quasar puts data-testid directly on the native input, not on the q-field wrapper
   - lazy-rules needs a blur (Tab), not just a fill — otherwise the message doesn't render
   - q-dialog teleports to body (confirmed: NOT inForm)
   - `page.fill` doesn't trigger Quasar validation — a Tab press is needed
   - CSS.escape is missing in older contexts — capture.ts already handles it

## 6b. The two-way overlay (the author's idea, 2026-09-09; a long-term TODO)

Bug Hunt is not only for testers. The overlay is a **general visual ↔ code bridge**:

| Mode | Who | What it does | Writes to |
|---|---|---|---|
| 🐞 Bug | tester | a pin + a comment | IndexedDB → a bundle → `bugs ingest` → a card |
| 🔒 Freeze | developer | a pin = "the layout is ready for testing" | **directly into docs/ui-freeze.md** (no AI middleman) |
| 👁 View | both | a "show frozen" button | highlights 🔒/🔒🔒/free on the live page |

### The key task: visual → component WITHOUT AI

A pin on a q-btn → automatically understand "this is src/pages/OrdersPage.vue, component OrderList". Options:

1. **Build-time instrumentation**: a devst Vite plugin adds `data-devst-file="src/pages/OrdersPage.vue"` to every SFC root in dev/staging builds. The overlay reads the attribute on click → a ready mapping. Zero AI, zero manual work.
2. **The Vue DevTools protocol**: `__VUE_DEVTOOLS_GLOBAL_HOOK__` — in dev mode the overlay can ask the Vue component tree directly.
3. **Fallback — the registry**: as today (URL → screen → files).

Option 1 is the favorite: cheap, explicit, works on staging (not only in dev).

### The freeze pin: what gets recorded

A click on an element in 🔒 mode → a direct append into `docs/ui-freeze.md`:
- the screen (from the URL via the registry)
- the file (from data-devst-file or the fallback)
- the "hard" status (the default for freezes)
- the date = today

**No AI middleman** (not card → later registry, but straight into the registry) — faster, and the developer sees the result in the docs instantly.

### The 👁 "show statuses" mode

A button in the overlay → the overlay reads `docs/ui-freeze.md` (a fetch from the same origin if the docs are served on staging; or embedded at emit) → highlights elements:
- 🔒🔒 hard — a red outline + a label
- 🔒 soft — yellow
- free — no highlight

The tester and the developer **see on the live page** what is already frozen.

### Dependencies

- Requires a decision on component mapping (option 1 = a Vite plugin — a separate artifact shipped with devst)
- The 👁 mode is safe (read-only), it can come earlier
- The 🔒 mode requires docs write access (repo access from staging, or an intermediate buffer → `devst freeze --ingest-pins`)

## 7. Non-goals

- A task tracker (the cards live in docs/; no Jira integration).
- Session/video recording (the rrweb class is heavy; pinpoint pins cover the case).
- Native mobile apps (web only).
