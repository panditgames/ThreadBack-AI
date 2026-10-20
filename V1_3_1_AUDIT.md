# v1.3.1 candidate: reconciliation scheduling and diagnosis

The debugging audit below describes the local candidate. Subsequent release publication requires final verification and successful GitHub CI for the exact release commit.

## Original report versus controlled evidence

The original report contains two task labels and five member domains, not the five captured page records. Original URLs/titles were unavailable; no personal browser profile was opened or copied. Production stores actual member URLs/titles in `threadback_data_v1.threads[*].tabs`, with observed events alongside them. The QA profiles use synthetic data. This audit cannot establish the original screenshot's exact KEEP condition or cache state.

The controlled reconstruction uses the reported review title and comparison title as page-title fixtures; its other three titles and all URLs are explicitly synthetic. Independently formed workflows are fixture input, while their embeddings and reconciliation decisions use the real production IntentEngine/BGE runtime.

Document A:
```
The 4 Best On-Ear Headphones of 2026
Best on-ear headphones review
On-ear headphones compared
```
Document B:
```
Headphone Alternatives Comparison
Compare on-ear headphone alternatives
```

Unmodified v1.3.0 membership gates already MERGE this controlled pair. Production values (also reproduced in actual Chromium): document cosine 0.8149436196; centroid cosine 0.8946193041; bidirectional support 0.8885483320; aggregate agreement 0.8609277387. Cross-page matrix (A rows / B columns):
```
0.7386174653  0.8127716401
0.7549169190  0.8625672991
0.8620587104  0.9451451949
```
Only one alternative candidate exists, so the ranking margin is uncontested (recorded as null, rather than a fabricated confidence). Both cached document keys were current in the browser comparison. The browser merged all five pages into one ACTIVE task in one cycle, 1590 ms from restoring the second independent workflow through reconciliation confirmation. This is one machine/fixture timing, not an SLA. The worker was then actually terminated/restarted and the five-page membership survived.

Thresholds are unchanged: agreement >=0.80, document >=0.70, centroid >=0.67, support >=0.69, at least two corroborating pages per side, ranking margin >=0.03. No semantic threshold calibration was justified by the measured data.

## Confirmed generic defect and fix

The v1.3.0 rotating cursor existed only in worker memory. With more tasks than the pass budget, repeatedly restarting workers could revisit the newest tasks indefinitely. A production-engine regression formed an old same-purpose pair plus newer latent pages, serialized state and constructed six fresh engines with one-task budgets. Before the fix the old pair never reconciled (3 pages instead of combined 5).

The fix stores `lastReconciledAt` per task and orders fair revisits by this persisted timestamp. Each bounded pass reserves a fair slot alongside dirty-task work, so repeatedly failing dirty tasks cannot consume every slot. This controls scheduling only; BGE evidence still exclusively controls membership. Normal page evidence/promotion and structural updates retain immediate reconciliation. Pending changed tasks receive a one-shot 30-second Chrome alarm without continually postponing an already scheduled alarm; the existing ten-minute periodic alarm remains. Startup retains durable replay and performs bounded reconciliation. Chrome may delay alarms under suspension/system sleep; wall-clock deadlines are not guaranteed.

The same restart regression passes after the fix without changing model, scoring or thresholds. The screenshot's original failure may have another cause: absent captured records, the scheduling defect cannot honestly be attributed as its proven root cause.

## Diagnostics and privacy

`GET_RECONCILIATION_DIAGNOSTICS` returns up to 24 in-memory traces of promoted-task comparisons: trigger, documents/cache keys, refresh flags, ranked candidate evidence, complete bounded cross-page matrices, threshold, margin and actual KEEP/MERGE outcome. It is an explicit extension-local request, not telemetry. Erase clears traces; deleting a task clears related traces. Existing task metadata remains the source of documents, never generated task names. No remote calls, permissions, topic dictionaries, website rules, keyword joins or domain/opener bonuses were added.

From the extension dashboard's developer console, inspect locally:
```js
await chrome.runtime.sendMessage({type: 'GET_RECONCILIATION_DIAGNOSTICS'})
```
Do not share that output without reviewing potentially sensitive titles/URLs. The trace is bounded and transient, not a permanent exhaustive history.

## Verification

The initial targeted run passed 23 tests across manager, worker and new cross-source suites. After the final scheduling/storage changes, the affected cross-source/worker rerun passed 9/9. Ten new cross-source positive pairs merge and ten close-but-different pairs stay separate through production BGE/IntentEngine; these fixtures passed before the fix too and do not prove universal semantic accuracy. Typecheck and lint pass. Candidate production build and extension/model verification pass. Full regression was not rerun in this targeted debugging session; the released v1.3.0 suite is separate historical evidence.

Final actual unpacked Chromium: **10/10 affected checks passed**, with no unexpected console/service-worker errors. The final affected Chromium results are recorded in the ignored `release/continuous-smoke.json`; all pages and profiles are isolated synthetic fixtures. Publication is separately gated by the final release checks and exact-commit CI.
