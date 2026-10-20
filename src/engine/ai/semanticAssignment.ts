import { IntentThread } from '../../types';
import { centroidOf, computeCosineSimilarity, isValidEmbedding } from './localEmbedder';

export const PAGE_THRESHOLD = 0.67;
export const CANDIDATE_MARGIN = 0.03;
export const RECONCILIATION_THRESHOLD = 0.69;
export const ANCHOR_THRESHOLD = 0.65;
export const MAX_SEMANTIC_PAGES = 5;
type SemanticPage = NonNullable<IntentThread['semanticPages']>[number];

export function representativePages(pages: SemanticPage[]): SemanticPage[] {
  const unique = [...new Map(pages.filter(p => p && isValidEmbedding(p.vector)).map(p => [p.url, p])).values()];
  return unique.length <= MAX_SEMANTIC_PAGES ? unique : [unique[0], ...unique.slice(-(MAX_SEMANTIC_PAGES - 1))];
}

export function workflowSupport(vector: number[], thread: IntentThread) {
  const pages = representativePages(thread.semanticPages || []);
  const centroid = centroidOf(pages.map(p => p.vector));
  const similarities = pages.map(p => computeCosineSimilarity(vector, p.vector)).sort((a, b) => b - a);
  const top1 = similarities[0] || 0;
  const top2Mean = similarities.length > 1 ? (top1 + similarities[1]) / 2 : top1;
  const centroidSimilarity = computeCosineSimilarity(vector, centroid);
  const score = 0.4 * centroidSimilarity + 0.4 * top2Mean + 0.2 * top1;
  return { thread, score, centroidSimilarity, top1, top2Mean };
}

export function decideSemanticAssignment(vector: number[], threads: IntentThread[]) {
  const ranked = threads
    .map(t => workflowSupport(vector, t)).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const margin = ranked[1] ? best.score - ranked[1].score : Infinity;
  return best && best.score >= (best.thread.status === 'ARCHIVED' ? 0.74 : PAGE_THRESHOLD) && margin >= (best.thread.status === 'ARCHIVED' ? 0.05 : CANDIDATE_MARGIN) ? best : null;
}
