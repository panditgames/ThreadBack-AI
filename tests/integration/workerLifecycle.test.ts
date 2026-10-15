import { beforeAll, describe, expect, it, vi } from 'vitest';
import { chromeMock } from '../setup';
import { storageManager } from '../../src/storage/storageManager';

const send = (message: any): Promise<any> => new Promise(resolve => chromeMock.runtime.onMessage.trigger(message, {}, resolve));

describe('MV3 worker persistence and privacy integration', () => {
  beforeAll(async () => {
    await storageManager.clearAllData();
    await import('../../src/background/serviceWorker');
  });
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
  it('keeps delete-all empty through alarm synchronization and fresh storage reads', async () => {
    await storageManager.clearAllData();
    await vi.waitFor(async () => expect((await send({ type: 'GET_ALL_THREADS' })).threads).toEqual([]));
    chromeMock.alarms.onAlarm.trigger({ name: 'threadback_sync' } as chrome.alarms.Alarm);
    await vi.waitFor(async () => expect(Object.values((await storageManager.load()).threads)).toEqual([]));
  });
});
