import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Check, Key, Lock, Shield, Trash2, X } from 'lucide-react';
import { AISettings, PrivacySettings } from '../types';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: PrivacySettings;
  aiSettings: AISettings;
  onSavePrivacy: (privacy: PrivacySettings) => Promise<void>;
  onSaveAI: (aiSettings: AISettings) => Promise<void>;
  onClearIntelligence: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  privacy,
  aiSettings,
  onSavePrivacy,
  onSaveAI,
  onClearIntelligence,
  onClearAll,
}) => {
  const [allowContentAnalysis, setAllowContentAnalysis] = useState(privacy.allowPageContentAnalysis);
  const [excludedDomains, setExcludedDomains] = useState(privacy.excludedDomains.join(', '));
  const [aiEnabled, setAiEnabled] = useState(aiSettings.enabled);
  const [provider, setProvider] = useState(aiSettings.provider);
  const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');
  const [modelName, setModelName] = useState(aiSettings.modelName || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAllowContentAnalysis(privacy.allowPageContentAnalysis);
    setExcludedDomains(privacy.excludedDomains.join(', '));
    setAiEnabled(aiSettings.enabled);
    setProvider(aiSettings.provider);
    setApiKey(aiSettings.apiKey || '');
    setModelName(aiSettings.modelName || '');
  }, [isOpen, privacy, aiSettings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await onSavePrivacy({
      ...privacy,
      allowPageContentAnalysis: allowContentAnalysis,
      excludedDomains: excludedDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean),
    });

    await onSaveAI({
      ...aiSettings,
      enabled: aiEnabled,
      provider,
      apiKey: apiKey.trim(),
      modelName: modelName.trim(),
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-emerald/20 border border-brand-emerald/40 flex items-center justify-center text-brand-emerald">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-brand-emerald font-mono font-semibold">
                Privacy Center & Engine Settings
              </span>
              <h2 className="text-lg font-bold text-white">
                Data Sovereignty & Local AI
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

        {/* Content body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs text-slate-300">
          {/* Privacy Guarantee Box */}
          <div className="bg-dark-surface/80 border border-dark-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Lock className="w-4 h-4 text-brand-cyan" />
              100% Local Processing by Default
            </div>
            <p className="text-slate-400 leading-relaxed">
              ThreadBack stores metadata strictly in your browser's local memory (<code className="text-brand-cyan">chrome.storage.local</code>). Zero browsing history, URLs, or queries are ever sent to remote analytics or third-party servers.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 font-mono space-y-1">
              <div>✓ Stored: Page title, URL, domain, timestamps, tab relationships</div>
              <div>✗ NEVER Stored: Form passwords, cookies, banking sessions, full page body</div>
            </div>
          </div>

          {/* Setting 1: Page Content Analysis */}
          <div className="bg-dark-surface/50 border border-dark-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-white mb-0.5">
                Allow Full Page Content Analysis
              </div>
              <div className="text-slate-400 max-w-sm">
                Default: <strong>OFF</strong>. Content extraction is not implemented; this control is reserved.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled
                aria-label="Page content analysis (unavailable)"
                checked={allowContentAnalysis}
                onChange={e => setAllowContentAnalysis(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-cyan"></div>
            </label>
          </div>

          <label className="block bg-dark-surface/50 border border-dark-border rounded-xl p-4">
            Excluded domains (comma separated)
            <input aria-label="Excluded domains" value={excludedDomains} onChange={e => setExcludedDomains(e.target.value)} className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </label>

          {/* Setting 2: Optional Remote AI Provider */}
          <div className="bg-dark-surface/50 border border-dark-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-purple" />
                  Optional AI Enhancement Layer
                </div>
                <div className="text-slate-400 max-w-sm mt-0.5">
                  Provider code is experimental and is not connected to the UI workflow. Local mode remains active.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled
                  aria-label="Remote AI (unavailable)"
                  checked={aiEnabled}
                  onChange={e => setAiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple"></div>
              </label>
            </div>

            {aiEnabled && (
              <div className="pt-2 border-t border-slate-700/60 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-slate-400 uppercase font-mono text-[10px] mb-1">
                    Provider
                  </label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-brand-purple"
                  >
                    <option value="gemini">Google Gemini API (gemini-1.5-flash)</option>
                    <option value="groq">Groq (llama-3.1-8b-instant)</option>
                    <option value="openai">OpenAI (gpt-4o-mini)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase font-mono text-[10px] mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3 text-brand-amber" />
                    Personal API Key (Stored strictly in your local extension memory)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your API key..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono focus:ring-1 focus:ring-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase font-mono text-[10px] mb-1">
                    Custom Model (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. gemini-1.5-flash or gpt-4o-mini"
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono focus:ring-1 focus:ring-brand-purple"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone: Data Management */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 space-y-3">
            <div className="text-red-400 font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Data Clearance Controls
            </div>
            <p className="text-slate-400">
              You maintain total control. Permanently purge your browsing intelligence or reset local state anytime.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={async () => {
                  if (confirm('Clear all captured browsing events and reconstructed intent threads?')) {
                    await onClearIntelligence();
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                Clear Browsing Intelligence
              </button>

              {confirmClearAll ? (
                <button
                  onClick={async () => {
                    await onClearAll();
                    setConfirmClearAll(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
                >
                  Yes, Erase Everything
                </button>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/50 text-red-300 border border-red-800/40 transition"
                >
                  Erase All ThreadBack Data
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-brand-emerald flex items-center gap-1">
            {saveSuccess && (
              <>
                <Check className="w-3.5 h-3.5" /> Settings Saved!
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-semibold text-xs transition shadow-md shadow-brand-cyan/20"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
