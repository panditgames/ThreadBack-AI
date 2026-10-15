import React, { useEffect, useState } from 'react';
import { 
  GitBranch, 
  HelpCircle, 
  Play, 
  Search, 
  Sparkles 
} from 'lucide-react';
import { IntentGraphModal } from '../components/IntentGraphModal';
import { ResumeBriefingModal } from '../components/ResumeBriefingModal';
import { WhyModal } from '../components/WhyModal';
import { createDemoDataset } from '../demo/demoDataset';
import { executeResumeTask, ResumeBriefingResult } from '../engine/resumeSelector';
import { storageManager } from '../storage/storageManager';
import { IntentThread } from '../types';

export const SidepanelApp: React.FC = () => {
  const [threads, setThreads] = useState<IntentThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [briefing, setBriefing] = useState<ResumeBriefingResult | null>(null);
  const [selectedWhyThread, setSelectedWhyThread] = useState<IntentThread | null>(null);
  const [selectedGraphThread, setSelectedGraphThread] = useState<IntentThread | null>(null);

  const loadData = async () => {
    const data = await storageManager.load();
    let all = Object.values(data.threads);
    if (all.length === 0 && data.lastProcessedTimestamp === 0) {
      all = createDemoDataset();
      await storageManager.saveThreads(all);
    }
    setThreads(all.sort((a, b) => b.updatedAt - a.updatedAt));
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
    await storageManager.saveThreads(threads.map(t => t.id === thread.id ? { ...t, status: 'ACTIVE', updatedAt: Date.now() } : t));
  };

  const filtered = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-cyan to-brand-indigo flex items-center justify-center text-slate-950 font-black text-xs">
              TB
            </div>
            <div className="text-xs font-bold text-white">Side Panel Intent Feed</div>
          </div>
          <button
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              } else {
                window.open('/dashboard.html', '_blank');
              }
            }}
            className="text-[11px] text-brand-cyan hover:underline flex items-center gap-1"
          >
            Dashboard
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search intents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
        </div>

        {/* Thread list */}
        <div className="space-y-3">
          {filtered.map(thread => (
            <div
              key={thread.id}
              className="glass-panel rounded-xl p-3 border border-dark-border hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  thread.status === 'ACTIVE'
                    ? 'bg-brand-emerald/20 text-brand-emerald'
                    : 'bg-brand-amber/20 text-brand-amber'
                }`}>
                  {thread.status}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {thread.tabs.length} tabs
                </span>
              </div>

              <h3 className="text-xs font-bold text-white mb-1">
                {thread.title}
              </h3>

              {thread.nextAction && (
                <div className="text-[11px] text-slate-300 bg-dark-surface/60 rounded-lg p-2 mb-2 flex items-start gap-1.5">
                  <Sparkles className="w-3 h-3 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{thread.nextAction.actionText}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedWhyThread(thread)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Why?"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setSelectedGraphThread(thread)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Graph"
                  >
                    <GitBranch className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => handleResume(thread)}
                  className="px-3 py-1 rounded-lg bg-brand-cyan text-slate-950 font-bold text-[11px] hover:opacity-90 flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Resume
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-3 text-[10px] text-slate-500">
        ThreadBack AI • Side Panel
      </div>

      <ResumeBriefingModal briefing={briefing} onClose={() => setBriefing(null)} />
      <WhyModal thread={selectedWhyThread} onClose={() => setSelectedWhyThread(null)} />
      <IntentGraphModal thread={selectedGraphThread} onClose={() => setSelectedGraphThread(null)} />
    </div>
  );
};
