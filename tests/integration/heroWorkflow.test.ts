import { describe, it, expect } from 'vitest';
import { createDemoDataset } from '../../src/demo/demoDataset';
import { executeResumeTask } from '../../src/engine/resumeSelector';
import { StorageManager } from '../../src/storage/storageManager';
import { IntentThread } from '../../src/types';

describe('Phase 5: Hero Workflow & Judge Demo Test', () => {
  it('executes the complete 15-step hero workflow flawlessly', async () => {
    const storage = new StorageManager();
    await storage.clearAllData();

    // Step 1: Load demo dataset
    const demoThreads = createDemoDataset();
    await storage.saveThreads(demoThreads);

    // Step 2: Show three separate intent threads
    const loadedState = await storage.load();
    const threads = Object.values(loadedState.threads);
    expect(threads.length).toBe(3);

    // Step 3: Open EurekaDev thread
    const eurekaThread = threads.find(t => t.id === 'demo-thread-eurekadev')!;
    expect(eurekaThread).toBeDefined();
    expect(eurekaThread.title).toBe('Submit EurekaDev Project');

    // Step 4: Show timeline
    expect(eurekaThread.events.length).toBeGreaterThanOrEqual(4);
    const sortedEvents = [...eurekaThread.events].sort((a, b) => a.timestamp - b.timestamp);
    expect(sortedEvents[0].url).toContain('eurekadev.devpost.com');

    // Step 5 & 6: Click Why? and verify explanation corresponds to actual evidence
    const { evidence } = eurekaThread;
    expect(evidence.explanationPoints.length).toBeGreaterThan(0);
    expect(evidence.searchQueries.length).toBeGreaterThan(0);
    expect(evidence.primaryDomains).toContain('devpost.com');
    expect(evidence.primaryDomains).toContain('github.com');
    expect(evidence.explanationPoints.join(' ')).toMatch(/EurekaDev|GitHub|YouTube|search/i);

    // Step 7: Simulate closing tabs
    const closedTabs = eurekaThread.tabs.map(t => ({ ...t, isClosed: true }));
    const threadWithClosedTabs: IntentThread = {
      ...eurekaThread,
      tabs: closedTabs,
    };

    // Step 8 & 9: Click Resume Task and verify intended tabs reopen
    const reopenedUrls: string[] = [];
    const mockTabsApi: any = {
      query: async () => [],
      create: async (props: any) => {
        reopenedUrls.push(props.url);
        return { id: Math.random(), url: props.url };
      },
      update: async () => {},
    };

    const briefing = await executeResumeTask(threadWithClosedTabs, mockTabsApi);
    expect(reopenedUrls.length).toBe(4);
    expect(reopenedUrls).toContain('https://eurekadev.devpost.com/rules');
    expect(reopenedUrls).toContain('https://github.com/eurekadev-team/threadback-ai');
    expect(reopenedUrls).toContain('https://devpost.com/software/threadback-ai/edit');

    // Step 10: Verify ordering (rules -> github -> youtube -> devpost edit)
    expect(briefing.restoredTabs[0].url).toBe('https://eurekadev.devpost.com/rules');
    expect(briefing.restoredTabs[briefing.restoredTabs.length - 1].url).toBe('https://devpost.com/software/threadback-ai/edit');

    // Step 11: Verify resume briefing content
    expect(briefing.workingOn).toBe('Submit EurekaDev Project');
    expect(briefing.likelyCompleted.length).toBeGreaterThan(0);
    expect(briefing.likelyRemaining.length).toBeGreaterThan(0);
    expect(briefing.nextAction).toContain('Upload demo video');
    expect(['Likely', 'Possibly', 'Inferred from browsing activity']).toContain(briefing.confidence);

    // Step 12: Mark task complete
    const completedThread: IntentThread = {
      ...eurekaThread,
      status: 'LIKELY_COMPLETE',
      updatedAt: Date.now(),
    };
    await storage.saveThreads([completedThread, threads[1], threads[2]]);

    // Step 13: Verify status change persists
    const stateAfterUpdate = await storage.load();
    expect(stateAfterUpdate.threads['demo-thread-eurekadev'].status).toBe('LIKELY_COMPLETE');

    // Step 14: Restart browser / extension (simulate new StorageManager instance)
    const newSessionStorage = new StorageManager();
    const persistedState = await newSessionStorage.load();

    // Step 15: Verify state remains intact across restart
    expect(persistedState.threads['demo-thread-eurekadev'].status).toBe('LIKELY_COMPLETE');
    expect(persistedState.threads['demo-thread-headphones'].title).toBe('Compare ANC Headphones');
    expect(persistedState.threads['demo-thread-physics'].title).toBe('Physics Assignment Research');
  });
});
