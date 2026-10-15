import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../../src/storage/storageManager';
import { IntentThread } from '../../src/types';

describe('StorageManager & Persistence', () => {
  let storage: StorageManager;

  beforeEach(async () => {
    storage = new StorageManager();
    await storage.clearAllData();
  });

  it('saves and reloads thread state correctly', async () => {
    const thread: IntentThread = {
      id: 't-test',
      title: 'Submit EurekaDev Project',
      summary: 'Task summary',
      createdAt: 1000,
      updatedAt: 2000,
      status: 'ACTIVE',
      confidence: 0.95,
      tabs: [],
      events: [],
      keywords: ['test'],
      completedSteps: [],
      unfinishedSteps: [],
      nextAction: { actionText: 'Next', confidence: 'Likely', rationale: 'Rationale' },
      evidence: {
        sharedKeywords: [],
        primaryDomains: [],
        searchQueries: [],
        timeSpanMinutes: 0,
        temporalContinuityScore: 1,
        domainSimilarityScore: 1,
        querySimilarityScore: 1,
        titleSimilarityScore: 1,
        openerRelationshipFound: false,
        explanationPoints: [],
      },
    };

    await storage.saveThreads([thread]);
    const loaded = await storage.load();
    expect(loaded.threads['t-test']).toBeDefined();
    expect(loaded.threads['t-test'].title).toBe('Submit EurekaDev Project');
  });

  it('recovers gracefully from corrupted or empty data without throwing', async () => {
    const corrupted: any = "not valid json object";
    const migrated = (storage as any).validateAndMigrate(corrupted);
    expect(migrated.version).toBe(1);
    expect(migrated.threads).toEqual({});
    expect(migrated.privacy.allowPageContentAnalysis).toBe(false);
  });

  it('preserves default privacy settings with content analysis OFF', async () => {
    const data = await storage.load();
    expect(data.privacy.allowPageContentAnalysis).toBe(false);
  });

  it('deletes a single thread cleanly', async () => {
    const thread1: any = { id: 't1', title: 'Task 1', tabs: [], events: [], keywords: [] };
    const thread2: any = { id: 't2', title: 'Task 2', tabs: [], events: [], keywords: [] };
    await storage.saveThreads([thread1, thread2]);

    await storage.deleteThread('t1');
    const loaded = await storage.load();
    expect(loaded.threads['t1']).toBeUndefined();
    expect(loaded.threads['t2']).toBeDefined();
  });

  it('clears all data completely when requested', async () => {
    const thread: any = { id: 't1', title: 'Task 1', tabs: [], events: [], keywords: [] };
    await storage.saveThreads([thread]);

    await storage.clearAllData();
    const loaded = await storage.load();
    expect(Object.keys(loaded.threads).length).toBe(0);
  });
});
