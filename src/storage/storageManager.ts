import { generateWhyExplanation } from '../engine/whyExplainer';
import { AISettings, IntentThread, PrivacySettings, ThreadBackStorageData } from '../types';

export const STORAGE_KEY = 'threadback_data_v1';
const CURRENT_VERSION = 1;

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

  public async clearBrowsingIntelligence(): Promise<void> {
    const data = await this.load();
    data.events = [];
    data.threads = {};
    data.activeThreadId = undefined;
    data.lastProcessedTimestamp = Date.now();
    await this.save(data);
  }

  public async clearAllData(): Promise<void> {
    // Persist an empty tombstone so reload cannot silently restore the demo.
    await this.save({ ...structuredClone(INITIAL_STORAGE_STATE), lastProcessedTimestamp: Date.now() });
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
    };
  }
}

export const storageManager = new StorageManager();
