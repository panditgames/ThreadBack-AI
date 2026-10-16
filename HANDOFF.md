# ThreadBack AI release handoff

EurekaDev 2026 — Coding / Computer Science + AI. Final release verification completed 16 October 2026 (Asia/Calcutta).


## v1.1.0 local semantic scorer — 16 October 2026

Added a hand-authored, six-concept English metadata classifier, not a trained embedding or LLM. It supplements only ambiguous, recent heuristic candidates; specific anchor + supporting cue evidence is required on both sides. Unknown/mixed concepts abstain. No dependencies, content scripts, permissions, backend, API keys, telemetry, external model downloads or persistent learned browsing data were added. Manual corrections and local privacy defaults are unchanged.

Model asset: 1,953 bytes. The generated extension increased from 394,546 to 398,383 uncompressed bytes versus the existing v1.0.1 build on this machine: +3,837 bytes including model and integration code. A 2,000-pair warmed microbenchmark measured approximately 0.032 ms per inference and 0.322 ms JSON copying/parsing + normalization initialization. Asset-fetch latency and runtime RAM were NOT measured; timings are host-specific and not an intent-accuracy evaluation. Model initialization has a bounded five-second local fetch deadline, and GET_ALL_THREADS reports its local readiness/status. Failures preserve heuristic operation.

Verification evidence:
- Targeted first pass: 47 clustering/scoring/model tests passed.
- One full local regression: 111 tests passed, 0 failed across 16 files; typecheck, lint, build, packaging and release/security scan passed.
- The first actual Chromium run passed all 10 existing core checks: native popup/dashboard, automatic mixed-task grouping, Resume/reuse/restoration, overlapping searches, real worker termination, cross-domain no-opener context, high-variety separation, unsafe restore rejection, manual states/deletion and browser-restart persistence. The new synonym fixture and closing UI smoke initially failed.
- The bounded model startup deadline was increased, read-only model status added, and UI automation now explicitly brings the dashboard to the foreground. After these changes, 19 affected model/worker tests, typecheck, lint and production rebuild passed; the regenerated package was verified. The complete final source suite is enforced again in matching GitHub CI.
- Only the two failed browser checks were repeated on the final build, both PASS: worker status ready; synonym-only grouping; an intentionally invalid local JSON asset causing heuristic-only separation; restored asset + actual worker restart recovering semantic grouping; final Demo Data/Why/popup/privacy UI smoke. Zero console errors were observed in this final run. This is staged verification, not a claim that an unfiltered 12-check run passed on the final build.
- Browser APIs were real, fixtures synthetic, profile isolated. The temporary invalid asset was restored in finally; its bytes were independently checked against source before packaging. No personal history was used. Installed Chrome/Edge distributions remain independently unqualified.

Artifact: release/ThreadBack-AI-v1.1.0.zip; 17 files verified byte-for-byte against final dist, manifest 1.1.0 at ZIP root. SHA-256: 5e1476b1cd890f922a2705c4c9894db0a6eb052d455de598939e43ddafc3b907. Publish only after the matching main-commit CI passes; preserve v1.0.0 and v1.0.1 releases. The immutable release tag and matching Actions run are the remote verification evidence.

Limitations: six curated English concepts rather than general language understanding; two different tasks in the same concept/session may remain ambiguous. No adaptive training or calibrated semantic probability is claimed. Existing development-toolchain advisories are unchanged; no dependencies were migrated. Browser-local storage is not application-encrypted.

## v1.0.1 independent audit — 16 October 2026

Reviewed Antigravity's seven-file patch rather than relying on its reported 87 passes. Independent tests reproduced overlapping-search merges, copied/invented query evidence, stale bridge use after erase, weak-word high-variety joins, broad completion matches and rejection of uppercase HTTPS restoration. Real Chromium also exposed browser-assigned opener IDs; opener/shared hosting alone is now insufficient. A separate latency regression reproduced lost captured URLs during overlapping worker storage reads. Worker mutations and saved-state synchronization now run in order.

Search sessions are bounded to 32 authentic queries with a 20-minute eligibility window. They rank matches without rewriting observed page queries, exclude missing/archived owners and are not persisted. Worker termination loses only this optional cache; retained genuine search evidence remains available. This is deterministic inference, not semantic understanding or an LLM.

