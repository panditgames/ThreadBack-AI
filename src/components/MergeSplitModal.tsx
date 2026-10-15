import React, { useState } from 'react';
import { Check, Layers, Split, X } from 'lucide-react';
import { IntentThread } from '../types';

interface MergeSplitModalProps {
  sourceThread: IntentThread | null;
  allThreads: IntentThread[];
  onClose: () => void;
  onMerge: (targetThreadId: string, sourceThreadId: string) => Promise<void>;
  onSplit: (sourceThreadId: string, tabUrls: string[], newTitle: string) => Promise<void>;
}

export const MergeSplitModal: React.FC<MergeSplitModalProps> = ({
  sourceThread,
  allThreads,
  onClose,
  onMerge,
  onSplit,
}) => {
  const [mode, setMode] = useState<'split' | 'merge'>('split');
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  if (!sourceThread) return null;

  const toggleUrl = (url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUrls.length === 0) return;
    await onSplit(sourceThread.id, selectedUrls, newTitle.trim() || 'Split Task');
    onClose();
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTargetId) return;
    await onMerge(mergeTargetId, sourceThread.id);
    onClose();
  };

  const otherThreads = allThreads.filter(t => t.id !== sourceThread.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-dark-card border border-brand-purple/40 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple">
              {mode === 'split' ? <Split className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-brand-purple font-mono font-semibold">
                Refine Intent Threads
              </span>
              <h2 className="text-lg font-bold text-white">
                {sourceThread.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 mb-5 border border-slate-700/60">
          <button
            onClick={() => setMode('split')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'split' ? 'bg-brand-purple text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Split Tabs into New Thread
          </button>
          <button
            onClick={() => setMode('merge')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'merge' ? 'bg-brand-purple text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Merge into Another Thread
          </button>
        </div>

        {mode === 'split' ? (
          <form onSubmit={handleSplitSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                New Thread Title
              </label>
              <input
                type="text"
                placeholder="e.g. Compare Alternative Headphone Brand"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-brand-purple focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Select Tabs to Extract ({selectedUrls.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {sourceThread.tabs.map(tab => (
                  <div
                    key={tab.id}
                    onClick={() => toggleUrl(tab.url)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedUrls.includes(tab.url)
                        ? 'bg-brand-purple/20 border-brand-purple text-white'
                        : 'bg-dark-surface/60 border-dark-border text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedUrls.includes(tab.url) ? 'bg-brand-purple border-brand-purple text-white' : 'border-slate-600'
                    }`}>
                      {selectedUrls.includes(tab.url) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{tab.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{tab.domain}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedUrls.length === 0}
                className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-40 text-white font-semibold text-xs transition"
              >
                Extract Tabs
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMergeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Target Thread to Merge Into
              </label>
              {otherThreads.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-4">No other threads available to merge with.</div>
              ) : (
                <select
                  value={mergeTargetId}
                  onChange={e => setMergeTargetId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-brand-purple focus:outline-none"
                  required
                >
                  <option value="">Select target thread...</option>
                  {otherThreads.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.tabs.length} tabs)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!mergeTargetId}
                className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-40 text-white font-semibold text-xs transition"
              >
                Merge Threads
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
