import { afterEach, expect, it, vi } from 'vitest';
import type { ActivityEvent } from '../../src/types';
import { ActivityCollector } from '../../src/collector/activityCollector';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { DEFAULT_PRIVACY_SETTINGS } from '../../src/storage/storageManager';

afterEach(() => vi.unstubAllGlobals());

it('keeps URL placeholder hostnames out of intent clustering during real navigation phases', () => {
  let updated!: (id: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void;
  const listener = () => ({ addListener: vi.fn(), removeListener: vi.fn() });
  vi.stubGlobal('chrome', { tabs: { onUpdated: { ...listener(), addListener: (fn: typeof updated) => { updated = fn; } }, onCreated: listener(), onActivated: listener(), onRemoved: listener() } });
  const engine = new IntentEngine();
  const capture = vi.fn((event: ActivityEvent) => engine.processEvent(event));
  new ActivityCollector(capture, DEFAULT_PRIVACY_SETTINGS).startListening();
  const paths = ['EurekaDev-hackathon-submission', 'EurekaDev-hackathon-repository', 'noise-cancelling-headphones-shopping', 'noise-cancelling-headphones-review', 'quantum-physics-assignment-notes', 'quantum-physics-assignment-reference'];
  paths.forEach((pathname, index) => {
    const url = 'https://site' + index + '.threadback.test/' + pathname;
    const tab = { id: index + 1, windowId: 1, url, title: url.replace('https://', ''), status: 'loading' } as chrome.tabs.Tab;
    updated(tab.id!, { url }, tab);
    expect(capture).toHaveBeenCalledTimes(index * 2);
    updated(tab.id!, { status: 'complete' }, { ...tab, status: 'complete' });
    updated(tab.id!, { title: pathname.replaceAll('-', ' ') }, { ...tab, title: pathname.replaceAll('-', ' '), status: 'complete' });
  });
  expect(engine.getThreads()).toHaveLength(3);
  expect(engine.getThreads().map(thread => thread.tabs.length).sort()).toEqual([2, 2, 2]);
  expect(capture.mock.calls.every(([event]) => !event.title.includes('threadback.test'))).toBe(true);
});
