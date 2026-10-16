import { ConfidenceQualifier, IntentThread, TabReference } from '../types';
import { isInternalUrl, parseUrl } from './urlParser';

export interface ResumeBriefingResult {
  workingOn: string;
  lastObservedAction: string;
  likelyCompleted: string[];
  likelyRemaining: string[];
  nextAction: string;
  confidence: ConfidenceQualifier;
  restoredTabCount: number;
  focusedTabUrl?: string;
  restoredTabs: TabReference[];
}

export function selectResumeTabs(tabs: TabReference[]): TabReference[] {
  if (!tabs || tabs.length === 0) return [];

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueTabs: TabReference[] = [];

  for (const tab of tabs) {
    if (!tab.url || isInternalUrl(tab.url) || !parseUrl(tab.url).isValid) continue;
    const cleanUrl = new URL(tab.url).href.split('#')[0]; // strip hash for deduplication
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      uniqueTabs.push(tab);
    }
  }

  // Sort by order/time
  return uniqueTabs.sort((a, b) => (a.order || 0) - (b.order || 0) || a.lastAccessed - b.lastAccessed);
}

export async function executeResumeTask(
  thread: IntentThread,
  chromeTabsApi = typeof chrome !== 'undefined' ? chrome.tabs : undefined
): Promise<ResumeBriefingResult> {
  const tabsToResume = selectResumeTabs(thread.tabs);
  const primaryTab = tabsToResume.find(t => t.url === thread.nextAction?.suggestedUrl)
    || [...tabsToResume].sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
  let restoredCount = 0;
  let focusedUrl: string | undefined;

  // Generate briefing information with humble, honest qualifiers
  const lastAction = thread.events.length > 0
    ? [...thread.events].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const lastObservedAction = lastAction
    ? (lastAction.eventType === 'tab_closed' ? `Closed ${lastAction.title || lastAction.domain}`
        : lastAction.eventType === 'tab_activated' ? `Viewed ${lastAction.title || lastAction.domain}`
        : lastAction.searchQuery
        ? `Searched for "${lastAction.searchQuery}"` 
        : `Opened ${lastAction.title || lastAction.domain}`)
    : (tabsToResume.length > 0 ? `Opened ${tabsToResume[tabsToResume.length - 1].title}` : 'Previous session');

  const likelyCompleted = thread.completedSteps.map(s => s.title);
  const likelyRemaining = thread.unfinishedSteps.map(s => s.title);

  if (likelyCompleted.length === 0 && tabsToResume.length > 1) {
    tabsToResume.slice(0, Math.min(2, tabsToResume.length - 1)).forEach(t => {
      likelyCompleted.push(t.title || t.domain);
    });
  }

  if (likelyRemaining.length === 0 && thread.nextAction?.actionText) {
    likelyRemaining.push(thread.nextAction.actionText);
  }

  // Restore/Focus tabs if Chrome tabs API is available
  if (chromeTabsApi) {
    try {
      const openTabs = await chromeTabsApi.query({});
      const openUrlMap = new Map<string, chrome.tabs.Tab>();

      for (const openTab of openTabs) {
        if (openTab.url) {
          openUrlMap.set(openTab.url.split('#')[0], openTab);
        }
      }

      // Reopen or focus tabs
      for (let i = 0; i < tabsToResume.length; i++) {
        const targetTab = tabsToResume[i];
        if (!parseUrl(targetTab.url).isValid) {
          continue; // strictly block javascript:, data:, file:, chrome:, edge:, etc.
        }
        const cleanTarget = new URL(targetTab.url).href.split('#')[0];
        const existingOpen = openUrlMap.get(cleanTarget);
        const isLastTab = targetTab === primaryTab;
        try {

        if (existingOpen && existingOpen.id !== undefined) {
          // Tab is already open; focus it if it's the primary target
          if (isLastTab) {
            await chromeTabsApi.update(existingOpen.id, { active: true });
            if (typeof chrome !== 'undefined' && chrome.windows && existingOpen.windowId !== undefined) {
              await chrome.windows.update(existingOpen.windowId, { focused: true });
            }
            focusedUrl = targetTab.url;
          }
        } else {
          // Tab is closed; reopen it
          await chromeTabsApi.create({
            url: targetTab.url,
            active: isLastTab,
          });
          restoredCount++;
          if (isLastTab) {
            focusedUrl = targetTab.url;
          }
        }
        } catch {
          // A single denied or stale tab must not prevent the remaining task tabs reopening.
          continue;
        }
      }
    } catch (err) {
      console.warn('[ThreadBack] Tab restore note:', err);
    }
  }

  return {
    workingOn: thread.title,
    lastObservedAction,
    likelyCompleted,
    likelyRemaining,
    nextAction: thread.nextAction?.actionText || 'Continue with next step',
    confidence: thread.nextAction?.confidence || 'Likely',
    restoredTabCount: restoredCount,
    focusedTabUrl: focusedUrl,
    restoredTabs: tabsToResume,
  };
}
