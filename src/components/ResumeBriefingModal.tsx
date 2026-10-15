import { useModalAccessibility } from '../ui/useModalAccessibility';
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
  const modalRef = useModalAccessibility(briefing != null, onClose);
  if (!briefing) return null;

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Resume briefing" tabIndex={-1} className="modal-panel max-w-xl">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-teal via-brand-teal to-brand-teal" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-brand-teal font-mono font-semibold">
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
           aria-label="Close dialog">
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
              <CircleDot className="w-4 h-4 text-brand-teal flex-shrink-0" />
              <span>{briefing.lastObservedAction}</span>
            </div>
          </div>

          {/* Likely Completed vs Remaining */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Completed */}
            <div className="bg-dark-surface/50 border border-dark-border rounded-xl p-3.5">
              <div className="text-xs text-brand-teal font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Likely Completed
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.likelyCompleted.length > 0 ? (
                  briefing.likelyCompleted.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-brand-teal font-bold">✓</span>
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
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Likely Remaining
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.likelyRemaining.length > 0 ? (
                  briefing.likelyRemaining.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold">•</span>
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
          <div className="bg-dark-surface/50 border border-brand-teal/40 rounded-xl p-4">
            <div className="text-xs text-brand-teal font-mono uppercase tracking-wider font-semibold mb-1">
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
                className="text-brand-teal hover:underline flex items-center gap-1"
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
            className="action-primary"
          >
            Continue Task
          </button>
        </div>
      </div>
    </div>
  );
};
