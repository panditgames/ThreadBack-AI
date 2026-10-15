import { ActivityEvent, IntentStep, IntentThread, TabReference, ThreadStatus } from '../types';
import { extractQueryKeywords, extractTitleKeywords } from './keywords';
import { inferNextAction } from './nextActionInferer';
import { computeEventSimilarity } from './scoring';
import { inferThreadStatus } from './statusInferer';
import { parseUrl } from './urlParser';
import { generateWhyExplanation } from './whyExplainer';

const CLUSTER_THRESHOLD = 0.40;

export function deriveThreadTitle(
  events: ActivityEvent[],
  existingTitle?: string
): { title: string; summary: string } {
  if (existingTitle && existingTitle.trim().length > 0) {
    return {
      title: existingTitle,
      summary: `User task: ${existingTitle}`,
    };
  }

  if (events.length === 0) {
    return {
      title: 'New Browsing Intent',
      summary: 'Task initialized from browsing activity',
    };
  }

  // 1. Check if there's a distinct search query
  const searchEvent = events.find(e => e.searchQuery && e.searchQuery.length > 2);

  // 2. Scan titles for high-intent verbs and domains
  const combinedText = events.map(e => `${e.title} ${e.domain}`).join(' ').toLowerCase();

  // Pattern detection for clear, natural task titles
  if (combinedText.includes('eurekadev') || (combinedText.includes('hackathon') && combinedText.includes('devpost'))) {
    return {
      title: 'Submit EurekaDev Project',
      summary: 'Hackathon project preparation, demo recording, and submission workflow.',
    };
  }

  if (combinedText.includes('headphone') || combinedText.includes('wh-1000xm') || combinedText.includes('earbuds')) {
    return {
      title: 'Compare ANC Headphones',
      summary: 'Evaluating wireless noise-cancelling headphones across reviews and retailers.',
    };
  }

  if (combinedText.includes('physics') || combinedText.includes('quantum') || combinedText.includes('assignment')) {
    return {
      title: 'Physics Assignment Research',
      summary: 'Gathering reference material, lecture notes, and textbook problems.',
    };
  }

  if (combinedText.includes('internship') || combinedText.includes('job') || combinedText.includes('apply')) {
    return {
      title: 'Software Internship Applications',
      summary: 'Reviewing job descriptions and submitting developer applications.',
    };
  }

  if (combinedText.includes('flight') || combinedText.includes('hotel') || combinedText.includes('trip') || combinedText.includes('travel')) {
    return {
      title: 'Plan Travel Trip',
      summary: 'Comparing travel itineraries, accommodation, and reservations.',
    };
  }

  // If originating from search, craft title from query
  if (searchEvent && searchEvent.searchQuery) {
    const raw = searchEvent.searchQuery;
    const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
    return {
      title: capitalized.length > 40 ? `${capitalized.slice(0, 37)}...` : capitalized,
      summary: `Investigating ${raw} and related resources.`,
    };
  }

  // Fallback to top keywords from the most prominent page
  const sortedByTime = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const primaryEvent = sortedByTime[0];
  const cleanedTitle = primaryEvent.title
    .replace(/\s*[-–—|•:]\s*.*$/, '')
    .trim();

  return {
    title: cleanedTitle.length > 4 ? cleanedTitle : `Research on ${primaryEvent.domain}`,
    summary: `Browsing and research activity on ${primaryEvent.domain}.`,
  };
}

