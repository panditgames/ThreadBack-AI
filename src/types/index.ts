export type ThreadStatus = 'ACTIVE' | 'PAUSED' | 'LIKELY_COMPLETE' | 'ARCHIVED';

export type ConfidenceQualifier = 'Likely' | 'Possibly' | 'Inferred from browsing activity';

export type ActivityEventType = 
  | 'navigation' 
  | 'tab_opened' 
  | 'tab_activated' 
  | 'tab_closed' 
  | 'history_import';

export interface ActivityEvent {
  id: string;
  tabId?: number;
  windowId?: number;
  openerTabId?: number;
  url: string;
  title: string;
  domain: string;
  pathname: string;
  searchQuery?: string;
  searchEngine?: string;
  timestamp: number;
  eventType: ActivityEventType;
  isInternalBrowserPage: boolean;
}

export interface TabReference {
  id: string;
  tabId?: number;
  windowId?: number;
  url: string;
  title: string;
  domain: string;
  searchQuery?: string;
  lastAccessed: number;
  isClosed: boolean;
  openerTabId?: number;
  order: number;
}

export interface IntentStep {
  id: string;
  title: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'LIKELY_REMAINING';
  confidence: ConfidenceQualifier;
  evidence: string[];
  url?: string;
  timestamp?: number;
}

export interface InferredNextAction {
  actionText: string;
  confidence: ConfidenceQualifier;
  rationale: string;
  suggestedUrl?: string;
  suggestedTabId?: number;
}

export interface ClusterEvidence {
  sharedKeywords: string[];
  primaryDomains: string[];
  searchQueries: string[];
  timeSpanMinutes: number;
  temporalContinuityScore: number;
  domainSimilarityScore: number;
  querySimilarityScore: number;
  titleSimilarityScore: number;
  openerRelationshipFound: boolean;
  explanationPoints: string[];
}

export interface IntentGraphNode {
  id: string;
  label: string;
  type: 'goal' | 'completed_step' | 'current_step' | 'remaining_step';
  evidence: string[];
  url?: string;
  timestamp?: number;
}

export interface IntentGraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface IntentGraph {
  goal: string;
  nodes: IntentGraphNode[];
  edges: IntentGraphEdge[];
}

export interface IntentThread {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  status: ThreadStatus;
  confidence: number; // 0.0 to 1.0
  tabs: TabReference[];
  events: ActivityEvent[];
  keywords: string[];
  completedSteps: IntentStep[];
  unfinishedSteps: IntentStep[];
  nextAction: InferredNextAction;
  evidence: ClusterEvidence;
  isManualCorrection?: boolean;
  isDemo?: boolean;
  lastInterruptionTimestamp?: number;
}

export interface InterruptionBriefing {
  threadId: string;
  threadTitle: string;
  inactiveDurationMs: number;
  inactiveTimeFormatted: string;
  lastObservedAction: string;
  likelyCompleted: string[];
  likelyRemaining: string[];
  nextAction: string;
  tabsToRestore: TabReference[];
}

export interface PrivacySettings {
  allowPageContentAnalysis: boolean;
  autoPurgeDays: number;
  excludedDomains: string[];
}

export interface AISettings {
  enabled: boolean;
  provider: 'gemini' | 'groq' | 'openai' | 'local_heuristic';
  apiKey?: string;
  modelName?: string;
  customEndpoint?: string;
}

export interface ThreadBackStorageData {
  version: number;
  threads: Record<string, IntentThread>;
  events: ActivityEvent[];
  activeThreadId?: string;
  privacy: PrivacySettings;
  aiSettings: AISettings;
  lastProcessedTimestamp: number;
}
