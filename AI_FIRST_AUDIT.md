> **Historical audit:** superseded by the current [v1.2.0 release verification](V1_2_RELEASE_AUDIT.md). These findings apply to earlier local revisions.

> Historical MiniLM audit. The current BGE audit is [BGE_RELEASE_AUDIT.md](BGE_RELEASE_AUDIT.md).

# AI-first working-tree audit — 18 October 2026

**BLOCKED — do not publish this rewrite.** Changes remain local. No commit, push, tag or release was performed. The published v1.1.1 release is unchanged.

## Architecture findings and local fixes

New safe, previously unknown URLs now enter MiniLM inference before automatic membership comparison. Exact known URLs and lifecycle events retain their existing routing. Category naming, status and milestone rules remain presentation/inference aids, not semantic membership authority. The original rewrite compared embeddings of heuristic-generated thread names/summaries; this indirect authority was removed. TinySemanticClassifier and the old concept scorer are not automatic membership resolvers; historical modules/tests remain.

Fixed independently reproduced/reviewed defects:
- Activation/closure of one URL incorrectly promoted a singleton; promotion now requires distinct URLs.
- Popup selected a latent singleton when no normal task existed.
- Latent insertion could exceed the 50-candidate cap; expiry was not enforced at reload/assignment. Pruning is now enforced at those boundaries and synchronization. Pruning never invokes tab-close APIs.
- Completed/archived tasks with latent flags could be pruned. They are protected, and explicit status changes make candidates normal tasks.
- A normalized centroid multiplied by event count was not a correct running mean. Centroids now use exact normalized sums over at most 16 observed page vectors.
- Persisted dimensions, finiteness, normalization and embedding-model version are checked before reuse. Legacy or invalid representations rebuild from observed tabs. Legacy unflagged single-tab tasks remain visible.
- Merge/split and real title updates invalidate affected representations; closure preserves the original page title.
- Model metadata is bounded; query evidence is reconstructed from the actual URL. Platform/subdomain identity cannot supply task evidence alone. Empty metadata cannot establish a similarity join.
- Engine event assignment is serialized. Inference errors preserve the captured event as a separate latent candidate, without a heuristic membership guess or remote fallback.
- Removed unused old-model initialization from the worker, unnecessary public exposure of model/runtime files, and ignored tournament_models/.
- Why? records actual semantic assignment scores and thresholds; its metadata statistics are explicitly contextual evidence rather than the new grouping algorithm.

## Model and packaging

Production model: Xenova/all-MiniLM-L6-v2, @xenova/transformers 2.17.2, 384 dimensions, mean pooling, unit normalization, maximum 256 tokens. ONNX inspection found 72 INT8 and 6 UINT8 tensors, 24 DynamicQuantizeLinear and 36 MatMulInteger nodes; floating-point scaling/normalization tensors remain as expected. No FP32 model file ships.

- Quantized weights: 22,972,370 bytes.
- Weights plus tokenizer/config: 23,685,172 bytes.
- Bundled WASM binaries: 38,348,360 bytes.
- Final dist: 63,256,833 bytes uncompressed.
- Weight SHA-256: afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1.
- Only the winning MiniLM directory is present under dist/models. Tournament models are outside public/ and ignored; generated packaging verification checks their exclusion.
- Remote model loading is disabled; local extension paths are used for model/tokenizer/WASM. No new permissions, content scripts, telemetry, API keys or page-body extraction were added.
- Embeddings are browsing-derived metadata persisted locally and are **not application-encrypted**. Content analysis and remote AI defaults remain disabled.
- No new ZIP was prepared because release gates failed. Existing release ZIPs were preserved.

## Benchmark discrepancy and independent replay

There are **three different datasets**, not one interchangeable evaluation: 165 tournament pairs (78 JOIN / 87 SEPARATE), 106 unit benchmark cases, and 58 cases in runBenchmark.mjs. The tournament also includes 25 sequences. Synthetic thread descriptions were weighted in the historical benchmark, while the production rewrite used a different maximum-of-centroid/name/opener formula. The 106-case test also changed formulas during its threshold sweep.

Thresholds were selected on the same curated cases used to report results; there is no independent holdout supporting a 97.2% generalization claim. The old sequence evaluator accepted a second thread bearing an already-used expected label, missing false splits. That defect and a hardcoded printed similarity were corrected. Examples contain hand-authored category cues and generated easy contrasts; labels are engineering expectations, not a representative real-user sample. Some closely related-but-separate task labels are inherently contextual.

