# ThreadBack AI release handoff

EurekaDev 2026 — Coding / Computer Science + AI. QA and UI polish completed 15 October 2026 (Asia/Calcutta).

## Release gates

- Typecheck: PASS (npm run typecheck).
- Lint: PASS (npm run lint).
- Tests: 78 passed, 0 failed across 14 files in the final full run. Includes clustering, resume, explanation, storage, worker lifecycle, privacy, AI fallback and React workflows.
- Production build: PASS (npm run build). Manifest V3, bundled module worker, popup/dashboard and icons generated in dist.
- Performance: 10,000 synthetic events in 11.1 seconds, below the 90-second budget; incremental regression passed. Baseline was 56.5 seconds. This measures engine throughput, not a browser render benchmark.
- Secret/personal-data scan: PASS on final tracked/prospective files; manual fixture review found synthetic data only. Generated builds, dependencies, local QA logs, environment files and profiles are excluded.
- Browser/extension QA: PARTIAL. Polished production previews checked at 390px and 1366px: dashboard, popup and companion page load; three demo threads, search, Why, Timeline, Intent Graph, Resume briefing, Escape dismissal, completion and reload persistence work. Privacy controls remain disabled by default and narrow dialogs scroll. No page runtime errors observed. MV3 worker, local assets, entrypoints and icon dimensions pass the packaging smoke script. Actual native Chrome/Edge unpacked loading, window focus and browser restart remain manual.

## UI polish and targeted fixes

Charcoal/teal shared theme, glass surfaces, quieter typography/cards, consistent buttons and scrollable dialogs. Added modal focus trapping/Escape/focus restoration, keyboard task/graph/tab selection, Archived filtering, split-selection reset and all-tabs guard. Erase-all resets dashboard privacy/AI state so saving cannot restore an erased key. Six focused UI regressions added; TESTING.md contains a native extension smoke checklist.

## Defects fixed

Worker/UI saved-state synchronization and live privacy updates; delete-all/last-thread reload behavior; corrupt saved-thread validation; split source evidence; repeated/closed activity routing; unrelated same-domain clustering; executable/malformed URL filtering and query decoding; evidence-grounded explanations and demo signals; retention-cap incremental inference; continuation after individual tab restore errors; accurate resume/graph wording. Unused history/sidePanel permissions were removed.

## Limitations

Remote AI and page-content extraction are reserved, disabled controls. Export, automatic age retention and browser side-panel registration are not implemented. Inference is heuristic; visits do not prove task completion. Demo URLs are illustrative and may require login or be unavailable. Browser storage is not application-encrypted; URLs/titles can contain personal data. Use a separate browser profile for judging.

npm audit reported 10 development-toolchain advisories: 3 moderate, 5 high, 2 critical, involving test/CSS tooling. No production dependency was implicated. Major tooling migrations were not performed in this runtime-focused QA pass. These advisories must be considered before exposing development/test servers or processing untrusted build inputs.

## Release packaging

Build locally with npm ci and npm run build, then load the project dist folder through Chrome/Edge Developer mode. The source tree is intended for the public panditgames/ThreadBack-AI repository. Earlier local commits contain personal author metadata and are retained locally on master; a clean main snapshot avoids publishing that history. No force push is authorized.
