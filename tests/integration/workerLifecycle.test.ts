import { beforeAll, describe, expect, it, vi } from 'vitest';
import { chromeMock } from '../setup';
import { storageManager } from '../../src/storage/storageManager';

const send = (message: any): Promise<any> => new Promise(resolve => chromeMock.runtime.onMessage.trigger(message, {}, resolve));

describe('MV3 worker persistence and privacy integration', () => {
  beforeAll(async () => {
    await storageManager.clearAllData();
    await import('../../src/background/serviceWorker');
  }, 60000);
  it('keeps dashboard rename/status/deletion edits instead of restoring stale worker state', async () => {
    await send({ type: 'LOAD_DEMO_DATA' });
    const state = await storageManager.load();
    const threads = Object.values(state.threads).slice(0, 2);
    threads[0] = { ...threads[0], title: 'Judge renamed task', status: 'LIKELY_COMPLETE' };
    await storageManager.saveThreads(threads);
    await vi.waitFor(async () => {
      const response = await send({ type: 'GET_ALL_THREADS' });
      expect(response.threads).toHaveLength(2);
      expect(response.threads.find((t: any) => t.id === threads[0].id).title).toBe('Judge renamed task');
      expect(response.threads.find((t: any) => t.id === threads[0].id).status).toBe('LIKELY_COMPLETE');
    });
  });
  it('applies changed privacy exclusions to the running collector', async () => {
    const state = await storageManager.load();
    await storageManager.savePrivacySettings({ ...state.privacy, excludedDomains: ['private.example'] });
    await vi.waitFor(async () => expect((await send({ type: 'GET_PRIVACY_SETTINGS' })).privacy.excludedDomains).toEqual(['private.example']));
    chromeMock.tabs.onCreated.trigger({ id: 700, windowId: 1, title: 'Private research', url: 'https://private.example/secret', incognito: false } as chrome.tabs.Tab);
    await Promise.resolve();
    const response = await send({ type: 'GET_ALL_THREADS' });
    expect(response.threads.flatMap((t: any) => t.tabs).some((t: any) => t.url.includes('private.example'))).toBe(false);
  });

  it('retains every captured URL when storage reads overlap rapid tab events', async () => {
    await send({ type: 'CLEAR_ALL_DATA' });
    const originalLoad = storageManager.load.bind(storageManager);
    let reads = 0;
    const delayed = vi.spyOn(storageManager, 'load').mockImplementation(async () => {
      const snapshot = await originalLoad();
      if (++reads % 3 !== 0) await new Promise(resolve => setTimeout(resolve, 12));
      return snapshot;
    });
    try {
      const urls = Array.from({ length: 8 }, (_, i) => 'https://notes.example/quantum/' + i);
      for (let i = 0; i < urls.length; i++) {
        chromeMock.tabs.onCreated.trigger({ id: 820 + i, windowId: 1, title: 'Quantum Physics Assignment Reference ' + i, url: urls[i], status: 'complete', incognito: false } as chrome.tabs.Tab);
        await new Promise(resolve => setTimeout(resolve, 3));
      }
      await vi.waitFor(async () => {
        const data = await originalLoad();
        const saved = Object.values(data.threads).flatMap(t => t.tabs.map(t => t.url));
        expect(urls.every(url => saved.includes(url))).toBe(true);
      }, { timeout: 15000 });
      const live = await send({ type: 'GET_ALL_THREADS' });
      expect(urls.every(url => live.threads.some((t: any) => t.tabs.some((tab: any) => tab.url === url)))).toBe(true);
    } finally { delayed.mockRestore(); }
  });
  it('keeps delete-all empty through alarm synchronization and fresh storage reads', async () => {
    await send({ type: 'CLEAR_ALL_DATA' });
    await vi.waitFor(async () => expect((await send({ type: 'GET_ALL_THREADS' })).threads).toEqual([]), { timeout: 10000 });
    chromeMock.alarms.onAlarm.trigger({ name: 'threadback_sync' } as chrome.alarms.Alarm);
    await vi.waitFor(async () => expect(Object.values((await storageManager.load()).threads)).toEqual([]), { timeout: 10000 });
  });

  it('replays unresolved pending events upon worker startup after abrupt termination', async () => {
    await send({ type: 'CLEAR_ALL_DATA' });
    // Simulate an event that was durably logged right before the worker was killed mid-inference
    const killedEvent = {
      id: 'killed-event-1',
      tabId: 991,
      windowId: 1,
      url: 'https://eurekadev.devpost.com/submission-guidelines',
      title: 'EurekaDev Hackathon Submission Guidelines',
      domain: 'eurekadev.devpost.com',
      pathname: '/submission-guidelines',
      timestamp: Date.now(),
      eventType: 'navigation' as const,
      isInternalBrowserPage: false,
    };
    await storageManager.addPendingEvent(killedEvent);

    const pendingBefore = await storageManager.getPendingEvents();
    expect(pendingBefore).toHaveLength(1);
    expect(pendingBefore[0].id).toBe('killed-event-1');

    // Simulate worker restart / replay trigger
    const replayRes = await send({ type: 'REPLAY_PENDING_EVENTS' });
    expect(replayRes.success).toBe(true);
    expect(replayRes.replayed).toBe(1);

    await vi.waitFor(async () => {
      const pendingAfter = await storageManager.getPendingEvents();
      expect(pendingAfter).toHaveLength(0); // resolved!
      const threads = (await send({ type: 'GET_ALL_THREADS' })).threads;
      expect(threads.some((t: any) => t.tabs.some((tab: any) => tab.url === killedEvent.url))).toBe(true);
    }, { timeout: 15000 });
  });
});
