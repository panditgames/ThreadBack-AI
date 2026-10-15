import React, { useState } from 'react';
import { 
  Archive, 
  Check, 
  CheckCircle2, 
  Clock,
  GitBranch,
  HelpCircle,
  MoreVertical, 
  Pencil, 
  Play, 
  Sparkles, 
  Split, 
  Trash2 
} from 'lucide-react';
import { formatTimeDifference } from '../engine/interruption';
import { IntentThread, ThreadStatus } from '../types';

interface TaskCardProps {
  thread: IntentThread;
  onResume: (thread: IntentThread) => void;
  onWhy: (thread: IntentThread) => void;
  onGraph: (thread: IntentThread) => void;
  onTimeline: (thread: IntentThread) => void;
  onRename: (threadId: string, newTitle: string) => void;
  onSetStatus: (threadId: string, status: ThreadStatus) => void;
  onDelete: (threadId: string) => void;
  onSplit: (thread: IntentThread) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  thread,
  onResume,
  onWhy,
  onGraph,
  onTimeline,
  onRename,
  onSetStatus,
  onDelete,
  onSplit,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(thread.title);
  const [showMenu, setShowMenu] = useState(false);

  const timeAgo = formatTimeDifference(Date.now() - (thread.updatedAt || thread.createdAt));

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedTitle.trim() && editedTitle !== thread.title) {
      onRename(thread.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const getStatusBadge = () => {
    switch (thread.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
            Active
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-amber/15 text-brand-amber border border-brand-amber/30">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber" />
            Paused
          </span>
        );
      case 'LIKELY_COMPLETE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-indigo/20 text-brand-indigo border border-brand-indigo/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between group">
      {/* Top subtle highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent group-hover:via-brand-cyan/60 transition duration-300" />

      {/* Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge()}
              {thread.isDemo && (
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                  Demo Data
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {timeAgo}
              </span>
            </div>

            {/* Editable Title */}
            {isEditingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  className="bg-slate-800 text-white font-bold text-base px-2.5 py-1 rounded-lg border border-brand-cyan focus:outline-none w-full"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 rounded-md bg-brand-cyan text-slate-950 hover:bg-brand-cyan/90 transition"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h3 className="text-base font-bold text-white truncate hover:text-brand-cyan transition">
                  {thread.title}
                </h3>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-white transition"
                  title="Rename Intent"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Context Menu Dropdown */}
          <div className="relative">
            <button
              aria-label="Task actions"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div 
                className="absolute right-0 top-8 z-30 w-44 bg-dark-card border border-dark-border rounded-xl shadow-2xl p-1.5 space-y-0.5 text-xs text-slate-200 animate-in fade-in"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => {
                    setIsEditingTitle(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" /> Rename
                </button>
                <button
                  onClick={() => {
                    onSplit(thread);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                >
                  <Split className="w-3.5 h-3.5 text-brand-purple" /> Split Tabs
                </button>
                <button
                  onClick={() => {
                    onSetStatus(thread.id, thread.status === 'LIKELY_COMPLETE' ? 'ACTIVE' : 'LIKELY_COMPLETE');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" /> 
                  {thread.status === 'LIKELY_COMPLETE' ? 'Mark Active' : 'Mark Complete'}
                </button>
                <button
                  onClick={() => {
                    onSetStatus(thread.id, thread.status === 'ARCHIVED' ? 'PAUSED' : 'ARCHIVED');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                >
                  <Archive className="w-3.5 h-3.5 text-slate-400" /> 
                  {thread.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                </button>
                <div className="border-t border-slate-700/50 my-1" />
                <button
                  onClick={() => {
                    onDelete(thread.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-red-950/40 text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Thread
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-400 mb-3.5 line-clamp-2 leading-relaxed">
          {thread.summary}
        </p>

        {/* Milestone lists */}
        <div className="space-y-2 mb-4 bg-dark-surface/40 border border-dark-border/60 rounded-xl p-3">
          {/* Completed */}
          {thread.completedSteps.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-brand-emerald font-semibold mb-1">
                Likely Completed
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {thread.completedSteps.slice(0, 2).map((s, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="text-brand-emerald font-bold">✓</span>
                    <span className="truncate">{s.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Remaining */}
          {thread.unfinishedSteps.length > 0 && (
            <div className={thread.completedSteps.length > 0 ? 'pt-2 border-t border-slate-800' : ''}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-brand-amber font-semibold mb-1">
                Likely Remaining
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {thread.unfinishedSteps.slice(0, 2).map((s, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="text-brand-amber font-bold">•</span>
                    <span className="truncate">{s.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Next Action Box */}
        {thread.nextAction && (
          <div className="bg-brand-cyan/10 border border-brand-cyan/30 rounded-xl p-2.5 mb-4">
            <div className="text-[10px] uppercase font-mono tracking-wider text-brand-cyan font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Next Likely Step
            </div>
            <div className="text-xs font-semibold text-white mt-0.5 line-clamp-2">
              {thread.nextAction.actionText}
            </div>
          </div>
        )}

        {/* Tab & Domain Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-xs text-slate-400 font-mono mr-1">
            {thread.tabs.length} tabs:
          </span>
          {thread.tabs.slice(0, 3).map((tab, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700 truncate max-w-[120px]"
              title={tab.title}
            >
              {tab.domain}
            </span>
          ))}
          {thread.tabs.length > 3 && (
            <span className="text-[11px] text-slate-400 font-mono">
              +{thread.tabs.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-dark-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onWhy(thread)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1"
            title="Why were these tabs grouped?"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-indigo" />
            Why?
          </button>

          <button
            onClick={() => onGraph(thread)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1"
            title="Inspect Intent Graph"
          >
            <GitBranch className="w-3.5 h-3.5 text-brand-purple" />
            Graph
          </button>

          <button
            onClick={() => onTimeline(thread)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1"
            title="View chronological timeline"
          >
            <Clock className="w-3.5 h-3.5 text-brand-cyan" />
            Timeline
          </button>
        </div>

        {/* Hero Resume Task Button */}
        <button
          onClick={() => onResume(thread)}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-indigo hover:opacity-95 text-slate-950 font-bold text-xs transition shadow-md shadow-brand-cyan/20 flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Resume Task
        </button>
      </div>
    </div>
  );
};
