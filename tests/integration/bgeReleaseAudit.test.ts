import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chromeMock } from '../setup';
import { storageManager } from '../../src/storage/storageManager';
const model = vi.hoisted(() => ({ embed: vi.fn() }));
vi.mock('../../src/engine/ai/localEmbedder', async original => ({
  ...await original<typeof import('../../src/engine/ai/localEmbedder')>(), generateEmbedding: model.embed,
}));
const vector = Array.from({ length: 384 }, (_, i) => i === 0 ? 1 : 0);
const send = (message: unknown): Promise<any> => new Promise(resolve => chromeMock.runtime.onMessage.trigger(message, {}, resolve));
describe('BGE release: durable capture and replay privacy', () => {
  beforeAll(async () => { await storageManager.clearAllData(); await import('../../src/background/serviceWorker'); await send({ type: 'GET_ALL_THREADS' }); });
  beforeEach(async () => { await send({ type: 'CLEAR_ALL_DATA' }); model.embed.mockReset().mockResolvedValue(vector); });
  it('persists every rapid capture before a blocked first inference completes', async () => {
    let release!: (value: number[]) => void;
    const blocked = new Promise<number[]>(resolve => { release = resolve; }); model.embed.mockReturnValue(blocked);
    const urls = Array.from({ length: 8 }, (_, i) => 'https://durable.example/quantum/' + i);
    try {
      urls.forEach((url, i) => chromeMock.tabs.onCreated.trigger({ id: 3000 + i, url, title: 'Quantum physics reference ' + i, status: 'complete', windowId: 1, incognito: false } as chrome.tabs.Tab));
      await vi.waitFor(async () => expect(new Set((await storageManager.getPendingEvents()).map(e => e.url)).size).toBe(8), { timeout: 1000 });
    } finally { release(vector); await send({ type: 'GET_ALL_THREADS' }); }
  });
  it('does not replay a pending URL after its domain becomes excluded', async () => {
    const event = { id: 'private-pending', url: 'https://private.example/work', title: 'Private task', domain: 'private.example', pathname: '/work', timestamp: Date.now(), eventType: 'navigation' as const, isInternalBrowserPage: false };
    await storageManager.addPendingEvent(event);
    const state = await storageManager.load(); await storageManager.savePrivacySettings({ ...state.privacy, excludedDomains: ['private.example'] });
    await send({ type: 'REPLAY_PENDING_EVENTS' });
    const stateAfter = await storageManager.load();
    expect(Object.values(stateAfter.threads).flatMap(t => t.tabs).some(t => t.url === event.url)).toBe(false);
    expect(await storageManager.getPendingEvents()).toHaveLength(0);
  });
});
