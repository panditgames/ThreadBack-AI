import { describe, it, expect } from 'vitest';
import { generateWhyExplanation } from '../../src/engine/whyExplainer';
import { ActivityEvent, TabReference } from '../../src/types';

describe('Why Was This Grouped Explainer', () => {
  it('generates grounded explanation points from real browsing evidence', () => {
    const now = Date.now();
    const events: ActivityEvent[] = [
      {
        id: '1',
        tabId: 1,
        url: 'https://devpost.com/software/threadback',
        title: 'ThreadBack AI — EurekaDev Hackathon 2026',
        domain: 'devpost.com',
        pathname: '/software/threadback',
        searchQuery: 'eurekadev 2026 hackathon deadlines',
        searchEngine: 'Google',
        timestamp: now,
        eventType: 'navigation',
        isInternalBrowserPage: false,
      },
      {
        id: '2',
        openerTabId: 1,
        url: 'https://github.com/eurekadev-team/threadback-ai',
        title: 'GitHub - eurekadev-team/threadback-ai',
        domain: 'github.com',
        pathname: '/eurekadev-team/threadback-ai',
        timestamp: now + 5 * 60000,
        eventType: 'tab_opened',
        isInternalBrowserPage: false,
      },
    ];

    const tabs: TabReference[] = [
      { id: 't1', url: events[0].url, title: events[0].title, domain: events[0].domain, lastAccessed: now, isClosed: false, order: 0 },
      { id: 't2', url: events[1].url, title: events[1].title, domain: events[1].domain, lastAccessed: now + 5 * 60000, isClosed: false, order: 1 },
    ];

    const evidence = generateWhyExplanation(events, tabs);

    expect(evidence.searchQueries).toContain('eurekadev 2026 hackathon deadlines');
    expect(evidence.primaryDomains).toContain('devpost.com');
    expect(evidence.primaryDomains).toContain('github.com');
    expect(evidence.timeSpanMinutes).toBe(5);
    expect(evidence.openerRelationshipFound).toBe(true);

    // Points should mention keywords or search queries
    const textPoints = evidence.explanationPoints.join(' ');
    expect(textPoints).toMatch(/eurekadev|search query|continuity|child tabs/i);
  });

  it('handles empty events gracefully', () => {
    const evidence = generateWhyExplanation([], []);
    expect(evidence.explanationPoints.length).toBeGreaterThan(0);
    expect(evidence.timeSpanMinutes).toBe(0);
  });
});