Independent replay uses actual observed metadata and the production IntentEngine; expected labels are used only for evaluation. Replay: node scripts/auditAIEngine.mjs. It requires installed project dependencies and the bundled local model; it downloads no models.

| Production replay | False merges | False splits | Fully correct sequences |
| --- | ---: | ---: | ---: |
| Original Antigravity rewrite at 0.38 | 3 | 50 | 5 / 25 |
| Corrected conservative engine at 0.45 | 0 | 68 | 2 / 25 |

At 0.45 the sequence replay has 0 incorrect-join steps and 79 split steps. These metrics are curated engineering evidence, **not real-world accuracy**. Some supplied searchQuery fields are not observable in their URLs; production reconstruction correctly ignores those fields.

The requested two-page EurekaDev/Devpost → “Branch · Hackathon participation guide” case scores **0.4163933563**, below the conservative 0.45 threshold. It fails. Lowering to 0.38 admits the guide but still falsely merges hackathon versus internship application metadata. One global centroid threshold does not satisfy both required outcomes on this dataset; it needs further validated grouping work, not a release claim.

## Verification

- Full run: 147 passed / 7 failed across 22 files, including six genuine grouping failures and one stale performance fixture.
- The performance fixture placed every event about 30 days ago, so the new 24-hour latent policy correctly removed every candidate. It was corrected to recent timestamps without changing grouping expectations.
- Targeted rerun: 13 passed / 0 failed (the performance file and 11 independent AI-first lifecycle/vector regressions).
- Current combined coverage: **150 passed / 6 failed, 156 tests**. The full suite was not repeated; six grouping failures remain in clusteringScenarios, localSemantic and aiClusteringBenchmark.
- Typecheck and production build passed. Packaging verification passed. The initial release scan examined 105 files with zero findings. Final lint/document scan results and real-browser results are recorded below after completion.
- The 106-case observed-metadata check at 0.45 has 0 false merges and 14 false splits; its three-page critical case scores 0.3663873289 and fails. Its ground-truth thread title is no longer injected into its representation.
- Node performance: 1,000 recent synthetic events processed in 19,049 ms, retaining two threads. This is not a 10,000-event test or a Chrome timing. RAM was not measured.

## Real browser and remaining blockers

Real MV3 audit: node scripts/aiFirstSmoke.mjs, using the existing THREADBACK_PLAYWRIGHT_MODULE and THREADBACK_CHROMIUM_EXECUTABLE environment variables. It creates a temporary isolated profile, serves controlled HTTPS fixture responses, blocks external fetches and uses actual Chrome tab/storage APIs. Sanitized artifacts are written under ignored release/.

Final real Chromium results: the complete workflow run recorded **13 passed / 5 failed**. The affected-check rerun recorded **4 passed / 1 failed**. These are staged results, not a clean all-green browser run. Historical v1.1.1 results do not qualify this rewrite.

Passed with actual Chrome APIs: worker/popup/dashboard loading; local bundled inference with external fetches blocked; latent singleton and second-page promotion; unrelated ChatGPT and YouTube separation; Google-to-cross-domain results without opener metadata; Why/Graph/Timeline and Escape; rename/merge/split; completion/archive/deletion across idle worker and browser restart; privacy defaults/exclusion; non-destructive latent expiry/cap pruning. Actual Resume reopened a missing page once and reused already-open pages; real worker restoration blocked javascript/data/file/blob/filesystem/chrome/edge/about and malformed URLs.

Confirmed product failures:
1. **P0: worker termination during pending MiniLM inference loses the captured navigation.** There is no durable replay before inference completes. Idle restart persistence passing does not resolve this.
2. **P0: semantic recall is insufficient at the false-merge-conservative threshold.** The exact requested ChatGPT guide stays separate: actual Chromium cosine **0.4118567266** versus 0.45 (Node counterpart 0.4163933563). Six automated grouping regressions remain.
3. **P1: closing a known tab after worker restart does not update its closed metadata.** The collector's URL-by-tab map is in memory. The first Resume smoke stalled on that metadata precondition; a separate real API rerun proves Resume itself still restores/reuses correctly despite the stale flag.

Harness limitations were kept separate: dynamic import is prohibited inside an MV3 worker, so that performance probe was moved to the actual extension dashboard context. The initial full run saw one HTTP 403 while browser fixture tabs restarted; the rerun blocks DNS/network before startup and reports zero unexpected console errors. The first cold-capture attempt timed out; a bootstrap-only rerun passed all three checks and the subsequent complete workflow captured normally. The timing variability remains documented, not hidden.

