import { describe, it, expect } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent } from '../../src/types';

describe('Phase 3: Synthetic Realistic Clustering Scenarios', () => {
  it('correctly clusters Dataset A: Hackathon workflow into one thread', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const eventsA: ActivityEvent[] = [
      { id: 'a1', tabId: 1, url: 'https://devpost.com/hackathons/eurekadev', title: 'EurekaDev Hackathon 2026', domain: 'devpost.com', pathname: '/hackathons/eurekadev', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'a2', tabId: 2, openerTabId: 1, url: 'https://github.com/team/eurekadev-project', title: 'GitHub - team/eurekadev-project: AI Intent Engine', domain: 'github.com', pathname: '/team/eurekadev-project', timestamp: base + 2 * 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'a3', tabId: 3, url: 'https://screenapp.io', title: 'ScreenApp Online Screen Recorder for Hackathon Demo', domain: 'screenapp.io', pathname: '/', searchQuery: 'best online screen recorder hackathon demo', timestamp: base + 15 * 60000, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'a4', tabId: 4, openerTabId: 3, url: 'https://studio.youtube.com/upload', title: 'YouTube Studio - Upload Hackathon Demo Video', domain: 'studio.youtube.com', pathname: '/upload', timestamp: base + 25 * 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
    ];

    eventsA.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();
    expect(threads.length).toBe(1);
    expect(threads[0].title).toContain('EurekaDev');
    expect(threads[0].tabs.length).toBe(4);
  });

  it('correctly clusters Dataset B: Headphone shopping workflow into one thread', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const eventsB: ActivityEvent[] = [
      { id: 'b1', tabId: 10, url: 'https://www.google.com/search?q=best+noise+cancelling+headphones', title: 'best noise cancelling headphones - Google Search', domain: 'google.com', pathname: '/search', searchQuery: 'best noise cancelling headphones', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'b2', tabId: 11, openerTabId: 10, url: 'https://rtings.com/headphones/reviews/best/by-feature/active-noise-cancelling', title: 'The Best Noise Cancelling Headphones - RTINGS.com', domain: 'rtings.com', pathname: '/headphones/reviews/best/by-feature/active-noise-cancelling', timestamp: base + 3 * 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'b3', tabId: 12, openerTabId: 11, url: 'https://amazon.com/Sony-WH-1000XM4/dp/B0863TXGM3', title: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Headphones - Amazon', domain: 'amazon.com', pathname: '/Sony-WH-1000XM4/dp/B0863TXGM3', timestamp: base + 8 * 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
    ];

    eventsB.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();
    expect(threads.length).toBe(1);
    expect(threads[0].title).toContain('Headphones');
    expect(threads[0].tabs.length).toBe(3);
  });

  it('correctly clusters Dataset C: Physics assignment workflow into one thread', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const eventsC: ActivityEvent[] = [
      { id: 'c1', tabId: 20, url: 'https://www.google.com/search?q=quantum+harmonic+oscillator+derivation', title: 'quantum harmonic oscillator derivation - Google Search', domain: 'google.com', pathname: '/search', searchQuery: 'quantum harmonic oscillator derivation', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'c2', tabId: 21, openerTabId: 20, url: 'https://en.wikipedia.org/wiki/Quantum_harmonic_oscillator', title: 'Quantum harmonic oscillator - Wikipedia', domain: 'wikipedia.org', pathname: '/wiki/Quantum_harmonic_oscillator', timestamp: base + 4 * 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'c3', tabId: 22, openerTabId: 20, url: 'https://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hosc.html', title: 'Harmonic Oscillator Energy - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu', pathname: '/hbase/quantum/hosc.html', timestamp: base + 9 * 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
    ];

    eventsC.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();
    expect(threads.length).toBe(1);
    expect(threads[0].title).toContain('Physics');
    expect(threads[0].tabs.length).toBe(3);
  });

  it('interleaves all three datasets and cleanly separates them into 3 distinct threads', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    // Mixed chronological events
    const mixedEvents: ActivityEvent[] = [
      // Hackathon start
      { id: 'a1', tabId: 1, url: 'https://devpost.com/hackathons/eurekadev', title: 'EurekaDev Hackathon 2026', domain: 'devpost.com', pathname: '/hackathons/eurekadev', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      // Interleaved quick search for headphones
      { id: 'b1', tabId: 10, url: 'https://www.google.com/search?q=best+noise+cancelling+headphones', title: 'best noise cancelling headphones - Google Search', domain: 'google.com', pathname: '/search', searchQuery: 'best noise cancelling headphones', timestamp: base + 60000, eventType: 'navigation', isInternalBrowserPage: false },
      // Hackathon repo push
      { id: 'a2', tabId: 2, openerTabId: 1, url: 'https://github.com/team/eurekadev-project', title: 'GitHub - team/eurekadev-project: EurekaDev Hackathon code', domain: 'github.com', pathname: '/team/eurekadev-project', timestamp: base + 120000, eventType: 'tab_opened', isInternalBrowserPage: false },
      // Physics homework search
      { id: 'c1', tabId: 20, url: 'https://www.google.com/search?q=quantum+harmonic+oscillator+derivation', title: 'quantum harmonic oscillator derivation - Google Search', domain: 'google.com', pathname: '/search', searchQuery: 'quantum harmonic oscillator derivation', timestamp: base + 180000, eventType: 'navigation', isInternalBrowserPage: false },
      // Headphone RTINGS review
      { id: 'b2', tabId: 11, openerTabId: 10, url: 'https://rtings.com/headphones/reviews/best/by-feature/active-noise-cancelling', title: 'The Best Noise Cancelling Headphones - RTINGS.com', domain: 'rtings.com', pathname: '/headphones/reviews/best/by-feature/active-noise-cancelling', timestamp: base + 240000, eventType: 'tab_opened', isInternalBrowserPage: false },
      // Physics Wikipedia
      { id: 'c2', tabId: 21, openerTabId: 20, url: 'https://en.wikipedia.org/wiki/Quantum_harmonic_oscillator', title: 'Quantum harmonic oscillator - Wikipedia', domain: 'wikipedia.org', pathname: '/wiki/Quantum_harmonic_oscillator', timestamp: base + 300000, eventType: 'tab_opened', isInternalBrowserPage: false },
      // Hackathon screen recorder
      { id: 'a3', tabId: 3, url: 'https://screenapp.io', title: 'ScreenApp Online Screen Recorder for Hackathon Demo', domain: 'screenapp.io', pathname: '/', searchQuery: 'best online screen recorder hackathon demo', timestamp: base + 360000, eventType: 'navigation', isInternalBrowserPage: false },
      // Headphone Amazon
      { id: 'b3', tabId: 12, openerTabId: 11, url: 'https://amazon.com/Sony-WH-1000XM4/dp/B0863TXGM3', title: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Headphones - Amazon', domain: 'amazon.com', pathname: '/Sony-WH-1000XM4/dp/B0863TXGM3', timestamp: base + 420000, eventType: 'tab_opened', isInternalBrowserPage: false },
      // Physics Hyperphysics
      { id: 'c3', tabId: 22, openerTabId: 20, url: 'https://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hosc.html', title: 'Harmonic Oscillator Energy - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu', pathname: '/hbase/quantum/hosc.html', timestamp: base + 480000, eventType: 'tab_opened', isInternalBrowserPage: false },
      // Hackathon YouTube Studio upload
      { id: 'a4', tabId: 4, openerTabId: 3, url: 'https://studio.youtube.com/upload', title: 'YouTube Studio - Upload Hackathon Demo Video', domain: 'studio.youtube.com', pathname: '/upload', timestamp: base + 540000, eventType: 'tab_opened', isInternalBrowserPage: false },
    ];

    mixedEvents.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();

    // Exactly 3 distinct intent threads
    expect(threads.length).toBe(3);

    const titles = threads.map(t => t.title).join(' ');
    expect(titles).toContain('EurekaDev');
    expect(titles).toContain('Headphone');
    expect(titles).toContain('Physics');
  });

  it('does NOT falsely merge same-domain unrelated pages (e.g. amazon shoes vs amazon headphones)', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const shoesEvent: ActivityEvent = {
      id: 's1',
      tabId: 1,
      url: 'https://amazon.com/dp/B01SHOES',
      title: 'Nike Air Zoom Pegasus Running Shoes - Amazon',
      domain: 'amazon.com',
      pathname: '/dp/B01SHOES',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const headphoneEvent: ActivityEvent = {
      id: 'h1',
      tabId: 2,
      url: 'https://amazon.com/dp/B02PHONES',
      title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones - Amazon',
      domain: 'amazon.com',
      pathname: '/dp/B02PHONES',
      timestamp: base + 4 * 3600000, // 4 hours later
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    engine.processEvent(shoesEvent);
    engine.processEvent(headphoneEvent);

    expect(engine.getThreads().length).toBe(2);
  });
});
