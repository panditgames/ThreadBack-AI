# ThreadBack AI — EurekaDev 2026

## Project identity
**Name:** ThreadBack AI
**Tagline:** Return to the task, not just the tab.
**Track context:** Coding → Computer Science + AI (provided project context; independently check the platform's current fields).

**Elevator pitch:** ThreadBack AI is a local-first browser extension that reconstructs task context from browsing metadata. It groups related pages into explainable intent threads, shows where the browsing sequence stopped, and restores relevant tabs with a concise recovery briefing. It helps people recover momentum after interruptions without sending their browsing history to a remote AI service.

## Problem
History records a chronological stream of pages. Bookmarks preserve selected links. Session managers restore windows. Those artifacts rarely capture the relationship between a goal, its evidence and the next unfinished step. When research, shopping and project work overlap, users must reconstruct that context themselves.

## Solution
ThreadBack organizes activity into Intent Threads with task cards, a timeline, a milestone graph and a Why explanation. Resume Task selects saved HTTP(S) URLs, reuses matching open tabs, reopens missing pages and focuses the suggested next-action tab. Its briefing distinguishes observed actions from likely progress and suggested remaining work. Manual controls let users correct the inference.

## Implemented features
- Manifest V3 extension with a compact popup and full dashboard.
- Automatic metadata collection and incremental local clustering across domains.
- Task cards, substring search, rename, merge/split, status updates, archive and deletion.
- Timeline, explainability, Intent Graph and interruption-recovery briefing.
- Resume with URL deduplication/reuse, missing-tab restoration and focus selection.
- Browser-local persistence, future-capture domain exclusions and erase-all controls.
- Charcoal/teal glass UI, responsive layouts, modal keyboard focus/Escape and reduced-motion styling.
- Deterministic synthetic Demo Data: EurekaDev submission, ANC headphones and physics assignment.

## Technical architecture
A TypeScript Manifest V3 service worker observes chrome.tabs lifecycle metadata. The collector normalizes URLs and filters internal, incognito, local and excluded pages. IntentEngine incrementally compares title/query keywords, domain relationships, temporal proximity, opener links and browsing sequence. Weighted deterministic scoring and explicit thresholds drive grouping; rules derive task labels, milestones and next actions.

React renders the popup/dashboard and evidence dialogs. Validated state persists in chrome.storage.local, and UI edits synchronize with the worker. Resume queries actual browser tabs and handles individual restoration failures without abandoning the remaining task. No backend or paid AI model is required. A companion HTML page exists, but native side-panel registration is not implemented.

## Innovation
ThreadBack connects a goal, related pages, inspectable evidence and a suggested continuation. That task-recovery model goes beyond restoring a raw list of URLs. Local deterministic inference makes the signals inspectable and the demo reproducible. This prototype does not claim a novel machine-learning model or universal intent accuracy.

## Technical challenges and solutions
- **Navigation placeholders:** Chromium emits temporary URL-shaped titles. Shared hostname words initially merged unrelated tasks. The collector now defers loading documents and uses path words for URL-placeholder titles while retaining the actual URL. A targeted regression and actual-browser mixed-task check verified the fix.
- **Worker/UI state:** Storage-change synchronization prevents stale worker state from reviving deleted or manually edited threads. An empty-state marker prevents demo resurrection after erase/restart.
- **Recovery:** Resume rejects unsafe schemes, deduplicates URLs, reuses existing tabs and tolerates denied/stale tab operations.
- **Honest explanations:** Signals come from retained browsing evidence. Visits and inferred milestones are explicitly separated from proven task completion.

## Testing and evidence
The v1.1.0 suite contains 111 tests across 16 files. One full local run passed, followed by 19 affected passes after browser-driven startup adjustments. Ten existing actual Chromium core checks passed before those adjustments; both affected model-recovery and final UI/privacy checks passed on the final build. Matching GitHub CI verifies the complete release source; HANDOFF.md records exact staged evidence and limitations. No benchmark is a claim of intent-detection accuracy.

Actual unpacked-extension testing in bundled Chromium used isolated persistent profiles, controlled HTTP pages and real service-worker, tab and storage APIs. It covered automatic collection, three separated scenarios, popup/dashboard, Demo Data, Why, Timeline, Graph, Resume, tab reopening/reuse, archive, merge/split, privacy, deletion, keyboard navigation and browser restart. Installed Google Chrome and Microsoft Edge distributions were not independently qualified. Component and worker tests using mocks are separate coverage.

The earlier v1.0.0 10,000-event engine benchmark completed in 43.2 seconds against a 90-second budget. This is a local throughput measurement, not a browser rendering benchmark or a guarantee on other machines. HANDOFF.md records the final run. Three controlled scenarios are not a population-level clustering accuracy metric.

## Privacy and security
Collected metadata includes URLs/query strings, titles, domains, timestamps and tab relationships. Page bodies, passwords, form inputs, cookies and keystrokes are not collected. Permissions are limited to tabs, storage and alarms; there are no host permissions, history import or content scripts. The product has no telemetry or automatic remote AI upload.

Content extraction and remote AI are reserved, disabled controls. An experimental provider adapter is not connected to the workflow. Storage is local, not application-encrypted; URLs/titles may contain sensitive information. Exclusions affect future capture, so erase existing data separately. Resume makes normal requests to restored websites. Use a separate profile for judging.

The current dependency audit reports zero production advisories and 10 development-toolchain advisories: 3 moderate, 5 high and 2 critical. Major migrations were deferred to preserve the tested toolchain; see HANDOFF.md for dated evidence and risk boundaries.

## Honest limitations
Inference is heuristic: generic titles and overlapping tasks can be ambiguous, and visits cannot prove completion. Some illustrative demo URLs require login or may no longer resolve. Remote AI, page extraction, export, automatic age retention and native side-panel registration are not implemented. Core local recovery works without those optional features. Stored evidence is bounded rather than a permanent full-history archive.

## Future improvements — not implemented
Broader multilingual evaluation; explicit retention/export controls; independent installed Chrome/Edge qualification; better ambiguous-title handling; native side-panel integration; and an explicit-consent remote enhancement workflow.

## Links and media
- Repository: https://github.com/panditgames/ThreadBack-AI
- Release: verify the v1.1.0 GitHub Release after publication; otherwise use the verified local ZIP listed in HANDOFF.md.
- Demo video: **[ADD YOUR RECORDED VIDEO URL BEFORE SUBMISSION]**
- Screenshots: **[ADD UPLOADED SCREENSHOT LINKS]**. Sanitized captures are generated under release/screenshots by the browser smoke.
- Installation: README.md. Release evidence: HANDOFF.md.

## Credits and attribution
Antigravity assisted the original implementation. OpenAI Codex assisted QA, targeted debugging, regression tests, UI refinement, release automation and documentation. Runtime inference is deterministic local logic, not an active remote generative model. React, TypeScript, Vite, Tailwind CSS, Lucide and Vitest retain their upstream licenses. We do not claim every line was handwritten. No project license has been selected; public source availability alone does not grant a software license.

### v1.1.0 local semantic scoring

The heuristic engine now has a tiny on-device concept classifier as an additional, confidence-gated signal. Its hand-authored English synonyms help related titles such as “EurekaDev project submission” and “How to win a hackathon” without requiring exact keyword overlap. Both pages must carry specific metadata evidence; unknown or mixed topics abstain. The classifier ships in the ZIP, needs no backend or API key, and falls back locally if unavailable. It is not an LLM, trained sentence embedding or universal semantic understanding.
