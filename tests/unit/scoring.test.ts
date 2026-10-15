import { describe, it, expect } from 'vitest';
import { 
  cleanText, 
  extractTokens, 
  extractTitleKeywords, 
  computeOverlapScore 
} from '../../src/engine/keywords';
import { 
  parseUrl, 
  isInternalUrl, 
  extractBaseDomain 
} from '../../src/engine/urlParser';
import { 
  computeTemporalSimilarity, 
  computeDomainSimilarity, 
  computeEventSimilarity 
} from '../../src/engine/scoring';
import { ActivityEvent } from '../../src/types';

describe('Keyword & Token Extraction', () => {
  it('cleans text and removes punctuation', () => {
    const raw = "What's the best noise-cancelling headphones in 2026?!";
    const cleaned = cleanText(raw);
    expect(cleaned).toContain('noise cancelling headphones');
  });

  it('filters out common English and web stopwords', () => {
    const text = "how to login to the online dashboard for my account";
    const tokens = extractTokens(text);
    expect(tokens).not.toContain('how');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('to');
    expect(tokens).not.toContain('login');
    expect(tokens).not.toContain('online');
    expect(tokens).not.toContain('dashboard');
  });

  it('strips common site suffix from page titles', () => {
    const title = 'Quantum harmonic oscillator - Google Search';
    const tokens = extractTitleKeywords(title);
    expect(tokens).toContain('quantum');
    expect(tokens).toContain('harmonic');
    expect(tokens).toContain('oscillator');
    expect(tokens).not.toContain('google');
    expect(tokens).not.toContain('search');
  });

  it('computes overlap score and returns shared tokens', () => {
    const tokensA = ['eurekadev', 'hackathon', 'submission', 'project'];
    const tokensB = ['eurekadev', 'hackathon', 'rules', 'deadline'];
    const { score, sharedTokens } = computeOverlapScore(tokensA, tokensB);
    expect(score).toBeGreaterThan(0.4);
    expect(sharedTokens).toContain('eurekadev');
    expect(sharedTokens).toContain('hackathon');
  });
});

describe('URL Parser & Domain Extraction', () => {
  it('correctly identifies internal browser protocols', () => {
    expect(isInternalUrl('chrome://extensions')).toBe(true);
    expect(isInternalUrl('edge://settings')).toBe(true);
    expect(isInternalUrl('about:blank')).toBe(true);
    expect(isInternalUrl('chrome-extension://xyz123/popup.html')).toBe(true);
    expect(isInternalUrl('https://github.com')).toBe(false);
  });

  it('extracts base domain across complex TLDs', () => {
    expect(extractBaseDomain('www.google.co.uk')).toBe('google.co.uk');
    expect(extractBaseDomain('sub.domain.github.com')).toBe('github.com');
    expect(extractBaseDomain('amazon.com')).toBe('amazon.com');
  });

  it('extracts search queries from major search engines', () => {
    const googleUrl = 'https://www.google.com/search?q=best+headphones+2026&oq=best';
    const parsedGoogle = parseUrl(googleUrl);
    expect(parsedGoogle.searchQuery).toBe('best headphones 2026');
    expect(parsedGoogle.searchEngine).toBe('Google');

    const ddgUrl = 'https://duckduckgo.com/?q=quantum+physics+lecture+notes';
    const parsedDdg = parseUrl(ddgUrl);
    expect(parsedDdg.searchQuery).toBe('quantum physics lecture notes');

    const ytUrl = 'https://www.youtube.com/results?search_query=hackathon+demo+video';
    const parsedYt = parseUrl(ytUrl);
    expect(parsedYt.searchQuery).toBe('hackathon demo video');
  });

  it('handles invalid or empty URLs gracefully without crashing', () => {
    const parsed = parseUrl('not a valid url :// oops');
    expect(parsed.isValid).toBe(false);
    expect(parsed.domain).toBe('');
  });
});

describe('Multi-Signal Similarity Scoring', () => {
  it('decays temporal similarity smoothly', () => {
    const now = Date.now();
    expect(computeTemporalSimilarity(now, now + 60000)).toBe(1.0); // 1 min
    expect(computeTemporalSimilarity(now, now + 5 * 60000)).toBe(0.9); // 5 min
    expect(computeTemporalSimilarity(now, now + 25 * 60000)).toBe(0.7); // 25 min
    expect(computeTemporalSimilarity(now, now + 24 * 3600000)).toBeLessThan(0.1); // 24 hrs
  });

  it('scores domain matches with proper weighting', () => {
    expect(computeDomainSimilarity('github.com', 'github.com', 'github.com', 'github.com')).toBe(1.0);
    expect(computeDomainSimilarity('api.github.com', 'gist.github.com', 'github.com', 'github.com')).toBe(0.85);
    expect(computeDomainSimilarity('amazon.com', 'devpost.com', 'amazon.com', 'devpost.com')).toBe(0.0);
  });

  it('computes high similarity for related hackathon activities', () => {
    const now = Date.now();
    const eventA: ActivityEvent = {
      id: 'ev-1',
      tabId: 10,
      windowId: 1,
      url: 'https://devpost.com/software/threadback-ai',
      title: 'ThreadBack AI — EurekaDev Hackathon 2026',
      domain: 'devpost.com',
      pathname: '/software/threadback-ai',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const eventB: ActivityEvent = {
      id: 'ev-2',
      tabId: 11,
      openerTabId: 10,
      windowId: 1,
      url: 'https://github.com/team/threadback-ai',
      title: 'GitHub - team/threadback-ai: EurekaDev Hackathon project',
      domain: 'github.com',
      pathname: '/team/threadback-ai',
      timestamp: now + 3 * 60000,
      eventType: 'tab_opened',
      isInternalBrowserPage: false,
    };

    const sim = computeEventSimilarity(eventA, eventB);
    expect(sim.totalScore).toBeGreaterThan(0.55);
    expect(sim.openerSimilarity).toBe(1.0);
    expect(sim.sharedTokens).toContain('threadback');
    expect(sim.rationale.length).toBeGreaterThan(0);
  });

  it('penalizes completely unrelated disjoint browsing events', () => {
    const now = Date.now();
    const eventA: ActivityEvent = {
      id: 'ev-1',
      tabId: 1,
      windowId: 1,
      url: 'https://amazon.com/dp/B012345',
      title: 'Sony WH-1000XM4 Noise Cancelling Headphones - Amazon',
      domain: 'amazon.com',
      pathname: '/dp/B012345',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const eventB: ActivityEvent = {
      id: 'ev-2',
      tabId: 2,
      windowId: 1,
      url: 'https://hyperphysics.phy-astr.gsu.edu/quantum.html',
      title: 'Quantum Harmonic Oscillator Wavefunction Energy Levels',
      domain: 'hyperphysics.phy-astr.gsu.edu',
      pathname: '/quantum.html',
      timestamp: now + 120 * 60000, // 2 hours later
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const sim = computeEventSimilarity(eventA, eventB);
    expect(sim.totalScore).toBeLessThan(0.15);
  });
});
