import { ActivityEvent, IntentThread } from '../types';
import { STOPWORDS, extractTitleKeywords } from './keywords';
import { parseUrl } from './urlParser';

/**
 * Structured input representing the current browsing page
 * Strictly uses only metadata already observed by ThreadBack (no DOM, no body scraping)
 */
export interface PageMetadataInput {
  title: string;
  domain: string;
  url?: string;
  searchQuery?: string;
}

/**
 * Structured input representing the candidate IntentThread under evaluation
 */
export interface CandidateThreadMetadataInput {
  id: string;
  title: string;
  keywords: string[];
  recentTitles: string[];
  originatingSearchQuery?: string;
}

/**
 * Strict constrained classification decision
 * Exposes the two tool actions: join_existing_thread vs create_new_thread
 */
export interface ClassificationDecision {
  decision: 'RELATED' | 'UNRELATED';
  confidence: number; // Normalized [0.0, 1.0]
  source: 'tiny_semantic' | 'heuristic_fallback';
  toolCalled: 'join_existing_thread' | 'create_new_thread';
  ambiguityResolved: boolean;
  rationale?: string;
}

/**
 * Domain concept clusters for tiny local semantic grounding
 */
interface SemanticConcept {
  name: string;
  coreTerms: string[];
  conflictingConcepts: string[];
}

const SEMANTIC_CONCEPTS: SemanticConcept[] = [
  {
    name: 'hackathon',
    coreTerms: ['eurekadev', 'hackathon', 'hackathons', 'devpost', 'unstop'],
    conflictingConcepts: ['internship', 'astronomy', 'physics_lecture']
  },
  {
    name: 'internship',
    coreTerms: ['internship', 'internships', 'careers', 'recruitment', 'job application', 'swe intern', 'summer intern', 'recruiter', 'hire'],
    conflictingConcepts: ['hackathon', 'astronomy', 'headphones_shopping']
  },
  {
    name: 'headphones_shopping',
    coreTerms: ['headphones', 'headphone', 'earbuds', 'headset', 'anc', 'noise cancelling', 'noise canceling', 'active noise cancellation', 'wh 1000xm5', 'qc45', 'headphone comparison'],
    conflictingConcepts: ['hackathon', 'internship', 'astronomy', 'physics_lecture']
  },
  {
    name: 'astronomy',
    coreTerms: ['astronomy', 'orbital', 'orbit', 'celestial', 'kepler', 'orbital mechanics', 'gravity simulation', 'planet', 'astrophysics'],
    conflictingConcepts: ['web_django', 'internship', 'hackathon', 'headphones_shopping']
  },
  {
    name: 'web_django',
    coreTerms: ['django', 'authentication', 'csrf', 'oauth', 'token auth', 'middleware', 'backend auth'],
    conflictingConcepts: ['astronomy', 'physics_lecture']
  },
  {
    name: 'physics_lecture',
    coreTerms: ['physics', 'quantum', 'quantum mechanics', 'harmonic oscillator', 'wavefunction', 'physics lecture', 'hamiltonian', 'schrodinger', 'hyperphysics'],
    conflictingConcepts: ['hackathon', 'headphones_shopping', 'web_django', 'travel_planning']
  },
  {
    name: 'travel_planning',
    coreTerms: ['tokyo', 'japan', 'hotel', 'shinjuku', 'flight', 'flights', 'itinerary', 'travel', 'booking', 'subway', 'vacation', 'airline', 'expedia'],
    conflictingConcepts: ['hackathon', 'headphones_shopping', 'web_django', 'physics_lecture', 'astronomy', 'internship']
  },
  {
    name: 'software_dev',
    coreTerms: ['chrome extension', 'manifest v3', 'serviceworker', 'storage local'],
    conflictingConcepts: ['travel_planning', 'astronomy']
  },
  { name: 'open_source_program', coreTerms: ['gsoc', 'summer of code'], conflictingConcepts: ['travel_planning', 'astronomy', 'laptop_shopping'] },
  { name: 'laptop_shopping', coreTerms: ['laptop', 'macbook pro', 'chromebook'], conflictingConcepts: ['hackathon', 'web_django', 'astronomy', 'physics_lecture', 'travel_planning'] }
];

const GENERIC = new Set([...STOPWORDS, 'project', 'research', 'python', 'demo', 'submission', 'guide', 'review', 'comparison', 'compare', 'youtube', 'reddit', 'amazon', 'chatgpt', 'google', 'github']);
const normalize = (text: string) => ' ' + text.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const bounded = (text: unknown) => typeof text === 'string' ? text.slice(0, 1024) : '';
const strings = (value: unknown, limit: number) => Array.isArray(value) ? value.slice(0, limit).map(bounded).filter(Boolean) : [];
const distinctiveWords = (text: string) => [...new Set(normalize(text).trim().split(/\s+/).filter(w => w.length >= 2 && !GENERIC.has(w)))];
const fallback = (): ClassificationDecision => ({ decision: 'UNRELATED', confidence: 0.5, source: 'heuristic_fallback', toolCalled: 'create_new_thread', ambiguityResolved: false, rationale: 'Insufficient or invalid metadata; retain heuristic decision' });
const decision = (related: boolean, confidence: number, rationale: string): ClassificationDecision => ({ decision: related ? 'RELATED' : 'UNRELATED', confidence, source: 'tiny_semantic', toolCalled: related ? 'join_existing_thread' : 'create_new_thread', ambiguityResolved: true, rationale });