Completion requires bounded receipt paths or explicit completion titles, not guide URLs or milestone counts. LIKELY_COMPLETE survives further activity and storage reconstruction; the user can return it to Active. No automatic deletion was added. Unsafe/non-web schemes are rejected in collection and restoration; normal case-insensitive HTTP(S), query strings and fragments remain eligible.

Local evidence:
- One complete local run: 94 passed, 0 failed across 15 files.
- Browser-discovered fixes were followed by 37 affected worker/clustering/scoring passes, including two additional regressions; the current suite therefore contains 96 distinct tests. The complete final source suite is also enforced by GitHub CI.
- Final typecheck, lint, production rebuild, verifyExtension and releaseScan passed. Only affected tests and necessary failed release gates were repeated.
- Fresh actual unpacked Chromium smoke: 11/11 PASS. It checked native popup/dashboard, live three-task grouping, overlapping Google queries, no-opener results across Devpost/Unstop/GitHub/YouTube/ChatGPT, high-variety separation, actual service-worker termination, safe restoration/reuse, completion/archive/deletion persistence, browser restart, returning completion to Active and final UI/privacy smoke. Console errors observed: zero.
- Worker termination was verified by an explicit DevTools stop and disappearance of a temporary global marker, not by assuming a Playwright event proves restart.
- HTTPS responses were controlled synthetic fixtures; Chrome APIs were real. Fixtures use foreground no-opener tabs to avoid lazy background rendering on this host. Focused reruns are explicitly filtered; only the final unfiltered 11-check result is the release smoke.
- The initial local benchmark processed 10,000 synthetic events in 5.6 seconds and formed 69 threads. This is not an accuracy evaluation or a comparable performance improvement over earlier releases; matching behavior and host load changed.

release/ThreadBack-AI-v1.0.1.zip has manifest version 1.0.1 at its root and 16 files matching tested dist byte for byte. SHA-256: ec5672269700b9fa8e4c5b7c258a4345810e82d534b8f4657be3840872f0b21c. Its source is committed before normal push; publication waits for the matching CI. Existing v1.0.0 and its asset are preserved. Inspect the matching release-commit Actions run rather than inferring remote CI success from local checks.

Limitations remain: heuristic grouping can be ambiguous; transient search confidence can be lost on suspension; installed Chrome/Edge distributions were not independently qualified; existing development-toolchain advisories remain documented below. No dependencies were upgraded in this audit.

## v1.0.0 release gates (historical)

- Typecheck: PASS (npm run typecheck).
- Lint: PASS (npm run lint).
- Tests: 79 passed, 0 failed across 15 files in the final full run. Includes clustering, resume, explanation, storage, worker lifecycle, privacy, AI fallback and React workflows.
- Production build: PASS (npm run build). Manifest V3, bundled module worker, popup/dashboard and icons generated in dist.
- Performance: 10,000 synthetic events in 43.2 seconds in this final run, below the 90-second budget; incremental regression passed. An earlier run measured 11.1 seconds; timings vary with machine load. This measures engine throughput, not a browser render benchmark.
- Secret/personal-data scan: PASS on final tracked/prospective files; manual fixture review found synthetic data only. Generated builds, dependencies, local QA logs, environment files and profiles are excluded.
- Browser/extension QA: PASS in bundled Chromium on 16 October 2026. Playwright loaded dist as an actual unpacked extension in a separate persistent profile, with real service-worker/tab/storage APIs. Headed native toolbar popup opening was confirmed through Chrome runtime POPUP contexts; the popup document and dashboard rendered. Demo Data, Why, Timeline, Graph, keyboard focus/Escape, archive/unarchive, merge/split, privacy settings/exclusions, individual deletion and erase-all passed. After the collector fix, six real HTTP fixture pages formed three tasks; Resume reopened a closed tab and reused open tabs; browser close/relaunch preserved threads; the final actual-extension smoke reported no page console errors. Fixture content was synthetic; Chrome APIs were not mocked. Installed Google Chrome and Microsoft Edge distributions were not separately qualified.

## Real-browser follow-up — 16 October 2026

Found and fixed premature intent assignment from Chromium URL-shaped placeholder titles: wait for completed navigation and use path words instead of shared hostname words when no real title is available. Initial demo restoration assertions encountered external login redirects; restoration/reuse passed against controlled real HTTP pages. Native popup targeting used actual runtime contexts because Playwright does not expose the toolbar widget as a normal page. The follow-up used one new collector regression. The later final release sequence included all 79 tests, as listed above. Production rebuild passed.

