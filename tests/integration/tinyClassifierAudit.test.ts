import { afterEach, describe, expect, it, vi } from 'vitest';
import { tinySemanticClassifier, resolveIntentAmbiguity } from '../../src/engine/localIntentClassifier';
import { ActivityEvent, IntentThread, InferredNextAction, ClusterEvidence } from '../../src/types';

const candidate = (title: string, keywords: string[] = [], recentTitles: string[] = [title]) => ({
  id: 'candidate',
  title,
  keywords,
  recentTitles,
});

let id = 0;
const event = (title: string, domain = 'fixture.example'): ActivityEvent => ({
  id: 'audit-' + ++id,
  title,
  url: 'https://' + domain + '/' + id,
  domain,
  pathname: '/' + id,
  timestamp: 1800000000000 + id * 1000,
  windowId: 1,
  tabId: id,
  eventType: 'navigation',
  isInternalBrowserPage: false,
});

const dummyNextAction: InferredNextAction = {
  actionText: 'Continue task',
  confidence: 'Likely',
  rationale: 'Resume work',
};

const dummyEvidence: ClusterEvidence = {
  sharedKeywords: [],
  primaryDomains: [],
  searchQueries: [],
  timeSpanMinutes: 0,
  temporalContinuityScore: 0,
  domainSimilarityScore: 0,
  querySimilarityScore: 0,
  titleSimilarityScore: 0,
  openerRelationshipFound: false,
  explanationPoints: [],
};

const makeThread = (id: string, title: string, events: ActivityEvent[] = [], keywords: string[] = []): IntentThread => ({
  id,
  title,
  summary: '',
  createdAt: 0,
  updatedAt: 0,
  status: 'ACTIVE',
  confidence: 0.8,
  tabs: [],
  events,
  keywords,
  completedSteps: [],
  unfinishedSteps: [],
  nextAction: dummyNextAction,
  evidence: dummyEvidence,
});

afterEach(() => vi.restoreAllMocks());

describe('independent resolver audit', () => {
  it.each([
    ['GSoC organization project proposals', 'Chrome extension project Manifest V3'],
    ['Camera competition project submission', 'Hackathon project submission'],
    ['Demographic population research', 'Hackathon demo submission'],
    ['3D models and camera views', 'Django authentication'],
    ['Sony camera lens comparison', 'ANC headphone research'],
    ['Chromosome sequence analysis', 'Chrome extension development'],
    ['Python research project guide', 'Python project research tutorial'],
    ['Wireless network router setup', 'Headphone reviews'],
    ['Tokyo hotel booking', 'Chrome extension Manifest V3'],
  ])('does not merge weak/subword/domain traps: %s', (title, other) => {
    const result = tinySemanticClassifier.classify({ title, domain: 'headphones.example' }, candidate(other));
    expect(result.decision === 'RELATED' && result.confidence >= 0.65 && result.ambiguityResolved).toBe(false);
  });

  it('returns fallback result when candidate has insufficient metadata', () => {
    const result = tinySemanticClassifier.classify(
      { title: '', domain: 'fixture.example' },
      candidate('', [], [])
    );
    expect(result.ambiguityResolved).toBe(false);
  });

  it('handles controlled classifier exceptions gracefully in wrapper', () => {
    vi.spyOn(tinySemanticClassifier, 'classify').mockImplementation(() => {
      throw new Error('controlled classifier failure');
    });
    const second = event('Amber orchard pruning');
    const thread = makeThread('dummy', 'Dummy Thread');
    const res = resolveIntentAmbiguity(second, thread);
    expect(res.ambiguityResolved).toBe(false);
    expect(res.decision).toBe('UNRELATED');
  });

  it('executes the real ambiguity resolver for related travel metadata', () => {
    const a = event('Tokyo hotel reservation', 'booking.com');
    const b = event('Tokyo subway route map', 'metro.example');
    b.url = 'https://metro.example/routes';
    const travelThread = makeThread('t-travel', 'Tokyo travel planning', [a], ['tokyo', 'hotel', 'travel']);
    const res = resolveIntentAmbiguity(b, travelThread);
    expect(res.decision).toBe('RELATED');
    expect(res.ambiguityResolved).toBe(true);
  });

  it('does not treat inferred page queries as observed search evidence', () => {
    const thread = makeThread('pottery', 'Cobalt pottery shapes', [event('Cobalt pottery shapes')]);
    const a = event('Unrelated orchid watering');
    a.searchQuery = 'Cobalt pottery shapes';
    const result = resolveIntentAmbiguity(a, thread);
    expect(result.decision === 'RELATED' && result.ambiguityResolved).toBe(false);
    expect(a.searchQuery).toBe('Cobalt pottery shapes');
  });

  it('handles missing metadata without throwing or asserting a semantic decision', () => {
    const bad = undefined as unknown as Parameters<typeof resolveIntentAmbiguity>[0];
    expect(() => resolveIntentAmbiguity(bad, {} as never)).not.toThrow();
    expect(
      tinySemanticClassifier.classify(
        { title: undefined, domain: undefined } as never,
        { title: '', keywords: undefined, recentTitles: undefined } as never
      ).ambiguityResolved
    ).toBe(false);
  });
});
