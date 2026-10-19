> **Historical audit:** superseded by the current [v1.2.0 release verification](V1_2_RELEASE_AUDIT.md). These findings apply to earlier local revisions.

# BGE release audit — 19 October 2026

**Status: BLOCKED. No commit, push, tag or release was performed.** v1.1.1 remains the published release; v1.2.0 is not recommended until the failed gates are resolved.

## Independently verified architecture

Production is Xenova/bge-small-en-v1.5 through the existing @xenova/transformers runtime, INT8 ONNX, 384 dimensions, mean pooling, unit normalization and a 256-token cap. Mean pooling and normalization match the selected model's [Transformers.js usage documentation](https://huggingface.co/Xenova/bge-small-en-v1.5). No alternative model was evaluated or downloaded in this audit.

New semantic assignments use BGE embeddings; generated category names and old heuristic/classifier modules do not decide automatic membership. Exact known-page updates and lifecycle/security handling remain deterministic. Effective similarity is the maximum of the normalized centroid and 0.95 times the best of up to 16 retained observed-page vectors. Global threshold remains 0.67. The 0.58 opener exception remains for eligible non-generic parent/child domains; it has not been declared safe.

The canonical formatPageMetadata entry point parses the actual URL for domain and genuine query evidence, bounds title/query input and avoids repeating queries already present in the title. Production, current release benchmarks and tests now use this input path. No body, DOM, form, cookie or password collection was added. Remote models are disabled, and model/tokenizer/WASM paths point to extension-local files. Defaults for content analysis and remote AI remain disabled.

Bundled weights are 34,014,426 bytes. ONNX inspection found 144 INT8 tensors, 6 UINT8 tensors, 48 DynamicQuantizeLinear and 72 MatMulInteger nodes, plus expected floating-point scaling/normalization tensors. Public model assets contain only bge-small-en-v1.5; MiniLM and tournament model weights are absent. Packaging checks verify the generated model directory and minimal tabs/storage/alarms permissions. Model-card browsing during engineering review is not runtime extension networking.

## Confirmed defects fixed locally

1. **Rapid capture was not write-ahead durable.** Eight captured events queued behind one blocked inference produced only one persistent pending record. Pending events now use independent per-event storage keys and persist before the serialized inference operation, so one long inference cannot strand later captures only in memory. Listeners register synchronously on MV3 startup; privacy initialization completes before persistence. Thread persistence precedes queue-key removal, and event IDs provide replay deduplication.
2. **Replay ignored new domain exclusions.** A controlled pending private.example URL was clustered after that domain became excluded. Capture and replay now recheck the actual URL and current privacy settings; rejected records are removed. Storage-write failures are surfaced rather than acknowledged as successful persistence.
3. **Generic-platform opener exceptions were too broad.** Reddit, Amazon and generic GitHub profiles could receive the relaxed threshold. Relaxation now excludes the broader set of generic platforms on both sides. The remaining non-generic rule still fails incidental-policy tests and is a release blocker.
4. Actual Why? records now identify the effective required threshold (0.58 when applicable), rather than always printing 0.67; stale MiniLM labels were corrected. No keyword exceptions or threshold reductions were used to make failing semantic cases pass.

The targeted queue/privacy/storage/worker checks passed 12/12. A later targeted canonical/boundary run passed 22/24; its two failures are the policy-link membership failures retained below.

## Benchmark integrity and results

The reported candidate-comparison script is not an exact production evaluator: it adds synthetic thread-title vectors, uses only five recent pages, directly embeds supplied query fields, and evaluates a separate threshold grid. Production does not inject those synthetic names. Exploratory scripts are now labelled historical, not release evidence. Their numbers must not be substituted for production results.

The independent audit uses the actual IntentEngine and bundled BGE through node scripts/auditAIEngine.mjs. Expected labels are used only to score decisions. The 165 pair cases contain 78 JOIN and 87 SEPARATE labels. Sequence fixtures provide title/domain metadata, with no observed query or opener fields; none are silently discarded by this replay.

- Final 165-pair production replay: **0 false merges / 57 false splits**, not 23 false splits.
- Final 25-sequence replay: **2/25 fully correct**, with **1 wrong-join step and 71 false-split steps**, not 25/25.
- The false-merge sequence is seq-12, computer-graphics ray tracing versus cryptocurrency proof of stake.
- Separate 106-case fixed benchmark at 0.67: 0 false merges / 11 false splits; its critical case score was 0.7331843043.
- These are curated engineering fixtures, not representative real-world accuracy estimates. No threshold was lowered or selected from this audit's results.

The requested application-language probes were executed. Software internship application guide, summer internship program application, student coding program application and project application guide stayed separate. Hackathon application guide and developer challenge application joined. Hackathon internship opportunity also joined despite its ambiguous intent; coding competition application split. Those mixed/vague examples are documented observations rather than silently relabelled to inflate accuracy.

