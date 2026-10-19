export const MODEL_TARGET = 'threadback-local-model';
let creating: Promise<void> | undefined;
let diagnostics = { assets: [] as string[], blockedRequests: 0 };

export function isModelServiceWorker(): boolean {
  return typeof document === 'undefined' && typeof chrome !== 'undefined' && !!chrome.offscreen?.createDocument;
}
async function ensureDocument(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType], documentUrls: [chrome.runtime.getURL('offscreen.html')],
  });
  if (contexts.length) return;
  if (!creating) creating = chrome.offscreen.createDocument({
    url: 'offscreen.html', reasons: ['WORKERS' as chrome.offscreen.Reason],
    justification: 'Host a dedicated worker for bundled offline metadata embeddings across MV3 suspension.',
  }).finally(() => { creating = undefined; });
  await creating;
}
export async function requestLocalEmbedding(text: string): Promise<number[]> {
  await ensureDocument();
  const response = await chrome.runtime.sendMessage({target:MODEL_TARGET,type:'EMBED',text:text.slice(0,1600)});
  if (!response?.success) throw Error(response?.error || 'Local model did not respond');
  diagnostics = response.diagnostics || diagnostics;
  return response.embedding;
}
export function getModelDiagnostics() { return diagnostics; }
export async function closeModelDocument(): Promise<void> {
  diagnostics = {assets:[],blockedRequests:0};
  if (!isModelServiceWorker()) return;
  if (creating) await creating;
  const contexts = await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],documentUrls:[chrome.runtime.getURL('offscreen.html')]});
  if (contexts.length) await chrome.offscreen.closeDocument();
}
