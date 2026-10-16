# ThreadBack AI architecture

## Runtime

Manifest V3 loads src/background/serviceWorker.ts. The ActivityCollector observes tab creation, URL/title updates, activation and removal. It filters internal, local, excluded and incognito pages. Loading documents are deferred; URL-shaped placeholder titles use path words rather than shared hostnames, preserving the actual URL while avoiding premature cross-task joins. History import and page-body extraction are not implemented.

IntentEngine incrementally compares each event against anchor/search/opener/recent events and retained keywords of non-archived threads. The join threshold is 0.40. Similarity combines title (0.28), query (0.22), domain (0.15), time (0.15), opener (0.12) and sequence (0.08) signals, with explicit boosts and disjoint-topic penalties. Timing uses discrete bands rather than exponential decay. Events are capped at 100 and tabs at 50 per incrementally updated thread; merge retains up to 150 events.

Known-page activation/closure routes to its existing thread. Duplicate event IDs are ignored. Generic titles remain ambiguous; manual rename/merge/split/status controls correct inference. Splits recompute both sides from retained evidence.

Milestones, next actions and status are heuristics, not proof of task completion. Explanations count distinct page titles and derive similarity metrics from adjacent unique-page event pairs. They describe retained evidence rather than storing a historical decision trace for every join. Intent Graph is a directed linear milestone chain, displayed as clickable cards with evidence.

## State and UI

StorageManager validates saved state and writes chrome.storage.local (localStorage in web preview). Corrupt entries are filtered/defaulted. Data is not encrypted. Worker initialization shares one promise. Storage changes synchronize the worker engine/privacy settings with UI edits; popup and companion page listen for saved-state changes. A ten-minute alarm persists state after initialization. An empty timestamp marker prevents delete-all or last-thread deletion from restoring demo data. Fresh storage-instance tests and worker mocks cover state handling; actual bundled Chromium close/relaunch with an isolated persistent profile also passed. Installed Chrome/Edge distributions remain independently unqualified.

Dashboard provides cards, substring search, timeline, explanation, graph, recovery banner, resume and manual controls. Popup provides quick resume/status and dashboard access. A sidepanel HTML page exists but is not registered in the browser manifest. Resume queries current tabs, reuses matching URLs, reopens missing HTTP(S) pages in saved order, and focuses the suggested next-action URL or most recently accessed page. Individual tab errors do not block remaining restoration.

## Demo and optional AI

The synthetic demo contains three fixed scenarios with relative timestamps based on the current time. It replaces stored threads; use a separate browser profile to avoid personal browsing collection. Some illustrative external URLs may require login or be unavailable.

The AIProviderService adapter is experimental, not invoked by the UI/worker. Its reserved switch and content-analysis switch are disabled. Direct developer invocation can send title/domain/query metadata to a provider; disabled/error paths use local heuristics.

## Verification

Vitest covers engine logic, storage, worker lifecycle mocks, security checks, React interactions and a 10,000-event benchmark. See TESTING.md and HANDOFF.md for actual results and practical browser coverage.

## Search context and completion hardening

A bounded in-memory buffer holds at most 32 authentic search sessions for 20 minutes. It ranks matching destinations using multiple distinct topic tokens (or a distinctive project/model identifier), never copies an inferred query into page evidence, ignores erased/archived owners, and does not persist extra context. Worker restart drops this optional buffer; retained genuine search events remain comparison anchors. Ambiguous destinations may lose confidence rather than being forcibly joined. Timing or platform domain alone cannot establish intent.

High-variety platforms have weaker domain signals. Generic action/platform words are filtered; direct opener evidence still supports related pages. Completion requires bounded receipt paths or explicit completion titles, not guide URLs or counts of inferred milestones. An explicit completed status stays until manually changed; completion never deletes a thread.
