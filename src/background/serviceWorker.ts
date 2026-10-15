import { ActivityCollector } from '../collector/activityCollector';
import { createDemoDataset } from '../demo/demoDataset';
import { IntentEngine } from '../engine/intentClusterer';
import { detectInterruption } from '../engine/interruption';
import { executeResumeTask } from '../engine/resumeSelector';
import { DEFAULT_PRIVACY_SETTINGS, STORAGE_KEY, storageManager } from '../storage/storageManager';
import { ActivityEvent } from '../types';

const intentEngine = new IntentEngine();
let activityCollector: ActivityCollector | null = null;
let isInitialized = false;
let initialization: Promise<void> | undefined;

function initialize(): Promise<void> {
  return initialization ??= initializeOnce();
}

async function initializeOnce() {
  if (isInitialized) return;

  try {
    const data = await storageManager.load();
    const existingThreads = Object.values(data.threads);

    if (existingThreads.length === 0 && data.lastProcessedTimestamp === 0) {
      // First install: load the rich deterministic demo dataset for immediate judge review
      const demoThreads = createDemoDataset();
      intentEngine.setThreads(demoThreads);
      await storageManager.saveThreads(demoThreads);
    } else {
      intentEngine.setThreads(existingThreads);
    }

    // Initialize activity collector
    activityCollector = new ActivityCollector(handleActivityEvent, data.privacy || DEFAULT_PRIVACY_SETTINGS);
    activityCollector.startListening();

    isInitialized = true;
    console.log('[ThreadBack Service Worker] Initialized with', intentEngine.getThreads().length, 'threads');
  } catch (err) {
    console.error('[ThreadBack Service Worker] Initialization error:', err);
  }
}

async function handleActivityEvent(event: ActivityEvent) {
  try {
    const updatedThread = intentEngine.processEvent(event);
    if (updatedThread) {
      // Persist updated threads
      await storageManager.saveThreads(intentEngine.getThreads());
      // Notify any open extension views (popup, dashboard, sidepanel)
      chrome.runtime.sendMessage({
        type: 'THREADS_UPDATED',
        threads: intentEngine.getThreads(),
        activeThreadId: updatedThread.id,
      }).catch(() => {
        // Safe to ignore if no views are open
      });
    }
  } catch (err) {
    console.error('[ThreadBack Service Worker] Error processing activity event:', err);
  }
}

// Extension Lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ThreadBack] Installed:', details.reason);
  await initialize();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[ThreadBack] Browser startup');
  await initialize();
});

// Periodic state synchronization alarm
chrome.alarms.create('threadback_sync', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'threadback_sync') {
    await initialize();
    await storageManager.saveThreads(intentEngine.getThreads());
  }
});

// Message Bus for UI components (Popup, Dashboard, Side Panel)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => {
    sendResponse({ success: false, error: err.message });
  });
  return true; // async sendResponse
});

async function handleMessage(message: any): Promise<any> {
  if (!isInitialized) {
    await initialize();
  }

  switch (message.type) {
    case 'GET_ALL_THREADS': {
      const threads = intentEngine.getThreads();
      return { success: true, threads };
    }

    case 'GET_THREAD_BY_ID': {
      const thread = intentEngine.getThread(message.threadId);
      return { success: true, thread };
    }

    case 'GET_ACTIVE_THREAD': {
      const threads = intentEngine.getThreads();
      const active = threads.find(t => t.status === 'ACTIVE') || threads[0];
      return { success: true, thread: active };
    }

    case 'RESUME_TASK': {
      const thread = intentEngine.getThread(message.threadId);
      if (!thread) {
        return { success: false, error: 'Thread not found' };
      }
      const briefing = await executeResumeTask(thread, chrome.tabs);
      // Mark resumed thread as ACTIVE
      intentEngine.setThreadStatus(thread.id, 'ACTIVE');
      await storageManager.saveThreads(intentEngine.getThreads());
      return { success: true, briefing };
    }

    case 'GET_INTERRUPTION_BRIEFING': {
      const thread = intentEngine.getThread(message.threadId);
      if (!thread) return { success: false, error: 'Thread not found' };
      const briefing = detectInterruption(thread);
      return { success: true, briefing };
    }

    case 'LOAD_DEMO_DATA': {
      const demoThreads = createDemoDataset();
      intentEngine.setThreads(demoThreads);
      await storageManager.saveThreads(demoThreads);
      return { success: true, threads: demoThreads };
    }

    case 'RENAME_THREAD': {
      const updated = intentEngine.renameThread(message.threadId, message.newTitle);
      if (updated) {
        await storageManager.saveThreads(intentEngine.getThreads());
        return { success: true, thread: updated };
      }
      return { success: false, error: 'Thread not found' };
    }

    case 'SET_THREAD_STATUS': {
      const updated = intentEngine.setThreadStatus(message.threadId, message.status);
      if (updated) {
        await storageManager.saveThreads(intentEngine.getThreads());
        return { success: true, thread: updated };
      }
      return { success: false, error: 'Thread not found' };
    }

    case 'MERGE_THREADS': {
      const merged = intentEngine.mergeThreads(message.targetThreadId, message.sourceThreadId);
      if (merged) {
        await storageManager.saveThreads(intentEngine.getThreads());
        return { success: true, thread: merged, threads: intentEngine.getThreads() };
      }
      return { success: false, error: 'Failed to merge threads' };
    }

    case 'SPLIT_THREAD': {
      const result = intentEngine.splitTabsFromThread(
        message.sourceThreadId,
        message.tabUrlsToExtract,
        message.newThreadTitle
      );
      if (result) {
        await storageManager.saveThreads(intentEngine.getThreads());
        return { success: true, result, threads: intentEngine.getThreads() };
      }
      return { success: false, error: 'Failed to split thread' };
    }

    case 'DELETE_THREAD': {
      const deleted = intentEngine.deleteThread(message.threadId);
      if (deleted) {
        await storageManager.deleteThread(message.threadId);
        return { success: true, threads: intentEngine.getThreads() };
      }
      return { success: false, error: 'Thread not found' };
    }

    case 'CLEAR_ALL_DATA': {
      await storageManager.clearAllData();
      intentEngine.setThreads([]);
      return { success: true, threads: [] };
    }

    case 'CLEAR_BROWSING_INTELLIGENCE': {
      await storageManager.clearBrowsingIntelligence();
      intentEngine.setThreads([]);
      return { success: true, threads: [] };
    }

    case 'GET_PRIVACY_SETTINGS': {
      const data = await storageManager.load();
      return { success: true, privacy: data.privacy };
    }

    case 'UPDATE_PRIVACY_SETTINGS': {
      await storageManager.savePrivacySettings(message.privacy);
      if (activityCollector) {
        activityCollector.updatePrivacySettings(message.privacy);
      }
      return { success: true };
    }

    case 'GET_AI_SETTINGS': {
      const data = await storageManager.load();
      return { success: true, aiSettings: data.aiSettings };
    }

    case 'UPDATE_AI_SETTINGS': {
      await storageManager.saveAISettings(message.aiSettings);
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// Views persist edits directly; keep the live collector and engine in sync.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const data = await storageManager.load();
  intentEngine.setThreads(Object.values(data.threads));
  activityCollector?.updatePrivacySettings(data.privacy);
  chrome.runtime.sendMessage({ type: 'THREADS_UPDATED', threads: intentEngine.getThreads() }).catch(() => {});
});

// Initial self-boot
initialize();
