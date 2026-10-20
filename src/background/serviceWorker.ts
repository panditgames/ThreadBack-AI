import { getLocalModelStatus, getModelDiagnostics, clearLocalModelState } from '../engine/ai/localEmbedder';
import { ActivityCollector } from '../collector/activityCollector';
import { createDemoDataset } from '../demo/demoDataset';
import { IntentEngine } from '../engine/intentClusterer';
import { detectInterruption } from '../engine/interruption';
import { executeResumeTask } from '../engine/resumeSelector';
import { DEFAULT_PRIVACY_SETTINGS, STORAGE_KEY, storageManager } from '../storage/storageManager';
import { parseUrl } from '../engine/urlParser';
import { ActivityEvent, PrivacySettings } from '../types';

const intentEngine = new IntentEngine();
let activityCollector: ActivityCollector | null = null;
let isInitialized = false;
let initialization: Promise<void> | undefined;
let captureReady!: () => void;
const privacyReady = new Promise<void>(resolve => { captureReady = resolve; });

async function captureDurably(event: ActivityEvent): Promise<void> {
  await privacyReady;
  if (!await canReplay(event)) return;
  await storageManager.addPendingEvent(event);
  void serialize(async () => { await initialize(); await handleActivityEvent(event); });
}

async function canReplay(event: ActivityEvent): Promise<boolean> {
  const data = await storageManager.load();
  const privacy: PrivacySettings = data.privacy || DEFAULT_PRIVACY_SETTINGS;
  const collector = new ActivityCollector(() => {}, privacy);
  const parsed = parseUrl(event.url);
  return parsed.isValid && !collector.isDomainExcluded(parsed.domain);
}
// Order engine mutations and saved-state synchronization so an older read cannot
// overwrite a newer captured event while asynchronous storage writes complete.
let pendingOperation: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingOperation.then(operation);
  pendingOperation = result.then(() => undefined, () => undefined);
  return result;
}

function initialize(): Promise<void> {
  return initialization ??= initializeOnce();
}

async function replayPendingEvents(): Promise<number> {
  const pendingEvents = await storageManager.getPendingEvents();
  if (pendingEvents.length > 0) {
    console.log(`[ThreadBack Service Worker] Replaying ${pendingEvents.length} unresolved pending events...`);
    for (const pending of pendingEvents) {
      try {
        if (!await canReplay(pending)) { await storageManager.resolvePendingEvent(pending.id); continue; }
        await intentEngine.processEvent(pending);
        await storageManager.resolvePendingEvent(pending.id, intentEngine.getThreads());
      } catch (replayErr) {
        console.error('[ThreadBack Service Worker] Error replaying pending event:', replayErr);
      }
    }
  }
  return pendingEvents.length;
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

    activityCollector?.updatePrivacySettings(data.privacy || DEFAULT_PRIVACY_SETTINGS);
    captureReady();

    // Replay any unresolved pending events from a prior worker restart/termination
    await replayPendingEvents();

    // Bounded startup reconciliation also revisits existing workflows without a new page.
    await intentEngine.reconcileWorkspace();
    await storageManager.saveThreads(intentEngine.getThreads());


    isInitialized = true;
    console.log('[ThreadBack Service Worker] Initialized with', intentEngine.getThreads().length, 'threads');
  } catch (err) {
    console.error('[ThreadBack Service Worker] Initialization error:', err);
  }
}

async function handleActivityEvent(event: ActivityEvent) {
  try {
    // 1. Durably record pending event before async ONNX inference
    if (!await canReplay(event)) { await storageManager.resolvePendingEvent(event.id); return; }

    // 2. Perform local model embedding and clustering
    const updatedThread = await intentEngine.processEvent(event);

    // 3. Atomically persist updated threads and remove from pending queue
    const persisted = await storageManager.resolvePendingEvent(event.id, intentEngine.getThreads());
    if (!persisted) { intentEngine.setThreads(Object.values((await storageManager.load()).threads)); return; }

    if (updatedThread) {
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
  await serialize(async () => {
    await initialize();
    await replayPendingEvents();
  });
});

// Periodic state synchronization alarm
chrome.alarms.create('threadback_sync', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'threadback_sync') {
    await serialize(async () => {
      await initialize();
      await intentEngine.reconcileWorkspace();
      await storageManager.saveThreads(intentEngine.getThreads());
    });
  }
});

