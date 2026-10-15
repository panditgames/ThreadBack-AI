import { ActivityEvent, IntentStep, ThreadStatus } from '../types';

const COMPLETION_URL_PATTERNS = [
  /\/confirm(ation)?/i,
  /\/thank(-|_)?you/i,
  /\/success/i,
  /\/order(-|_)?received/i,
  /\/submitted/i,
  /\/checkout\/complete/i,
  /\/done/i,
  /\/complete/i,
];

const COMPLETION_TITLE_PATTERNS = [
  /thank you/i,
  /order placed/i,
  /submission confirmed/i,
  /successfully submitted/i,
  /project published/i,
  /assignment submitted/i,
  /purchase complete/i,
];

export function inferThreadStatus(
  events: ActivityEvent[],
  completedSteps: IntentStep[],
  unfinishedSteps: IntentStep[],
  currentStatus?: ThreadStatus
): ThreadStatus {
  if (currentStatus === 'ARCHIVED') {
    return 'ARCHIVED';
  }

  if (events.length === 0) {
    return currentStatus || 'PAUSED';
  }

  const latestEvent = events.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest, 
    events[0]
  );

  const now = Date.now();
  const inactiveDurationMs = now - latestEvent.timestamp;
  const fifteenMinutesMs = 15 * 60 * 1000;

  // Check for definitive completion markers in recent browsing events
  const hasCompletionMarker = events.some(e => {
    return (
      COMPLETION_URL_PATTERNS.some(p => p.test(e.pathname || e.url)) ||
      COMPLETION_TITLE_PATTERNS.some(p => p.test(e.title || ''))
    );
  });

  if ((hasCompletionMarker || completedSteps.length >= 2) && unfinishedSteps.length === 0) {
    return 'LIKELY_COMPLETE';
  }

  // If there are still unfinished steps or no completion marker:
  if (inactiveDurationMs <= fifteenMinutesMs) {
    return 'ACTIVE';
  }

  return 'PAUSED';
}
