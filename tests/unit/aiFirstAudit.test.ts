import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityEvent } from '../../src/types';
const mocks = vi.hoisted(() => ({ embed: vi.fn() }));
vi.mock('../../src/engine/ai/localEmbedder', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/engine/ai/localEmbedder')>(), generateEmbedding: mocks.embed,
}));
import { IntentEngine } from '../../src/engine/intentClusterer';
import { formatPageMetadata, centroidOf, computeCosineSimilarity, isValidEmbedding, normalizeVector } from '../../src/engine/ai/localEmbedder';
const vector = (axis: number) => Array.from({ length: 384 }, (_, i) => i === axis ? 1 : 0);
let counter = 0;
const event = (url = 'https://example.test/' + (++counter)): ActivityEvent => ({
  id: 'audit-' + (++counter), url, title: 'Observed task title', domain: 'example.test', pathname: '/',
  tabId: counter, windowId: 1, timestamp: Date.now(), eventType: 'navigation', isInternalBrowserPage: false,
});
beforeEach(() => { mocks.embed.mockReset().mockResolvedValue(vector(0)); });
describe('Independent AI-first lifecycle regressions', () => {
  it('does not lower semantic requirements for a direct child', async () => {
    const engine = new IntentEngine();
    const seed = event(); const first = (await engine.processEvent(seed))!;
    await engine.processEvent(event());
    const incoming = event();
    mocks.embed.mockResolvedValueOnce(normalizeVector(vector(0).map((_, i) => i === 0 ? 0.61 : i === 1 ? Math.sqrt(1 - 0.61 ** 2) : 0)));
    const result = (await engine.processEvent({ ...incoming, openerTabId: seed.tabId }))!;
    expect(result.id).not.toBe(first.id);
    expect(result.isLatent).toBe(true);
  });
  it('abstains when two latent intents have equal semantic support', async () => {
    const engine = new IntentEngine();
    mocks.embed.mockResolvedValueOnce(vector(0)).mockResolvedValueOnce(vector(1))
      .mockResolvedValueOnce(normalizeVector(vector(0).map((_, i) => i < 2 ? 1 : 0)));
    const first = (await engine.processEvent(event()))!;
    const second = (await engine.processEvent(event()))!;
    const result = (await engine.processEvent(event()))!;
    expect(result.id).not.toBe(first.id);
    expect(result.id).not.toBe(second.id);
    expect(engine.getLatentThreads()).toHaveLength(3);
  });
  it('does not promote a singleton on activation or closure', async () => {
    const engine = new IntentEngine(); const first = event();
    const t = (await engine.processEvent(first))!;
    await engine.processEvent({ ...first, id: 'activate', eventType: 'tab_activated' });
    await engine.processEvent({ ...first, id: 'close', eventType: 'tab_closed' });
    expect(engine.getThread(t.id)?.isLatent).toBe(true);
    expect(mocks.embed).toHaveBeenCalledTimes(1);
  });
  it('preserves the observed page title when a tab closes', async () => {
    const engine = new IntentEngine(); const first = event(); const thread = (await engine.processEvent(first))!;
    await engine.processEvent({ ...first, id: 'closed-title', title: 'example.test', eventType: 'tab_closed' });
    expect(engine.getThread(thread.id)?.tabs[0].title).toBe(first.title);
    expect(mocks.embed).toHaveBeenCalledTimes(1);
  });
  it('rebuilds cached metadata after a real title update', async () => {
    const engine = new IntentEngine(); const first = event(); await engine.processEvent(first);
    await engine.processEvent({ ...first, id: 'updated-title', title: 'Updated observed task title' });
    await engine.processEvent(event());
    expect(mocks.embed.mock.calls.flat().join(' ')).toContain('Updated observed task title');
    expect(mocks.embed).toHaveBeenCalledTimes(3);
  });
  it('serializes simultaneous new pages and preserves all observations', async () => {
    const engine = new IntentEngine();
    const results = await Promise.all(Array.from({ length: 8 }, () => engine.processEvent(event())));
    expect(new Set(results.map(t => t?.id)).size).toBe(1);
    expect(engine.getThreads()[0].tabs).toHaveLength(8);
    expect(engine.getThreads()[0].isLatent).toBe(false);
  });
  it('bounds latent count after insertion without closing browser tabs', async () => {
    const engine = new IntentEngine(); let n = 0;
    mocks.embed.mockImplementation(async () => vector(n++));
    const remove = vi.spyOn(chrome.tabs, 'remove');
    for (let i = 0; i < 53; i++) await engine.processEvent(event());
    expect(engine.getLatentThreads()).toHaveLength(50);
    expect(remove).not.toHaveBeenCalled();
  });
  it('preserves a failed-inference event as a latent candidate and recovers later', async () => {
    const engine = new IntentEngine(); mocks.embed.mockRejectedValueOnce(new Error('offline model failure'));
    const first = (await engine.processEvent(event()))!;
    expect(first.events).toHaveLength(1); expect(first.isLatent).toBe(true);
    await engine.processEvent(event());
    expect(engine.getThreads()).toHaveLength(1); expect(engine.getThreads()[0].tabs).toHaveLength(2);
  });
  it('does not embed generated or manually renamed thread names', async () => {
    const engine = new IntentEngine(); const first = (await engine.processEvent(event()))!;
    engine.renameThread(first.id, 'Invented category must not decide membership');
    await engine.processEvent(event());
    expect(mocks.embed.mock.calls.flat().join(' ')).not.toContain('Invented category');
  });
  it('rejects corrupt/version-mismatched persisted representations and rebuilds observed metadata', async () => {
    const engine = new IntentEngine(); const first = (await engine.processEvent(event()))!;
    first.centroidEmbedding = [NaN]; first.embeddingModelVersion = 'old-model';
    const restored = new IntentEngine([first]); await restored.processEvent(event());
    expect(isValidEmbedding(restored.getThreads()[0].centroidEmbedding)).toBe(true);
    expect(mocks.embed).toHaveBeenCalledTimes(3);
  });
  it('removes invented query context and bounds title input', async () => {
    const engine = new IntentEngine(); await engine.processEvent({ ...event(), title: 'x'.repeat(10000), searchQuery: 'invented query' });
    const input = mocks.embed.mock.calls[0][0] as string;
    expect(input.length).toBeLessThan(1300); expect(input).not.toContain('invented query');
  });
  it('never prunes completed or archived tasks, including legacy latent flags', async () => {
    const engine = new IntentEngine(); const t = (await engine.processEvent(event()))!;
    engine.setThreadStatus(t.id, 'LIKELY_COMPLETE');
    expect(engine.getThread(t.id)?.isLatent).toBe(false);
    engine.pruneLatentThreads(-1, 0);
    expect(engine.getThread(t.id)?.status).toBe('LIKELY_COMPLETE');
    t.status = 'ARCHIVED'; t.isLatent = true; t.updatedAt = 0;
    engine.setThreads([t]); engine.pruneLatentThreads(-1, 0);
    expect(engine.getThread(t.id)?.status).toBe('ARCHIVED');
  });
  it('uses canonical URL-derived query evidence once without accepting invented fields', () => {
    const query = formatPageMetadata({ url: 'https://google.com/search?q=quantum+mechanics', title: 'quantum mechanics - Google Search' });
    expect(query.match(/quantum mechanics/gi)).toHaveLength(1);
    const forged = { url: 'https://example.test/notes', title: 'Observed task', searchQuery: 'invented query', domain: 'google.com' };
    expect(formatPageMetadata(forged)).not.toContain('invented query');
  });
  it('computes an exact normalized sum and rejects NaN/wrong-dimensional similarities', () => {
    expect(centroidOf([vector(0), vector(1), vector(1)])).toEqual(normalizeVector(vector(0).map((x, i) => x + 2 * vector(1)[i])));
    expect(computeCosineSimilarity([NaN], [NaN])).toBe(0);
    expect(computeCosineSimilarity([1], [1])).toBe(0);
  });
});

