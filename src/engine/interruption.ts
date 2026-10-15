import { IntentThread, InterruptionBriefing } from '../types';

export function formatTimeDifference(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function detectInterruption(
  thread: IntentThread,
  now = Date.now()
): InterruptionBriefing | null {
  const lastActivity = thread.updatedAt || thread.createdAt;
  const inactiveDurationMs = now - lastActivity;

  // An interruption is recognized if the task was paused or inactive for >= 20 minutes
  const isInterrupted = 
    thread.status === 'PAUSED' || 
    (thread.status === 'ACTIVE' && inactiveDurationMs >= 20 * 60 * 1000);

  if (!isInterrupted) {
    return null;
  }

  // Find last observed event or tab
  let lastObservedAction = 'Active browsing';
  if (thread.events.length > 0) {
    const sorted = [...thread.events].sort((a, b) => b.timestamp - a.timestamp);
    const lastEvent = sorted[0];
    lastObservedAction = lastEvent.searchQuery 
      ? `Searched for "${lastEvent.searchQuery}"`
      : `Opened ${lastEvent.title || lastEvent.domain}`;
  } else if (thread.tabs.length > 0) {
    const lastTab = thread.tabs[thread.tabs.length - 1];
    lastObservedAction = `Opened ${lastTab.title || lastTab.domain}`;
  }

  const likelyCompleted = thread.completedSteps.map(s => s.title);
  if (likelyCompleted.length === 0 && thread.tabs.length > 0) {
    // Infer 1-2 completed milestone actions from earlier tabs
    thread.tabs.slice(0, Math.min(2, thread.tabs.length - 1)).forEach(t => {
      likelyCompleted.push(`Reviewed ${t.domain || t.title.slice(0, 30)}`);
    });
  }

  const likelyRemaining = thread.unfinishedSteps.map(s => s.title);
  if (likelyRemaining.length === 0 && thread.nextAction?.actionText) {
    likelyRemaining.push(thread.nextAction.actionText);
  }

  return {
    threadId: thread.id,
    threadTitle: thread.title,
    inactiveDurationMs,
    inactiveTimeFormatted: formatTimeDifference(inactiveDurationMs),
    lastObservedAction,
    likelyCompleted,
    likelyRemaining,
    nextAction: thread.nextAction?.actionText || 'Resume where you left off',
    tabsToRestore: thread.tabs,
  };
}
