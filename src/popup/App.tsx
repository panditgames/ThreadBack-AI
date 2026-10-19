import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  ExternalLink, 
  Pause, 
  Play, 
  Sparkles 
} from 'lucide-react';
import { ResumeBriefingModal } from '../components/ResumeBriefingModal';
import { createDemoDataset } from '../demo/demoDataset';
import { executeResumeTask, ResumeBriefingResult } from '../engine/resumeSelector';
import { storageManager } from '../storage/storageManager';
import { IntentThread, ThreadStatus } from '../types';

export const PopupApp: React.FC = () => {
  const [threads, setThreads] = useState<IntentThread[]>([]);
  const [activeThread, setActiveThread] = useState<IntentThread | null>(null);
  const [briefing, setBriefing] = useState<ResumeBriefingResult | null>(null);

  const loadData = async () => {
    try {
      const data = await storageManager.load();
      const allThreads = Object.values(data.threads);

      if (allThreads.length === 0 && data.lastProcessedTimestamp === 0) {
        const demo = createDemoDataset();
        await storageManager.saveThreads(demo);
        setThreads(demo);
        setActiveThread(demo[0]);
      } else {
        const sorted = allThreads.sort((a, b) => b.updatedAt - a.updatedAt);
        setThreads(sorted);
        const visibleSorted = sorted.filter(t => !t.isLatent);
        const currentActive = visibleSorted.find(t => t.status === 'ACTIVE') || visibleSorted[0];
        setActiveThread(currentActive || null);
      }
    } catch (err) {
      console.error('[ThreadBack Popup] Load error:', err);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = () => { void loadData(); };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleResume = async (thread: IntentThread) => {
    const brief = await executeResumeTask(thread, typeof chrome !== 'undefined' ? chrome.tabs : undefined);
    setBriefing(brief);
    
    // Update active status
    const updated = threads.map(t => t.id === thread.id ? { ...t, status: 'ACTIVE' as ThreadStatus } : t);
    setThreads(updated);
    setActiveThread(thread);
    await storageManager.saveThreads(updated);
  };

  const handleSetStatus = async (status: ThreadStatus) => {
    if (!activeThread) return;
    const updated = threads.map(t => t.id === activeThread.id ? { ...t, status } : t);
    setThreads(updated);
    setActiveThread({ ...activeThread, status });
    await storageManager.saveThreads(updated);
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/dashboard.html', '_blank');
    }
  };

  return (
    <div className="popup-shell text-slate-100 p-5 flex flex-col gap-5 justify-between">
      <div>
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="brand-mark w-7 h-7 text-sm">
              TB
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                ThreadBack AI
                <span className="text-[9px] px-1.5 py-0.2 bg-brand-teal/20 text-brand-teal rounded font-mono font-bold">
                  MV3
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Your work, in context</div>
            </div>
          </div>

          <button
            onClick={openDashboard}
            className="text-[11px] text-brand-teal hover:underline flex items-center gap-1 font-medium"
          >
            Dashboard <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Current Active Intent Card */}
        {activeThread ? (
          <div className="glass-panel rounded-2xl p-4 mb-3.5 border border-dark-border relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-brand-teal/20" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-brand-teal">
                Current Intent
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                activeThread.status === 'ACTIVE'
                  ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'
                  : 'bg-slate-400/20 text-slate-400 border border-slate-400/30'
              }`}>
                {activeThread.status}
              </span>
            </div>

            <h2 className="text-base font-bold text-white mb-1 leading-snug">
              {activeThread.title}
            </h2>

            <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">
              {activeThread.summary}
            </p>

            {/* Next Action Box */}
            {activeThread.nextAction && (
              <div className="bg-dark-surface/80 border border-dark-border rounded-xl p-2.5 mb-3 text-xs">
                <div className="text-[9px] uppercase font-mono text-brand-teal font-semibold flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3 h-3" /> Next Action ({activeThread.nextAction.confidence})
                </div>
                <div className="font-medium text-slate-200 text-[11px] line-clamp-2">
                  {activeThread.nextAction.actionText}
                </div>
              </div>
            )}

            {/* Tabs info */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between mb-3.5">
              <span>{activeThread.tabs.length} related tabs in context</span>
              <span className="font-mono text-brand-teal">{Math.round(activeThread.confidence * 100)}% match</span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => handleResume(activeThread)}
              className="action-primary w-full"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume Task Context
            </button>

            {/* Sub controls: Pause / Complete */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleSetStatus(activeThread.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition flex items-center justify-center gap-1"
              >
                <Pause className="w-3 h-3" />
                {activeThread.status === 'PAUSED' ? 'Resume Status' : 'Pause'}
              </button>

              <button
                onClick={() => handleSetStatus('LIKELY_COMPLETE')}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-brand-teal" />
                Complete
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 text-center mb-3.5">
            <div className="text-xs text-slate-400 mb-2">No active intent detected</div>
            <button
              onClick={async () => {
                const demo = createDemoDataset();
                setThreads(demo);
                setActiveThread(demo[0]);
                await storageManager.saveThreads(demo);
              }}
              className="action-primary"
            >
              Load Demo Intent
            </button>
          </div>
        )}

        {/* Other Recent Intents */}
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold mb-2">
            Recent threads
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {threads
              .filter(t => !t.isLatent && t.id !== activeThread?.id)
              .slice(0, 3)
              .map(thread => (
                <div
                  key={thread.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-dark-surface/50 border border-dark-border hover:border-slate-600 transition cursor-pointer"
                >
                  <button type="button" onClick={() => setActiveThread(thread)} aria-label={`Select ${thread.title}`} className="flex-1 min-w-0 mr-2 text-left">
                    <div className="text-xs font-semibold text-white truncate">
                      {thread.title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {thread.tabs.length} tabs • {thread.status}
                    </div>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleResume(thread);
                    }}
                    className="p-1 rounded-md bg-slate-800 hover:bg-brand-teal hover:text-slate-950 text-slate-300 transition"
                    title="Quick resume"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-dark-border flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
          <span>Local Engine Active</span>
        </div>
        <button
          onClick={openDashboard}
          className="text-slate-400 hover:text-white transition"
        >
          Open Full Dashboard →
        </button>
      </div>

      {/* Modal */}
      <ResumeBriefingModal
        briefing={briefing}
        onClose={() => setBriefing(null)}
      />
    </div>
  );
};