export function deriveMilestoneSteps(
  events: ActivityEvent[],
  tabs: TabReference[]
): { completedSteps: IntentStep[]; unfinishedSteps: IntentStep[] } {
  const completedSteps: IntentStep[] = [];
  const unfinishedSteps: IntentStep[] = [];

  const text = events.map(e => `${e.title} ${e.url} ${e.domain}`).join(' ').toLowerCase();

  if (text.includes('devpost') || text.includes('hackathon') || text.includes('eurekadev')) {
    // Hackathon milestones
    if (text.includes('rule') || text.includes('schedule') || text.includes('overview') || text.includes('google')) {
      completedSteps.push({
        id: 'hs-1',
        title: 'Review hackathon rules & requirements',
        status: 'COMPLETED',
        confidence: 'Likely',
        evidence: ['Visited hackathon overview and rules page'],
      });
    }
    if (text.includes('github.com')) {
      completedSteps.push({
        id: 'hs-2',
        title: 'GitHub repository and code artifacts',
        status: 'COMPLETED',
        confidence: 'Likely',
        evidence: ['Visited project GitHub repository'],
      });
    }
    if (text.includes('screenapp') || text.includes('studio.youtube') || text.includes('loom')) {
      completedSteps.push({
        id: 'hs-3',
        title: 'Record demo walkthrough video',
        status: 'COMPLETED',
        confidence: 'Likely',
        evidence: ['Opened demo recording/upload studio'],
      });
    } else {
      unfinishedSteps.push({
        id: 'hs-3u',
        title: 'Record demo video',
        status: 'LIKELY_REMAINING',
        confidence: 'Likely',
        evidence: ['Required for Devpost video submission field'],
      });
    }

    if (text.includes('confirm') || text.includes('submitted')) {
      completedSteps.push({
        id: 'hs-4',
        title: 'Devpost project submission',
        status: 'COMPLETED',
        confidence: 'Likely',
        evidence: ['Confirmation page detected'],
      });
    } else {
      unfinishedSteps.push({
        id: 'hs-4u',
        title: 'Final Devpost submission',
        status: 'LIKELY_REMAINING',
        confidence: 'Likely',
        evidence: ['Devpost submission form not yet finalized'],
      });
    }
  } else if (text.includes('headphone') || text.includes('laptop') || text.includes('amazon') || text.includes('compare')) {
    // Shopping / Comparison milestones
    completedSteps.push({
      id: 'sc-1',
      title: 'Initial criteria & search',
      status: 'COMPLETED',
      confidence: 'Likely',
      evidence: ['Search queries and review exploration'],
    });

    const candidateTabs = tabs.filter(t => t.domain.includes('amazon.') || t.title.toLowerCase().includes('review'));
    if (candidateTabs.length > 0) {
      completedSteps.push({
        id: 'sc-2',
        title: 'Identify shortlisted models',
        status: 'COMPLETED',
        confidence: 'Likely',
        evidence: candidateTabs.map(t => `Shortlisted: ${t.title.slice(0, 30)}`),
      });
    }

    unfinishedSteps.push({
      id: 'sc-3',
      title: 'Compare final two candidates & check pricing',
      status: 'LIKELY_REMAINING',
      confidence: 'Likely',
      evidence: ['No purchase confirmation detected'],
    });
  } else if (text.includes('physics') || text.includes('assignment') || text.includes('quantum')) {
    completedSteps.push({
      id: 'ac-1',
      title: 'Review problem prompt & research references',
      status: 'COMPLETED',
      confidence: 'Likely',
      evidence: ['Accessed reference documentation and lecture notes'],
    });
    unfinishedSteps.push({
      id: 'ac-2',
      title: 'Synthesize solution & submit assignment',
      status: 'LIKELY_REMAINING',
      confidence: 'Inferred from browsing activity',
      evidence: ['Reference tabs still open'],
    });
  } else {
    // General fallback
    if (events.length > 1) {
      completedSteps.push({
        id: 'gen-1',
        title: 'Initial research & page exploration',
        status: 'COMPLETED',
        confidence: 'Inferred from browsing activity',
        evidence: [`Navigated ${events.length} pages`],
      });
    }
    unfinishedSteps.push({
      id: 'gen-2',
      title: 'Complete task objective',
      status: 'LIKELY_REMAINING',
      confidence: 'Possibly',
      evidence: ['Active browsing tab context'],
    });
  }

  return { completedSteps, unfinishedSteps };
}

export class IntentEngine {
  private threads: Map<string, IntentThread> = new Map();
  private processedCounts = new Map<string, number>();

  constructor(initialThreads?: IntentThread[]) {
    if (initialThreads) {
      for (const t of initialThreads) {
        this.threads.set(t.id, t);
      }
    }
  }