Independent opener negatives exposed:
- Privacy Policy for EurekaDev Hackathon: **joined at 0.8032**, above even the global 0.67 gate.
- Headphones shipping and returns policy: **joined at 0.6460** through the 0.58 rule.
- A generic GitHub profile and internship pages on Reddit/Amazon incorrectly joined before the generic-platform fix; their targeted regression checks now pass.
- An unrelated external internship reference from a physics article stayed separate.

A numeric semantic gate exists, but these results do not establish that either threshold is safe for task membership. Topic similarity is not the same as task relevance. Raising the global threshold blindly would risk the required EurekaDev guide; adding title-word exceptions would undermine the requested AI-first design.

## Final verification

One full suite run: **167 passed / 3 failed, 170 tests across 24 files**. The remaining failures are the two policy-link negatives and the cross-domain shopping scenario, which splits into two tasks. Assertions were not weakened to hide these failures.

The recent 1,000-event Node performance check passed in 10,099.5 ms. This is not a Chromium timing, a 10,000-event benchmark or a RAM measurement. Runtime RAM was not measured.

Typecheck, production build, verifyExtension and releaseScan passed. Initial lint found one obsolete smoke-script global declaration; it was removed and affected-script lint rerun. The final uncompressed dist is 74,302,241 bytes; no new release ZIP was created. The real smoke uses an isolated temporary profile, synthetic fixtures, startup DNS/network blocking, actual Chrome APIs and the unpacked dist build. Its strengthened kill check holds the local weights fetch inside an active feature-extraction request, requires every rapid event to have a durable record before termination, restarts the actual worker and checks replay IDs exactly once. This is not a claim to preempt every individual synchronous WASM instruction.

## Actual unpacked Chromium evidence

The final full smoke recorded **16 passed / 3 failed** across 19 checks. One is a real grouping failure; two state checks cascaded from an unset test variable after that assertion failed. A focused follow-up reused only the same isolated synthetic profile, confirmed the grouping failure, then independently passed complete/archive/delete persistence across both worker and browser restarts. The harness now assigns that variable before assertions so future failures do not mask those state checks.

- Exact EurekaDev + ChatGPT participation guide: **PASS**, observed score **0.7048266708**.
- React debugging and physics controls stayed separate. **Software internship application guide falsely joined EurekaDev at 0.6785055868**, after the participation-guide page had joined. Testing that page only against the initial seed would miss this representation-drift failure.
- YouTube separation, Google cross-domain/no-opener flow, latent hiding/promotion/pruning, Why/Graph/Timeline, Resume reuse/reopen, rename/merge/split and privacy checks passed.
- Worker termination during held local-model inference: **4 pending records replayed, 3 requested URLs, 0 lost records, 0 duplicates**. Additional pending navigation metadata accounted for the fourth record.
- All model requests were extension-local; external DNS/fetches were blocked. No unexpected page/worker console errors were recorded.
- The real opener-policy checks cannot validate the intended title-based negatives: persisted input titles were temporary hostnames (policies.example and shipping.example), not the completed fixture titles. The Node tests expose policy membership errors using the intended completed titles. This is an additional collector readiness gap, not a browser proof of safe opener relaxation.
- Cold initialization plus first persisted result took **60,253 ms** on this machine. A separate pipeline in the actual extension dashboard measured initialization/first embedding at 3,284.6 ms; warm embedding plus 10/25/50 comparisons took 221.5/311.2/111.6 ms. These noisy extension-page timings are not service-worker or low-end-hardware guarantees. RAM was not measured.

Reproduction: build once, then run node scripts/aiFirstSmoke.mjs with THREADBACK_CHROMIUM_EXECUTABLE pointing to the installed bundled Chromium. Full results are in ignored release/ai-first-smoke.json; the focused follow-up is release/bge-state-audit.json. THREADBACK_BGE_STATE_AUDIT=1 and THREADBACK_AI_REUSE_PROFILE may reuse only a generated threadback-ai-first-* directory directly under the system temporary directory; personal profiles are rejected.

## Remaining limitations

- Blocking: internship control falsely joins after the guide; incidental policy links can falsely join; cross-domain shopping splits; full sequence quality is not the reported 25/25. Temporary hostname capture also weakens completed-title browser coverage.
- Mixed application language remains ambiguous; curated pair precision does not prove general safety.
- The collector's closed-tab URL map remains process-local; old closed-status-after-restart coverage should not be confused with actual Resume restoration, which queries real open tabs.
- Concurrent erase during inference and every storage-failure timing are not exhaustively qualified. Browser-local metadata and vectors are not application-encrypted.
- Installed Chrome/Edge distributions and exact runtime RAM are not independently measured.

All existing releases and ZIPs are preserved. No new release ZIP is being published while gates fail.
