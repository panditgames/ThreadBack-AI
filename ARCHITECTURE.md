> **v1.3.0:** the continuous manager adds cached workflow-document embeddings, bounded periodic reconciliation and reversible actions. See [V1_3_AUDIT.md](V1_3_AUDIT.md) for the current decision rules. The v1.2.0 design below describes the preceding baseline.

# ThreadBack AI architecture — v1.2.0

Chrome/Edge Manifest V3; TypeScript and React. The sidepanel.html companion remains a normal extension page, not a registered native side panel.

## Collection and durability

ActivityCollector observes tab metadata and lifecycle events, excludes configured/private/internal URLs, and never reads page bodies, forms, cookies or passwords. Empty/URL-shaped placeholder titles carry no invented task meaning. A later completed singleton title receives a real semantic assignment while retaining its earlier event IDs.

The service worker persists each event under an independent pending key before asynchronous inference. Engine mutations remain serialized. Updated threads are saved before acknowledging the pending record; startup replays unresolved IDs exactly once. This queue is independent of the model runtime.

## Local model runtime

Xenova/bge-small-en-v1.5, INT8 ONNX, 384 dimensions, mean pooling and unit normalization. Input is bounded observed metadata: an authentic URL search query takes precedence; otherwise the document title is used. Exact edge site-brand decorations may be removed generically using the hostname; the hostname is never embedded or scored.

An offscreen extension document hosts a dedicated inference worker. This isolates the ONNX/WASM runtime from MV3 service-worker suspension and the browsing UI. The worker caches bounded embeddings; the host is reused across worker restarts. Erase controls close it and clear metadata caches. This requires the offscreen permission and Chrome/Edge 116+; it adds no content-script or host permissions. See [Chrome's offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen).

Model/tokenizer/config/WASM are bundled. Remote models are disabled, worker fetches accept only its own extension origin, and CSP restricts connections to self. There is no backend, API key, remote AI or telemetry.

## Semantic membership

semanticAssignment.ts contains the grouping decisions, using BGE vectors only. Names, keywords, sites, opener links and time proximity provide no join bonuses.

Each workflow retains at most five observed page embeddings: its original anchor and up to four recent representatives. Page support is 0.40 centroid cosine + 0.40 top-two mean + 0.20 top-one cosine. Mature and latent candidates are ranked together; joins require support >= 0.67 and a >= 0.03 margin. Otherwise the event remains latent.

Two corroborated multi-page workflows may reconcile at centroid cosine >= 0.69 when the older original anchor agrees with the newer centroid at >= 0.65. A lone stray page cannot authorize this merge. Completed/archived workflows and explicit manual split boundaries prevent automatic coalescing; naming does not set those boundaries.

Singletons remain outside the main task grid until a related distinct page joins or the user promotes them. Latents are capped at 50 and expire after 24 hours; pruning never closes tabs and protects archived/completed tasks.

## UI, storage and evidence

Naming, status inference and graph/evidence presentation retain deterministic helpers after grouping. They never decide automatic membership. Why records actual BGE support or reconciliation scores plus observed metadata context; these are not calibrated probabilities or generated model rationales.

Browser-local storage persists tasks, event IDs, representative vectors, manual corrections and privacy settings. It is not application-level encryption. Resume uses actual open tabs to reuse/reopen safe HTTP(S) pages.

Tests and scripts/auditAIEngine.mjs invoke production IntentEngine and evaluate final membership. No benchmark-only scoring replica or forced seed merges are used. See [release audit](V1_2_RELEASE_AUDIT.md) for measured evidence and limitations.