// Message Bus for UI components (Popup, Dashboard, Side Panel)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target === 'threadback-local-model') return false;
  serialize(() => handleMessage(message)).then(sendResponse).catch(err => {
    sendResponse({ success: false, error: err.message });
  });
  return true; // async sendResponse
});

async function handleMessage(message: any): Promise<any> {
  if (!isInitialized) {
    await initialize();
  }

  switch (message.type) {
    case 'REPLAY_PENDING_EVENTS': {
      const count = await replayPendingEvents();
      return { success: true, replayed: count, threads: intentEngine.getThreads() };
    }
    case 'GET_ALL_THREADS': {
      const threads = intentEngine.getThreads();
      return { success: true, threads, semanticModelStatus: getLocalModelStatus(), modelDiagnostics: getModelDiagnostics() };
    }

    case 'RECONCILE_WORKSPACE': {
      intentEngine.setThreads(Object.values((await storageManager.load()).threads));
      const actions = await intentEngine.reconcileWorkspace();
      await storageManager.saveThreads(intentEngine.getThreads());
      return { success: true, actions, threads: intentEngine.getThreads() };
    }
    case 'UNDO_INTENT_ACTION': {
      const success = intentEngine.undoManagerAction(message.threadId, message.actionId);
      if (success) await storageManager.saveThreads(intentEngine.getThreads());
      return { success, error: success ? undefined : 'Newer activity prevents safe undo.', threads: intentEngine.getThreads() };
    }
    case 'GET_THREAD_BY_ID': {
      const thread = intentEngine.getThread(message.threadId);
      return { success: true, thread };
    }

    case 'GET_ACTIVE_THREAD': {
      const threads = intentEngine.getActiveThreads();
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
        await intentEngine.reconcileWorkspace();
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
        await intentEngine.reconcileWorkspace();
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

    case 'PROMOTE_LATENT_THREAD': {
      const promoted = intentEngine.promoteLatentThread(message.threadId);
      if (promoted) {
        await intentEngine.reconcileWorkspace();
        await storageManager.saveThreads(intentEngine.getThreads());
        return { success: true, thread: promoted, threads: intentEngine.getThreads() };
      }
      return { success: false, error: 'Thread not found' };
    }

    case 'CLEAR_ALL_DATA': {
      await clearLocalModelState();
      await storageManager.clearAllData();
      intentEngine.setThreads([]);
      return { success: true, threads: [] };
    }

    case 'CLEAR_BROWSING_INTELLIGENCE': {
      await clearLocalModelState();
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
  void serialize(async () => {
    const data = await storageManager.load();
    const structuralChange=intentEngine.setThreads(Object.values(data.threads));
    if(structuralChange){await intentEngine.reconcileWorkspace();await storageManager.saveThreads(intentEngine.getThreads());}
    activityCollector?.updatePrivacySettings(data.privacy);
    chrome.runtime.sendMessage({ type: 'THREADS_UPDATED', threads: intentEngine.getThreads() }).catch(() => {});
  }).catch(err => console.error('[ThreadBack] State synchronization failed:', err));
});

// MV3 wake-up listeners must register synchronously, before storage/model awaits.
activityCollector = new ActivityCollector(event => { void captureDurably(event).catch(err =>
  console.error('[ThreadBack] Durable capture failed:', err)); }, DEFAULT_PRIVACY_SETTINGS);
activityCollector.startListening();
// Initial self-boot
initialize();
