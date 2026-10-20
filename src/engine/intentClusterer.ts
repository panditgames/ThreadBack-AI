import { ActivityEvent, IntentManagerAction, IntentStep, IntentThread, TabReference, ThreadStatus } from '../types';
import { extractQueryKeywords, extractTitleKeywords } from './keywords';
import { inferNextAction } from './nextActionInferer';
import { inferThreadStatus, hasCompletionEvidence } from './statusInferer';
import { parseUrl } from './urlParser';
import { generateWhyExplanation } from './whyExplainer';
import { PAGE_THRESHOLD, CANDIDATE_MARGIN, decideSemanticAssignment, representativePages } from './ai/semanticAssignment';
import { workflowDocument, taskRelationship, strongTaskRelationship, divergentGroups, intentRevision } from './ai/continuousIntent';
import {
  computeCosineSimilarity,
  generateEmbedding,
  formatPageMetadata,
  centroidOf,
  isValidEmbedding,
  EMBEDDING_VERSION,
} from './ai/localEmbedder';

export const CLUSTER_THRESHOLD = PAGE_THRESHOLD;

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


export class IntentEngine {
  private threads: Map<string, IntentThread> = new Map();
  private processedCounts = new Map<string, number>();
  private changedIntents = new Set<string>();
  private reconciliationCursor = 0;
  private eventQueue: Promise<unknown> = Promise.resolve();

  constructor(initialThreads?: IntentThread[]) {
    if (initialThreads) {
      for (const t of initialThreads) {
        this.threads.set(t.id, t);
      }
    }
    this.pruneLatentThreads();
  }

