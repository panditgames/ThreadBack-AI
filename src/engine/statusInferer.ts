import { ActivityEvent, IntentStep, ThreadStatus } from '../types';

const COMPLETION_URL_PATTERNS = [
  /(?:^|\/)(submitted|order[-_]?received|thank[-_]?you|confirmation|success)\/?$/i,
  /\/checkout\/complete\/?$/i,
];

const COMPLETION_TITLE_PATTERNS = [
  /^(order placed|submission confirmed|successfully submitted|project published|assignment submitted|purchase complete)\b/i,
  /^thank you[!,]? for (your )?(order|submission|purchase)\b/i,
];

export function hasCompletionEvidence(event: ActivityEvent): boolean {
  try {
    const url = new URL(event.url);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    return COMPLETION_URL_PATTERNS.some(p => p.test(url.pathname)) || COMPLETION_TITLE_PATTERNS.some(p => p.test(event.title || ''));
  } catch { return false; }
}

export function inferThreadStatus(
  events: ActivityEvent[],
  _completedSteps: IntentStep[],
  unfinishedSteps: IntentStep[],
  currentStatus?: ThreadStatus
): ThreadStatus {
  if (currentStatus === 'ARCHIVED') {
    return 'ARCHIVED';
  }

  // Manual completion is sticky: respect the user's explicit completion decision
  if (currentStatus === 'LIKELY_COMPLETE') {
    return 'LIKELY_COMPLETE';
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
  const hasCompletionMarker = hasCompletionEvidence(latestEvent);
  if (hasCompletionMarker && unfinishedSteps.length === 0) return 'LIKELY_COMPLETE';

  // If there are still unfinished steps or no completion marker:
  if (inactiveDurationMs <= fifteenMinutesMs) {
    return 'ACTIVE';
  }

  return 'PAUSED';
}
