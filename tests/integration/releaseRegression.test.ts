import { describe, it, expect, vi } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { generateWhyExplanation } from '../../src/engine/whyExplainer';
import { executeResumeTask, selectResumeTabs } from '../../src/engine/resumeSelector';
import { parseUrl } from '../../src/engine/urlParser';
import { StorageManager, STORAGE_KEY } from '../../src/storage/storageManager';
import { ActivityCollector } from '../../src/collector/activityCollector';
import { createDemoDataset } from '../../src/demo/demoDataset';
import { AIProviderService } from '../../src/engine/ai/provider';
import { chromeMock } from '../setup';

const event = (id: string, title: string, url = 'https://amazon.com/' + id) => ({ id, title, url, domain: new URL(url).hostname, pathname: '/', timestamp: Date.now(), tabId: 42, windowId: 1, eventType: 'navigation' as const, isInternalBrowserPage: false });

describe('Release defect regressions', () => {
  it('separates unrelated same-domain pages in the same tab immediately', async () => {
    const engine = new IntentEngine();
    await engine.processEvent(event('shoes', 'Nike Running Shoes'));
    await engine.processEvent(event('audio', 'Sony Noise Cancelling Headphones'));
    expect(engine.getThreads()).toHaveLength(2);
  });
  it('deduplicates identical event IDs and routes close events back to the page', async () => {
    const engine = new IntentEngine();
    const e = event('one', 'Sony Noise Cancelling Headphones');
    const thread = (await engine.processEvent(e))!;
    await engine.processEvent(e);
    expect(engine.getThread(thread.id)!.events).toHaveLength(1);
    await engine.processEvent({ ...e, id: 'closed', title: 'amazon.com', eventType: 'tab_closed' });
    expect(engine.getThreads()).toHaveLength(1);
    expect(engine.getThread(thread.id)!.tabs[0].isClosed).toBe(true);
  });
  it('does not claim shared keywords or a parent link from duplicated or absent evidence', () => {
    const e = { ...event('one', 'Unique Topic'), openerTabId: 999 };
    const tab = { ...e, id: 'tab', isClosed: false, lastAccessed: e.timestamp, order: 0 };
    const why = generateWhyExplanation([e], [tab]);
    expect(why.sharedKeywords).toEqual([]);
    expect(why.openerRelationshipFound).toBe(false);
    expect(why.titleSimilarityScore).toBe(0);
  });
  it('retains deletion across a fresh storage instance', async () => {
    const storage = new StorageManager();
    await storage.saveThreads(createDemoDataset());
    await storage.clearAllData();
    const restored = await new StorageManager().load();
    expect(restored.threads).toEqual({});
    expect(restored.lastProcessedTimestamp).toBeGreaterThan(0);
    expect(restored.aiSettings.apiKey).toBe('');
  });
  it('recovers malformed thread objects and excluded-domain entries', async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: { threads: { bad: null, partial: { id: 'p', title: 'Recovered', tabs: [null], events: [null] } }, privacy: { excludedDomains: [null, 42, 'private.example'] } } });
    const state = await new StorageManager().load();
    expect(Object.keys(state.threads)).toEqual(['p']);
    expect(state.threads.p.tabs).toEqual([]);
    expect(state.threads.p.evidence.explanationPoints.length).toBeGreaterThan(0);
    expect(state.privacy.excludedDomains).toEqual(['private.example']);
  });
  it('rejects executable/malformed/internal URLs and decodes search queries once', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', 'bad url', 'chrome://settings', 'edge://settings']) {
      expect(parseUrl(url).isValid).toBe(false);
      expect(selectResumeTabs([{ id: url, url, title: '', domain: '', lastAccessed: 0, isClosed: true, order: 0 }])).toEqual([]);
    }
    expect(parseUrl('https://google.com/search?q=100%25+physics').searchQuery).toBe('100% physics');
  });
  it('reuses open tabs, restores only task URLs, focuses next-action evidence, and tolerates denied tabs', async () => {
    const thread = createDemoDataset()[0];
    thread.nextAction.suggestedUrl = thread.tabs[2].url;
    const api: any = { query: vi.fn(async () => [{ id: 77, url: thread.tabs[2].url }, { id: 88, url: 'https://unrelated.example/' }]), update: vi.fn(async () => ({})), create: vi.fn(async (p: any) => { if (p.url === thread.tabs[0].url) throw new Error('denied'); return p; }) };
    const brief = await executeResumeTask(thread, api);
    expect(api.update).toHaveBeenCalledWith(77, { active: true });
    expect(api.create).toHaveBeenCalledTimes(3);
    expect(brief.restoredTabCount).toBe(2);
    expect(brief.focusedTabUrl).toBe(thread.tabs[2].url);
    expect(brief.lastObservedAction).toContain(thread.events.at(-1)!.title);
  });
  it('drops local, incognito, excluded and internal activity and handles revoked tab access', async () => {
    const callback = vi.fn();
    const collector = new ActivityCollector(callback, { allowPageContentAnalysis: false, autoPurgeDays: 30, excludedDomains: ['private.example'] });
    collector.startListening();
    for (const url of ['http://localhost/test', 'http://127.0.0.1/test', 'https://private.example/', 'chrome://settings', 'https://safe.example/']) chromeMock.tabs.onCreated.trigger({ url, incognito: url.includes('safe.example') } as chrome.tabs.Tab);
    chromeMock.tabs.onActivated.trigger({ tabId: -999, windowId: 1 });
    await Promise.resolve();
    collector.stopListening();
    expect(callback).not.toHaveBeenCalled();
  });
  it('split removes extracted events, keywords and milestone evidence from the source', () => {
    const [demo] = createDemoDataset();
    const engine = new IntentEngine([demo]);
    const url = demo.tabs[1].url;
    const result = engine.splitTabsFromThread(demo.id, [url], 'Repository')!;
    expect(result.sourceThread.events.some(e => e.url === url)).toBe(false);
    expect(result.sourceThread.completedSteps.some(s => s.title.includes('GitHub'))).toBe(false);
    expect(result.newThread.evidence.primaryDomains).toEqual(['github.com']);
  });
  it('avoids full inference on every event after the retained history reaches 100', async () => {
    const engine = new IntentEngine();
    const first = event('base', 'Consistent Research Topic');
    for (let i = 0; i < 100; i++) await engine.processEvent({ ...first, id: 'event-' + i, timestamp: first.timestamp + i });
    const before = engine.getThreads()[0];
    const evidence = before.evidence;
    await engine.processEvent({ ...first, id: 'event-101', timestamp: first.timestamp + 101 });
    expect(engine.getThreads()[0].events).toHaveLength(100);
    expect(engine.getThreads()[0].evidence).toBe(evidence);
  });
  it('keeps local AI mode offline and falls back when remote requests fail', async () => {
    const [thread] = createDemoDataset();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const settings = { enabled: false, provider: 'openai' as const, apiKey: '', modelName: '', customEndpoint: '' };
    const provider = new AIProviderService(settings);
    expect((await provider.enhanceThread(thread.title, thread.events, thread.tabs)).source).toBe('local_fallback');
    expect(fetchMock).not.toHaveBeenCalled();
    provider.updateSettings({ ...settings, enabled: true, apiKey: 'synthetic-test-key' });
    expect((await provider.enhanceThread(thread.title, thread.events, thread.tabs)).source).toBe('local_fallback');
    fetchMock.mockRestore();
  });
});
