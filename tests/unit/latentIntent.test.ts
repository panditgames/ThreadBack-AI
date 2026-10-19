import { describe, it, expect, beforeEach } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent } from '../../src/types';

describe('Singleton / Latent Intent Lifecycle & Clutter Control', () => {
  let engine: IntentEngine;

  beforeEach(() => {
    engine = new IntentEngine();
  });

  it('marks an isolated single tab as a latent intent candidate to prevent dashboard clutter', async () => {
    const event: ActivityEvent = {
      id: 'tab-1-ev',
      tabId: 101,
      windowId: 1,
      url: 'https://nature.com/articles/cellular-respiration-atp',
      title: 'Mechanisms of Cellular Respiration and Mitochondrial ATP Synthesis',
      domain: 'nature.com',
      pathname: '/articles/cellular-respiration-atp',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const thread = await engine.processEvent(event);
    expect(thread).not.toBeNull();
    expect(thread?.isLatent).toBe(true);
    expect(thread?.tabs).toHaveLength(1);

    // Active threads view hides isolated single-tab noise
    expect(engine.getActiveThreads()).toHaveLength(0);

    // Latent candidates view retains the candidate
    expect(engine.getLatentThreads()).toHaveLength(1);
    expect(engine.getThreads()).toHaveLength(1);
  });

  it('immediately promotes a latent thread when a second semantically related tab arrives', async () => {
    const now = Date.now();
    const firstEvent: ActivityEvent = {
      id: 'tab-1-ev',
      tabId: 101,
      windowId: 1,
      url: 'https://nature.com/articles/cellular-respiration-atp',
      title: 'Mechanisms of Cellular Respiration and Mitochondrial ATP Synthesis',
      domain: 'nature.com',
      pathname: '/articles/cellular-respiration-atp',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const firstThread = await engine.processEvent(firstEvent);
    expect(firstThread?.isLatent).toBe(true);
    expect(engine.getActiveThreads()).toHaveLength(0);

    const secondEvent: ActivityEvent = {
      id: 'tab-2-ev',
      tabId: 102,
      openerTabId: 101,
      windowId: 1,
      url: 'https://biology.org/biochemistry/glycolysis-krebs-cycle',
      title: 'Glycolysis and Krebs Cycle in Cellular Respiration Pathway',
      domain: 'biology.org',
      pathname: '/biochemistry/glycolysis-krebs-cycle',
      timestamp: now + 30000,
      eventType: 'tab_opened',
      isInternalBrowserPage: false,
    };

    const updatedThread = await engine.processEvent(secondEvent);
    expect(updatedThread).not.toBeNull();
    expect(updatedThread?.id).toBe(firstThread?.id);
    expect(updatedThread?.isLatent).toBe(false);
    expect(updatedThread?.latentPromotionReason).toBe('MULTI_TAB_MATCH');
    expect(updatedThread?.tabs).toHaveLength(2);

    // Promoted thread is now fully visible in active threads
    expect(engine.getActiveThreads()).toHaveLength(1);
    expect(engine.getLatentThreads()).toHaveLength(0);
  });

  it('promotes a latent thread upon subsequent navigation within the same tab', async () => {
    const now = Date.now();
    const searchEvent: ActivityEvent = {
      id: 'search-ev',
      tabId: 201,
      windowId: 1,
      url: 'https://www.google.com/search?q=quantum+harmonic+oscillator',
      title: 'quantum harmonic oscillator - Google Search',
      domain: 'google.com',
      pathname: '/search',
      searchQuery: 'quantum harmonic oscillator',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const initial = await engine.processEvent(searchEvent);
    expect(initial).not.toBeNull();
    expect(initial?.isLatent).toBe(true);

    const resultClickEvent: ActivityEvent = {
      id: 'result-ev',
      tabId: 201,
      windowId: 1,
      url: 'https://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hosc.html',
      title: 'Quantum Harmonic Oscillator Wavefunctions and Energy Levels',
      domain: 'hyperphysics.phy-astr.gsu.edu',
      pathname: '/hbase/quantum/hosc.html',
      timestamp: now + 5000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const promoted = await engine.processEvent(resultClickEvent);
    expect(promoted).not.toBeNull();
    expect(promoted?.id).toBe(initial?.id);
    expect(promoted?.isLatent).toBe(false);
    expect(engine.getActiveThreads()).toHaveLength(1);
  });

  it('supports explicit manual promotion of an isolated latent thread', async () => {
    const event: ActivityEvent = {
      id: 'tab-manual-ev',
      tabId: 301,
      windowId: 1,
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API',
      title: 'Service Worker API - MDN Web Docs',
      domain: 'developer.mozilla.org',
      pathname: '/en-US/docs/Web/API/Service_Worker_API',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const thread = (await engine.processEvent(event))!;
    expect(thread.isLatent).toBe(true);
    expect(engine.getActiveThreads()).toHaveLength(0);

    const promoted = engine.promoteLatentThread(thread.id);
    expect(promoted).not.toBeNull();
    expect(promoted?.isLatent).toBe(false);
    expect(promoted?.latentPromotionReason).toBe('MANUAL');
    expect(engine.getActiveThreads()).toHaveLength(1);
    expect(engine.getLatentThreads()).toHaveLength(0);
  });

  it('enforces bounded capacity and expires stale latent tabs older than 24 hours', async () => {
    const now = Date.now();
    const oldTimestamp = now - 25 * 60 * 60 * 1000; // 25 hours old

    // Old latent tab
    const oldEvent: ActivityEvent = {
      id: 'old-ev',
      tabId: 401,
      windowId: 1,
      url: 'https://random-blog.com/post-1',
      title: 'Random distraction article from yesterday',
      domain: 'random-blog.com',
      pathname: '/post-1',
      timestamp: oldTimestamp,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    await engine.processEvent(oldEvent);
    expect(engine.getLatentThreads()).toHaveLength(0);

    // Expired candidates are pruned automatically; explicit pruning remains safe.
    engine.pruneLatentThreads(24 * 60 * 60 * 1000, 50);
    expect(engine.getLatentThreads()).toHaveLength(0);
  });
});
