import React from 'react';
import { CheckCircle2, CircleDot, ExternalLink, Play, Sparkles, X } from 'lucide-react';
import { ResumeBriefingResult } from '../engine/resumeSelector';

interface ResumeBriefingModalProps {
  briefing: ResumeBriefingResult | null;
  onClose: () => void;
}

export const ResumeBriefingModal: React.FC<ResumeBriefingModalProps> = ({
  briefing,
  onClose,
}) => {
  if (!briefing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-dark-card border border-brand-cyan/30 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan via-brand-indigo to-brand-purple" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-brand-cyan font-mono font-semibold">
                  Task Resumed
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {briefing.confidence}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {briefing.workingOn}
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

        {/* Content Body */}
        <div className="space-y-4">
          {/* Last Observed Action */}
          <div className="bg-dark-surface/70 border border-dark-border rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">
              Last Observed Action
            </div>
            <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-brand-cyan flex-shrink-0" />
              <span>{briefing.lastObservedAction}</span>
            </div>
          </div>

          {/* Likely Completed vs Remaining */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Completed */}
            <div className="bg-dark-surface/50 border border-dark-border rounded-xl p-3.5">
              <div className="text-xs text-brand-emerald font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Likely Completed
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.likelyCompleted.length > 0 ? (
                  briefing.likelyCompleted.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-brand-emerald font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">No prior milestones recorded</li>
                )}
              </ul>
            </div>

            {/* Remaining */}
            <div className="bg-dark-surface/50 border border-dark-border rounded-xl p-3.5">
              <div className="text-xs text-brand-amber font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Likely Remaining
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.likelyRemaining.length > 0 ? (
                  briefing.likelyRemaining.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-brand-amber font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">Ready for completion</li>
                )}
              </ul>
            </div>
          </div>

          {/* Next Action Box */}
          <div className="bg-gradient-to-r from-brand-cyan/15 via-brand-indigo/15 to-transparent border border-brand-cyan/40 rounded-xl p-4">
            <div className="text-xs text-brand-cyan font-mono uppercase tracking-wider font-semibold mb-1">
              Suggested Next Action
            </div>
            <div className="text-base font-semibold text-white">
              {briefing.nextAction}
            </div>
          </div>

          {/* Restored Tabs info */}
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-dark-border">
            <span>
              Selected <strong className="text-slate-200">{briefing.restoredTabs.length}</strong> related tabs ({briefing.restoredTabCount} reopened from closed state)
            </span>
            {briefing.focusedTabUrl && (
              <a
                href={briefing.focusedTabUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-cyan hover:underline flex items-center gap-1"
              >
                Go to focused tab <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-indigo text-slate-950 font-semibold text-sm hover:opacity-95 transition shadow-lg shadow-brand-cyan/20"
          >
            Continue Task
          </button>
        </div>
      </div>
    </div>
  );
};
