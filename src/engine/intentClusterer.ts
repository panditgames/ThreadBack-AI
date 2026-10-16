import { ActivityEvent, IntentStep, IntentThread, TabReference, ThreadStatus } from '../types';
import { extractQueryKeywords, extractTitleKeywords, computeOverlapScore, hasTopicEvidence } from './keywords';
import { inferNextAction } from './nextActionInferer';
import { computeEventSimilarity } from './scoring';
import { inferThreadStatus, hasCompletionEvidence } from './statusInferer';
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

  // 1. Scan text and queries
  const combinedText = events.map(e => `${e.title} ${e.url} ${e.domain}`).join(' ').toLowerCase();
  const searchEvent = events.find(e => e.searchQuery && e.searchQuery.length > 2);

  // 2. High-confidence specific categories (Strict intent criteria - no single-weak-keyword false triggers)
  const hasEureka = combinedText.includes('eurekadev');
  const hasHackathon = combinedText.includes('hackathon');
  const hasHackathonPlatform = combinedText.includes('devpost') || combinedText.includes('unstop') || combinedText.includes('screenapp');
  if (hasEureka || (hasHackathon && (hasHackathonPlatform || combinedText.includes('submission') || combinedText.includes('project')))) {
    return {
      title: 'Submit EurekaDev Project',
      summary: 'Hackathon project preparation, demo recording, and submission workflow.',
    };
  }

  const hasHeadphones = combinedText.includes('headphone') || combinedText.includes('headphones') || combinedText.includes('wh-1000x') || combinedText.includes('earbuds') || combinedText.includes('airpods');
  const hasCompare = combinedText.includes('compare') || combinedText.includes('anc') || combinedText.includes('noise cancelling') || combinedText.includes('rtings') || combinedText.includes('review');
  if (hasHeadphones && hasCompare) {
    return {
      title: 'Compare ANC Headphones',
      summary: 'Evaluating wireless noise-cancelling headphones across reviews and retailers.',
    };
  }

  const hasPhysics = combinedText.includes('physics') || combinedText.includes('quantum') || combinedText.includes('doppler');
  const hasAcademic = combinedText.includes('assignment') || combinedText.includes('homework') || combinedText.includes('problem') || combinedText.includes('hyperphysics') || combinedText.includes('lecture');
  if (hasPhysics && hasAcademic) {
    return {
      title: 'Physics Assignment Research',
      summary: 'Gathering reference material, lecture notes, and textbook problems.',
    };
  }

  // Software Internship: require explicit internship OR job + recruiting context AND NOT hackathon
  const hasInternship = combinedText.includes('internship') || combinedText.includes('internships');
  const hasJobRecruiting = combinedText.includes('job') && (combinedText.includes('hiring') || combinedText.includes('careers') || combinedText.includes('vacancy') || combinedText.includes('applicant'));
  const isNotHackathon = !hasHackathon && !hasEureka && !combinedText.includes('contest') && !combinedText.includes('challenge');
  if ((hasInternship || hasJobRecruiting) && isNotHackathon) {
    return {
      title: 'Software Internship Applications',
      summary: 'Reviewing job descriptions and submitting developer applications.',
    };
  }

  const hasTravel = combinedText.includes('flight') || combinedText.includes('airline') || combinedText.includes('hotel') || combinedText.includes('booking.com') || combinedText.includes('airbnb');
  const hasTrip = combinedText.includes('trip') || combinedText.includes('travel') || combinedText.includes('vacation') || combinedText.includes('itinerary');
  if (hasTravel && hasTrip) {
    return {
      title: 'Plan Travel Trip',
      summary: 'Comparing travel itineraries, accommodation, and reservations.',
    };
  }

  // 3. If originating from an authentic user search query, use clean title case of the query
  if (searchEvent && searchEvent.searchQuery) {
    const raw = searchEvent.searchQuery.trim();
    const capitalized = raw
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return {
      title: capitalized.length > 42 ? `${capitalized.slice(0, 39)}...` : capitalized,
      summary: `Investigating "${raw}" and related resources.`,
    };
  }

  // 4. Grounded fallback to most prominent non-search page title
  const sortedByTime = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const nonSearch = sortedByTime.find(e => !e.domain.includes('google.') && !e.domain.includes('bing.') && !e.domain.includes('duckduckgo.'));
  const primaryEvent = nonSearch || sortedByTime[0];
  const cleanedTitle = primaryEvent.title
    .replace(/\s*[-–—|•:]\s*(google search|bing search|duckduckgo|github|wikipedia|amazon|youtube|stack overflow|reddit|devpost|unstop|chatgpt|openai).*$/i, '')
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

  if (text.includes('devpost') || text.includes('hackathon') || text.includes('eurekadev') || text.includes('unstop')) {
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
        evidence: ['Required for project video submission field'],
      });
    }

    if (events.some(hasCompletionEvidence)) {
      completedSteps.push({
        id: 'hs-4',
        title: 'Hackathon project submission',
        status: 'COMPLETED',
        confidence: 'Likely',
        evidence: ['Confirmation page detected'],
      });
    } else {
      unfinishedSteps.push({
        id: 'hs-4u',
        title: 'Final hackathon submission',
        status: 'LIKELY_REMAINING',
        confidence: 'Likely',
        evidence: ['Submission form not yet finalized'],
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

interface ActiveSearchSession {
  query: string;
  queryTokens: string[];
  tabId?: number;
  timestamp: number;
  threadId: string;
}

export class IntentEngine {
  private threads: Map<string, IntentThread> = new Map();
  private processedCounts = new Map<string, number>();
  private activeSearchSessions: ActiveSearchSession[] = [];

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
    this.activeSearchSessions = this.activeSearchSessions.filter(session => threads.some(t => t.id === session.threadId && t.status !== 'ARCHIVED'));
    this.threads.clear();
    for (const id of this.processedCounts.keys()) {
      if (!threads.some(thread => thread.id === id)) this.processedCounts.delete(id);
    }
    for (const t of threads) {
      this.threads.set(t.id, t);
    }
  }

  private recordSearchSession(event: ActivityEvent, threadId: string): void {
    // Only an observed query on a search URL can establish context.
    const query = parseUrl(event.url).searchQuery;
    if (!query || query !== event.searchQuery) return;
    const queryTokens = extractQueryKeywords(query);
    if (!queryTokens.length) return;
    const cutoff = event.timestamp - 20 * 60 * 1000;
    this.activeSearchSessions = this.activeSearchSessions.filter(s => s.timestamp >= cutoff && !(s.tabId === event.tabId && s.threadId === threadId && s.query === query));
    this.activeSearchSessions.unshift({ query, queryTokens, tabId: event.tabId, timestamp: event.timestamp, threadId });
    this.activeSearchSessions = this.activeSearchSessions.slice(0, 32);
  }

  private findMatchingSearchSession(event: ActivityEvent, eventTokens: string[]): ActiveSearchSession | undefined {
    let best: ActiveSearchSession | undefined;
    let bestScore = 0;
    for (const session of this.activeSearchSessions) {
      const age = event.timestamp - session.timestamp;
      const thread = this.threads.get(session.threadId);
      if (age < 0 || age > 20 * 60 * 1000 || !thread || thread.status === 'ARCHIVED') continue;
      if (!thread.events.some(e => e.searchQuery === session.query && e.tabId === session.tabId)) continue;
      const shared = session.queryTokens.filter(t => eventTokens.includes(t));
      if (!hasTopicEvidence(shared)) continue;
      const score = computeOverlapScore(session.queryTokens, eventTokens).score;
      if (score > bestScore) { best = session; bestScore = score; }
    }
    return best;
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
        this.recordSearchSession(event, thread.id);
        return this.addEventToThread(thread, event, thread.confidence);
      }
    }
    if (event.eventType === 'tab_closed') return null;

    let bestThread: IntentThread | null = null;
    let highestScore = 0;

    // Pre-extract tokens once for all comparisons
    const titleTokens = extractTitleKeywords(event.title);
    const queryTokens = extractQueryKeywords(event.searchQuery);
    const allTokens = [...new Set([...titleTokens, ...queryTokens])];

    // Check against active search sessions for contextual bridging (e.g. Ctrl+click or Right-click new tab)
    const recentSearch = !event.searchQuery ? this.findMatchingSearchSession(event, allTokens) : undefined;
    // Context changes a match score, never the observed event or its searchQuery.
    const bridgedThread = recentSearch ? this.threads.get(recentSearch.threadId) : undefined;

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

      // Gather candidate events: anchor, search queries, opener parent, and recent events
      const candidateEvents = new Map<string, ActivityEvent>();
      if (thread.events[0]) candidateEvents.set(thread.events[0].id, thread.events[0]);
      for (const se of thread.events.filter(e => e.searchQuery)) candidateEvents.set(se.id, se);
      if (event.openerTabId) {
        const parent = thread.events.find(e => e.tabId === event.openerTabId);
        if (parent) candidateEvents.set(parent.id, parent);
      }
      for (const re of thread.events.slice(-4)) candidateEvents.set(re.id, re);

      for (const pastEvent of candidateEvents.values()) {
        const sim = computeEventSimilarity(event, pastEvent);
        if (sim.totalScore > highestScore) {
          highestScore = sim.totalScore;
          bestThread = thread;
        }
      }

      // Contextual bridge bonus: if this thread owns the active search session
      if (bridgedThread && bridgedThread.id === thread.id && isRecent) {
        const bridgeScore = 0.52 + (sharedWithThread.length * 0.08);
        if (bridgeScore > highestScore) {
          highestScore = Math.min(0.95, bridgeScore);
          bestThread = thread;
        }
      }

      // Direct thread title overlap
      const threadTitleTokens = extractTitleKeywords(thread.title);
      const titleOverlap = computeOverlapScore(allTokens, threadTitleTokens);
      const isShortGap = timeDiff <= 30 * 60 * 1000;

      if (hasTopicEvidence(titleOverlap.sharedTokens) && titleOverlap.score >= 0.40 && (isShortGap || sharedWithThread.length >= 2 || titleOverlap.score >= 0.55)) {
        const titleScore = 0.48 + (titleOverlap.score * 0.35);
        if (titleScore > highestScore) {
          highestScore = Math.min(0.95, titleScore);
          bestThread = thread;
        }
      }

      // Distinctive keyword matching:
      // Require 2+ shared keywords for general multi-hour clustering, or 1 distinctive keyword within immediate session (30 mins)
      const distinctiveShared = sharedWithThread.filter(t => hasTopicEvidence([t]));
      if (sharedWithThread.length >= 2 && isRecent) {
        const keywordScore = 0.45 + (sharedWithThread.length * 0.08);
        if (keywordScore > highestScore) {
          highestScore = Math.min(0.95, keywordScore);
          bestThread = thread;
        }
      } else if (distinctiveShared.length >= 1 && isShortGap) {
        const singleScore = 0.42 + (distinctiveShared.length * 0.08);
        if (singleScore > highestScore) {
          highestScore = Math.min(0.85, singleScore);
          bestThread = thread;
        }
      }
    }

    if (bestThread && highestScore >= CLUSTER_THRESHOLD) {
      if (event.searchQuery) {
        this.recordSearchSession(event, bestThread.id);
      }
      // Append event to matched thread
      return this.addEventToThread(bestThread, event, highestScore);
    } else {
      // Create new IntentThread
      const newThread = this.createNewThread(event);
      if (event.searchQuery && newThread) {
        this.recordSearchSession(event, newThread.id);
      }
      return newThread;
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

    // Incremental milestone and evidence derivation (recompute periodically or on initial events)
    const processedCount = (this.processedCounts.get(thread.id) ?? thread.events.length) + 1;
    this.processedCounts.set(thread.id, processedCount);

    // Dynamic title: allow generic initial titles to upgrade, while strictly preserving manual corrections
    const hasManualTitle = thread.isManualCorrection;
    const isGenericTitle = !thread.title || thread.title === 'New Browsing Intent' || thread.title.startsWith('Research on ');
    const titleInfo = (hasManualTitle || (!isGenericTitle && processedCount > 3))
      ? { title: thread.title, summary: thread.summary }
      : deriveThreadTitle(updatedEvents, hasManualTitle ? thread.title : undefined);

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
