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

  if (!thread) return null;

  const graph = buildIntentGraph(thread);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-dark-card border border-brand-purple/40 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-emerald" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-brand-purple font-mono font-semibold">
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
          >
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
                  className={`w-full p-4 rounded-xl border transition cursor-pointer ${
                    node.type === 'goal'
                      ? 'bg-gradient-to-r from-brand-purple/20 via-brand-indigo/15 to-transparent border-brand-purple/50'
                      : node.type === 'completed_step'
                      ? 'bg-dark-surface/70 border-brand-emerald/40 hover:border-brand-emerald/70'
                      : node.type === 'current_step'
                      ? 'bg-brand-cyan/10 border-brand-cyan/60 shadow-lg shadow-brand-cyan/10'
                      : 'bg-dark-surface/40 border-brand-amber/40 border-dashed hover:border-brand-amber/70'
                  } ${isSelected ? 'ring-2 ring-brand-cyan' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {node.type === 'goal' && (
                        <Target className="w-4 h-4 text-brand-purple" />
                      )}
                      {node.type === 'completed_step' && (
                        <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                      )}
                      {node.type === 'current_step' && (
                        <CircleDot className="w-4 h-4 text-brand-cyan animate-pulse" />
                      )}
                      {node.type === 'remaining_step' && (
                        <Sparkles className="w-4 h-4 text-brand-amber" />
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
                        className="text-xs text-brand-cyan hover:underline flex items-center gap-1"
                      >
                        Inspect link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-white">
                    {node.label}
                  </div>

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
              <span className="w-2 h-2 rounded-full bg-brand-emerald" /> Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-amber" /> Remaining
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
