import { beforeEach, describe, expect, it, vi } from 'vitest';
import model from '../../src/engine/semanticModel.json';
import { LocalSemanticModel, localSemanticModel } from '../../src/engine/localSemantic';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { computeEventSimilarity } from '../../src/engine/scoring';
import { generateWhyExplanation } from '../../src/engine/whyExplainer';
import { ActivityEvent } from '../../src/types';

let n = 0;
const page = (title: string, domain = 'www.youtube.com', minutes = 0): ActivityEvent => ({
  id: 'semantic-' + ++n, title, url: 'https://' + domain + '/page-' + n, domain,
  pathname: '/page-' + n, tabId: n, windowId: 1, timestamp: 1800000000000 + minutes * 60000,
  eventType: 'navigation', isInternalBrowserPage: false,
});
beforeEach(async () => { vi.restoreAllMocks(); await localSemanticModel.load(async () => model); });

describe('conservative offline semantic signal', () => {
  it('improves synonym-only cross-domain grouping without opener or copied query', async () => {
    const a = page('EurekaDev project submission', 'devpost.com');
    const b = page('How to win a hackathon', 'www.youtube.com', 1);
    await localSemanticModel.load(async () => { throw new Error('unavailable'); });
    const baseline = new IntentEngine(); baseline.processEvent(a); baseline.processEvent(b);
    expect(baseline.getThreads()).toHaveLength(2);
    await localSemanticModel.load(async () => model);
    const hybrid = new IntentEngine();
    for (const e of [a, b, page('Hackathon pitch preparation', 'unstop.com', 2)]) hybrid.processEvent(e);
    expect(hybrid.getThreads()).toHaveLength(1);
    expect(hybrid.getThreads()[0].events.every(e => !e.searchQuery)).toBe(true);
    expect(generateWhyExplanation([a, b], []).explanationPoints.join(' ')).toContain('Local concept match: hackathon participation');
    expect(generateWhyExplanation([a, b], []).sharedKeywords).toHaveLength(0);
  });
  it('groups ANC headphone search, Amazon, RTINGS and video synonyms', () => {
    const query = 'ANC headphones';
    const first = page(query, 'www.google.com');
    first.url = 'https://www.google.com/search?q=' + encodeURIComponent(query); first.searchQuery = query;
    const engine = new IntentEngine();
    for (const e of [first, page('Wireless headset', 'amazon.com', 1), page('Active noise cancellation earbuds', 'rtings.com', 2), page('Headphone comparison', 'www.youtube.com', 3)]) engine.processEvent(e);
    expect(engine.getThreads()).toHaveLength(1);
    expect(engine.getThreads()[0].tabs).toHaveLength(4);
  });
  it.each([
    ['Python Django authentication', 'Python astronomy orbit analysis'],
    ['Hackathon demo preparation', 'Physics lecture energy problems'],
    ['Hackathon project submission - ChatGPT', 'Coding bug conversation - ChatGPT'],
    ['Apply for hackathon', 'Apply for software internship'],
    ['Application guide video chat', 'Application guide video chat help'],
  ])('does not semantically join %s with %s', (a, b) => {
    const first = page(a), second = page(b, a.includes('ChatGPT') ? 'chatgpt.com' : 'www.youtube.com', 1);
    expect(computeEventSimilarity(first, second).semanticSimilarity).toBe(0);
    const engine = new IntentEngine(); engine.processEvent(first); engine.processEvent(second);
    expect(engine.getThreads()).toHaveLength(2);
  });
  it('abstains for insufficient or mixed concept evidence', () => {
    for (const title of ['Hackathon', 'Video guide', 'Hackathon demo and physics assignment']) {
      expect(localSemanticModel.compare(page('EurekaDev project submission'), page(title)).similarity).toBe(0);
    }
  });
  it('keeps clearly high/low or old decisions outside the semantic gate', () => {
    const spy = vi.spyOn(localSemanticModel, 'compare');
    computeEventSimilarity(page('EurekaDev hackathon submission'), page('EurekaDev hackathon submission'));
    computeEventSimilarity(page('EurekaDev project submission'), page('How to win a hackathon', 'example.com', 120));
    expect(spy).not.toHaveBeenCalled();
  });
  it('does not force a merge without enough independent context', () => {
    const a = page('EurekaDev project submission', 'example.com'), b = page('How to win a hackathon', 'other.example', 1);
    delete a.windowId; delete b.windowId;
    expect(computeEventSimilarity(a, b).totalScore).toBeLessThan(0.4);
  });
  it('falls back on loader failure and invalid model data', async () => {
    for (const loader of [async () => { throw new Error('missing local asset'); }, async () => ({ version: 1, concepts: [{}] })]) {
      expect(await localSemanticModel.load(loader)).toBe(false);
      const engine = new IntentEngine();
      engine.processEvent(page('EurekaDev project submission', 'devpost.com'));
      engine.processEvent(page('How to win a hackathon', 'www.youtube.com', 1));
      expect(engine.getThreads()).toHaveLength(2);
    }
  });
  it('falls back if optional inference throws', () => {
    const a = page('EurekaDev project submission'), b = page('How to win a hackathon', 'example.com', 1);
    vi.spyOn(localSemanticModel, 'compare').mockImplementation(() => { throw new Error('model error'); });
    expect(() => computeEventSimilarity(a, b)).not.toThrow();
    expect(computeEventSimilarity(a, b).semanticSimilarity).toBe(0);
  });
  it('reinitializes from a fresh instance without saved model state', async () => {
    const fresh = new LocalSemanticModel();
    const a = page('EurekaDev project submission'), b = page('How to win a hackathon');
    expect(fresh.compare(a, b).similarity).toBe(0);
    expect(await fresh.load(async () => model)).toBe(true);
    expect(fresh.compare(a, b).similarity).toBe(1);
  });
  it('reports a small reproducible metadata-only microbenchmark', async () => {
    const fresh = new LocalSemanticModel();
    const start = performance.now();
    await fresh.load(async () => JSON.parse(JSON.stringify(model)));
    const initializationMs = performance.now() - start;
    const a = page('EurekaDev project submission', 'devpost.com'), b = page('How to win a hackathon');
    for (let i = 0; i < 100; i++) fresh.compare(a, b);
    const inferStart = performance.now();
    for (let i = 0; i < 2000; i++) fresh.compare(a, b);
    const inferenceMs = (performance.now() - inferStart) / 2000;
    console.info('SEMANTIC_METRICS ' + JSON.stringify({ initializationMs, inferenceMs, iterations: 2000 }));
    expect(Number.isFinite(inferenceMs)).toBe(true);
  });
  it('retains manual merge, rename and split controls', () => {
    const engine = new IntentEngine();
    const a = page('EurekaDev project submission'), b = page('Physics lecture energy problems');
    const first = engine.processEvent(a)!, second = engine.processEvent(b)!;
    expect(engine.mergeThreads(first.id, second.id)?.tabs).toHaveLength(2);
    expect(engine.renameThread(first.id, 'My explicit task')?.title).toBe('My explicit task');
    const split = engine.splitTabsFromThread(first.id, [b.url], 'Physics research');
    expect(split?.sourceThread.tabs.map(t => t.url)).toEqual([a.url]);
    expect(split?.newThread.tabs.map(t => t.url)).toEqual([b.url]);
    expect(split?.sourceThread.title).toBe('My explicit task');
  });
});
