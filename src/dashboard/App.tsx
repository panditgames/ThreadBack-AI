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

export const DashboardApp: React.FC = () => {
  const [threads, setThreads] = useState<IntentThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ThreadStatus>('ALL');
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

  // Filter & Search
  const filteredThreads = threads.filter(thread => {
    // Status filter
    if (statusFilter !== 'ALL' && thread.status !== statusFilter) {
      return false;
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
    <div className="min-h-screen bg-dark-bg text-slate-100 p-6 md:p-10 max-w-7xl mx-auto flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dark-border mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-indigo flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-brand-cyan/20">
              TB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">
                  ThreadBack AI
                </h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                  v1.0 • EurekaDev 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Remembers what you were trying to accomplish across browser tabs
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadDemoData}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
              title="Reset with deterministic judge demo dataset"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-purple" />
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
              className="px-3.5 py-1.5 rounded-xl bg-dark-surface hover:bg-slate-800 text-slate-200 border border-dark-border text-xs font-semibold transition flex items-center gap-1.5"
              title="Privacy & AI Settings"
            >
              <Shield className="w-3.5 h-3.5 text-brand-emerald" />
              Privacy Center
            </button>
          </div>
        </header>

        {/* Interruption Recovery Banner (Feature 6) */}
        {interruption && (
          <div className="mb-6 bg-gradient-to-r from-brand-cyan/15 via-brand-indigo/10 to-transparent border border-brand-cyan/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase font-mono tracking-wider text-brand-cyan font-bold">
                  Interruption Detected • You left this task {interruption.inactiveTimeFormatted}
                </div>
                <div className="text-base font-bold text-white mt-0.5">
                  {interruption.threadTitle}
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Last action: <strong className="text-white">{interruption.lastObservedAction}</strong></span>
                  <span>Next: <strong className="text-brand-cyan">{interruption.nextAction}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const target = threads.find(t => t.id === interruption.threadId);
                if (target) handleResumeTask(target);
              }}
              className="px-5 py-2 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-bold text-xs transition shadow-md shadow-brand-cyan/20 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume Context
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Search Box (Feature 9) */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search intent threads, tasks, keywords, domains..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan transition"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-xl bg-dark-card p-1 border border-dark-border text-xs">
            {(['ALL', 'ACTIVE', 'PAUSED', 'LIKELY_COMPLETE'] as const).map(filterKey => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === filterKey
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filterKey === 'ALL' ? 'All Tasks' : filterKey.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Task Cards (Feature 7) */}
        {filteredThreads.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center my-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              No matching intent threads
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery ? `No tasks found matching "${searchQuery}".` : 'Browse normally in tabs or click below to populate the interactive demo.'}
            </p>
            <button
              onClick={handleLoadDemoData}
              className="px-4 py-2 rounded-xl bg-brand-cyan text-slate-950 font-bold text-xs hover:opacity-90 transition"
            >
              Load Demo Intent Threads
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-dark-border/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-emerald" />
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