it('does not let one stray old page dominate a workflow', async () => {
  const engine = new IntentEngine(); const first = (await engine.processEvent(event()))!;
  for (let i = 0; i < 7; i++) await engine.processEvent(event());
  mocks.embed.mockImplementation(async (text: string) => text.includes('Distinct') ? vector(1) : vector(0));
  const stray = (await engine.processEvent({ ...event(), title: 'Distinct observed purpose' }))!;
  engine.mergeThreads(first.id, stray.id);
  expect((await engine.processEvent({ ...event(), title: 'Distinct observed purpose' }))!.id).not.toBe(first.id);
  expect(engine.getThread(first.id)!.semanticPages).toHaveLength(5);
});
it('uses identical semantic metadata for identical titles on arbitrary websites', () => {
  expect(formatPageMetadata({url:'https://one.example/page',title:'Observed purpose'}))
    .toBe(formatPageMetadata({url:'https://different.example/page',title:'Observed purpose'}));
});

it('preserves explicit manual split boundaries during later automatic reconciliation', async () => {
  const engine = new IntentEngine();
  const first = (await engine.processEvent(event()))!;
  await engine.processEvent(event());
  const related = normalizeVector(vector(0).map((_, i) => i === 0 ? 0.8 : i === 1 ? 0.6 : 0));
  mocks.embed.mockImplementation(async (text: string) => text.includes('Alternate') ? related : vector(0));
  const extracted = [{ ...event(), title: 'Alternate observed purpose' }, { ...event(), title: 'Alternate observed purpose' }];
  for (const item of extracted) await engine.processEvent(item);
  const split = engine.splitTabsFromThread(first.id, extracted.map(item => item.url))!;
  const result = (await engine.processEvent({ ...event(), title: 'Alternate observed purpose' }))!;
  expect(result.id).toBe(split.newThread.id);
  expect(engine.getThreads()).toHaveLength(2);
  expect(engine.getThread(split.sourceThread.id)).toBeDefined();
});

it('removes exact site branding generically without using site identity as purpose', () => {
  for (const site of ['firstbrand', 'otherbrand']) {
    expect(formatPageMetadata({url:'https://' + site + '.example/page',title:'Repair a bicycle chain - ' + site}))
      .toBe('Repair a bicycle chain');
  }
});

it('never automatically coalesces or removes a completed workflow', async () => {
  const seed = new IntentEngine();
  const first = (await seed.processEvent(event()))!; await seed.processEvent(event());
  const completed = seed.setThreadStatus(first.id, 'LIKELY_COMPLETE')!;
  const related = normalizeVector(vector(0).map((_, i) => i === 0 ? 0.8 : i === 1 ? 0.6 : 0));
  const active = { ...completed, id: 'active-purpose', status: 'ACTIVE' as const, createdAt: completed.createdAt + 1,
    tabs: completed.tabs.map((tab, i) => ({ ...tab, url:'https://alternate.example/' + i, title:'Alternate observed purpose' })),
    events: [], centroidEmbedding:related,
    semanticPages: completed.semanticPages!.map((_, i) => ({url:'https://alternate.example/' + i,vector:related})),
  };
  const recovered = new IntentEngine([completed,active]);
  mocks.embed.mockResolvedValueOnce(related);
  expect((await recovered.processEvent({ ...event(), title:'Alternate observed purpose' }))!.id).toBe(active.id);
  expect(recovered.getThreads()).toHaveLength(2);
  expect(recovered.getThread(completed.id)?.status).toBe('LIKELY_COMPLETE');
});
