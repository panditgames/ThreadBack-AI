# v1.2.0 final release verification

Local release gates passed. Publication additionally requires exact-commit GitHub CI success.

## Implementation

- BGE-small-en-v1.5 INT8 is the only production model. Every new semantic assignment uses local model evidence; weak/ambiguous metadata remains latent.
- One vector-only decision module ranks mature and latent workflows together. Five bounded representatives preserve an original purpose anchor; corroborated workflows can reconcile. Manual split boundaries are protected independently of naming.
- Removed policy keyword vetoes, old semantic authority, website/domain/opener bonuses and dead search-bridge state. Authentic queries replace search-page branding; exact hostname branding is removed generically, never treated as meaning.
- Placeholder URLs are not invented titles. Completed latent titles receive BGE reassignment while preserving earlier events.
- Reproduced a real ONNX startup stall in MV3 workers, including a standalone bundle and diagnostic keepalive. The same model initialized in an actual extension page. A dedicated local worker/offscreen host fixes the runtime context without replacing BGE or the durable pending-event queue.
- Offscreen startup passed actual Chromium without keepalive: 384-dimensional output and extension-local resource requests, with singleton hiding. The one additional permission is documented; no page-content/host permission was added.
- The old unloaded concept JSON no longer ships. Experimental scoring replicas are preserved locally outside the release source. Benchmarks now use production IntentEngine and final workflow membership without forced seed merges.

## Evidence

20 new-topic interleaved five-step scenarios passed coherently with no cross-purpose merges in that curated set. They were introduced after the decision architecture; production membership contains none of their topic vocabulary. This is engineering evidence, not real-world accuracy.

The legacy Dataset A expectation required joining an opaque repository title ('AI Intent Engine') using its project identifier/opener. The AI-only engine correctly keeps that page latent while grouping the three explicitly hackathon-related pages; the regression now asserts this conservative outcome and preservation of all four tabs. No threshold was lowered to force this ambiguous join.

The generic unqualified Privacy Policy negative remains. A topic-qualified policy title can be semantically ambiguous from metadata alone; its regression checks opener invariance rather than reinstating a forbidden keyword veto. No claim of perfect purpose discrimination is made.

Final verified counts are recorded below. Tests explicitly include failed inference, normalization/dimension safety, one-stray-page resistance, manual-split preservation, no-opener/search controls, URL security, privacy, persistence and durable replay.

## Reproduction

Run npm ci, npm run typecheck, npm run lint, npm test, npm run build, node scripts/verifyExtension.js and node scripts/releaseScan.js. Tests use one worker to bound local-model memory; slow module-init hooks have a bounded 90-second budget.

Run node scripts/aiFirstSmoke.mjs with the existing Playwright bundled Chromium, optionally setting THREADBACK_CHROMIUM_EXECUTABLE. It creates an isolated temporary profile and synthetic fixtures, blocks external networking, and exercises real tabs/storage/MV3 APIs. No personal profile or real history is used. Diagnostic keepalive is not a release test.

The optional 165-pair/25-sequence production replay is node scripts/auditAIEngine.mjs. Historical tournament/MiniLM/Tiny-classifier scores do not qualify this engine.

## Limitations

Embedding similarity is not calibrated probability or proof of user purpose. Closely related goals may merge; ambiguous pages can split or remain latent. First model initialization can take tens of seconds on this machine; the runtime then remains warm across MV3 restarts. Exact RAM and installed Google Chrome/Microsoft Edge distributions were not independently qualified. Native side-panel registration and remote AI are not implemented.

## Final local verification — 19 October 2026

- Typecheck, lint, production build, extension verification and release/security scan passed.
- Full automated suite: **181 passed, 0 failed across 25 files**.
- Actual unpacked Chromium: **23/23 passed**, using isolated synthetic fixtures, real extension APIs and blocked external networking. The final run includes local BGE startup, cross-domain/new-topic grouping, separate controls, latent promotion, Why/Graph/Timeline, keyboard Escape, exact Resume reuse/reopen, manual controls, browser restart, privacy and erase.
- Worker termination: three requested URLs, four durable pending metadata records; **0 lost, 0 duplicates** after actual worker termination and replay.
- Twenty curated unseen-topic interleaved five-step workflows: **20/20 coherent**, no cross-purpose merges in that set. This is not a general accuracy estimate.
- The final browser cold initialization plus first assignment measured **42,253 ms** on this machine; this is not Node timing or a universal performance claim. RAM was not measured.
- Chromium restart testing exposed a harness wake-up race. The helper now waits for the worker stopped event and bounds its wake-up message; final replay passed without diagnostic keepalive.
- GitHub CI and publication are separate gates on the exact pushed commit.
