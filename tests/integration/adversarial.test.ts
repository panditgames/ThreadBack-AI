import { describe, it, expect } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { parseUrl } from '../../src/engine/urlParser';
import { selectResumeTabs } from '../../src/engine/resumeSelector';
import { StorageManager } from '../../src/storage/storageManager';
import { ActivityEvent } from '../../src/types';

describe('Phase 6: Adversarial & Edge Case Resilience', () => {
  it('handles 0 events and 0 tabs without crashing', () => {
    const engine = new IntentEngine();
    expect(engine.getThreads()).toEqual([]);
    const resume = selectResumeTabs([]);
    expect(resume).toEqual([]);
  });

  it('handles 1 single isolated tab event gracefully', async () => {
    const engine = new IntentEngine();
    const event: ActivityEvent = {
      id: 'e1',
      tabId: 1,
      url: 'https://example.com',
      title: 'Just Example',
      domain: 'example.com',
      pathname: '/',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };
    const thread = await engine.processEvent(event);
    expect(thread).not.toBeNull();
    expect(engine.getThreads().length).toBe(1);
  });

  it('handles massive burst of 200 tab events in fast succession', async () => {
    const engine = new IntentEngine();
    const base = Date.now();
    for (let i = 0; i < 200; i++) {
      await engine.processEvent({
        id: `burst-${i}`,
        tabId: i,
        url: `https://example.com/item-${i % 5}`,
        title: `Item ${i % 5} on Example`,
        domain: 'example.com',
        pathname: `/item-${i % 5}`,
        searchQuery: undefined,
        timestamp: base + i * 50, // 50ms apart
        eventType: 'navigation',
        isInternalBrowserPage: false,
      });
    }
    expect(engine.getThreads().length).toBeGreaterThanOrEqual(1);
  });

  it('filters out internal chrome:// and edge:// URLs', async () => {
    const engine = new IntentEngine();
    const chromeEvent: ActivityEvent = {
      id: 'c1',
      url: 'chrome://extensions',
      title: 'Extensions',
      domain: '',
      pathname: '',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: true,
    };
    const edgeEvent: ActivityEvent = {
      id: 'c2',
      url: 'edge://settings',
      title: 'Settings',
      domain: '',
      pathname: '',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: true,
    };

    expect(await engine.processEvent(chromeEvent)).toBeNull();
    expect(await engine.processEvent(edgeEvent)).toBeNull();
    expect(engine.getThreads().length).toBe(0);
  });

  it('handles emoji, non-English, and very long page titles safely', async () => {
    const engine = new IntentEngine();
    const superLongTitle = 'A'.repeat(5000);
    const emojiTitle = '🚀🔥🎉 EurekaDev Project AI Hackathon 🤖💻';
    const nonEnglishTitle = '東京の観光名所とおすすめホテルガイド - 日本語検索';

    const ev1: ActivityEvent = {
      id: 'e1',
      tabId: 1,
      url: 'https://test.com/long',
      title: superLongTitle,
      domain: 'test.com',
      pathname: '/long',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const ev2: ActivityEvent = {
      id: 'e2',
      tabId: 2,
      url: 'https://test.com/emoji',
      title: emojiTitle,
      domain: 'test.com',
      pathname: '/emoji',
      timestamp: Date.now() + 1000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const ev3: ActivityEvent = {
      id: 'e3',
      tabId: 3,
      url: 'https://test.com/jp',
      title: nonEnglishTitle,
      domain: 'test.com',
      pathname: '/jp',
      timestamp: Date.now() + 2000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    await engine.processEvent(ev1);
    await engine.processEvent(ev2);
    await engine.processEvent(ev3);

    expect(engine.getThreads().length).toBeGreaterThan(0);
  });

  it('handles missing titles, missing hostnames, and malformed URLs', async () => {
    expect(() => parseUrl('javascript:void(0)')).not.toThrow();
    expect(() => parseUrl('')).not.toThrow();
    expect(() => parseUrl('https://')).not.toThrow();
    expect(() => parseUrl('http://?query=only')).not.toThrow();

    const engine = new IntentEngine();
    const malformedEvent: ActivityEvent = {
      id: 'm1',
      url: '',
      title: '',
      domain: '',
      pathname: '',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };
    expect(await engine.processEvent(malformedEvent)).toBeNull();
  });

  it('handles storage corruption safely and restores initial state', async () => {
    const storage = new StorageManager();
    // Simulate corrupted local storage payload
    (storage as any).inMemoryFallback = null;
    const loaded = await storage.load();
    expect(loaded.version).toBe(1);
    expect(loaded.threads).toBeDefined();
  });

  it('survives repeated split and merge cycles', async () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const t1 = (await engine.processEvent({
      id: 'e1',
      tabId: 1,
      url: 'https://site.com/product1',
      title: 'Compare Alpha Laptops',
      domain: 'site.com',
      pathname: '/product1',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    }))!;

    await engine.processEvent({
      id: 'e2',
      tabId: 2,
      openerTabId: 1,
      url: 'https://site.com/product2',
      title: 'Compare Beta Laptops',
      domain: 'site.com',
      pathname: '/product2',
      timestamp: base + 1000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    });

    // Split
    const splitResult = engine.splitTabsFromThread(t1.id, ['https://site.com/product2'], 'Split Part');
    expect(splitResult).not.toBeNull();
    expect(engine.getThreads().length).toBe(2);

    // Merge back
    const merged = engine.mergeThreads(splitResult!.sourceThread.id, splitResult!.newThread.id);
    expect(merged).not.toBeNull();
    expect(engine.getThreads().length).toBe(1);

    // Split again
    const split2 = engine.splitTabsFromThread(merged!.id, ['https://site.com/product2'], 'Split Again');
    expect(split2).not.toBeNull();
    expect(engine.getThreads().length).toBe(2);
  });
});
