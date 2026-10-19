// UI/evidence similarity only. Automatic workflow membership never imports this module.
import { extractBaseDomain } from './urlParser';
import { ActivityEvent } from '../types';
import { extractTitleKeywords, extractQueryKeywords, computeOverlapScore, hasTopicEvidence } from './keywords';

export interface SimilarityResult {
  totalScore: number;
  semanticSimilarity: number;
  titleSimilarity: number;
  querySimilarity: number;
  domainSimilarity: number;
  temporalSimilarity: number;
  openerSimilarity: number;
  sequenceSimilarity: number;
  sharedTokens: string[];
  rationale: string[];
}

export function computeTemporalSimilarity(timestampA: number, timestampB: number): number {
  const diffMs = Math.abs(timestampA - timestampB);
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes <= 2) return 1.0;
  if (diffMinutes <= 10) return 0.90;
  if (diffMinutes <= 30) return 0.70;
  if (diffMinutes <= 60) return 0.50;
  if (diffMinutes <= 180) return 0.25;
  if (diffMinutes <= 720) return 0.10;
  return 0.02;
}

const HIGH_VARIETY_DOMAINS = new Set([
  'youtube.com',
  'chatgpt.com',
  'openai.com',
  'reddit.com',
  'wikipedia.org',
  'medium.com',
  'stackoverflow.com',
  'quora.com',
  'x.com',
  'twitter.com',
]);

const HACKATHON_ECOSYSTEM_DOMAINS = new Set([
  'devpost.com',
  'unstop.com',
  'screenapp.io',
  'github.com',
  'studio.youtube.com',
]);

export function computeDomainSimilarity(
  domainA: string,
  domainB: string,
  baseDomainA: string,
  baseDomainB: string
): number {
  if (!domainA || !domainB) return 0;

  const baseA = extractBaseDomain(baseDomainA || domainA);
  const baseB = extractBaseDomain(baseDomainB || domainB);

  if (domainA === domainB || (baseA && baseB && baseA === baseB)) {
    if (HIGH_VARIETY_DOMAINS.has(baseA)) {
      // Content platforms host millions of disjoint tasks; same domain is only a weak signal
      return 0.25;
    }
    return domainA === domainB ? 1.0 : 0.85;
  }

  // Correlated hackathon ecosystems
  if (HACKATHON_ECOSYSTEM_DOMAINS.has(baseA) && HACKATHON_ECOSYSTEM_DOMAINS.has(baseB)) {
    return 0.45;
  }

  // Search engines are bridges; their domain match shouldn't strongly bind unrelated queries
  const isSearchA = domainA.includes('google.') || domainA.includes('bing.') || domainA.includes('duckduckgo.');
  const isSearchB = domainB.includes('google.') || domainB.includes('bing.') || domainB.includes('duckduckgo.');
  if (isSearchA && isSearchB) return 0.20;

  return 0.0;
}