/**
 * Bounded binary subword features (strings, not hashes)
 */
function extractSubwordNgrams(text: string): Set<string> {
  const ngrams = new Set<string>();
  const words = distinctiveWords(text);

  for (const word of words) {
    // Add full word
    ngrams.add(`w:${word}`);
    // Add character 3-grams and 4-grams for morphological stem matching
    if (word.length >= 4) {
      for (let i = 0; i <= word.length - 3; i++) {
        ngrams.add(`c3:${word.slice(i, i + 3)}`);
      }
      for (let i = 0; i <= word.length - 4; i++) {
        ngrams.add(`c4:${word.slice(i, i + 4)}`);
      }
    }
  }

  return ngrams;
}

/**
 * Tiny Local Semantic Classifier (Second-Stage Ambiguity Resolver)
 * Offline, zero-dependency. RAM usage has not been independently measured.
 */
export class TinySemanticClassifier {
  /**
   * Evaluates whether a page belongs to a candidate thread under ambiguity.
   * Returns a constrained structured decision matching the function calling contract.
   */
  public classify(
    page: PageMetadataInput,
    candidate: CandidateThreadMetadataInput
  ): ClassificationDecision {
    try {
      if (!page || !candidate || typeof page.title !== 'string' || typeof candidate.title !== 'string') return fallback();
      // Hosting domains and synthesized keyword lists are not semantic topic evidence.
      const pageText = normalize(extractTitleKeywords(bounded(page.title)).join(' ') + ' ' + bounded(page.searchQuery));
      const recent = strings(candidate.recentTitles, 5);
      const threadText = normalize((recent.length ? recent.map(t => extractTitleKeywords(t).join(' ')).join(' ') : extractTitleKeywords(bounded(candidate.title)).join(' ')) + ' ' + bounded(candidate.originatingSearchQuery));
      const pageWords = distinctiveWords(pageText), threadWords = distinctiveWords(threadText);
      if (pageWords.length < 2 || threadWords.length < 2) return fallback();
      const concepts = (text: string) => SEMANTIC_CONCEPTS.filter(c => c.coreTerms.some(term => text.includes(normalize(term))));
      const pageConcepts = concepts(pageText), threadConcepts = concepts(threadText);
      for (const pc of pageConcepts) for (const tc of threadConcepts) {
        if (pc.conflictingConcepts.includes(tc.name) || tc.conflictingConcepts.includes(pc.name)) {
          return decision(false, 0.92, 'Conflicting observed metadata concepts: ' + pc.name + ' / ' + tc.name);
        }
      }
      const shared = pageConcepts.filter(pc => threadConcepts.some(tc => tc.name === pc.name));
      if (shared.length === 1 && pageConcepts.length === 1 && threadConcepts.length === 1) {
        return decision(true, 0.88, 'Aligned observed metadata concept: ' + shared[0].name);
      }
      const pageNgrams = extractSubwordNgrams(pageText), threadNgrams = extractSubwordNgrams(threadText);
      let intersection = 0;
      for (const ng of pageNgrams) if (threadNgrams.has(ng)) intersection += ng.startsWith('w:') ? 2.5 : 1;
      const norm = (features: Set<string>) => [...features].reduce((sum, ng) => sum + (ng.startsWith('w:') ? 2.5 : 1), 0);
      const cosine = intersection / (Math.sqrt(norm(pageNgrams) * norm(threadNgrams)) || 1);
      const sharedWords = pageWords.filter(word => threadWords.includes(word));
      // Character fragments or one generic/shared word cannot authorize a join.
      // This is a heuristic score, not a calibrated probability.
      if (cosine >= 0.35 && sharedWords.length >= 2 && !pageConcepts.length && !threadConcepts.length) {
        return decision(true, Math.min(0.95, 0.60 + cosine * 0.40), 'Distinct word and subword overlap: ' + cosine.toFixed(2));
      }
      if (shared.length || pageConcepts.length > 1 || threadConcepts.length > 1) return fallback();
      return decision(false, 0.75, 'Insufficient shared topic evidence');
    } catch { return fallback(); }
  }
}

/**
 * Global singleton of the local semantic classifier
 */
export const tinySemanticClassifier = new TinySemanticClassifier();

/**
 * Resolves intent ambiguity between an activity event and a candidate thread.
 * Used exclusively in the ambiguity band (0.25 <= heuristicScore < 0.50).
 */
export function resolveIntentAmbiguity(
  event: ActivityEvent,
  candidateThread: IntentThread
): ClassificationDecision {
  try {
    if (!event || !candidateThread || !Array.isArray(candidateThread.events)) return fallback();
    const observedQuery = parseUrl(event.url).searchQuery;
    const searchEvent = candidateThread.events.find(e => e.searchQuery && parseUrl(e.url).searchQuery === e.searchQuery);
    return tinySemanticClassifier.classify({ title: event.title || '', domain: event.domain || '', url: event.url, searchQuery: observedQuery === event.searchQuery ? observedQuery : undefined }, {
      id: candidateThread.id, title: candidateThread.title || '', keywords: strings(candidateThread.keywords, 30),
      recentTitles: candidateThread.events.slice(-5).map(e => bounded(e?.title)).filter(Boolean),
      originatingSearchQuery: searchEvent?.searchQuery,
    });
  } catch { return fallback(); }
}