Actual Chromium timings (host-specific): fresh-profile model initialization + first embedding + persisted assignment **14,188 ms** in the full run, **21,679 ms** in the bootstrap rerun. A new pipeline in the extension dashboard, with the browser/model cache already warm, took **2,318.2 ms** including its first embedding. Warm embedding plus production comparison against 10/25/50 candidate threads took **51.9 / 53.4 / 78.2 ms**. These are extension-page WASM timings, not isolated service-worker initialization/inference or pure dot-product timings. RAM: **NOT MEASURED**.

Sanitized desktop and popup screenshots were inspected. They retain the charcoal/teal layout; modal Escape and popup keyboard navigation passed. Native installed Chrome/Edge qualification, real-browser UI search/manual-promotion exercises and deterministic replay of every abrupt termination point are not established by this smoke.

The worker serializes normal mutations, but the rewrite does not have durable in-flight event replay. Termination during embedding is now reproduced as a data-loss failure. Erase/update while embedding still requires independent race verification; an idle restart alone cannot prove it safe. Do not interpret passing worker mocks as proof of interrupted real inference recovery.

No push or release is recommended until the grouping regressions and any browser/lifecycle failures are resolved. Installed Chrome/Edge distributions and reliable runtime RAM remain independently unmeasured. The companion page is not a registered browser-native side panel.

## Final static/security gates and files

Final typecheck PASS. Full-project lint initially found audit-script globals; after correction, the remaining script lint rerun PASS. Build PASS; verifyExtension PASS. Release scan PASS with 106 scanned files and zero findings; git diff --check PASS. The final source-level title-cache/closure fixes have dedicated passing targeted regressions. No full-suite rerun was used to disguise the six unresolved grouping failures.

The manifest/package version remains 1.1.1 for this unpublished working tree. It must not replace the published release. Consider v1.2.0 only after the blocking issues and release gates are resolved. No new ZIP, commit, push or release was created.

Modified tracked files:

- .gitignore
- ARCHITECTURE.md
- HANDOFF.md
- PRIVACY.md
- README.md
- TESTING.md
- package-lock.json
- package.json
- public/manifest.json
- scripts/verifyExtension.js
- src/background/serviceWorker.ts
- src/components/TaskCard.tsx
- src/components/WhyModal.tsx
- src/dashboard/App.tsx
- src/engine/intentClusterer.ts
- src/engine/whyExplainer.ts
- src/popup/App.tsx
- src/storage/storageManager.ts
- src/types/index.ts
- tests/integration/adversarial.test.ts
- tests/integration/clusteringScenarios.test.ts
- tests/integration/localSemantic.test.ts
- tests/integration/releaseRegression.test.ts
- tests/integration/tinyClassifierAudit.test.ts
- tests/integration/workerLifecycle.test.ts
- tests/performance/largeScaleHistory.test.ts
- tests/unit/activityCollector.test.ts
- tests/unit/clusterer.test.ts
- tests/unit/localClassifier.test.ts

Untracked additions reviewed/prepared locally:

- AI_FIRST_AUDIT.md
- public/models/Xenova/all-MiniLM-L6-v2/config.json
- public/models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx
- public/models/Xenova/all-MiniLM-L6-v2/special_tokens_map.json
- public/models/Xenova/all-MiniLM-L6-v2/tokenizer.json
- public/models/Xenova/all-MiniLM-L6-v2/tokenizer_config.json
- public/wasm/ort-wasm-simd-threaded.wasm
- public/wasm/ort-wasm-simd.wasm
- public/wasm/ort-wasm-threaded.wasm
- public/wasm/ort-wasm.wasm
- scripts/aiFirstSmoke.mjs
- scripts/auditAIEngine.mjs
- scripts/benchmarkData.mjs
- scripts/downloadModel.py
- scripts/downloadTournamentModels.py
- scripts/runBenchmark.mjs
- scripts/runTournamentHarness.mjs
- scripts/tournament_results.json
- src/engine/ai/localEmbedder.ts
- tests/benchmarks/aiClusteringBenchmark.test.ts
- tests/unit/aiFirstAudit.test.ts
- tests/unit/latentIntent.test.ts

The initially untracked tournament_models/ directory is now ignored and excluded from production. Existing release ZIPs, generated dist, browser profiles, screenshots, logs and ignored .qa-* diagnostics are not publication inputs. To repeat only the affected browser checks, set THREADBACK_AI_TARGETED=1 before running scripts/aiFirstSmoke.mjs; omit it for the complete smoke. Set THREADBACK_AI_BOOTSTRAP_ONLY=1 only for the three-check first-navigation diagnostic.
