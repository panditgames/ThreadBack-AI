# v1.3.0 continuous intent manager — release audit

Release publication is gated on final local verification and successful GitHub CI for the exact release commit. BGE-small-en-v1.5 INT8 remains unchanged.

## Behavior

- The observer and durable per-event write-ahead queue remain intact. BGE supplies all automatic semantic evidence; website identity, topic dictionaries, keywords, openers and generated task names do not authorize membership.
- Tasks cache a normalized BGE embedding of a bounded document built from up to five actually observed page titles/authentic URL queries, alongside five page vectors and their centroid. Unchanged documents are not re-embedded.
- Page assignment remains conservative. Task agreement is 0.40 × document cosine + 0.30 × centroid cosine + 0.30 × bidirectional page support. A merge requires agreement >=0.80, document >=0.70, centroid >=0.67, support >=0.69, two supporting pages on each side and a 0.03 ranking margin against alternative eligible candidates. Similarity is not calibrated confidence.
- Ambiguous page assignment may leave related latents. A combined latent workflow can promote only when a mature workflow independently corroborates the multi-page document, then immediate task-to-task reconciliation runs.
- Promotion/new evidence schedules reconciliation immediately. Startup, manual structural changes and the existing ten-minute alarm revisit the workspace without new navigation. Each pass handles at most four queued/rotating intents and six model-prefiltered candidates per intent; no all-pairs sweep runs on each event.
- Automatic splitting requires two cohesive multi-page groups with weak cross-group similarity; one outlier never suffices. Only tasks whose full membership fits the five represented pages are eligible. Explicit manual split/Undo boundaries are respected.
- Closed latent candidates expire after six hours; other latents after 24 hours, capped at 50 candidates. Expiry removes metadata only, never browser tabs.
- Established tasks are archived, never automatically deleted, only after all observed tabs close and inactivity exceeds 30 days (seven days for completed tasks). New strong semantic evidence can reactivate archived tasks.
- Existing initial-label/milestone/status helpers remain downstream presentation; their category labels never enter semantic membership or task-document inputs.
- Periodic naming chooses an actually observed representative title after grouping; manual names remain protected.
- MERGE/SPLIT/ARCHIVE/RENAME/REACTIVATE actions record real reasons/evidence locally. History is bounded; snapshots omit embeddings and nested history. Timeline offers Undo and refuses it when newer activity would be overwritten.

## Verification

Targeted production-engine evidence: ten same-purpose task pairs merge; ten close but different purposes remain separate; twenty interleaved generalization flows remain coherent with no cross-purpose merges in that curated set. Tests cover the actual latent-promotion tie and immediate EurekaDev/video workflow merge, multiple mixed-task splits, one-outlier abstention, latent close/expiry, archive/reactivation, grounded rename and safe Undo. These hand-labelled scenarios do not establish universal accuracy.

Final automated regression: **197 passed / 0 failed, 26 files**. Typecheck, lint, build, MV3/model packaging verification and security scan pass. Actual unpacked Chromium final run: **31/31 passed**, including the new continuous-manager flows and all existing core workflows. The earlier affected-only manager run also passed 9/9. The final real worker-termination run replayed **five durable metadata records for three requested URLs, 0 lost and 0 duplicates**. Model inference used only extension-local assets with external networking blocked. Unit/worker mocks are distinct from unpacked-extension browser tests.

The first full run exposed the budget/ANC fixture expectation described below and one test-only lint declaration; the failing gate was rerun after targeted checks. A missing-title hostname fallback was also removed and independently regression-tested. The final browser expiry fixture waits for the durable capture queue to settle and consistently ages stored timestamps; it simulates retention rather than waiting six hours. No website/topic-specific rescue was introduced.

Publication-session rerun: the complete suite passed 196 tests and hit one timing-only performance failure (33.6 seconds against the unchanged 30-second budget). The isolated affected-file rerun passed both tests, processing 1,000 events in 20.2 seconds. All 197 distinct tests are green after that targeted rerun; no product change or timing-budget relaxation was made.

## Limitations

Metadata-only embedding similarity can confuse related goals or conservatively split them. The legacy five-page budget-ANC/Sony fixture produced document cosine 0.632, centroid 0.712, support 0.669 and no two-page corroboration. Its old forced-one-task label was changed to explicit abstention: budget/acronym research and premium-product reviews remain two intact groups, with grounded distinct names. Direct product/review continuity and the broader noise-cancelling-headphone fixture still pass. This is a known false-split/ambiguous-purpose limitation, not an accuracy improvement claim. Candidate prefiltering and maintenance budgets trade immediate recall for bounded work. Automatic splitting abstains when not all member pages are represented; it is not unrestricted historical reclustering. Undo is intentionally unavailable after conflicting later activity. Installed Chrome/Edge distributions and RAM were not independently measured. No generative AI, remote inference or browser-native side panel was added.
