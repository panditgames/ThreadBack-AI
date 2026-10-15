import { describe, it, expect, vi } from 'vitest';
import { selectResumeTabs, executeResumeTask } from '../../src/engine/resumeSelector';
import { IntentThread, TabReference } from '../../src/types';

describe('Resume Task Engine', () => {
  it('deduplicates tabs by URL and ignores internal browser pages', () => {
    const rawTabs: TabReference[] = [
      { id: '1', url: 'https://github.com/eurekadev/threadback', title: 'Repo', domain: 'github.com', lastAccessed: 100, isClosed: false, order: 0 },
      { id: '2', url: 'https://github.com/eurekadev/threadback#readme', title: 'Repo Readme', domain: 'github.com', lastAccessed: 110, isClosed: false, order: 1 },
      { id: '3', url: 'chrome://settings', title: 'Settings', domain: '', lastAccessed: 120, isClosed: false, order: 2 },
      { id: '4', url: 'about:blank', title: 'Blank', domain: '', lastAccessed: 130, isClosed: true, order: 3 },
      { id: '5', url: 'https://devpost.com/software/threadback', title: 'Devpost', domain: 'devpost.com', lastAccessed: 140, isClosed: true, order: 4 },
    ];

    const resumeTabs = selectResumeTabs(rawTabs);
    expect(resumeTabs.length).toBe(2);
    expect(resumeTabs[0].url).toBe('https://github.com/eurekadev/threadback');
    expect(resumeTabs[1].url).toBe('https://devpost.com/software/threadback');
  });

  it('restores closed tabs and returns a structured resume briefing', async () => {
    const mockTabsApi: any = {
      query: vi.fn(async () => [
        { id: 101, url: 'https://github.com/eurekadev/threadback', active: false },
      ]),
      create: vi.fn(async (props: any) => ({ id: 102, url: props.url })),
      update: vi.fn(async (id: number, props: any) => ({ id, ...props })),
    };

    const thread: IntentThread = {
      id: 'thread-test',
      title: 'Submit EurekaDev Project',
      summary: 'Hackathon submission workflow',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      status: 'PAUSED',
      confidence: 0.95,
      tabs: [
        { id: 't1', url: 'https://github.com/eurekadev/threadback', title: 'Repo', domain: 'github.com', lastAccessed: 10, isClosed: false, order: 0 },
        { id: 't2', url: 'https://devpost.com/software/threadback/edit', title: 'Edit Devpost', domain: 'devpost.com', lastAccessed: 20, isClosed: true, order: 1 },
      ],
      events: [
        { id: 'e1', url: 'https://devpost.com/software/threadback/edit', title: 'Edit Devpost', domain: 'devpost.com', pathname: '/edit', timestamp: Date.now(), eventType: 'navigation', isInternalBrowserPage: false },
      ],
      keywords: ['eurekadev', 'devpost'],
      completedSteps: [
        { id: 's1', title: 'GitHub repo push', status: 'COMPLETED', confidence: 'Likely', evidence: ['Visited github.com'] },
      ],
      unfinishedSteps: [
        { id: 's2', title: 'Finalize submission', status: 'LIKELY_REMAINING', confidence: 'Likely', evidence: ['Form in progress'] },
      ],
      nextAction: {
        actionText: 'Finalize submission details',
        confidence: 'Likely',
        rationale: 'Active draft form detected',
      },
      evidence: {
        sharedKeywords: [],
        primaryDomains: [],
        searchQueries: [],
        timeSpanMinutes: 10,
        temporalContinuityScore: 0.9,
        domainSimilarityScore: 0.8,
        querySimilarityScore: 0.8,
        titleSimilarityScore: 0.8,
        openerRelationshipFound: false,
        explanationPoints: [],
      },
    };

    const briefing = await executeResumeTask(thread, mockTabsApi);

    expect(briefing.workingOn).toBe('Submit EurekaDev Project');
    expect(briefing.likelyCompleted).toContain('GitHub repo push');
    expect(briefing.likelyRemaining).toContain('Finalize submission');
    expect(briefing.nextAction).toBe('Finalize submission details');
    expect(mockTabsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://devpost.com/software/threadback/edit',
    }));
    expect(briefing.restoredTabCount).toBe(1);
  });
});
