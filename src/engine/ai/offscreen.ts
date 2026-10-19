import { MODEL_TARGET } from './offscreenBridge';
let modelWorker: Worker | undefined;
let sequence = 0;
const pending = new Map<number,{respond:(response:unknown)=>void;timer:ReturnType<typeof setTimeout>}>();
function respondSafely(respond: (response: unknown) => void, value: unknown) {
  try { respond(value); } catch { /* A terminated caller will replay its durable event. */ }
}
function failAll(error: string) {
  modelWorker?.terminate(); modelWorker = undefined;
  for (const request of pending.values()) { clearTimeout(request.timer); respondSafely(request.respond,{success:false,error}); }
  pending.clear();
}
function getWorker(): Worker {
  if (!modelWorker) {
    modelWorker = new Worker(new URL('./embeddingWorker.ts', import.meta.url));
    modelWorker.onmessage = event => {
      const request = pending.get(event.data?.id); if (!request) return;
      clearTimeout(request.timer); pending.delete(event.data.id); respondSafely(request.respond,event.data);
    };
    modelWorker.onerror = () => failAll('Local inference worker failed');
  }
  return modelWorker;
}
chrome.runtime.onMessage.addListener((message,_sender,respond) => {
  if (message?.target !== MODEL_TARGET || message.type !== 'EMBED') return false;
  if (typeof message.text !== 'string' || message.text.length > 1600) { respond({success:false,error:'Invalid metadata input'}); return false; }
  const id = ++sequence, worker = getWorker();
  const timer = setTimeout(() => failAll('Local model request timed out'), 120000);
  pending.set(id,{respond,timer}); worker.postMessage({id,text:message.text});
  return true;
});
