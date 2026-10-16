import { vi } from 'vitest';
import { inferThreadStatus } from '../../src/engine/statusInferer';
import { deriveMilestoneSteps } from '../../src/engine/intentClusterer';
import { parseUrl } from '../../src/engine/urlParser';
import { selectResumeTabs, executeResumeTask } from '../../src/engine/resumeSelector';
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

  it('SCENARIO A: Related cross-domain hackathon task (Google, Devpost, Unstop, GitHub, YouTube, ChatGPT) forms ONE intent', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const crossDomainEvents: ActivityEvent[] = [
      { id: 'cd-1', tabId: 1, url: 'https://www.google.com/search?q=EurekaDev+hackathon+submission', title: 'EurekaDev hackathon submission - Google Search', domain: 'google.com', pathname: '/search', searchQuery: 'EurekaDev hackathon submission', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'cd-2', tabId: 2, url: 'https://devpost.com/software/eurekadev-project', title: 'EurekaDev Project Submission | Devpost', domain: 'devpost.com', pathname: '/software/eurekadev-project', timestamp: base + 30000, eventType: 'tab_opened', isInternalBrowserPage: false },
      // Unstop page contains "apply" and "opportunity", but represents EurekaDev hackathon!
      { id: 'cd-3', tabId: 3, url: 'https://unstop.com/hackathons/eurekadev-2026-coding-challenge', title: 'EurekaDev 2026 Coding Hackathon Challenge | Unstop - Apply Now', domain: 'unstop.com', pathname: '/hackathons/eurekadev-2026-coding-challenge', timestamp: base + 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'cd-4', tabId: 4, url: 'https://github.com/team/eurekadev-project', title: 'GitHub - team/eurekadev-project: EurekaDev Hackathon Code', domain: 'github.com', pathname: '/team/eurekadev-project', timestamp: base + 90000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'cd-5', tabId: 5, url: 'https://www.youtube.com/watch?v=12345', title: 'EurekaDev Hackathon Demo Walkthrough - YouTube', domain: 'youtube.com', pathname: '/watch', timestamp: base + 120000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'cd-6', tabId: 6, url: 'https://chatgpt.com/c/67890', title: 'EurekaDev Hackathon Brainstorming & Architecture - ChatGPT', domain: 'chatgpt.com', pathname: '/c/67890', timestamp: base + 150000, eventType: 'tab_opened', isInternalBrowserPage: false },
    ];

    crossDomainEvents.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();

    // Must form ONE coherent hackathon intent, NOT 5 fragmented tasks
    expect(threads.length).toBe(1);
    expect(threads[0].title).toBe('Submit EurekaDev Project');
    expect(threads[0].title).not.toContain('Internship');
    expect(threads[0].tabs.length).toBe(6);
  });

  it('SCENARIO B & I: Search as contextual bridge preserves continuity without opener metadata (Ctrl+Click / Right-click new tab)', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    // 1. User performs Google search
    const searchEvent: ActivityEvent = {
      id: 'bridge-1',
      tabId: 1,
      url: 'https://www.google.com/search?q=EurekaDev+hackathon+submission',
      title: 'EurekaDev hackathon submission - Google Search',
      domain: 'google.com',
      pathname: '/search',
      searchQuery: 'EurekaDev hackathon submission',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };
    engine.processEvent(searchEvent);

    // 2. User right-clicks / Ctrl+clicks result -> opened in new tab with NO openerTabId
    const rightClickResultEvent: ActivityEvent = {
      id: 'bridge-2',
      tabId: 2,
      // openerTabId is intentionally undefined to simulate right-click new tab
      openerTabId: undefined,
      url: 'https://unstop.com/hackathons/eurekadev-challenge',
      title: 'EurekaDev Challenge - Online Hackathon on Unstop',
      domain: 'unstop.com',
      pathname: '/hackathons/eurekadev-challenge',
      timestamp: base + 20000,
      eventType: 'tab_opened',
      isInternalBrowserPage: false,
    };
    engine.processEvent(rightClickResultEvent);

    const threads = engine.getThreads();
    expect(threads.length).toBe(1);
    expect(threads[0].tabs.length).toBe(2);
    expect(threads[0].title).toBe('Submit EurekaDev Project');
  });

  it('SCENARIO C: Similar domain (YouTube), different tasks MUST NOT merge into one task', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const ytHackathon: ActivityEvent = {
      id: 'yt-1',
      tabId: 1,
      url: 'https://www.youtube.com/watch?v=hack1',
      title: 'EurekaDev Hackathon Full Tutorial & Submission Guide - YouTube',
      domain: 'youtube.com',
      pathname: '/watch',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const ytPhysics: ActivityEvent = {
      id: 'yt-2',
      tabId: 2,
      url: 'https://www.youtube.com/watch?v=phys1',
      title: 'Quantum Mechanics Schrödinger Equation Lecture - YouTube',
      domain: 'youtube.com',
      pathname: '/watch',
      timestamp: base + 30000, // opened within 30 seconds
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    engine.processEvent(ytHackathon);
    engine.processEvent(ytPhysics);

    const threads = engine.getThreads();
    expect(threads.length).toBe(2);
    expect(threads.map(t => t.title)).toContain('Submit EurekaDev Project');
  });

  it('SCENARIO D: Same website, different ChatGPT conversations MUST remain separate', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const gpt1: ActivityEvent = {
      id: 'gpt-1',
      tabId: 1,
      url: 'https://chatgpt.com/c/hackathon-ideas',
      title: 'Hackathon Project Pitch - ChatGPT',
      domain: 'chatgpt.com',
      pathname: '/c/hackathon-ideas',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const gpt2: ActivityEvent = {
      id: 'gpt-2',
      tabId: 2,
      url: 'https://chatgpt.com/c/python-bug',
      title: 'Fix Python Virtualenv Installation Issue - ChatGPT',
      domain: 'chatgpt.com',
      pathname: '/c/python-bug',
      timestamp: base + 45000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const gpt3: ActivityEvent = {
      id: 'gpt-3',
      tabId: 3,
      url: 'https://chatgpt.com/c/laptop-specs',
      title: 'Compare Gaming Laptop GPU Benchmarks - ChatGPT',
      domain: 'chatgpt.com',
      pathname: '/c/laptop-specs',
      timestamp: base + 90000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    engine.processEvent(gpt1);
    engine.processEvent(gpt2);
    engine.processEvent(gpt3);

    const threads = engine.getThreads();
    expect(threads.length).toBe(3);
  });

  it('SCENARIO E: Cross-domain shopping (Google, Amazon, RTINGS, Reddit, YouTube review) forms ONE shopping intent', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const shoppingEvents: ActivityEvent[] = [
      { id: 'sh-1', tabId: 1, url: 'https://www.google.com/search?q=best+ANC+headphones+under+budget', title: 'best ANC headphones under budget - Google Search', domain: 'google.com', pathname: '/search', searchQuery: 'best ANC headphones under budget', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'sh-2', tabId: 2, openerTabId: 1, url: 'https://www.rtings.com/headphones/reviews/best/by-feature/active-noise-cancelling', title: 'Best ANC Headphones Reviews - RTINGS.com', domain: 'rtings.com', pathname: '/headphones/reviews/best/by-feature/active-noise-cancelling', timestamp: base + 30000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'sh-3', tabId: 3, openerTabId: 2, url: 'https://www.amazon.com/Sony-WH-1000XM5-Canceling-Headphones/dp/B09XS7JWHH', title: 'Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones - Amazon', domain: 'amazon.com', pathname: '/Sony-WH-1000XM5-Canceling-Headphones/dp/B09XS7JWHH', timestamp: base + 60000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'sh-4', tabId: 4, url: 'https://www.reddit.com/r/headphones/comments/wh1000xm5_review', title: 'Sony WH-1000XM5 Honest Long-Term Review : r/headphones', domain: 'reddit.com', pathname: '/r/headphones/comments/wh1000xm5_review', timestamp: base + 90000, eventType: 'tab_opened', isInternalBrowserPage: false },
      { id: 'sh-5', tabId: 5, url: 'https://www.youtube.com/watch?v=review123', title: 'Sony WH-1000XM5 vs Bose QC45 Noise Cancelling Headphones Review - YouTube', domain: 'youtube.com', pathname: '/watch', timestamp: base + 120000, eventType: 'tab_opened', isInternalBrowserPage: false },
    ];

    shoppingEvents.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();

    expect(threads.length).toBe(1);
    expect(threads[0].title).toBe('Compare ANC Headphones');
    expect(threads[0].tabs.length).toBe(5);
  });

  it('SCENARIO F: Completely unrelated tasks opened rapidly within 1-2 minutes MUST NOT merge', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const rapidEvents: ActivityEvent[] = [
      { id: 'r-1', tabId: 1, url: 'https://devpost.com/hackathons/eurekadev', title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', pathname: '/hackathons/eurekadev', timestamp: base, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'r-2', tabId: 2, url: 'https://amazon.com/dp/headphones', title: 'Sony WH-1000XM5 Wireless Headphones', domain: 'amazon.com', pathname: '/dp/headphones', timestamp: base + 20000, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'r-3', tabId: 3, url: 'https://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hosc.html', title: 'Quantum Physics Harmonic Oscillator', domain: 'hyperphysics.phy-astr.gsu.edu', pathname: '/hbase/quantum/hosc.html', timestamp: base + 40000, eventType: 'navigation', isInternalBrowserPage: false },
      { id: 'r-4', tabId: 4, url: 'https://booking.com/hotel/tokyo', title: 'Tokyo Shinjuku Hotel Vacation Booking', domain: 'booking.com', pathname: '/hotel/tokyo', timestamp: base + 60000, eventType: 'navigation', isInternalBrowserPage: false },
    ];

    rapidEvents.forEach(e => engine.processEvent(e));
    const threads = engine.getThreads();

    // Must be 4 separate threads despite being opened within 60 seconds
    expect(threads.length).toBe(4);
  });

  it('SCENARIO G: Weak shared word "apply" MUST NOT cause false grouping or false internship categorization', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    const hackathonEvent: ActivityEvent = {
      id: 'g-1',
      tabId: 1,
      url: 'https://unstop.com/competitions/eurekadev',
      title: 'Apply for EurekaDev Hackathon 2026',
      domain: 'unstop.com',
      pathname: '/competitions/eurekadev',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const internshipEvent: ActivityEvent = {
      id: 'g-2',
      tabId: 2,
      url: 'https://careers.google.com/jobs/internship',
      title: 'Apply for Google Software Engineering Summer Internship',
      domain: 'careers.google.com',
      pathname: '/jobs/internship',
      timestamp: base + 30000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    engine.processEvent(hackathonEvent);
    engine.processEvent(internshipEvent);

    const threads = engine.getThreads();
    expect(threads.length).toBe(2);

    const hackThread = threads.find(t => t.tabs.some(x => x.url.includes('unstop.com')));
    const internThread = threads.find(t => t.tabs.some(x => x.url.includes('careers.google.com')));

    expect(hackThread?.title).toBe('Submit EurekaDev Project');
    expect(internThread?.title).toBe('Software Internship Applications');
  });

  it('SCENARIO H: Repeated navigation in same tab updates page without fragmenting threads', () => {
    const engine = new IntentEngine();
    const base = Date.now();

    // Page 1
    engine.processEvent({
      id: 'nav-1',
      tabId: 1,
      url: 'https://devpost.com/hackathons/eurekadev',
      title: 'EurekaDev Hackathon 2026',
      domain: 'devpost.com',
      pathname: '/hackathons/eurekadev',
      timestamp: base,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    });

    // Page 2 in same tab (navigated to rules)
    engine.processEvent({
      id: 'nav-2',
      tabId: 1,
      url: 'https://devpost.com/hackathons/eurekadev/rules',
      title: 'EurekaDev Rules & Guidelines - Devpost',
      domain: 'devpost.com',
      pathname: '/hackathons/eurekadev/rules',
      timestamp: base + 30000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    });

    // Page 3 in same tab (navigated to submission form)
    engine.processEvent({
      id: 'nav-3',
      tabId: 1,
      url: 'https://devpost.com/software/new',
      title: 'EurekaDev Project Submission Form - Devpost',
      domain: 'devpost.com',
      pathname: '/software/new',
      timestamp: base + 60000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    });

    const threads = engine.getThreads();
    expect(threads.length).toBe(1);
    expect(threads[0].events.length).toBe(3);
    expect(threads[0].title).toBe('Submit EurekaDev Project');
  });
});

describe('Independent release audit regressions', () => {
  const base = Date.now();
  const page = (id: string, title: string, url: string, offset = 0, openerTabId?: number): ActivityEvent => ({
    id, tabId: Number(id.replace(/\D/g, '')) || 99, windowId: 1, title, url,
    domain: new URL(url).hostname.replace(/^www\./, ''), pathname: new URL(url).pathname,
    timestamp: base + offset, eventType: 'navigation', isInternalBrowserPage: false, openerTabId,
  });
  const search = (id: string, query: string, offset = 0) => ({
    ...page(id, query + ' - Google Search', 'https://www.google.com/search?q=' + encodeURIComponent(query), offset),
    searchQuery: query,
  });

  it('keeps three overlapping searches and interleaved no-opener results separate', () => {
    const e = new IntentEngine();
    const queries = ['EurekaDev hackathon software submission', 'software engineering internship', 'ANC headphones'];
    const owners = queries.map((q, i) => e.processEvent(search(String(i + 1), q, i * 1000))!.id);
    const results = [
      page('11', 'Software Engineering Internship Careers', 'https://careers.example/internship', 4000),
      page('12', 'EurekaDev Hackathon Submission', 'https://devpost.com/software/eurekadev', 5000),
      page('13', 'ANC Headphones Comparison', 'https://reviews.example/anc', 6000),
    ];
    const joined = results.map(p => e.processEvent(p)!.id);
    expect(new Set(owners).size).toBe(3);
    expect(joined).toEqual([owners[1], owners[0], owners[2]]);
    expect(e.getThreads()).toHaveLength(3);
  });

  it('does not fabricate a search query on a result or propagate context through unrelated child links', () => {
    const e = new IntentEngine();
    const origin = e.processEvent(search('1', 'EurekaDev hackathon submission'))!;
    const result = page('2', 'EurekaDev Hackathon Submission', 'https://unstop.com/hackathons/eurekadev', 1000);
    expect(e.processEvent(result)!.id).toBe(origin.id);
    expect(e.getThread(origin.id)!.events.find(x => x.id === result.id)!.searchQuery).toBeUndefined();
    expect(result.searchQuery).toBeUndefined();
    const unrelated = page('3', 'Sourdough Bread Baking', 'https://recipes.example/bread', 2000, 2);
    expect(e.processEvent(unrelated)!.id).not.toBe(origin.id);
  });

  it('does not merge a single shared subject word across unrelated videos or conversations', () => {
    for (const domain of ['youtube.com', 'chatgpt.com', 'chat.openai.com']) {
      const e = new IntentEngine();
      e.processEvent(page('1', 'Python Astronomy Orbital Analysis', 'https://' + domain + '/topic/astronomy'));
      e.processEvent(page('2', 'Python Django Authentication', 'https://' + domain + '/topic/django', 1000));
      expect(e.getThreads()).toHaveLength(2);
    }
  });

  it('loses only transient confidence on worker restart without inventing or reviving erased searches', () => {
    const e = new IntentEngine();
    const owner = e.processEvent(search('1', 'EurekaDev hackathon submission'))!;
    const restarted = new IntentEngine(structuredClone(e.getThreads()));
    expect(restarted.processEvent(page('2', 'EurekaDev Hackathon Submission', 'https://devpost.com/eurekadev', 1000))!.id).toBe(owner.id);
    expect(restarted.processEvent(page('3', 'Sourdough Bread Baking', 'https://recipes.example/bread', 2000, 1))!.id).not.toBe(owner.id);
    e.setThreads([]);
    const fresh = e.processEvent(page('4', 'EurekaDev Ecology Conference', 'https://conference.example/ecology', 3000))!;
    expect(fresh.events[0].searchQuery).toBeUndefined();
    expect(e.getThreads()).toHaveLength(1);
  });

  it('requires completion evidence rather than broad guide URLs or milestone counts', () => {
    for (const pathname of ['/docs/complete-guide', '/checkout/complete-guide', '/confirmation-guide']) {
      const p = page('1', 'EurekaDev completion documentation', 'https://devpost.com' + pathname);
      expect(inferThreadStatus([p], [], [], 'ACTIVE')).toBe('ACTIVE');
      expect(deriveMilestoneSteps([p], []).completedSteps.some(s => s.id === 'hs-4')).toBe(false);
    }
    const p = page('1', 'Ordinary research', 'https://research.example/');
    const steps = [{ id: 'a', title: 'Visited', status: 'COMPLETED' as const, confidence: 'Likely' as const, evidence: [] }];
    expect(inferThreadStatus([p], [...steps, ...steps], [], 'ACTIVE')).toBe('ACTIVE');
    for (const pathname of ['/submitted', '/confirmation', '/checkout/complete']) {
      expect(inferThreadStatus([page('1', 'Submission receipt', 'https://devpost.com' + pathname)], [], [], 'ACTIVE')).toBe('LIKELY_COMPLETE');
    }
  });

  it('preserves explicit completion through subsequent activity and storage reconstruction without deleting', () => {
    const e = new IntentEngine();
    const p = page('1', 'EurekaDev Hackathon Project', 'https://devpost.com/eurekadev');
    const id = e.processEvent(p)!.id;
    e.setThreadStatus(id, 'LIKELY_COMPLETE');
    e.processEvent({ ...p, id: '2', timestamp: base + 1000 });
    const restarted = new IntentEngine(structuredClone(e.getThreads()));
    restarted.processEvent({ ...p, id: '3', timestamp: base + 2000 });
    expect(restarted.getThread(id)!.status).toBe('LIKELY_COMPLETE');
    expect(restarted.getThreads()).toHaveLength(1);
    restarted.setThreadStatus(id, 'ACTIVE');
    restarted.processEvent({ ...p, id: '4', timestamp: base + 3000 });
    expect(restarted.getThread(id)!.status).toBe('ACTIVE');
  });

  it('accepts normal case-insensitive HTTP(S) with queries/fragments and blocks every non-web scheme in collection and resume', async () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///tmp/x', 'blob:https://example.com/id', 'filesystem:https://example.com/temporary/x', 'chrome://settings', 'edge://settings', 'about:blank', 'not a URL']) {
      expect(parseUrl(url).isValid).toBe(false);
      expect(new IntentEngine().processEvent({ ...page('1', 'Unsafe', 'https://example.com/'), url })).toBeNull();
      expect(selectResumeTabs([{ id: 'x', url, title: 'Unsafe', domain: '', lastAccessed: base, isClosed: true, order: 0 }])).toEqual([]);
    }
    const url = 'HTTPS://example.com/path?q=physics#notes';
    expect(parseUrl(url).isValid).toBe(true);
    const thread = new IntentEngine().processEvent({ ...page('1', 'Physics research', 'https://example.com/'), url })!;
    const api = { query: vi.fn(async () => []), create: vi.fn(async () => ({})), update: vi.fn() };
    await executeResumeTask(thread, api as unknown as typeof chrome.tabs);
    expect(api.create).toHaveBeenCalledTimes(1);
  });
  it('requires topic evidence even when Chromium assigns an opener on shared hosting', () => {
    const e = new IntentEngine();
    const first = e.processEvent(page('1', 'EurekaDev Hackathon Submission', 'https://work.shared.example/hackathon'))!;
    expect(e.processEvent(page('2', 'Noise Cancelling Headphones', 'https://shop.shared.example/headphones', 1000, 1))!.id).not.toBe(first.id);
    for (const domain of ['youtube.com', 'chatgpt.com']) {
      const platform = new IntentEngine();
      platform.processEvent(page('1', 'Python Astronomy Orbital Analysis', 'https://' + domain + '/one'));
      platform.processEvent(page('2', 'Python Django Authentication', 'https://' + domain + '/two', 1000, 1));
      expect(platform.getThreads()).toHaveLength(2);
    }
    const queries = new IntentEngine();
    queries.processEvent(search('1', 'EurekaDev hackathon software submission'));
    queries.processEvent({ ...search('2', 'software engineering internship', 1000), openerTabId: 1 });
    expect(queries.getThreads()).toHaveLength(2);
  });

});
