import React, { useEffect, useState } from 'react';
import { 
  AlertCircle, 
  HelpCircle, 
  Play, 
  RefreshCw, 
  Search, 
  Shield 
} from 'lucide-react';
import { IntentGraphModal } from '../components/IntentGraphModal';
import { MergeSplitModal } from '../components/MergeSplitModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { PrivacySettingsModal } from '../components/PrivacySettingsModal';
import { ResumeBriefingModal } from '../components/ResumeBriefingModal';
import { TaskCard } from '../components/TaskCard';
import { TimelineModal } from '../components/TimelineModal';
import { WhyModal } from '../components/WhyModal';
import { createDemoDataset } from '../demo/demoDataset';
import { IntentEngine } from '../engine/intentClusterer';
import { detectInterruption } from '../engine/interruption';
import { executeResumeTask, ResumeBriefingResult } from '../engine/resumeSelector';
import { 
  DEFAULT_AI_SETTINGS, 
  DEFAULT_PRIVACY_SETTINGS, 
  storageManager 
} from '../storage/storageManager';
import { AISettings, IntentThread, InterruptionBriefing, PrivacySettings, ThreadStatus } from '../types';

type DashboardFilter = 'ALL' | ThreadStatus | 'STANDALONE';

export const DashboardApp: React.FC = () => {
  const [threads, setThreads] = useState<IntentThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DashboardFilter>('ALL');
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [interruption, setInterruption] = useState<InterruptionBriefing | null>(null);

  // Modals state
  const [briefing, setBriefing] = useState<ResumeBriefingResult | null>(null);
  const [selectedWhyThread, setSelectedWhyThread] = useState<IntentThread | null>(null);
  const [selectedGraphThread, setSelectedGraphThread] = useState<IntentThread | null>(null);
  const [selectedTimelineThread, setSelectedTimelineThread] = useState<IntentThread | null>(null);
  const [selectedSplitThread, setSelectedSplitThread] = useState<IntentThread | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      const data = await storageManager.load();
      let loadedThreads = Object.values(data.threads);

      if (loadedThreads.length === 0 && data.lastProcessedTimestamp === 0) {
        // Load demo data if fresh install
        loadedThreads = createDemoDataset();
        await storageManager.saveThreads(loadedThreads);
        setIsOnboardingOpen(true);
      }

      setThreads(loadedThreads.sort((a, b) => b.updatedAt - a.updatedAt));
      setPrivacy(data.privacy || DEFAULT_PRIVACY_SETTINGS);
      setAiSettings(data.aiSettings || DEFAULT_AI_SETTINGS);

      // Check for prominent interrupted thread
      const pausedThread = loadedThreads.find(t => t.status === 'PAUSED');
      if (pausedThread) {
        const brief = detectInterruption(pausedThread);
        setInterruption(brief);
      }
    } catch (err) {
      console.error('[ThreadBack Dashboard] Load error:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to background updates
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const listener = (msg: any) => {
        if (msg.type === 'THREADS_UPDATED' && Array.isArray(msg.threads)) {
          setThreads(msg.threads);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }
  }, []);

  // Handlers
  const handleResumeTask = async (thread: IntentThread) => {
    const brief = await executeResumeTask(thread, typeof chrome !== 'undefined' ? chrome.tabs : undefined);
    
    // Update local thread status
    const updatedThreads = threads.map(t => 
      t.id === thread.id ? { ...t, status: 'ACTIVE' as ThreadStatus, updatedAt: Date.now() } : t
    );
    setThreads(updatedThreads);
    await storageManager.saveThreads(updatedThreads);
    
    setBriefing(brief);
    setInterruption(null);
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    const updated = threads.map(t => 
      t.id === threadId ? { ...t, title: newTitle, isManualCorrection: true, updatedAt: Date.now() } : t
    );
    setThreads(updated);
    await storageManager.saveThreads(updated);
  };

  const handleSetStatus = async (threadId: string, status: ThreadStatus) => {
    const updated = threads.map(t => 
      t.id === threadId ? { ...t, status, updatedAt: Date.now() } : t
    );
    setThreads(updated);
    await storageManager.saveThreads(updated);
  };

  const handleDeleteThread = async (threadId: string) => {
    if (confirm('Delete this intent thread?')) {
      const remaining = threads.filter(t => t.id !== threadId);
      setThreads(remaining);
      await storageManager.deleteThread(threadId);
      if (interruption?.threadId === threadId) {
        setInterruption(null);
      }
    }
  };

  const handleMergeThreads = async (targetThreadId: string, sourceThreadId: string) => {
    const engine = new IntentEngine(threads);
    if (!engine.mergeThreads(targetThreadId, sourceThreadId)) return;
    const updated = engine.getThreads();
    setThreads(updated);
    await storageManager.saveThreads(updated);
  };

  const handleSplitThread = async (sourceThreadId: string, tabUrls: string[], newTitle: string) => {
    const engine = new IntentEngine(threads);
    if (!engine.splitTabsFromThread(sourceThreadId, tabUrls, newTitle)) return;
    const updated = engine.getThreads();
    setThreads(updated);
    await storageManager.saveThreads(updated);
  };

  const handleLoadDemoData = async () => {
    const demo = createDemoDataset();
    setThreads(demo);
    await storageManager.saveThreads(demo);
    setInterruption(detectInterruption(demo[0]));
  };

  const handlePromoteLatent = async (threadId: string) => {
    const engine = new IntentEngine(threads);
    const promoted = engine.promoteLatentThread(threadId);
    if (!promoted) return;
    const updated = engine.getThreads();
    setThreads(updated);
    await storageManager.saveThreads(updated);
  };

  const latentCount = threads.filter(t => !!t.isLatent).length;

  // Filter & Search
  const filteredThreads = threads.filter(thread => {
    // If viewing STANDALONE filter, only show latent singleton tabs
    if (statusFilter === 'STANDALONE') {
      if (!thread.isLatent) return false;
    } else {
      // By default (ALL, ACTIVE, PAUSED, etc.), hide latent singleton noise unless user is actively searching
      if (thread.isLatent && !searchQuery.trim()) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && thread.status !== statusFilter) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = thread.title.toLowerCase().includes(q);
      const matchSummary = thread.summary.toLowerCase().includes(q);
      const matchKeywords = thread.keywords.some(k => k.toLowerCase().includes(q));
      const matchTabs = thread.tabs.some(t => t.title.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q));
      return matchTitle || matchSummary || matchKeywords || matchTabs;
    }
    return true;
  });

  return (
    <div className="min-h-screen text-slate-100 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-8 border-b border-dark-border/70 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="brand-mark w-11 h-11 text-sm">
              TB
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  ThreadBack AI
                </h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-dark-surface/70 text-slate-400 border border-dark-border">
                  EurekaDev 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Pick up where your thinking left off.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadDemoData}
              className="action-secondary border-brand-teal/25 text-brand-teal"
              title="Reset with deterministic judge demo dataset"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-teal" />
              Demo Data
            </button>

            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="How ThreadBack Works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="action-secondary"
              title="Privacy & AI Settings"
            >
              <Shield className="w-3.5 h-3.5 text-brand-teal" />
              Privacy Center
            </button>
          </div>
        </header>

        {/* Interruption Recovery Banner (Feature 6) */}
        {interruption && (
          <div className="mb-8 glass-panel border border-dark-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                  Ready when you are • Last active {interruption.inactiveTimeFormatted}
                </div>
                <div className="text-base font-bold text-white mt-0.5">
                  {interruption.threadTitle}
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Last action: <strong className="text-white">{interruption.lastObservedAction}</strong></span>
                  <span>Next: <strong className="text-brand-teal">{interruption.nextAction}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const target = threads.find(t => t.id === interruption.threadId);
                if (target) handleResumeTask(target);
              }}
              className="action-primary shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume Context
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-slate-200">Your intent threads</h2>
          <span className="text-[11px] text-slate-500">{filteredThreads.length} {filteredThreads.length === 1 ? 'thread' : 'threads'} in view</span>
        </div>
        {/* Search & Filter Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
          {/* Search Box (Feature 9) */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search intent threads, tasks, keywords, domains..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-teal transition"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-dark-card/70 p-1 border border-dark-border text-[11px]">
            {(['ALL', 'ACTIVE', 'PAUSED', 'LIKELY_COMPLETE', 'ARCHIVED'] as const).map(filterKey => (
              <button
                key={filterKey}
                aria-pressed={statusFilter === filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === filterKey
                    ? 'bg-brand-teal/10 text-brand-teal shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filterKey === 'ALL' ? 'All Tasks' : filterKey === 'LIKELY_COMPLETE' ? 'Completed' : filterKey === 'ARCHIVED' ? 'Archived' : filterKey === 'ACTIVE' ? 'Active' : 'Paused'}
              </button>
            ))}
            {latentCount > 0 && (
              <button
                aria-pressed={statusFilter === 'STANDALONE'}
                onClick={() => setStatusFilter(statusFilter === 'STANDALONE' ? 'ALL' : 'STANDALONE')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  statusFilter === 'STANDALONE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
                title="Isolated tabs awaiting a related tab to form an intent cluster"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Standalone Tabs ({latentCount})
              </button>
            )}
          </div>
        </div>

        {/* Grid of Task Cards (Feature 7) */}
        {filteredThreads.length === 0 ? (
          <div className="glass-panel rounded-2xl px-6 py-14 text-center my-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              No matching intent threads
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery ? `No tasks found matching "${searchQuery}".` : 'Your next task starts here. Browse normally, or explore three sample threads with demo data.'}
            </p>
            <button
              onClick={handleLoadDemoData}
              className="action-primary"
            >
              Load Demo Intent Threads
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredThreads.map(thread => (
              <TaskCard
                key={thread.id}
                thread={thread}
                onResume={handleResumeTask}
                onWhy={t => setSelectedWhyThread(t)}
                onGraph={t => setSelectedGraphThread(t)}
                onTimeline={t => setSelectedTimelineThread(t)}
                onRename={handleRenameThread}
                onSetStatus={handleSetStatus}
                onDelete={handleDeleteThread}
                onSplit={t => setSelectedSplitThread(t)}
                onPromote={handlePromoteLatent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-dark-border/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-teal" />
          <span>Local deterministic intent engine active</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          "Bookmarks remember URLs. ThreadBack remembers intentions."
        </div>
      </footer>

      {/* Modals */}
      <ResumeBriefingModal
        briefing={briefing}
        onClose={() => setBriefing(null)}
      />

      <WhyModal
        thread={selectedWhyThread}
        onClose={() => setSelectedWhyThread(null)}
      />

      <IntentGraphModal
        thread={selectedGraphThread}
        onClose={() => setSelectedGraphThread(null)}
      />

      <TimelineModal
        thread={selectedTimelineThread}
        onClose={() => setSelectedTimelineThread(null)}
      />

      <MergeSplitModal
        sourceThread={selectedSplitThread}
        allThreads={threads}
        onClose={() => setSelectedSplitThread(null)}
        onMerge={handleMergeThreads}
        onSplit={handleSplitThread}
      />

      <PrivacySettingsModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        privacy={privacy}
        aiSettings={aiSettings}
        onSavePrivacy={async p => {
          setPrivacy(p);
          await storageManager.savePrivacySettings(p);
        }}
        onSaveAI={async a => {
          setAiSettings(a);
          await storageManager.saveAISettings(a);
        }}
        onClearIntelligence={async () => {
          await storageManager.clearBrowsingIntelligence();
          setThreads([]);
          setInterruption(null);
        }}
        onClearAll={async () => {
          await storageManager.clearAllData();
          setPrivacy(DEFAULT_PRIVACY_SETTINGS);
          setAiSettings(DEFAULT_AI_SETTINGS);
          setThreads([]);
          setInterruption(null);
        }}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onTryDemo={handleLoadDemoData}
      />
    </div>
  );
};
