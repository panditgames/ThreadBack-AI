import { useModalAccessibility } from '../ui/useModalAccessibility';
import React from 'react';
import { Clock, ExternalLink, Globe, Search, X } from 'lucide-react';
import { IntentThread } from '../types';

interface TimelineModalProps {
  thread: IntentThread | null;
  onClose: () => void;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ thread, onClose }) => {
  const modalRef = useModalAccessibility(thread != null, onClose);
  if (!thread) return null;

  const sortedEvents = [...thread.events].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Activity timeline" tabIndex={-1} className="modal-panel max-w-xl">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-teal via-brand-teal to-brand-teal" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-brand-teal font-mono font-semibold">
                Activity Sequence
              </span>
              <h2 className="text-lg font-bold text-white">
                Timeline: {thread.title}
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
          Chronological reconstructed path of how this intention developed across tabs.
        </p>

        {/* Timeline Events List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic">
              No historical events recorded for this thread yet.
            </div>
          ) : (
            sortedEvents.map((event, idx) => {
              const timeFormatted = new Date(event.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={event.id || idx} className="relative pl-6 border-l-2 border-slate-700 hover:border-brand-teal transition group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-dark-card border-2 border-brand-teal group-hover:scale-125 transition" />

                  <div className="bg-dark-surface/60 border border-dark-border rounded-xl p-3 hover:border-slate-600 transition">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-brand-teal font-semibold">
                        {timeFormatted}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase px-2 py-0.5 rounded bg-slate-800">
                        {event.eventType.replace('_', ' ')}
                      </span>
                    </div>

                    {event.searchQuery ? (
                      <div className="flex items-start gap-2 mt-1">
                        <Search className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-400 font-mono">
                            {event.searchEngine || 'Search'}:
                          </div>
                          <div className="text-sm font-medium text-white">
                            "{event.searchQuery}"
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 mt-1">
                        <Globe className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-400 font-mono truncate">
                            {event.domain}
                          </div>
                          <div className="text-sm font-medium text-white truncate">
                            {event.title}
                          </div>
                        </div>
                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-brand-teal transition p-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-dark-border flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