  public static readonly MAX_LATENT_CANDIDATES = 50;
  public static readonly LATENT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  public getThreads(): IntentThread[] {
    return Array.from(this.threads.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getActiveThreads(): IntentThread[] {
    return this.getThreads().filter(t => !t.isLatent);
  }

  public getLatentThreads(): IntentThread[] {
    return this.getThreads().filter(t => !!t.isLatent);
  }

  public promoteLatentThread(threadId: string): IntentThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    const promoted: IntentThread = {
      ...thread,
      isLatent: false,
      latentPromotionReason: 'MANUAL',
      updatedAt: Date.now(),
    };
    this.threads.set(threadId, promoted);
    this.changedIntents.add(threadId);
    return promoted;
  }

  public pruneLatentThreads(
    maxAgeMs = IntentEngine.LATENT_EXPIRATION_MS,
    maxCount = IntentEngine.MAX_LATENT_CANDIDATES,
    now = Date.now()
  ): void {
    for (const thread of Array.from(this.threads.values())) {
      if (thread.isLatent && thread.status !== 'LIKELY_COMPLETE' && thread.status !== 'ARCHIVED' && (now - thread.updatedAt > (thread.tabs.every(tab => tab.isClosed) ? Math.min(maxAgeMs, 6 * 60 * 60 * 1000) : maxAgeMs))) {
        this.deleteThread(thread.id);
        this.processedCounts.delete(thread.id);
      }
    }

    const latentThreads = Array.from(this.threads.values())
      .filter(t => !!t.isLatent && t.status !== 'LIKELY_COMPLETE' && t.status !== 'ARCHIVED')
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (latentThreads.length > maxCount) {
      const toEvict = latentThreads.slice(maxCount);
      for (const t of toEvict) {
        this.deleteThread(t.id);
        this.processedCounts.delete(t.id);
      }
    }
  }

  public getThread(id: string): IntentThread | undefined {
    return this.threads.get(id);
  }

  public setThreads(threads: IntentThread[]): boolean {
    const structure=(thread:IntentThread)=>JSON.stringify([!!thread.isLatent,thread.tabs.map(tab=>[tab.url,tab.title,tab.isClosed])]);
    const changed=threads.filter(thread=>!this.threads.has(thread.id) || structure(thread)!==structure(this.threads.get(thread.id)!));
    for(const thread of changed)this.changedIntents.add(thread.id);
    this.threads.clear();
    for (const id of this.processedCounts.keys()) {
      if (!threads.some(thread => thread.id === id)) this.processedCounts.delete(id);
    }
    for (const t of threads) {
      this.threads.set(t.id, t);
    }
    this.pruneLatentThreads();
    return changed.length>0;
  }

  public static readonly JOIN_THRESHOLD = CLUSTER_THRESHOLD;

  /**
   * Process a single ActivityEvent using the local AI embedding model as the primary decision engine.
   * Every new page/tab segregation decision is evaluated primarily by the local BGE model.
   */
  public processEvent(event: ActivityEvent): Promise<IntentThread | null> {
    const result = this.eventQueue.then(async () => {
      const url=typeof event.url==='string'?event.url.split('#')[0]:'';
      let known:TabReference|undefined;
      for(const thread of this.threads.values()){known=thread.tabs.find(tab=>tab.url.split('#')[0]===url);if(known)break;}
      const title=typeof event.title==='string'?event.title.slice(0,1000):'';
      const newMetadata=!known || (event.eventType!=='tab_closed' && !!title && known.title!==title);
      const assigned = await this.assignEvent(event);
      if (!assigned || !this.threads.has(assigned.id)) return assigned;
      if(!newMetadata && !(event.eventType==='tab_closed' && assigned.tabs.every(tab=>tab.isClosed)))return assigned;
      this.changedIntents.add(assigned.id);
      await this.reconcileInternal([assigned.id], 1);
      return this.getThreads().find(thread => thread.events.some(item => item.id === event.id)) || this.getThread(assigned.id) || null;
    });
    this.eventQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async ensureCentroid(thread: IntentThread): Promise<number[]> {
    if (thread.embeddingModelVersion === EMBEDDING_VERSION &&
        isValidEmbedding(thread.centroidEmbedding) && thread.semanticPages?.length &&
        thread.semanticPages.length <= 5 && thread.semanticPages.every(page => isValidEmbedding(page.vector))) return thread.centroidEmbedding;
    // Bounded to max 5 representative entries; only observed metadata defines membership
    const pages: NonNullable<IntentThread['semanticPages']> = [];
    for (const tab of (thread.tabs.length <= 5 ? thread.tabs : [thread.tabs[0], ...thread.tabs.slice(-4)])) {
      if (!parseUrl(tab.url).isValid) continue;
      pages.push({ url: tab.url.split('#')[0], vector: await generateEmbedding(
        formatPageMetadata(tab)) });
    }
    thread.semanticPages = pages;
    thread.embeddingModelVersion = EMBEDDING_VERSION;
    thread.centroidEmbedding = centroidOf(pages.map(page => page.vector));
    return thread.centroidEmbedding;
  }

  private async assignEvent(event: ActivityEvent): Promise<IntentThread | null> {
    if (event.isInternalBrowserPage || !event.url || !parseUrl(event.url).isValid || !Number.isFinite(event.timestamp)) {
      return null;
    }

    this.pruneLatentThreads();
    const parsed = parseUrl(event.url);
    event = { ...event, title: typeof event.title === 'string' ? event.title.slice(0, 1000) : '',
      domain: parsed.domain, searchQuery: parsed.searchQuery };
    // Non-intent lifecycle: Route closure and repeated activation to their known page, without reclustering.
    for (const thread of this.threads.values()) {
      if (thread.events.some(e => e.id === event.id)) return thread;
      const knownTab = thread.tabs.find(t => t.url.split('#')[0] === event.url.split('#')[0]);
      if (knownTab) {
        // An incomplete singleton had no stable purpose yet. Re-evaluate its real title without losing old events.
        if (thread.isLatent && thread.status !== 'LIKELY_COMPLETE' && thread.status !== 'ARCHIVED' && thread.tabs.length === 1 && event.eventType !== 'tab_closed' &&
            event.title && knownTab.title !== event.title) {
          this.threads.delete(thread.id);
          const assigned = await this.assignEvent(event);
          if (!assigned) { this.threads.set(thread.id, thread); return thread; }
          if (assigned.isLatent) {
            this.threads.delete(assigned.id);
            assigned.id = thread.id; assigned.createdAt = thread.createdAt;
            assigned.events = [...new Map([...thread.events, ...assigned.events].map(e => [e.id, e])).values()]
              .sort((a, b) => a.timestamp - b.timestamp).slice(-100);
            assigned.evidence = generateWhyExplanation(assigned.events, assigned.tabs);
            this.threads.set(assigned.id, assigned);
            return assigned;
          }
          const pages = assigned.semanticPages;
          const centroid = assigned.centroidEmbedding;
          this.threads.set(thread.id, thread);
          const merged = this.mergeThreads(assigned.id, thread.id, false)!;
          merged.semanticPages = pages; merged.centroidEmbedding = centroid; merged.embeddingModelVersion = EMBEDDING_VERSION;
          this.threads.set(merged.id, merged);
          return merged;
        }
        if(thread.status==='ARCHIVED' && knownTab.isClosed && event.eventType!=='tab_closed')this.reactivate(thread);
        if (event.eventType !== 'tab_closed' && event.title && knownTab.title !== event.title) {
          thread.centroidEmbedding = undefined; thread.semanticPages = undefined; thread.embeddingModelVersion = undefined;
        }
        return this.addEventToThread(thread, event, thread.confidence);
      }
    }
    if (event.eventType === 'tab_closed') return null;

    // AI-FIRST CLUSTERING PATH:
    // 1. Extract SAFE metadata only: clean page title, domain, authentic search query.
    // ZERO body scraping, ZERO DOM extraction, ZERO cookies, ZERO passwords.
    const safeText = formatPageMetadata(event);

    // 2. Generate normalized 384-dimensional embedding via local quantized bge-small-en-v1.5
    let eventEmbedding: number[];
    try {
      eventEmbedding = await generateEmbedding(safeText);
    } catch {
      // Preserve the event without guessing membership when the local runtime fails.
      return this.createNewThread(event);
    }

    const available: IntentThread[] = [];
    for (const thread of this.threads.values()) {
      if (thread.isDemo) continue;
      try { await this.ensureCentroid(thread); available.push(thread); } catch { /* Retain unavailable state without guessing. */ }
    }
    const assignment = decideSemanticAssignment(eventEmbedding, available);
    const targetThread = assignment?.thread;
    const matchScore = assignment?.score || 0;

    if (targetThread) {
      const requiredThreshold=targetThread.status==='ARCHIVED'?0.74:IntentEngine.JOIN_THRESHOLD;
      if (targetThread.status === 'ARCHIVED') this.reactivate(targetThread);
      const cleanUrl = event.url.split('#')[0];
      const pages = targetThread.semanticPages ? [...targetThread.semanticPages] : [];
      const existingIndex = pages.findIndex(p => p.url === cleanUrl);
      if (existingIndex !== -1) {
        pages[existingIndex] = { url: cleanUrl, vector: eventEmbedding };
      } else {
        pages.push({ url: cleanUrl, vector: eventEmbedding });
      }
      targetThread.semanticPages = representativePages(pages);
      targetThread.centroidEmbedding = centroidOf(targetThread.semanticPages.map(page => page.vector));
      targetThread.embeddingModelVersion = EMBEDDING_VERSION;

      const updated = this.addEventToThread(
        targetThread,
        { ...event, semanticSimilarity: matchScore, semanticThreshold: requiredThreshold },
        matchScore
      );
      return updated;
    } else {
      // Create new IntentThread with initial centroid (starts as LATENT to avoid singleton clutter)
      const newThread = this.createNewThread(event, eventEmbedding);
      return newThread;
    }
  }

  /** Serialized, bounded background maintenance; no new browsing page is required. */
  public reconcileWorkspace(now = Date.now(), budget = 4): Promise<IntentManagerAction[]> {
    const result = this.eventQueue.then(() => this.reconcileInternal(undefined, Math.max(1,Math.min(8,budget)), now));
    this.eventQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private snapshot(thread: IntentThread): IntentThread {
    const copy = structuredClone(thread); delete copy.managerActions;
    delete copy.workflowEmbedding;delete copy.workflowDocumentKey;delete copy.centroidEmbedding;
    delete copy.semanticPages;delete copy.embeddingModelVersion;return copy;
  }

  private recordAction(kind: IntentManagerAction['kind'], before: IntentThread[], after: IntentThread[], reason: string,
    evidence?: Record<string,number>): IntentManagerAction {
    const action: IntentManagerAction = { id:'intent-action-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
      kind, timestamp:Date.now(), reason, evidence, before:before.map(thread=>this.snapshot(thread)),
      after:after.map(thread=>({id:thread.id,revision:intentRevision(thread)})) };
    const actionIds=[...new Map([...this.threads.values()].flatMap(thread=>thread.managerActions || []).concat(action).map(item=>[item.id,item])).values()]
      .reverse().sort((a,b)=>b.timestamp-a.timestamp).slice(0,8).map(item=>item.id);
    for(const thread of this.threads.values())thread.managerActions=(thread.managerActions || []).filter(item=>actionIds.includes(item.id));
    for(const thread of after) thread.managerActions=[...(thread.managerActions || []),action].slice(-5);
    return action;
  }

  private reactivate(thread: IntentThread): void {
    const before=this.snapshot(thread); thread.status='ACTIVE';
    this.recordAction('REACTIVATE',[before],[thread],'New observed activity returned to this saved intent.');
  }

  public undoManagerAction(threadId: string, actionId: string): boolean {
    const action=this.threads.get(threadId)?.managerActions?.find(item=>item.id===actionId);
    if(!action || action.undone || !action.before?.length || action.before.length>2 || !action.after?.length || action.after.length>2) return false;
    if(action.after.some(item=>!this.threads.has(item.id) || intentRevision(this.threads.get(item.id)!)!==item.revision))return false;
    const priorActions=[...new Map([...this.threads.values()].flatMap(thread=>thread.managerActions || []).map(item=>[item.id,item])).values()];
    for(const item of action.after)this.threads.delete(item.id);
    for(const prior of action.before){const restored=this.snapshot(prior);if(action.kind==='MERGE' || action.kind==='SPLIT')restored.preserveSemanticBoundary=true;
      if(action.kind==='RENAME')restored.managerNameHeld=true;
      restored.updatedAt=Date.now();
      restored.managerActions=[...priorActions.filter(item=>item.id!==action.id && item.after.some(after=>after.id===prior.id)),{...action,undone:true}].slice(-5);this.threads.set(restored.id,restored);this.changedIntents.delete(restored.id);}
    return true;
  }

  private async ensureWorkflow(thread: IntentThread): Promise<void> {
    await this.ensureCentroid(thread);
    const document=workflowDocument(thread), key=EMBEDDING_VERSION+'\n'+document;
    if(!document)throw Error('No observed workflow metadata');
    if(thread.workflowDocumentKey===key && isValidEmbedding(thread.workflowEmbedding))return;
    thread.workflowEmbedding=await generateEmbedding(document); thread.workflowDocumentKey=key;
  }

  private async reconcileLatent(thread: IntentThread): Promise<IntentManagerAction[]> {
    await this.ensureCentroid(thread);
    const nearby=this.getLatentThreads().filter(other=>other.id!==thread.id && other.status!=='ARCHIVED' && other.status!=='LIKELY_COMPLETE' && !other.preserveSemanticBoundary && isValidEmbedding(other.centroidEmbedding))
      .map(other=>({other,score:computeCosineSimilarity(thread.centroidEmbedding!,other.centroidEmbedding!)})).sort((a,b)=>b.score-a.score);
    const best=nearby[0];
    if(!best || best.score<PAGE_THRESHOLD || (nearby[1] && best.score-nearby[1].score<CANDIDATE_MARGIN))return [];
    const first=thread.createdAt<=best.other.createdAt?thread:best.other,second=first===thread?best.other:thread;
    const pages=representativePages([...(first.semanticPages || []),...(second.semanticPages || [])]);
    const hypothesis:IntentThread={...thread,isLatent:false,workflowEmbedding:undefined,workflowDocumentKey:undefined,
      tabs:[...new Map([...first.tabs,...second.tabs].map(tab=>[tab.url.split('#')[0],tab])).values()],
      semanticPages:pages,centroidEmbedding:centroidOf(pages.map(page=>page.vector)),embeddingModelVersion:EMBEDDING_VERSION};
    await this.ensureWorkflow(hypothesis);
    // A page-level tie does not authorize a join. Require independent multi-page workflow corroboration.
    const candidates=this.getThreads().filter(other=>!other.isLatent && !other.isDemo && other.status!=='ARCHIVED' &&
      other.status!=='LIKELY_COMPLETE' && isValidEmbedding(other.centroidEmbedding))
      .map(other=>({other,score:computeCosineSimilarity(hypothesis.centroidEmbedding!,other.centroidEmbedding!)}))
      .filter(item=>item.score>=0.60).sort((a,b)=>b.score-a.score).slice(0,6);
    const matches=[];
    for(const {other}of candidates){await this.ensureWorkflow(other);const evidence=taskRelationship(hypothesis,other);if(evidence)matches.push(evidence);}
    matches.sort((a,b)=>b.agreement-a.agreement);
    if(!matches[0] || !strongTaskRelationship(matches[0]) || (matches[1] && matches[0].agreement-matches[1].agreement<CANDIDATE_MARGIN))return [];
    const before=[this.snapshot(thread),this.snapshot(best.other)];
    const promoted=this.mergeThreads(first.id,second.id,false)!;
    promoted.semanticPages=pages;promoted.centroidEmbedding=hypothesis.centroidEmbedding;
    promoted.embeddingModelVersion=EMBEDDING_VERSION;promoted.workflowEmbedding=hypothesis.workflowEmbedding;promoted.workflowDocumentKey=hypothesis.workflowDocumentKey;
    const action=this.recordAction('MERGE',before,[promoted],'Latent continuation is corroborated by strong multi-page BGE workflow evidence.',matches[0]);
    return [action,...await this.reconcileInternal([promoted.id],1)];
  }

  private async reconcileInternal(ids?: string[], budget=4, now=Date.now()): Promise<IntentManagerAction[]> {
    this.pruneLatentThreads(undefined, undefined, now);
    const actions:IntentManagerAction[]=[];
    const all=this.getThreads().filter(thread=>!thread.isDemo);
    // Lifecycle checks are cheap and never remove established tasks.
    for(const thread of all){
      if(thread.isLatent || thread.status==='ARCHIVED' || !thread.tabs.length || thread.tabs.some(tab=>!tab.isClosed))continue;
      const last=Math.max(thread.updatedAt,...thread.tabs.map(tab=>tab.lastAccessed));
      const retention=(thread.status==='LIKELY_COMPLETE'?7:30)*86400000;
      if(now-last>=retention){const before=this.snapshot(thread);thread.status='ARCHIVED';
        actions.push(this.recordAction('ARCHIVE',[before],[thread],'All observed tabs are closed and the intent has had no activity beyond its retention window.'));}
    }
    const promoted=all.filter(thread=>thread.status!=='ARCHIVED' && thread.status!=='LIKELY_COMPLETE');
    const rotating=promoted.length ? promoted.slice(this.reconciliationCursor).concat(promoted.slice(0,this.reconciliationCursor)) : [];
    const selected=ids || [...new Set([...this.changedIntents,...rotating.map(thread=>thread.id)])];
    this.reconciliationCursor=promoted.length ? (this.reconciliationCursor+budget)%promoted.length : 0;
    for(const id of selected.slice(0,budget)){
      this.changedIntents.delete(id);
      let thread=this.threads.get(id);
      if(!thread || thread.isDemo || thread.status==='ARCHIVED' || thread.status==='LIKELY_COMPLETE')continue;
      try{
        if(thread.isLatent){actions.push(...await this.reconcileLatent(thread));continue;}
        await this.ensureWorkflow(thread);
        const groups=divergentGroups(thread);
        if(groups){const before=this.snapshot(thread);const split=this.splitTabsFromThread(thread.id,groups[1]);
          if(split){split.sourceThread.isManualCorrection=before.isManualCorrection;split.newThread.isManualCorrection=false;
            split.sourceThread.preserveSemanticBoundary=false;split.newThread.preserveSemanticBoundary=false;
            actions.push(this.recordAction('SPLIT',[before],[split.sourceThread,split.newThread],
              'Two multi-page BGE clusters have strong internal support and weak cross-cluster similarity.'));
            this.changedIntents.add(split.sourceThread.id);this.changedIntents.add(split.newThread.id);continue;}}
        // Cheap model-vector prefilter over all saved workflows; only six documents need full comparison.
        const candidates=this.getThreads().filter(other=>other.id!==id && !other.isLatent && !other.isDemo &&
          other.status!=='ARCHIVED' && other.status!=='LIKELY_COMPLETE' && !other.preserveSemanticBoundary &&
          isValidEmbedding(other.centroidEmbedding))
          .map(other=>({other,score:computeCosineSimilarity(thread!.centroidEmbedding!,other.centroidEmbedding!)}))
          .filter(item=>item.score>=0.60).sort((a,b)=>b.score-a.score).slice(0,6);
        const matches=[];
        for(const {other} of candidates){await this.ensureWorkflow(other);const evidence=taskRelationship(thread,other);
          if(evidence)matches.push({other,evidence});}
        matches.sort((a,b)=>b.evidence.agreement-a.evidence.agreement);
        if(matches[0] && strongTaskRelationship(matches[0].evidence) && (!matches[1] || matches[0].evidence.agreement-matches[1].evidence.agreement>=CANDIDATE_MARGIN)){
          const other=matches[0].other; const older=thread.createdAt<=other.createdAt?thread:other;
          const newer=older===thread?other:thread;const before=[this.snapshot(older),this.snapshot(newer)];
          const pages=representativePages([...(older.semanticPages || []),...(newer.semanticPages || [])]);
          const merged=this.mergeThreads(older.id,newer.id,false)!;merged.semanticPages=pages;
          merged.centroidEmbedding=centroidOf(pages.map(page=>page.vector));merged.embeddingModelVersion=EMBEDDING_VERSION;
          actions.push(this.recordAction('MERGE',before,[merged],'Strong BGE workflow agreement corroborated by multiple member pages.',matches[0].evidence));
          thread=merged;await this.ensureWorkflow(thread);
        }
        // Naming is downstream only: select an actually observed title closest to the task document.
        if(!ids && !thread.managerNameHeld && !thread.isManualCorrection && !thread.preserveSemanticBoundary){
          const best=(thread.semanticPages || []).map(page=>({page,score:computeCosineSimilarity(page.vector,thread!.workflowEmbedding!)}))
            .sort((a,b)=>b.score-a.score)[0];
          const tab=thread.tabs.find(tab=>tab.url.split('#')[0]===best?.page.url);
          const title=tab ? formatPageMetadata(tab).slice(0,100) : '';
          if(title && title!==thread.title && (!best || best.score>=0.70)){
            const before=this.snapshot(thread);thread.title=title;thread.summary='Intent inferred from observed page metadata.';
            actions.push(this.recordAction('RENAME',[before],[thread],'A representative observed page now best summarizes the workflow.'));
          }
        }
      }catch{this.changedIntents.add(id); /* Failed local inference abstains and retries on a later bounded pass. */}
    }
    return actions;
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
        title: event.eventType === 'tab_closed' ? updatedTabs[existingTabIndex].title : (event.title || updatedTabs[existingTabIndex].title),
        lastAccessed: event.timestamp,
        isClosed: event.eventType === 'tab_closed',
      };
    } else if (event.eventType !== 'tab_closed') {
      updatedTabs.push({
        id: `tab-${event.tabId || Math.random().toString(36).slice(2, 8)}`,
        tabId: event.tabId,
        windowId: event.windowId,
        url: event.url,
        title: event.title || '',
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

    const isNowPromoted = thread.isLatent && (
      new Set(updatedTabs.map(tab => tab.url.split('#')[0])).size > 1 ||
      thread.latentPromotionReason === 'MULTI_TAB_MATCH'
    );
    const isLatent = isNowPromoted ? false : (thread.isLatent ?? (updatedTabs.length <= 1));
    const latentPromotionReason = isNowPromoted
      ? (thread.latentPromotionReason || (updatedTabs.length > 1 ? 'MULTI_TAB_MATCH' : 'SUBSEQUENT_NAVIGATION'))
      : thread.latentPromotionReason;

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
      isLatent,
      latentPromotionReason,
    };

    this.threads.set(updatedThread.id, updatedThread);
    return updatedThread;
  }

  private createNewThread(initialEvent: ActivityEvent, initialEmbedding?: number[]): IntentThread {
    this.pruneLatentThreads();

    const threadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const events = [initialEvent];
    const tabs: TabReference[] = [
      {
        id: `tab-${initialEvent.tabId || Math.random().toString(36).slice(2, 8)}`,
        tabId: initialEvent.tabId,
        windowId: initialEvent.windowId,
        url: initialEvent.url,
        title: initialEvent.title || '',
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
      centroidEmbedding: initialEmbedding,
      embeddingModelVersion: EMBEDDING_VERSION,
      semanticPages: initialEmbedding ? [{ url: initialEvent.url.split('#')[0], vector: initialEmbedding }] : [],
      isLatent: true,
      latentPromotionReason: initialEvent.searchQuery ? 'SEARCH_INTENT' : undefined,
    };

    this.threads.set(threadId, newThread);
    this.pruneLatentThreads();
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
      isLatent: false,
      latentPromotionReason: thread.isLatent ? 'MANUAL' : thread.latentPromotionReason,
      updatedAt: Date.now(),
    };
    this.threads.set(threadId, updated);
    return updated;
  }

  public deleteThread(threadId: string): boolean {
    for(const thread of this.threads.values()) thread.managerActions=(thread.managerActions || []).filter(action=>
      !action.before.some(prior=>prior.id===threadId) && !action.after.some(after=>after.id===threadId));
    this.changedIntents.delete(threadId);
    return this.threads.delete(threadId);
  }

  public mergeThreads(targetThreadId: string, sourceThreadId: string, manual = true): IntentThread | null {
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
      centroidEmbedding: undefined, semanticPages: undefined, embeddingModelVersion: undefined,
      isLatent: false, latentPromotionReason: manual ? 'MANUAL' : 'MULTI_TAB_MATCH',
      updatedAt: Date.now(),
      tabs: mergedTabs,
      events: mergedEvents,
      keywords: mergedKeywords,
      completedSteps,
      unfinishedSteps,
      nextAction,
      evidence,
      isManualCorrection: manual || target.isManualCorrection,
      preserveSemanticBoundary: manual ? false : target.preserveSemanticBoundary || source.preserveSemanticBoundary,
    };

    this.changedIntents.add(targetThreadId);
    this.threads.set(targetThreadId, mergedThread);
    this.threads.delete(sourceThreadId);
    this.processedCounts.delete(sourceThreadId);this.changedIntents.delete(sourceThreadId);
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
      preserveSemanticBoundary: true,
      centroidEmbedding: undefined, semanticPages: undefined, embeddingModelVersion: undefined,
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
      preserveSemanticBoundary: true,
      isLatent: false,
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

    this.changedIntents.add(sourceThreadId);this.changedIntents.add(newThreadId);
    this.threads.set(newThreadId, newThread);
    return { sourceThread: updatedSource, newThread };
  }
}