  public getThreads(): IntentThread[] {
    return Array.from(this.threads.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getThread(id: string): IntentThread | undefined {
    return this.threads.get(id);
  }

  public setThreads(threads: IntentThread[]): void {
    this.threads.clear();
    for (const id of this.processedCounts.keys()) {
      if (!threads.some(thread => thread.id === id)) this.processedCounts.delete(id);
    }
    for (const t of threads) {
      this.threads.set(t.id, t);
    }
  }

  /**
   * Incrementally process a single ActivityEvent
   */
  public processEvent(event: ActivityEvent): IntentThread | null {
    if (event.isInternalBrowserPage || !event.url || !parseUrl(event.url).isValid || !Number.isFinite(event.timestamp)) {
      return null;
    }

    event = { ...event, title: event.title || event.domain || '' };
    // Route closure and repeated activation to their known page, without reclustering.
    for (const thread of this.threads.values()) {
      if (thread.events.some(e => e.id === event.id)) return thread;
      if (thread.tabs.some(t => t.url.split('#')[0] === event.url.split('#')[0])) {
        return this.addEventToThread(thread, event, thread.confidence);
      }
    }
    if (event.eventType === 'tab_closed') return null;

    let bestThread: IntentThread | null = null;
    let highestScore = 0;

    // Pre-extract tokens once for all comparisons
    const titleTokens = extractTitleKeywords(event.title);
    const queryTokens = extractQueryKeywords(event.searchQuery);
    const allTokens = [...titleTokens, ...queryTokens];

    // Compare with non-archived threads (focus on active/recent or keyword-relevant)
    for (const thread of this.threads.values()) {
      if (thread.status === 'ARCHIVED') continue;

      const timeDiff = Math.abs(event.timestamp - thread.updatedAt);
      const isRecent = timeDiff <= 48 * 3600 * 1000;
      const sharedWithThread = allTokens.filter(t => thread.keywords.includes(t));

      // Fast skip if thread is days apart with zero shared keywords
      if (!isRecent && sharedWithThread.length === 0) {
        continue;
      }

      // Fast check: pairwise with recent events in thread
      const recentEvents = thread.events.slice(-2);
      for (const pastEvent of recentEvents) {
        const sim = computeEventSimilarity(event, pastEvent);
        if (sim.totalScore > highestScore) {
          highestScore = sim.totalScore;
          bestThread = thread;
        }
      }

      // Keyword match bonus
      if (sharedWithThread.length >= 2) {
        const keywordScore = 0.45 + (sharedWithThread.length * 0.1);
        if (keywordScore > highestScore) {
          highestScore = keywordScore;
          bestThread = thread;
        }
      }
    }

    if (bestThread && highestScore >= CLUSTER_THRESHOLD) {
      // Append event to matched thread
      return this.addEventToThread(bestThread, event, highestScore);
    } else {
      // Create new IntentThread
      return this.createNewThread(event);
    }
  }

  private addEventToThread(
    thread: IntentThread,
    event: ActivityEvent,
    matchScore: number
  ): IntentThread {
    const updatedEvents = [...thread.events, event].slice(-100); // retain last 100 events

    // Update tabs
    const existingTabIndex = thread.tabs.findIndex(t => t.url.split('#')[0] === event.url.split('#')[0]);
    const updatedTabs = [...thread.tabs];

    if (existingTabIndex !== -1) {
      updatedTabs[existingTabIndex] = {
        ...updatedTabs[existingTabIndex],
        tabId: event.tabId,
        windowId: event.windowId,
        title: event.title || updatedTabs[existingTabIndex].title,
        lastAccessed: event.timestamp,
        isClosed: event.eventType === 'tab_closed',
      };
    } else if (event.eventType !== 'tab_closed') {
      updatedTabs.push({
        id: `tab-${event.tabId || Math.random().toString(36).slice(2, 8)}`,
        tabId: event.tabId,
        windowId: event.windowId,
        url: event.url,
        title: event.title || event.domain,
        domain: event.domain,
        searchQuery: event.searchQuery,
        lastAccessed: event.timestamp,
        isClosed: false,
        openerTabId: event.openerTabId,
        order: updatedTabs.length,
      });
    }

    // Update keywords
    const newKws = [
      ...extractTitleKeywords(event.title),
      ...extractQueryKeywords(event.searchQuery),
    ];
    const updatedKeywords = Array.from(new Set([...thread.keywords, ...newKws])).slice(0, 30);

    // Dynamic title only if not already established
    const titleInfo = (thread.title && thread.title !== 'New Browsing Intent')
      ? { title: thread.title, summary: thread.summary }
      : deriveThreadTitle(updatedEvents, undefined);

    // Incremental milestone and evidence derivation (recompute periodically or on initial events)
    const processedCount = (this.processedCounts.get(thread.id) ?? thread.events.length) + 1;
    this.processedCounts.set(thread.id, processedCount);
    const shouldFullRecompute = processedCount <= 4 || processedCount % 10 === 0 || event.eventType === 'tab_closed';
    const { completedSteps, unfinishedSteps } = shouldFullRecompute
      ? deriveMilestoneSteps(updatedEvents, updatedTabs)
      : { completedSteps: thread.completedSteps, unfinishedSteps: thread.unfinishedSteps };

    const nextAction = shouldFullRecompute
      ? inferNextAction(titleInfo.title, updatedEvents, updatedTabs)
      : thread.nextAction;

    const status = inferThreadStatus(updatedEvents, completedSteps, unfinishedSteps, thread.status);
    const evidence = shouldFullRecompute
      ? generateWhyExplanation(updatedEvents, updatedTabs)
      : thread.evidence;

    const updatedThread: IntentThread = {
      ...thread,
      title: titleInfo.title,
      summary: titleInfo.summary,
      updatedAt: event.timestamp,
      confidence: Math.min(0.98, Math.max(thread.confidence, matchScore)),
      events: updatedEvents,
      tabs: updatedTabs.slice(-50),
      keywords: updatedKeywords,
      completedSteps,
      unfinishedSteps,
      nextAction,
      status,
      evidence,
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  private createNewThread(initialEvent: ActivityEvent): IntentThread {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const events = [initialEvent];
    const tabs: TabReference[] = [
      {
        id: `tab-${initialEvent.tabId || Math.random().toString(36).slice(2, 8)}`,
        tabId: initialEvent.tabId,
        windowId: initialEvent.windowId,
        url: initialEvent.url,
        title: initialEvent.title || initialEvent.domain,
        domain: initialEvent.domain,
        searchQuery: initialEvent.searchQuery,
        lastAccessed: initialEvent.timestamp,
        isClosed: initialEvent.eventType === 'tab_closed',
        openerTabId: initialEvent.openerTabId,
        order: 0,
      },
    ];

    const keywords = [
      ...extractTitleKeywords(initialEvent.title),
      ...extractQueryKeywords(initialEvent.searchQuery),
    ];

    const { title, summary } = deriveThreadTitle(events);
    const { completedSteps, unfinishedSteps } = deriveMilestoneSteps(events, tabs);
    const nextAction = inferNextAction(title, events, tabs);
    const evidence = generateWhyExplanation(events, tabs);

    const newThread: IntentThread = {
      id: threadId,
      title,
      summary,
      createdAt: initialEvent.timestamp,
      updatedAt: initialEvent.timestamp,
      status: 'ACTIVE',
      confidence: 0.85,
      tabs,
      events,
      keywords,
      completedSteps,
      unfinishedSteps,
      nextAction,
      evidence,
    };

    this.threads.set(threadId, newThread);
    return newThread;
  }

  // --- Manual Controls (Feature 8) ---

  public renameThread(threadId: string, newTitle: string): IntentThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const updated: IntentThread = {
      ...thread,
      title: newTitle.trim(),
      summary: `User task: ${newTitle.trim()}`,
      isManualCorrection: true,
      updatedAt: Date.now(),
    };
    this.threads.set(threadId, updated);
    return updated;
  }

  public setThreadStatus(threadId: string, status: ThreadStatus): IntentThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const updated: IntentThread = {
      ...thread,
      status,
      updatedAt: Date.now(),
    };
    this.threads.set(threadId, updated);
    return updated;
  }

  public deleteThread(threadId: string): boolean {
    return this.threads.delete(threadId);
  }

  public mergeThreads(targetThreadId: string, sourceThreadId: string): IntentThread | null {
    if (targetThreadId === sourceThreadId) return null;
    const target = this.threads.get(targetThreadId);
    const source = this.threads.get(sourceThreadId);
    if (!target || !source) return null;

    // Combine events and tabs
    const mergedEvents = [...target.events, ...source.events]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-150);

    const seenUrls = new Set<string>();
    const mergedTabs: TabReference[] = [];

    for (const t of [...target.tabs, ...source.tabs]) {
      const cleanUrl = t.url.split('#')[0];
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        mergedTabs.push({ ...t, order: mergedTabs.length });
      }
    }

    const mergedKeywords = Array.from(new Set([...target.keywords, ...source.keywords]));
    const { completedSteps, unfinishedSteps } = deriveMilestoneSteps(mergedEvents, mergedTabs);
    const nextAction = inferNextAction(target.title, mergedEvents, mergedTabs);
    const evidence = generateWhyExplanation(mergedEvents, mergedTabs);

    const mergedThread: IntentThread = {
      ...target,
      updatedAt: Date.now(),
      tabs: mergedTabs,
      events: mergedEvents,
      keywords: mergedKeywords,
      completedSteps,
      unfinishedSteps,
      nextAction,
      evidence,
      isManualCorrection: true,
    };

    this.threads.set(targetThreadId, mergedThread);
    this.threads.delete(sourceThreadId);
    return mergedThread;
  }

