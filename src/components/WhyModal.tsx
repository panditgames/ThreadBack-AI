import { useModalAccessibility } from '../ui/useModalAccessibility';
import React from 'react';
import { HelpCircle, Network, Search, Tag, Timer, X } from 'lucide-react';
import { IntentThread } from '../types';

interface WhyModalProps {
  thread: IntentThread | null;
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({ thread, onClose }) => {
  const modalRef = useModalAccessibility(thread != null, onClose);
  if (!thread) return null;

  const { evidence } = thread;

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Why was this grouped?" tabIndex={-1} className="modal-panel max-w-lg">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-teal to-brand-teal" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-brand-teal font-mono font-semibold">
                Clustering Rationale
              </span>
              <h2 className="text-lg font-bold text-white">
                Why was this grouped?
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

        <p className="text-xs text-slate-300 mb-4">
          New pages are compared by local BGE embeddings of observed metadata. The evidence below describes captured activity; keyword, domain and timing statistics do not decide membership.
        </p>

        {/* Evidence Points */}
        <div className="space-y-2.5 mb-5">
          {evidence.explanationPoints.map((point, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 bg-dark-surface/60 border border-dark-border rounded-xl p-3 text-sm text-slate-200"
            >
              <div className="w-2 h-2 rounded-full bg-brand-teal mt-1.5 flex-shrink-0" />
              <span>{point}</span>
            </div>
          ))}
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-5">
          <div className="bg-dark-surface/40 border border-dark-border rounded-lg p-2.5 flex items-center gap-2">
            <Timer className="w-4 h-4 text-brand-teal" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Time Span</div>
              <div className="font-semibold text-slate-200">{evidence.timeSpanMinutes} minutes</div>
            </div>
          </div>

          <div className="bg-dark-surface/40 border border-dark-border rounded-lg p-2.5 flex items-center gap-2">
            <Network className="w-4 h-4 text-brand-teal" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Domains</div>
              <div className="font-semibold text-slate-200">{evidence.primaryDomains.length} involved</div>
            </div>
          </div>

          <div className="bg-dark-surface/40 border border-dark-border rounded-lg p-2.5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-teal" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Top Keywords</div>
              <div className="font-semibold text-slate-200 truncate max-w-[130px]">
                {evidence.sharedKeywords.slice(0, 2).join(', ') || 'Contextual'}
              </div>
            </div>
          </div>

          <div className="bg-dark-surface/40 border border-dark-border rounded-lg p-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Query Bridge</div>
              <div className="font-semibold text-slate-200">
                {evidence.searchQueries.length > 0 ? 'Search observed' : 'No query captured'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-dark-border text-xs text-slate-400">
          <span>Evidence: <strong className="text-white">Local metadata inference</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