export function computeEventSimilarity(
  eventA: ActivityEvent,
  eventB: ActivityEvent
): SimilarityResult {
  const rationale: string[] = [];

  // 1. Title Keyword Overlap
  const titleTokensA = extractTitleKeywords(eventA.title);
  const titleTokensB = extractTitleKeywords(eventB.title);
  const titleOverlap = computeOverlapScore(titleTokensA, titleTokensB);
  const titleSimilarity = titleOverlap.score;

  if (titleOverlap.sharedTokens.length > 0) {
    rationale.push(`Shared keywords: "${titleOverlap.sharedTokens.slice(0, 3).join(', ')}"`);
  }

  // 2. Query Similarity
  const queryTokensA = extractQueryKeywords(eventA.searchQuery);
  const queryTokensB = extractQueryKeywords(eventB.searchQuery);
  let querySimilarity = 0;
  const sharedQueryTokens: string[] = [];

  if (queryTokensA.length > 0 && queryTokensB.length > 0) {
    const queryOverlap = computeOverlapScore(queryTokensA, queryTokensB);
    querySimilarity = queryOverlap.score;
    if (queryOverlap.sharedTokens.length > 0) {
      sharedQueryTokens.push(...queryOverlap.sharedTokens);
      rationale.push(`Shared search query terms: "${queryOverlap.sharedTokens.join(', ')}"`);
    }
  } else if (queryTokensA.length > 0 && titleTokensB.length > 0) {
    // Cross query-to-title comparison (e.g. search "eureka dev" -> visited page title "EurekaDev Hackathon")
    const crossOverlap = computeOverlapScore(queryTokensA, titleTokensB);
    querySimilarity = crossOverlap.score * 0.9;
    if (crossOverlap.sharedTokens.length > 0) {
      sharedQueryTokens.push(...crossOverlap.sharedTokens);
      rationale.push(`Search query matched page title: "${crossOverlap.sharedTokens.join(', ')}"`);
    }
  } else if (queryTokensB.length > 0 && titleTokensA.length > 0) {
    const crossOverlap = computeOverlapScore(queryTokensB, titleTokensA);
    querySimilarity = crossOverlap.score * 0.9;
    if (crossOverlap.sharedTokens.length > 0) {
      sharedQueryTokens.push(...crossOverlap.sharedTokens);
      rationale.push(`Search query matched page title: "${crossOverlap.sharedTokens.join(', ')}"`);
    }
  }

  // 3. Domain Relationship
  const domainSimilarity = computeDomainSimilarity(
    eventA.domain,
    eventB.domain,
    eventA.domain,
    eventB.domain
  );
  if (domainSimilarity >= 0.85) {
    rationale.push(`Repeated domain: ${eventA.domain}`);
  }

  // 4. Temporal Proximity
  const temporalSimilarity = computeTemporalSimilarity(eventA.timestamp, eventB.timestamp);
  const diffMinutes = Math.round(Math.abs(eventA.timestamp - eventB.timestamp) / 60000);
  if (diffMinutes <= 15) {
    rationale.push(`Navigated within ${Math.max(1, diffMinutes)} minute(s)`);
  }

  // 5. Opener / Tab relationship
  let openerSimilarity = 0;
  if (
    (eventA.tabId && eventB.openerTabId && eventA.tabId === eventB.openerTabId) ||
    (eventB.tabId && eventA.openerTabId && eventB.tabId === eventA.openerTabId)
  ) {
    openerSimilarity = 1.0;
    rationale.push(`Direct link: tab opened from parent tab`);
  } else if (eventA.tabId && eventB.tabId && eventA.tabId === eventB.tabId) {
    openerSimilarity = 0.75;
    rationale.push(`Sequential navigation within the same tab`);
  }

  // 6. Navigation Sequence / Activity Continuity
  let sequenceSimilarity = 0;
  if (eventA.windowId && eventB.windowId && eventA.windowId === eventB.windowId) {
    if (temporalSimilarity > 0.6) {
      sequenceSimilarity = 0.8;
    }
  }

  // Weight combination
  // If search query is present, query similarity gives strong intentional signal
  let totalScore =
    0.28 * titleSimilarity +
    0.22 * querySimilarity +
    0.15 * domainSimilarity +
    0.15 * temporalSimilarity +
    0.12 * openerSimilarity +
    0.08 * sequenceSimilarity;

  // An opener can also be assigned by the browser to a new tab; it is not sufficient alone.
  const topicTokens = [...new Set([...titleOverlap.sharedTokens, ...sharedQueryTokens])];
  const broadPlatform = [eventA.domain, eventB.domain].some(d => HIGH_VARIETY_DOMAINS.has(extractBaseDomain(d)));
  const linkedTopic = openerSimilarity === 1 && topicTokens.length > 0 && !broadPlatform && !(eventA.searchQuery && eventB.searchQuery);
  if (linkedTopic) totalScore = Math.min(1.0, totalScore + 0.15);
  const recordingContext = domainSimilarity === 0.45 && [eventA.domain, eventB.domain].some(d => d === 'screenapp.io' || d === 'studio.youtube.com') && topicTokens.includes('hackathon') && temporalSimilarity >= 0.7;
  if ((hasTopicEvidence(topicTokens) || recordingContext) && temporalSimilarity >= 0.5) totalScore = Math.min(1.0, totalScore + 0.20);
  if (!hasTopicEvidence(topicTokens) && !recordingContext && !linkedTopic) totalScore = Math.min(totalScore, 0.35);

  // No legacy concept model is loaded in the production UI or membership path.
  const semanticSimilarity = 0;

  // A shared domain/window/tab alone is not evidence of a shared task.
  if (!semanticSimilarity && titleSimilarity === 0 && querySimilarity === 0 && openerSimilarity !== 1) totalScore *= 0.5;

  // Penalty if completely disjoint domains with ZERO shared tokens and no opener link
  if (!semanticSimilarity && domainSimilarity === 0 && titleSimilarity === 0 && querySimilarity === 0 && openerSimilarity === 0) {
    totalScore = totalScore * 0.15; // steep attenuation
  }

  totalScore = Math.min(1, totalScore + 0.20 * semanticSimilarity);

  const allSharedTokens = Array.from(
    new Set([...titleOverlap.sharedTokens, ...sharedQueryTokens])
  );

  return {
    totalScore: Math.min(1.0, Math.max(0.0, totalScore)),
    semanticSimilarity,
    titleSimilarity,
    querySimilarity,
    domainSimilarity,
    temporalSimilarity,
    openerSimilarity,
    sequenceSimilarity,
    sharedTokens: allSharedTokens,
    rationale,
  };
}
