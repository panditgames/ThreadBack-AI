import { generateWhyExplanation } from '../engine/whyExplainer';
import { ActivityEvent, AISettings, IntentThread, PrivacySettings, ThreadBackStorageData } from '../types';

export const STORAGE_KEY = 'threadback_data_v1';
const CURRENT_VERSION = 1;
const PENDING_PREFIX = 'threadback_pending_v1:';
const ERASE_KEY = 'threadback_erase_before_v1';

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allowPageContentAnalysis: false, // OFF by default
  autoPurgeDays: 30,
  excludedDomains: ['bank', 'paypal.com', 'accounts.google.com'],
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: 'local_heuristic',
  apiKey: '',
  modelName: '',
  customEndpoint: '',
};

export const INITIAL_STORAGE_STATE: ThreadBackStorageData = {
  version: CURRENT_VERSION,
  threads: {},
  events: [],
  activeThreadId: undefined,
  privacy: DEFAULT_PRIVACY_SETTINGS,
  aiSettings: DEFAULT_AI_SETTINGS,
  lastProcessedTimestamp: 0,
  pendingEvents: [],
};

export class StorageManager {
  private inMemoryFallback: ThreadBackStorageData = { ...INITIAL_STORAGE_STATE };

  private isChromeStorageAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
  }

  public async load(): Promise<ThreadBackStorageData> {
    try {
      if (this.isChromeStorageAvailable()) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const stored = result[STORAGE_KEY];
        if (stored) {
          return this.validateAndMigrate(stored);
        }
      } else if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(STORAGE_KEY);
        if (item) {
          return this.validateAndMigrate(JSON.parse(item));
        }
      }
    } catch (err) {
      console.warn('[ThreadBack Storage] Failed to load storage, using safe fallback:', err);
    }

    return this.validateAndMigrate(this.inMemoryFallback);
  }

  public async save(data: ThreadBackStorageData): Promise<void> {
    this.inMemoryFallback = { ...data };
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error('[ThreadBack Storage] Failed to save state:', err);
      throw err;
    }
  }

  public async saveThreads(threads: IntentThread[]): Promise<void> {
    const data = await this.load();
    const threadMap: Record<string, IntentThread> = {};
    for (const t of threads) {
      threadMap[t.id] = t;
    }
    data.threads = threadMap;
    data.lastProcessedTimestamp = Date.now();
    await this.save(data);
  }

  public async savePrivacySettings(privacy: PrivacySettings): Promise<void> {
    const data = await this.load();
    data.privacy = privacy;
    await this.save(data);
  }

  public async saveAISettings(aiSettings: AISettings): Promise<void> {
    const data = await this.load();
    data.aiSettings = aiSettings;
    await this.save(data);
  }

  public async deleteThread(threadId: string): Promise<void> {
    const data = await this.load();
    delete data.threads[threadId];
    data.lastProcessedTimestamp = Date.now();
    if (data.activeThreadId === threadId) {
      data.activeThreadId = undefined;
    }
    await this.save(data);
  }

  public async getPendingEvents(): Promise<ActivityEvent[]> {
    const data = await this.load();
    const legacy = Array.isArray(data.pendingEvents) ? data.pendingEvents : [];
    if (!this.isChromeStorageAvailable()) return [...legacy];
    const stored = await chrome.storage.local.get(null);
    const erasedBefore = Number(stored[ERASE_KEY]) || 0;
    const pending = Object.entries(stored).filter(([key]) => key.startsWith(PENDING_PREFIX)).map(([, value]) => value as ActivityEvent);
    return [...new Map([...legacy, ...pending].filter(event => event && typeof event.id === 'string' &&
      typeof event.url === 'string' && Number.isFinite(event.timestamp) && event.timestamp >= erasedBefore)
      .map(event => [event.id, event])).values()].sort((a, b) => a.timestamp - b.timestamp);
  }

  public async addPendingEvent(event: ActivityEvent): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      // Independent keys cannot be overwritten by concurrent UI/thread snapshots.
      await chrome.storage.local.set({ [PENDING_PREFIX + event.id]: event });
      return;
    }
    const data = await this.load();
    data.pendingEvents = [...(data.pendingEvents || []).filter(e => e.id !== event.id), event];
    await this.save(data);
  }

  public async resolvePendingEvent(eventId: string, updatedThreads?: IntentThread[]): Promise<boolean> {
    const pending = (await this.getPendingEvents()).some(event => event.id === eventId);
    const data = await this.load();
    if (updatedThreads && pending) {
      data.threads = Object.fromEntries(updatedThreads.map(thread => [thread.id, thread]));
      data.lastProcessedTimestamp = Date.now();
    }
    const hadLegacy = data.pendingEvents?.some(event => event.id === eventId);
    data.pendingEvents = (data.pendingEvents || []).filter(event => event.id !== eventId);
    if ((updatedThreads && pending) || hadLegacy) await this.save(data);
    // Remove only after thread persistence succeeds. A crash before removal replays idempotently.
    if (this.isChromeStorageAvailable()) await chrome.storage.local.remove(PENDING_PREFIX + eventId);
    return pending;
  }

  private async persistErasure(data: ThreadBackStorageData): Promise<void> {
    if (!this.isChromeStorageAvailable()) { await this.save(data); return; }
    const erasedBefore = Date.now();
    data.lastProcessedTimestamp = erasedBefore;
    this.inMemoryFallback = data;
    await chrome.storage.local.set({ [STORAGE_KEY]: data, [ERASE_KEY]: erasedBefore });
    const stored = await chrome.storage.local.get(null);
    const keys = Object.keys(stored).filter(key => key.startsWith(PENDING_PREFIX) && stored[key]?.timestamp <= erasedBefore);
    if (keys.length) await chrome.storage.local.remove(keys);
  }

  public async clearBrowsingIntelligence(): Promise<void> {
    const data = await this.load();
    await this.persistErasure({ ...data, events: [], threads: {}, activeThreadId: undefined, pendingEvents: [] });
  }

  public async clearAllData(): Promise<void> {
    await this.persistErasure(structuredClone(INITIAL_STORAGE_STATE));
  }

  private validateAndMigrate(data: any): ThreadBackStorageData {
    if (!data || typeof data !== 'object') {
      return { ...INITIAL_STORAGE_STATE };
    }

    // Version migration handling
    if (!data.version || data.version < CURRENT_VERSION) {
      data.version = CURRENT_VERSION;
    }

    const threads: Record<string, IntentThread> = {};
    for (const candidate of Object.values(data.threads && typeof data.threads === 'object' ? data.threads : {}) as any[]) {
      if (!candidate || typeof candidate.id !== 'string' || typeof candidate.title !== 'string') continue;
      const tabs = (Array.isArray(candidate.tabs) ? candidate.tabs : []).filter((t: any) => t && typeof t.url === 'string' && typeof t.title === 'string' && typeof t.domain === 'string');
      const events = (Array.isArray(candidate.events) ? candidate.events : []).filter((e: any) => e && typeof e.url === 'string' && typeof e.title === 'string' && typeof e.domain === 'string' && Number.isFinite(e.timestamp));
      threads[candidate.id] = { ...candidate, tabs, events,
        summary: typeof candidate.summary === 'string' ? candidate.summary : '',
        createdAt: Number.isFinite(candidate.createdAt) ? candidate.createdAt : 0,
        updatedAt: Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : 0,
        status: ['ACTIVE', 'PAUSED', 'LIKELY_COMPLETE', 'ARCHIVED'].includes(candidate.status) ? candidate.status : 'PAUSED',
        confidence: Number.isFinite(candidate.confidence) ? candidate.confidence : 0,
        keywords: (Array.isArray(candidate.keywords) ? candidate.keywords : []).filter((k: any) => typeof k === 'string'),
        completedSteps: (Array.isArray(candidate.completedSteps) ? candidate.completedSteps : []).filter((step: any) => step && typeof step.title === 'string' && Array.isArray(step.evidence)),
        unfinishedSteps: (Array.isArray(candidate.unfinishedSteps) ? candidate.unfinishedSteps : []).filter((step: any) => step && typeof step.title === 'string' && Array.isArray(step.evidence)),
        nextAction: candidate.nextAction && typeof candidate.nextAction.actionText === 'string' ? candidate.nextAction : { actionText: 'Review task tabs', confidence: 'Possibly', rationale: 'Recovered saved state' },
        evidence: generateWhyExplanation(events, tabs),
        isLatent: typeof candidate.isLatent === 'boolean' ? candidate.isLatent : false,
        latentPromotionReason: candidate.latentPromotionReason,
      };
    }
    return {
      version: data.version || CURRENT_VERSION,
      threads,
      events: Array.isArray(data.events) ? data.events : [],
      activeThreadId: typeof data.activeThreadId === 'string' ? data.activeThreadId : undefined,
      privacy: {
        allowPageContentAnalysis: !!data.privacy?.allowPageContentAnalysis,
        autoPurgeDays: typeof data.privacy?.autoPurgeDays === 'number' ? data.privacy.autoPurgeDays : 30,
        excludedDomains: Array.isArray(data.privacy?.excludedDomains) ? data.privacy.excludedDomains.filter((d: any) => typeof d === 'string' && d.length > 0) : DEFAULT_PRIVACY_SETTINGS.excludedDomains,
      },
      aiSettings: {
        enabled: !!data.aiSettings?.enabled,
        provider: data.aiSettings?.provider || 'local_heuristic',
        apiKey: data.aiSettings?.apiKey || '',
        modelName: data.aiSettings?.modelName || '',
        customEndpoint: data.aiSettings?.customEndpoint || '',
      },
      lastProcessedTimestamp: typeof data.lastProcessedTimestamp === 'number' ? data.lastProcessedTimestamp : 0,
      pendingEvents: (Array.isArray(data.pendingEvents) ? data.pendingEvents : []).filter((e: any) => e && typeof e.id === 'string' && typeof e.url === 'string'),
    };
  }
}

export const storageManager = new StorageManager();
