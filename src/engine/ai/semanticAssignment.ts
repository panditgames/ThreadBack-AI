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
  const ranked = threads.filter(t => t.status !== 'ARCHIVED')
    .map(t => workflowSupport(vector, t)).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const margin = ranked[1] ? best.score - ranked[1].score : Infinity;
  return best && best.score >= PAGE_THRESHOLD && margin >= CANDIDATE_MARGIN ? best : null;
}

/** Corroborate two multi-page workflows without letting a new bridge replace the original purpose. */
export function reconciliationEvidence(a: IntentThread, b: IntentThread) {
  if (a.preserveSemanticBoundary || b.preserveSemanticBoundary ||
      [a.status, b.status].some(status => status === 'LIKELY_COMPLETE' || status === 'ARCHIVED')) return null;
  const older = a.createdAt <= b.createdAt ? a : b;
  const newer = older === a ? b : a;
  const oldPages = representativePages(older.semanticPages || []);
  const newPages = representativePages(newer.semanticPages || []);
  if (oldPages.length < 2 || newPages.length < 2 || older.isLatent || newer.isLatent) return null;
  const newCentroid = centroidOf(newPages.map(p => p.vector));
  const similarity = computeCosineSimilarity(centroidOf(oldPages.map(p => p.vector)), newCentroid);
  const anchorAgreement = computeCosineSimilarity(oldPages[0].vector, newCentroid);
  return similarity >= RECONCILIATION_THRESHOLD && anchorAgreement >= ANCHOR_THRESHOLD
    ? { older, newer, similarity, anchorAgreement } : null;
}
