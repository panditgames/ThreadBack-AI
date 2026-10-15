import { useModalAccessibility } from '../ui/useModalAccessibility';
import React from 'react';
import { ArrowRight, Play, Sparkles, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryDemo: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onTryDemo,
}) => {
  const modalRef = useModalAccessibility(isOpen != null && isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Welcome to ThreadBack" tabIndex={-1} className="modal-panel max-w-lg">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
         aria-label="Close dialog">
          <X className="w-5 h-5" />
        </button>

        {/* Badge & Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-mono font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          EurekaDev 2026 — Track: CS + AI
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
          ThreadBack AI
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
          Bookmarks remember URLs. History remembers pages. <br />
          <span className="text-brand-teal font-semibold">ThreadBack remembers what you were trying to accomplish.</span>
        </p>

        {/* 3 Step Flow (Under 20 seconds) */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3.5 bg-dark-surface/60 border border-dark-border rounded-xl p-3">
            <div className="w-7 h-7 rounded-lg bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal font-bold text-xs flex-shrink-0">
              1
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Browse Normally</div>
              <div className="text-xs text-slate-400">Open tabs, search, and research without manual tagging.</div>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-dark-surface/60 border border-dark-border rounded-xl p-3">
            <div className="w-7 h-7 rounded-lg bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal font-bold text-xs flex-shrink-0">
              2
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Local Intent Engine Groups Tasks</div>
              <div className="text-xs text-slate-400">Reconstructs goals, milestones, and what remains unfinished.</div>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-dark-surface/60 border border-dark-border rounded-xl p-3">
            <div className="w-7 h-7 rounded-lg bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal font-bold text-xs flex-shrink-0">
              3
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Click "Resume Task"</div>
              <div className="text-xs text-slate-400">Reopens closed tabs, restores order, and shows next action.</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onTryDemo();
              onClose();
            }}
            className="action-primary"
          >
            <Play className="w-4 h-4 fill-current" />
            Try Demo Mode
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            Explore Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
