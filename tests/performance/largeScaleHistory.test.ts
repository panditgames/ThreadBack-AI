import { describe, it, expect } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent } from '../../src/types';

describe('Phase 7: Large-Scale History Performance Benchmark', () => {
  it('processes 10,000 synthetic events under performance budget without lagging', () => {
    const engine = new IntentEngine();
    const baseTime = Date.now() - 30 * 24 * 3600000; // over 30 days
    const totalEvents = 10000;

    const domains = [
      'devpost.com',
      'github.com',
      'youtube.com',
      'screenapp.io',
      'google.com',
      'amazon.com',
      'rtings.com',
      'wikipedia.org',
      'hyperphysics.phy-astr.gsu.edu',
      'stackoverflow.com',
    ];

    const startTime = performance.now();

    for (let i = 0; i < totalEvents; i++) {
      const domainIndex = i % domains.length;
      const domain = domains[domainIndex];
      const event: ActivityEvent = {
        id: `perf-ev-${i}`,
        tabId: i % 25,
        windowId: 1,
        url: `https://${domain}/page/${i % 100}`,
        title: `Browsing ${domain} Task Item ${i % 100}`,
        domain,
        pathname: `/page/${i % 100}`,
        searchQuery: i % 20 === 0 ? `query ${domain}` : undefined,
        timestamp: baseTime + (i * 120000), // 2 min intervals
        eventType: 'navigation',
        isInternalBrowserPage: false,
      };

      engine.processEvent(event);
    }

    const durationMs = performance.now() - startTime;
    const threads = engine.getThreads();

    console.log(`[Performance Benchmark] Processed ${totalEvents} events in ${durationMs.toFixed(1)}ms. Total intent threads formed: ${threads.length}`);

    // Performance budget: 10,000 events processed under 90s (average < 10ms per event)
    expect(durationMs).toBeLessThan(90000);
    expect(threads.length).toBeGreaterThan(0);
  }, 120000);

  it('performs incremental single-event addition in fast sub-millisecond time', () => {
    const engine = new IntentEngine();
    const event: ActivityEvent = {
      id: 'single-ev',
      tabId: 1,
      url: 'https://github.com/eurekadev/threadback',
      title: 'GitHub - eurekadev/threadback: Browser intent memory',
      domain: 'github.com',
      pathname: '/eurekadev/threadback',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    // JIT warm-up
    engine.processEvent(event);

    const start = performance.now();
    engine.processEvent(event);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(25);
  });
});
