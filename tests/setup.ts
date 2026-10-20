import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Comprehensive Chrome Extension API Mock for testing
class MockChromeStorageArea {
  private data: Record<string, any> = {};

  async get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    if (!keys) return { ...this.data };
    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    }
    if (Array.isArray(keys)) {
      const res: Record<string, any> = {};
      for (const k of keys) {
        if (k in this.data) res[k] = this.data[k];
      }
      return res;
    }
    const res: Record<string, any> = { ...keys };
    for (const k of Object.keys(keys)) {
      if (k in this.data) res[k] = this.data[k];
    }
    return res;
  }

  async set(items: Record<string, any>): Promise<void> {
    const changes = Object.fromEntries(Object.entries(items).map(([key, value]) => [key, { oldValue: this.data[key], newValue: structuredClone(value) }]));
    Object.assign(this.data, structuredClone(items));
    (globalThis as any).chrome?.storage.onChanged.trigger(changes, 'local');
  }

  async remove(keys: string | string[]): Promise<void> {
    const kArray = Array.isArray(keys) ? keys : [keys];
    for (const k of kArray) {
      delete this.data[k];
    }
  }

  async clear(): Promise<void> {
    this.data = {};
  }
}

class MockEvent<T extends (...args: any[]) => void> {
  private listeners: T[] = [];

  addListener(callback: T) {
    this.listeners.push(callback);
  }

  removeListener(callback: T) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  hasListener(callback: T): boolean {
    return this.listeners.includes(callback);
  }

  trigger(...args: Parameters<T>) {
    for (const listener of this.listeners) {
      listener(...args);
    }
  }
}

const mockLocalStorage = new MockChromeStorageArea();
const mockOpenTabs: chrome.tabs.Tab[] = [];
let nextTabId = 100;

export const chromeMock = {
  storage: {
    local: mockLocalStorage,
    onChanged: new MockEvent<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>(),
  },
  tabs: {
    query: vi.fn(async (queryInfo: chrome.tabs.QueryInfo) => {
      return mockOpenTabs.filter(tab => {
        if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
        if (queryInfo.currentWindow && !tab.highlighted) return true;
        return true;
      });
    }),
    get: vi.fn(async (tabId: number) => {
      const found = mockOpenTabs.find(t => t.id === tabId);
      if (!found) throw new Error(`Tab ${tabId} not found`);
      return found;
    }),
    create: vi.fn(async (createProperties: chrome.tabs.CreateProperties) => {
      const newTab = {
        id: nextTabId++,
        index: mockOpenTabs.length,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: createProperties.active ?? true,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        url: createProperties.url || 'about:blank',
        title: createProperties.url || 'New Tab',
        frozen: false,
      } as chrome.tabs.Tab;
      mockOpenTabs.push(newTab);
      return newTab;
    }),
    update: vi.fn(async (tabId: number, updateProps: chrome.tabs.UpdateProperties) => {
      const tab = mockOpenTabs.find(t => t.id === tabId);
      if (tab) {
        if (updateProps.active !== undefined) tab.active = updateProps.active;
        if (updateProps.url !== undefined) tab.url = updateProps.url;
      }
      return tab as chrome.tabs.Tab;
    }),
    remove: vi.fn(async (tabIds: number | number[]) => {
      const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
      for (const id of ids) {
        const index = mockOpenTabs.findIndex(t => t.id === id);
        if (index !== -1) mockOpenTabs.splice(index, 1);
      }
    }),
    onCreated: new MockEvent<(tab: chrome.tabs.Tab) => void>(),
    onUpdated: new MockEvent<(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void>(),
    onRemoved: new MockEvent<(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void>(),
    onActivated: new MockEvent<(activeInfo: chrome.tabs.TabActiveInfo) => void>(),
  },
  history: {
    search: vi.fn(async () => []),
    onVisited: new MockEvent<(result: chrome.history.HistoryItem) => void>(),
  },
  runtime: {
    id: 'mock-threadback-extension-id',
    onInstalled: new MockEvent<(details: any) => void>(),
    onStartup: new MockEvent<() => void>(),
    sendMessage: vi.fn(async () => ({ success: true })),
    onMessage: new MockEvent<(message: any, sender: any, sendResponse: (response?: any) => void) => void>(),
    getURL: (path: string) => `chrome-extension://mock-threadback-extension-id/${path}`,
  },
  alarms: {
    get: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: new MockEvent<(alarm: chrome.alarms.Alarm) => void>(),
  },
  sidePanel: {
    open: vi.fn(),
    setOptions: vi.fn(),
  },
};

// Install globally
(globalThis as any).chrome = chromeMock;
