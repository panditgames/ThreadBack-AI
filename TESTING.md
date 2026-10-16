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
