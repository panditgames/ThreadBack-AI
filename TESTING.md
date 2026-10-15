# ThreadBack AI test commands

Run npm run typecheck, npm run lint, npm test, and npm run build. Dependencies are locked in package-lock.json; use npm ci on a clean checkout.

The suite covers scoring/tokenization, mixed hackathon/shopping/study clustering, unrelated same-domain pages, duplicate/closed tabs, resume selection/reuse, explanation grounding, corrupt state recovery, reload persistence, privacy exclusions, AI fallback, merge/split, worker lifecycle mocks and React dashboard interactions. The existing benchmark processes 10,000 synthetic events under a 90-second engine budget. This does not establish browser UI performance with 10,000 rendered events.

Targeted checks can run with npx vitest run tests/integration/releaseRegression.test.ts tests/integration/workerLifecycle.test.ts tests/ui/dashboard.test.tsx.

Run node scripts/releaseScan.js before committing. It scans tracked and prospective files for recognizable keys, private-key markers, user paths, email addresses and unsafe artifact filenames. It supplements manual review; it is not a proof that every possible secret is absent.

Native Chrome/Edge extension loading, actual browser restart, and cross-window focus require manual verification when only the in-app browser is available. Mocked APIs cover worker synchronization and tab restoration; web preview cannot restore tabs. See HANDOFF.md for current results.

After building, run node scripts/verifyExtension.js to check the MV3 manifest, local entrypoints/assets, worker and icon dimensions. Targeted polish coverage: npx vitest run tests/ui/polish.test.tsx.

Native unpacked smoke checklist (use a separate browser profile): load dist in Chrome/Edge Developer mode; check popup and dashboard; load Demo Data and confirm three threads; open Timeline, Why and Intent Graph; resume a thread with open and closed tabs; search, rename, archive and split; reload and confirm persistence; verify content analysis is disabled; erase all data and confirm settings remain reset after saving/reloading. Check keyboard Tab/Escape and narrow dialog scrolling. The companion sidepanel.html page is built but native side-panel registration remains unimplemented.
