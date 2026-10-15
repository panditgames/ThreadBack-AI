# ThreadBack AI release handoff

EurekaDev 2026 — Coding / Computer Science + AI. QA and UI polish completed 15 October 2026 (Asia/Calcutta).

## Release gates

- Typecheck: PASS (npm run typecheck).
- Lint: PASS (npm run lint).
- Tests: 78 passed, 0 failed across 14 files in the final full run. Includes clustering, resume, explanation, storage, worker lifecycle, privacy, AI fallback and React workflows.
- Production build: PASS (npm run build). Manifest V3, bundled module worker, popup/dashboard and icons generated in dist.
- Performance: 10,000 synthetic events in 11.1 seconds, below the 90-second budget; incremental regression passed. Baseline was 56.5 seconds. This measures engine throughput, not a browser render benchmark.
- Secret/personal-data scan: PASS on final tracked/prospective files; manual fixture review found synthetic data only. Generated builds, dependencies, local QA logs, environment files and profiles are excluded.
- Browser/extension QA: PASS in bundled Chromium on 16 October 2026. Playwright loaded dist as an actual unpacked extension in a separate persistent profile, with real service-worker/tab/storage APIs. Headed native toolbar popup opening was confirmed through Chrome runtime POPUP contexts; the popup document and dashboard rendered. Demo Data, Why, Timeline, Graph, keyboard focus/Escape, archive/unarchive, merge/split, privacy settings/exclusions, individual deletion and erase-all passed. After the collector fix, six real HTTP fixture pages formed three tasks; Resume reopened a closed tab and reused open tabs; browser close/relaunch preserved threads; the final actual-extension smoke reported no page console errors. Fixture content was synthetic; Chrome APIs were not mocked. Installed Google Chrome and Microsoft Edge distributions were not separately qualified.

## Real-browser follow-up — 16 October 2026

Found and fixed premature intent assignment from Chromium URL-shaped placeholder titles: wait for completed navigation and use path words instead of shared hostname words when no real title is available. Initial demo restoration assertions encountered external login redirects; restoration/reuse passed against controlled real HTTP pages. Native popup targeting used actual runtime contexts because Playwright does not expose the toolbar widget as a normal page. One new collector regression passed; the previous 78-test full suite was not repeated. Production rebuild passed.

## UI polish and targeted fixes

Charcoal/teal shared theme, glass surfaces, quieter typography/cards, consistent buttons and scrollable dialogs. Added modal focus trapping/Escape/focus restoration, keyboard task/graph/tab selection, Archived filtering, split-selection reset and all-tabs guard. Erase-all resets dashboard privacy/AI state so saving cannot restore an erased key. Six focused UI regressions added; TESTING.md contains a native extension smoke checklist.

## Defects fixed

Worker/UI saved-state synchronization and live privacy updates; delete-all/last-thread reload behavior; corrupt saved-thread validation; split source evidence; repeated/closed activity routing; unrelated same-domain clustering; executable/malformed URL filtering and query decoding; evidence-grounded explanations and demo signals; retention-cap incremental inference; continuation after individual tab restore errors; accurate resume/graph wording. Unused history/sidePanel permissions were removed.

## Limitations

Remote AI and page-content extraction are reserved, disabled controls. Export, automatic age retention and browser side-panel registration are not implemented. Inference is heuristic; visits do not prove task completion. Demo URLs are illustrative and may require login or be unavailable. Browser storage is not application-encrypted; URLs/titles can contain personal data. Use a separate browser profile for judging.

npm audit reported 10 development-toolchain advisories: 3 moderate, 5 high, 2 critical, involving test/CSS tooling. No production dependency was implicated. Major tooling migrations were not performed in this runtime-focused QA pass. These advisories must be considered before exposing development/test servers or processing untrusted build inputs.

## Release packaging

Build locally with npm ci and npm run build, then load the project dist folder through Chrome/Edge Developer mode. The source tree is intended for the public panditgames/ThreadBack-AI repository. Earlier local commits contain personal author metadata and are retained locally on master; a clean main snapshot avoids publishing that history. No force push is authorized.
