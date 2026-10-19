import { parseUrl } from '../urlParser';
import { isModelServiceWorker, requestLocalEmbedding, closeModelDocument, getModelDiagnostics } from './offscreenBridge';
export { getModelDiagnostics };
import { pipeline, env } from '@xenova/transformers';

// Strict offline and local-only configuration
// Zero network calls, zero telemetry, zero remote model fetching
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;

// Configure local asset paths for extension vs node/testing
const isNode = typeof process !== 'undefined' && !!process.versions?.node;
if (isNode) {
  env.localModelPath = './public/models/';
  env.backends.onnx.wasm.wasmPaths = './public/wasm/';
} else if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
  try {
    env.localModelPath = chrome.runtime.getURL('models/');
    env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
  } catch {
    env.localModelPath = '/models/';
    env.backends.onnx.wasm.wasmPaths = '/wasm/';
  }
} else {
  env.localModelPath = '/models/';
  env.backends.onnx.wasm.wasmPaths = '/wasm/';
}

// Single-threaded execution for maximum MV3 service worker and cross-platform compatibility
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

export const MODEL_ID = 'Xenova/bge-small-en-v1.5';
export const EMBEDDING_DIM = 384;
export const EMBEDDING_VERSION = MODEL_ID + ':int8:mean:metadata-v4';

let extractorPromise: Promise<any> | null = null;
let modelStatus: 'uninitialized' | 'loading' | 'ready' | 'failed' = 'uninitialized';
export const getLocalModelStatus = () => modelStatus;
const embeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 1000;

/**
 * Extract safe metadata string for embedding.
 * PRIVACY RULE: Extracts ONLY clean page title, domain, and authentic search query.
 * NO DOM, NO page body, NO cookies, NO tokens, NO form fields.
 */
export function formatPageMetadata(page: { url: string; title: string }): string {
  const parsed = parseUrl(page.url);
  return parsed.isValid ? formatSafeMetadata(page.title, parsed.domain, parsed.searchQuery) : '';
}

export function formatSafeMetadata(title: string, domain: string, searchQuery?: string): string {
  let text = typeof title === 'string' ? title.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 1000) : '';
  const query = typeof searchQuery === 'string' ? searchQuery.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
  // Domains and site identities provide no semantic authority. Query evidence is URL-derived by the caller.
  // A hostname is only used to remove an exact edge branding segment, never as semantic evidence.
  const host = typeof domain === 'string' ? domain.toLowerCase().replace(/^www\./, '') : '';
  const brand = host.split('.').at(-2) || host;
  const identity = (part: string) => [host, brand].includes(part.trim().toLowerCase());
  const parts = text.split(/\s+[|·–—-]\s+/);
  if (parts.length > 1) {
    while (parts.length > 1 && identity(parts[0])) parts.shift();
    while (parts.length > 1 && identity(parts[parts.length - 1])) parts.pop();
    text = parts.join(' — ');
  }
  // The observed query is the user's search; result-page branding adds no purpose evidence.
  return query || text;
}

/**
 * Initialize or get the feature extraction pipeline.
 */
export async function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    modelStatus = 'loading';
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      quantized: true,
    }).then(extractor => { modelStatus = 'ready'; return extractor; }).catch(err => {
      modelStatus = 'failed';
      extractorPromise = null;
      console.error('[ThreadBack AI] Failed to initialize local BGE pipeline:', err);
      throw err;
    });
  }
  return extractorPromise;
}

/**
 * Generate 384-dimensional normalized embedding for text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = typeof text === 'string' ? text.trim().slice(0, 1600) : ''; 
  if (!trimmed) {
    return new Array(EMBEDDING_DIM).fill(0);
  }

  if (!isNode && isModelServiceWorker()) {
    modelStatus = 'loading';
    try {
      const embedding = await requestLocalEmbedding(trimmed);
      if (!isValidEmbedding(embedding)) throw Error('Invalid local worker embedding');
      modelStatus = 'ready'; return embedding;
    } catch (error) { modelStatus = 'failed'; throw error; }
  }
  const cached = embeddingCache.get(trimmed);
  if (cached) {
    return [...cached];
  }

  const extractor = await getExtractor();
  const output = await extractor(trimmed, { pooling: 'mean', normalize: true, truncation: true, max_length: 256 });
  const rawData: Float32Array = output.data;
  const embedding = normalizeVector(Array.from(rawData));
  if (!isValidEmbedding(embedding)) throw new Error('Invalid local model output');

  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey !== undefined) {
      embeddingCache.delete(firstKey);
    }
  }
  embeddingCache.set(trimmed, embedding);

  return [...embedding];
}

/**
 * Compute cosine similarity between two unit-normalized embeddings.
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!isValidEmbedding(a) || !isValidEmbedding(b)) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(-1, Math.min(1, dot));
}

/**
 * Normalize vector to unit length.
 */
export function normalizeVector(v: number[]): number[] {
  if (!Array.isArray(v) || !v.length || !v.every(Number.isFinite)) return [];
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) {
    sumSq += v[i] * v[i];
  }
  const mag = Math.sqrt(sumSq);
  if (mag <= 1e-9) return new Array(v.length).fill(0);
  return v.map(x => x / mag);
}

/** Reject corrupt, wrong-dimension, zero and non-normalized persisted vectors. */
export function isValidEmbedding(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length !== EMBEDDING_DIM || !value.every(Number.isFinite)) return false;
  const normSquared = value.reduce((sum, n) => sum + n * n, 0);
  return Math.abs(normSquared - 1) < 0.001;
}

/** Exact centroid of a bounded window; never average previously normalized means. */
export function centroidOf(vectors: number[][]): number[] {
  const valid = vectors.filter(isValidEmbedding);
  if (!valid.length) return [];
  const sum = new Array(EMBEDDING_DIM).fill(0);
  for (const vector of valid) for (let i = 0; i < EMBEDDING_DIM; i++) sum[i] += vector[i];
  return normalizeVector(sum);
}

export async function clearLocalModelState(): Promise<void> {
  embeddingCache.clear();
  if (!isNode) { await closeModelDocument(); modelStatus = 'uninitialized'; }
}