  public splitTabsFromThread(
    sourceThreadId: string,
    tabUrlsToExtract: string[],
    newThreadTitle?: string
  ): { sourceThread: IntentThread; newThread: IntentThread } | null {
    const source = this.threads.get(sourceThreadId);
    if (!source || tabUrlsToExtract.length === 0) return null;

    const extractSet = new Set(tabUrlsToExtract.map(u => u.split('#')[0]));

    const remainingTabs = source.tabs.filter(t => !extractSet.has(t.url.split('#')[0]));
    const extractedTabs = source.tabs.filter(t => extractSet.has(t.url.split('#')[0]));

    if (extractedTabs.length === 0 || remainingTabs.length === 0) {
      return null;
    }

    const extractedEvents = source.events.filter(e => extractSet.has(e.url.split('#')[0]));
    const remainingEvents = source.events.filter(e => !extractSet.has(e.url.split('#')[0]));

    const remainingSteps = deriveMilestoneSteps(remainingEvents, remainingTabs);
    // Update source
    const updatedSource: IntentThread = {
      ...source,
      tabs: remainingTabs,
      events: remainingEvents,
      keywords: [...new Set(remainingEvents.flatMap(e => [...extractTitleKeywords(e.title), ...extractQueryKeywords(e.searchQuery)]))],
      ...remainingSteps,
      nextAction: inferNextAction(source.title, remainingEvents, remainingTabs),
      updatedAt: Date.now(),
      evidence: generateWhyExplanation(remainingEvents, remainingTabs),
      isManualCorrection: true,
    };
    this.threads.set(sourceThreadId, updatedSource);

    // Create new extracted thread
    const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { title, summary } = deriveThreadTitle(extractedEvents, newThreadTitle);
    const { completedSteps, unfinishedSteps } = deriveMilestoneSteps(extractedEvents, extractedTabs);
    const nextAction = inferNextAction(title, extractedEvents, extractedTabs);
    const evidence = generateWhyExplanation(extractedEvents, extractedTabs);

    const newThread: IntentThread = {
      id: newThreadId,
      title,
      summary,
      createdAt: extractedTabs[0]?.lastAccessed || Date.now(),
      updatedAt: Date.now(),
      status: 'ACTIVE',
      confidence: 0.90,
      tabs: extractedTabs,
      events: extractedEvents,
      keywords: extractTitleKeywords(extractedTabs.map(t => t.title).join(' ')),
      completedSteps,
      unfinishedSteps,
      nextAction,
      evidence,
      isManualCorrection: true,
    };

    this.threads.set(newThreadId, newThread);
    return { sourceThread: updatedSource, newThread };
  }
}
