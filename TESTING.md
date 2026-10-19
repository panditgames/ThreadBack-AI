> **v1.2.0:** current architecture and verification are documented in [V1_2_RELEASE_AUDIT.md](V1_2_RELEASE_AUDIT.md). Earlier dated test/engine notes below are historical.

Current v1.2.0 verification: **181 tests passed / 0 failed (25 files)**; actual unpacked Chromium **23/23 passed**, including restart and four pending records replayed with zero loss/duplicates. See the current audit for curated semantic evidence and limitations.

# ThreadBack AI test commands

Run npm run typecheck, npm run lint, npm test, and npm run build. Dependencies are locked in package-lock.json; use npm ci on a clean checkout.

The suite covers scoring/tokenization, mixed hackathon/shopping/study clustering, unrelated same-domain pages, duplicate/closed tabs, resume selection/reuse, explanation grounding, corrupt state recovery, reload persistence, privacy exclusions, AI fallback, merge/split, worker lifecycle mocks and React dashboard interactions. The existing benchmark processes 10,000 synthetic events under a 90-second engine budget. This does not establish browser UI performance with 10,000 rendered events.

Targeted checks can run with npx vitest run tests/integration/releaseRegression.test.ts tests/integration/workerLifecycle.test.ts tests/ui/dashboard.test.tsx.

Run node scripts/releaseScan.js before committing. It scans tracked and prospective files for recognizable keys, private-key markers, user paths, email addresses and unsafe artifact filenames. It supplements manual review; it is not a proof that every possible secret is absent.

Actual unpacked-extension workflows and restart passed in bundled Chromium with real tab/storage APIs. Worker integration and React tests use mocks and do not independently establish browser behavior. Installed Chrome/Edge distributions remain separate manual checks; web preview cannot restore tabs. See HANDOFF.md for dated results.

After building, run node scripts/verifyExtension.js to check the MV3 manifest, local entrypoints/assets, worker and icon dimensions. Targeted polish coverage: npx vitest run tests/ui/polish.test.tsx.

Native unpacked smoke checklist (use a separate browser profile): load dist in Chrome/Edge Developer mode; check popup and dashboard; load Demo Data and confirm three threads; open Timeline, Why and Intent Graph; resume a thread with open and closed tabs; search, rename, archive and split; reload and confirm persistence; verify content analysis is disabled; erase all data and confirm settings remain reset after saving/reloading. Check keyboard Tab/Escape and narrow dialog scrolling. The companion sidepanel.html page is built but native side-panel registration remains unimplemented.

## Reproducible actual-extension smoke

After building, run node scripts/extensionSmoke.js with an existing Playwright installation and Chromium. This optional smoke is separate from lightweight CI. It uses a disposable profile and real HTTP fixture pages served locally through test-domain mapping. It checks the real toolbar popup, tracks/clusters six pages, restores/reuses tabs, restarts the browser and saves sanitized desktop/popup screenshots under release/screenshots. Chrome APIs are not mocked. Only the script's own temporary profile is removed.

By default it imports the optional package playwright and uses its Chromium channel. To reuse an external installation, set THREADBACK_PLAYWRIGHT_MODULE to its module file URL and THREADBACK_CHROMIUM_EXECUTABLE to its Chromium executable. No personal profile is accepted. If you lack Playwright, install it separately for browser testing; it is not a production dependency. Missing browser support is a blocked smoke, not a pass. The local fixtures test pipeline behavior, not universal clustering accuracy.

CI uses Node 22 LTS, npm caching and read-only repository permissions. It runs npm ci, typecheck, lint, the full Vitest suite, one production build, verifyExtension and releaseScan. It does not run the optional headed smoke or claim installed Chrome/Edge certification.

## Independent clustering audit

The clustering-scenario suite includes overlapping/interleaved searches, no-opener destinations, query-evidence provenance, one-word false positives on high-variety platforms, erased/restarted context, completion boundaries, persistent manual completion and case-insensitive HTTP(S) restoration. The optional extension smoke now adds controlled Google/search and YouTube/ChatGPT fixtures, explicit MV3 worker termination, unsafe stored-URL fixtures, and complete/archive/delete persistence using real APIs. HTTPS fixture responses are intercepted synthetic HTML; extension APIs are never mocked. See the dated HANDOFF.md entry for actual results.

For a targeted browser rerun, THREADBACK_SMOKE_TEST filters check names; a filtered run is not a full smoke pass. THREADBACK_SMOKE_DEBUG logs only the isolated synthetic profile's actual tab metadata/events. No-opener fixtures use real chrome.tabs.create followed by controlled navigation; they are focused to avoid lazy background rendering on the test host. The worker-restart check explicitly stops the service worker and verifies that a temporary global marker disappears before opening a result.

## v1.1.0 hybrid scorer coverage

The localSemantic integration regressions compare synonym-only grouping with model availability versus heuristic fallback; cover headphone/hackathon cross-domain workflows, Python topic separation, high-variety platforms, generic words, mixed/insufficient evidence, confidence gates, invalid/missing assets, inference errors, cold model instances and manual corrections. A bounded microbenchmark reports parsing/normalization initialization and mean metadata-pair inference time; it excludes asset-fetch latency and does not measure RAM.

The existing actual Chromium smoke additionally verifies the separate bundled JSON, synonym-only grouping, real worker restart with a temporarily invalid model asset, heuristic fallback and model restoration. The asset is restored in a finally block before the final UI smoke. Fixtures remain synthetic and Chrome APIs real; no personal browser profile is used. See HANDOFF.md for this release's measured results.

## TinySemanticClassifier independent audit

The 50-case benchmark is a curated development regression set that overlaps the classifier vocabulary, not an independent held-out accuracy study or end-to-end engine benchmark. Its ambiguous labels are hand assigned; separate integration tests check actual production band boundaries [0.25,0.50), confidence boundaries, authentic-query handling, malformed inputs, returned fallback and a thrown exception on the real singleton. Two generic recorder/upload cases were relabeled as lacking captured task evidence; denominators are derived from labels rather than hardcoded. No inference about general accuracy or exact RAM follows from these tests.

Independent negative cases cover generic words, substrings, brand names, platform/domain contamination and conflicting topics. The real Chromium smoke now includes Tokyo hotel versus subway metadata whose first-stage score is below the join threshold but in the resolver band, plus unrelated coding metadata. Unit assertions independently establish this ambiguity path. It uses real tab/storage APIs and isolated synthetic fixtures.
