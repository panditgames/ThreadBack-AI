import { afterEach, expect, it, vi } from 'vitest';
import type { ActivityEvent } from '../../src/types';
import { ActivityCollector } from '../../src/collector/activityCollector';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { DEFAULT_PRIVACY_SETTINGS } from '../../src/storage/storageManager';

afterEach(() => vi.unstubAllGlobals());

it('keeps URL placeholder hostnames out of intent clustering during real navigation phases', async () => {
  let updated!: (id: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void;
  const listener = () => ({ addListener: vi.fn(), removeListener: vi.fn() });
  vi.stubGlobal('chrome', {
    tabs: {
      onUpdated: { ...listener(), addListener: (fn: typeof updated) => { updated = fn; } },
      onCreated: listener(),
      onActivated: listener(),
      onRemoved: listener(),
    },
  });
  const engine = new IntentEngine();
  let pending: Promise<any>[] = [];
  const capture = vi.fn((event: ActivityEvent) => {
    const p = engine.processEvent(event);
    pending.push(p);
    return p;
  });
  new ActivityCollector(capture, DEFAULT_PRIVACY_SETTINGS).startListening();
  const paths = [
    'EurekaDev-hackathon-submission',
    'EurekaDev-hackathon-repository',
    'noise-cancelling-headphones-shopping',
    'noise-cancelling-headphones-review',
    'quantum-physics-assignment-notes',
    'quantum-physics-assignment-reference',
  ];
  for (let index = 0; index < paths.length; index++) {
    const pathname = paths[index];
    const url = 'https://site' + index + '.threadback.test/' + pathname;
    const tab = { id: index + 1, windowId: 1, url, title: url.replace('https://', ''), status: 'loading' } as chrome.tabs.Tab;
    updated(tab.id!, { url }, tab);
    expect(capture).toHaveBeenCalledTimes(index * 2);
    updated(tab.id!, { status: 'complete' }, { ...tab, status: 'complete' });
    updated(tab.id!, { title: pathname.replaceAll('-', ' ') }, { ...tab, title: pathname.replaceAll('-', ' '), status: 'complete' });
    await Promise.all(pending);
    pending = [];
  }
  expect(engine.getThreads()).toHaveLength(3);
  expect(engine.getThreads().map(thread => thread.tabs.length).sort()).toEqual([2, 2, 2]);
  expect(capture.mock.calls.every(([event]) => !event.title.includes('threadback.test'))).toBe(true);
  expect(engine.getThreads().flatMap(t => t.events)).toHaveLength(12);
});

it('waits for a completed title instead of collecting an unloaded new tab', () => {
  let created!: (tab: chrome.tabs.Tab) => void;
  let updated!: (id: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void;
  const listener = () => ({ addListener: vi.fn(), removeListener: vi.fn() });
  vi.stubGlobal('chrome', { tabs: {
    onCreated: { ...listener(), addListener: (fn: typeof created) => { created = fn; } },
    onUpdated: { ...listener(), addListener: (fn: typeof updated) => { updated = fn; } },
    onActivated: listener(), onRemoved: listener(),
  } });
  const capture = vi.fn();
  new ActivityCollector(capture, DEFAULT_PRIVACY_SETTINGS).startListening();
  const tab = { id: 200, url: 'https://policies.example/audit', title: '', status: 'unloaded' } as chrome.tabs.Tab;
  created(tab); expect(capture).not.toHaveBeenCalled();
  updated(200, { status: 'complete' }, { ...tab, status: 'complete', title: 'Privacy Policy' });
  expect(capture).toHaveBeenCalledTimes(1);
  expect(capture.mock.calls[0][0].title).toBe('Privacy Policy');
});
