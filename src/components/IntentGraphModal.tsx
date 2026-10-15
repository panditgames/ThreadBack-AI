import { useModalAccessibility } from '../ui/useModalAccessibility';
import React, { useState } from 'react';
import { ArrowDown, CheckCircle2, CircleDot, ExternalLink, GitBranch, Sparkles, Target, X } from 'lucide-react';
import { buildIntentGraph } from '../engine/graphBuilder';
import { IntentGraphNode, IntentThread } from '../types';

interface IntentGraphModalProps {
  thread: IntentThread | null;
  onClose: () => void;
}

export const IntentGraphModal: React.FC<IntentGraphModalProps> = ({ thread, onClose }) => {
  const [selectedNode, setSelectedNode] = useState<IntentGraphNode | null>(null);

  const modalRef = useModalAccessibility(thread != null, onClose);
  if (!thread) return null;

  const graph = buildIntentGraph(thread);

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Intent graph" tabIndex={-1} className="modal-panel max-w-2xl">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-teal via-brand-teal to-brand-teal" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-brand-teal font-mono font-semibold">
                Structured Intent Graph
              </span>
              <h2 className="text-lg font-bold text-white">
                {thread.title}
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

        <p className="text-xs text-slate-400 mb-4 flex-shrink-0">
          Milestones are inferred from page visits. Evidence links do not prove task completion.
        </p>

        {/* Graph Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {graph.nodes.map((node, index) => {
            const isLast = index === graph.nodes.length - 1;
            const isSelected = selectedNode?.id === node.id;

            return (
              <div key={node.id} className="flex flex-col items-center">
                {/* Node Box */}
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                    node.type === 'goal'
                      ? 'bg-dark-surface/50 border-brand-teal/50'
                      : node.type === 'completed_step'
                      ? 'bg-dark-surface/70 border-brand-teal/40 hover:border-brand-teal/70'
                      : node.type === 'current_step'
                      ? 'bg-brand-teal/10 border-brand-teal/60 shadow-lg shadow-brand-teal/10'
                      : 'bg-dark-surface/40 border-slate-400/40 border-dashed hover:border-slate-400/70'
                  } ${isSelected ? 'ring-2 ring-brand-teal' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {node.type === 'goal' && (
                        <Target className="w-4 h-4 text-brand-teal" />
                      )}
                      {node.type === 'completed_step' && (
                        <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                      )}
                      {node.type === 'current_step' && (
                        <CircleDot className="w-4 h-4 text-brand-teal " />
                      )}
                      {node.type === 'remaining_step' && (
                        <Sparkles className="w-4 h-4 text-slate-400" />
                      )}

                      <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-300">
                        {node.type === 'goal'
                          ? 'High-Level Goal'
                          : node.type === 'completed_step'
                          ? 'Likely Completed Step'
                          : node.type === 'current_step'
                          ? 'Current In-Progress Step'
                          : 'Likely Unfinished Step'}
                      </span>
                    </div>

                    {node.url && (
                      <a
                        href={node.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-brand-teal hover:underline flex items-center gap-1"
                      >
                        Inspect link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <button type="button" aria-pressed={isSelected} onClick={() => setSelectedNode(node)} className="text-sm text-left w-full font-semibold text-white">
                    {node.label}
                  </button>

                  {/* Inline Evidence Summary */}
                  {node.evidence && node.evidence.length > 0 && (
                    <div className="mt-2 text-xs text-slate-400 bg-black/30 rounded-lg p-2 space-y-1">
                      {node.evidence.map((ev, eIdx) => (
                        <div key={eIdx} className="flex items-start gap-1.5">
                          <span className="text-slate-500">•</span>
                          <span className="font-mono text-[11px] text-slate-300">{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Downward Edge Connector */}
                {!isLast && (
                  <div className="my-1.5 flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-gradient-to-b from-slate-600 to-slate-700" />
                    <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between flex-shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-teal" /> Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-teal" /> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Remaining
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Graph
          </button>
        </div>
      </div>
    </div>
  );
};