## UI polish and targeted fixes

Charcoal/teal shared theme, glass surfaces, quieter typography/cards, consistent buttons and scrollable dialogs. Added modal focus trapping/Escape/focus restoration, keyboard task/graph/tab selection, Archived filtering, split-selection reset and all-tabs guard. Erase-all resets dashboard privacy/AI state so saving cannot restore an erased key. Six focused UI regressions added; TESTING.md contains a native extension smoke checklist.

## Defects fixed

Worker/UI saved-state synchronization and live privacy updates; delete-all/last-thread reload behavior; corrupt saved-thread validation; split source evidence; repeated/closed activity routing; unrelated same-domain clustering; executable/malformed URL filtering and query decoding; evidence-grounded explanations and demo signals; retention-cap incremental inference; continuation after individual tab restore errors; accurate resume/graph wording. Unused history/sidePanel permissions were removed.

## Limitations

Remote AI and page-content extraction are reserved, disabled controls. Export, automatic age retention and browser side-panel registration are not implemented. Inference is heuristic; visits do not prove task completion. Demo URLs are illustrative and may require login or be unavailable. Browser storage is not application-encrypted; URLs/titles can contain personal data. Use a separate browser profile for judging.

Current npm audit (16 October 2026): zero production dependency advisories; 10 affected development-toolchain packages: 3 moderate (@vitest/mocker, postcss-nested, postcss-selector-parser), 5 high (braces, chokidar, fast-glob, micromatch, tailwindcss), 2 critical (tinypool, vitest). These counts include transitive affected packages, not ten distinct CVEs. Suggested root fixes require major Tailwind/Vitest migrations; the checked braces 3.0.4 patch does not exist in the registry. No compatible update was applied. Do not expose test/dev servers or process untrusted tooling inputs; lack of production advisories is not a general security guarantee.

## Release packaging

Build locally with npm ci and npm run build, then load the project dist folder through Chrome/Edge Developer mode. The source tree is intended for the public panditgames/ThreadBack-AI repository. Earlier local commits contain personal author metadata and are retained locally on master; a clean main snapshot avoids publishing that history. No force push is authorized.

## Final release deliverables

- One final local sequence: typecheck PASS, lint PASS after correcting the optional smoke script's browser-global declaration, 79 tests PASS, production build PASS, verifyExtension PASS, releaseScan PASS. Only the failed lint gate was repeated. The known non-fatal PostCSS from-option warning and Vitest environmentMatchGlobs deprecation remain.
- The preserved scripts/extensionSmoke.js passed all five focused checks after the final build: real toolbar POPUP context, six HTTP pages separated into three tasks, closed-tab restoration/open-tab reuse, actual persistent-context restart, final demo/popup/privacy/explanation smoke. Page console errors: zero. Earlier broader real-browser checks above remain applicable; mocks are separate coverage.
- Actual screenshots were inspected at desktop 1280×900 and popup 380×600. release/screenshots/dashboard.png is the task-card viewport; release/screenshots/popup.png shows the compact popup. Both display synthetic demo content only. No UI redesign was required.
- release/ThreadBack-AI-v1.0.0.zip contains manifest.json at the root and 16 files matching tested dist byte for byte. SHA-256: 0787600749f2f0d7e18260a0d2cae1bd288fc2fe323c9d655de4c37c00034276. Generated artifacts, screenshots, logs and profiles are excluded from Git. release/SHA256SUMS.txt records the digest.
- SUBMISSION.md supplies ready-to-copy project material; DEMO_SCRIPT.md is a timed 2:40 take; SUBMISSION_CHECKLIST.md lists the remaining human steps. Video and uploaded screenshot links intentionally remain placeholders.
- .github/workflows/ci.yml runs the required seven commands on main pushes and pull requests with Node 22 LTS, npm caching and read-only repository permissions. It builds once and does not launch browsers. The remote run must be observed independently; local passes do not imply green GitHub CI. Check the release commit on the Actions page and the final handoff report.

GitHub Release publication is attempted only after gates and the matching CI pass, without overwriting an existing v1.0.0. If publication is unavailable, use the verified local ZIP above. Installed Chrome/Edge qualification, recording/uploading the demo, checking actual platform requirements and submitting remain human actions. No store publishing or hackathon submission was performed.
