import modelUrl from './semanticModel.json?url&no-inline';
import { ActivityEvent } from '../types';
import { parseUrl } from './urlParser';

type Concept = { label: string; anchors: string[]; cues: string[] };
type Model = { version: number; concepts: Concept[] };
export type ModelLoader = () => Promise<unknown>;
const normalize = (text: string) => ' ' + text.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const contains = (text: string, phrase: string) => text.includes(phrase);

/** Small curated concept classifier, not a trained embedding or language model.
 * No browsing text, vectors or corrections are cached or persisted here. */
export class LocalSemanticModel {
  private model: Model | undefined;
  private loadState = 'unavailable';
  get status(): string { return this.loadState; }

  async load(loader: ModelLoader = async () => {
    const response = await fetch(new URL(modelUrl, import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Local model unavailable');
    return response.json();
  }): Promise<boolean> {
    this.model = undefined;
    this.loadState = 'unavailable';
    try {
      const value = await loader() as Model;
      if (value?.version !== 1 || !Array.isArray(value.concepts) || !value.concepts.length || value.concepts.length > 32) return false;
      for (const c of value.concepts) {
        if (typeof c.label !== 'string' || !c.label || ![c.anchors, c.cues].every(a => Array.isArray(a) && a.length > 0 && a.length <= 64 && a.every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 80))) return false;
      }
      this.model = { version: 1, concepts: value.concepts.map(c => ({ ...c, anchors: c.anchors.map(normalize), cues: c.cues.map(normalize) })) };
      this.loadState = 'ready';
      return true;
    } catch (error) { this.loadState = error instanceof Error ? error.name : 'unavailable'; return false; }
  }

  compare(a: ActivityEvent, b: ActivityEvent): { similarity: number; label?: string } {
    if (!this.model) return { similarity: 0 };
    const classify = (event: ActivityEvent) => {
      const observedQuery = event.searchQuery ? parseUrl(event.url).searchQuery : undefined;
      const text = normalize((event.title || '').slice(0, 1024) + ' ' + (observedQuery === event.searchQuery ? observedQuery || '' : '').slice(0, 512));
      return this.model!.concepts.filter(c => c.anchors.some(anchor => contains(text, anchor) && c.cues.some(cue => cue !== anchor && contains(text, cue))));
    };
    const left = classify(a), right = classify(b);
    // Abstain on mixed or unknown topics instead of forcing a broad fuzzy match.
    return left.length === 1 && right.length === 1 && left[0].label === right[0].label
      ? { similarity: 1, label: left[0].label } : { similarity: 0 };
  }
}

export const localSemanticModel = new LocalSemanticModel();
