import { generateEmbedding } from './localEmbedder';
const requests = new Set<string>();
let blockedRequests = 0;
const localFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input), self.location.href);
  if (url.protocol !== self.location.protocol || url.host !== self.location.host) {
    blockedRequests++;
    return Promise.reject(Error('Only bundled local inference resources are allowed'));
  }
  if (requests.size < 12) requests.add(url.href);
  return localFetch(input, init);
};
let queue: Promise<unknown> = Promise.resolve();
self.onmessage = (event: MessageEvent) => {
  const {id,text} = event.data || {};
  queue = queue.then(async () => {
    try {
      if (typeof text !== 'string' || text.length > 1600) throw Error('Invalid metadata input');
      const embedding = await generateEmbedding(text);
      self.postMessage({id,success:true,embedding,diagnostics:{assets:[...requests],blockedRequests}});
    } catch (error) { self.postMessage({id,success:false,error:error instanceof Error ? error.message : 'Local inference failed'}); }
  });
};
