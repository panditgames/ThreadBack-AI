import { IntentThread } from '../../types';
import { centroidOf, computeCosineSimilarity as cosine, formatPageMetadata, isValidEmbedding } from './localEmbedder';
import { representativePages } from './semanticAssignment';

export const WORKFLOW_MERGE_THRESHOLD = 0.80;
export function workflowDocument(thread: IntentThread): string {
  const pages = representativePages(thread.semanticPages || []);
  const texts = pages.map(page => thread.tabs.find(tab => tab.url.split('#')[0] === page.url))
    .filter((tab): tab is IntentThread['tabs'][number] => !!tab).map(formatPageMetadata).filter(Boolean);
  return [...new Set(texts)].slice(0, 5).map(text => text.slice(0, 220)).join('\n');
}
export function taskRelationship(a: IntentThread, b: IntentThread) {
  const ap = representativePages(a.semanticPages || []), bp = representativePages(b.semanticPages || []);
  if (a.isLatent || b.isLatent || a.isDemo || b.isDemo || a.preserveSemanticBoundary || b.preserveSemanticBoundary ||
      [a.status,b.status].some(status => status === 'ARCHIVED' || status === 'LIKELY_COMPLETE') ||
      ap.length < 2 || bp.length < 2 || !isValidEmbedding(a.workflowEmbedding) || !isValidEmbedding(b.workflowEmbedding)) return null;
  const document = cosine(a.workflowEmbedding!, b.workflowEmbedding!);
  const centroid = cosine(centroidOf(ap.map(p=>p.vector)),centroidOf(bp.map(p=>p.vector)));
  const left = ap.map(p=>Math.max(...bp.map(q=>cosine(p.vector,q.vector))));
  const right = bp.map(p=>Math.max(...ap.map(q=>cosine(p.vector,q.vector))));
  const support = (left.reduce((x,y)=>x+y,0)/left.length + right.reduce((x,y)=>x+y,0)/right.length)/2;
  const corroborated = left.filter(s=>s>=0.67).length>=2 && right.filter(s=>s>=0.67).length>=2;
  const agreement=0.40*document+0.30*centroid+0.30*support;
  return {document,centroid,support,agreement,corroborated:corroborated?1:0};
}
export function strongTaskRelationship(evidence: NonNullable<ReturnType<typeof taskRelationship>>): boolean {
  return evidence.document>=0.70 && evidence.centroid>=0.67 && evidence.support>=0.69 &&
    evidence.corroborated===1 && evidence.agreement>=WORKFLOW_MERGE_THRESHOLD;
}
/** A split requires two internally cohesive groups, not one unusual page. No unrepresented tabs are moved. */
export function divergentGroups(thread: IntentThread): string[][] | null {
  if (thread.isLatent || thread.isDemo || thread.preserveSemanticBoundary || thread.isManualCorrection ||
      thread.status==='LIKELY_COMPLETE' || thread.status==='ARCHIVED' || thread.tabs.length>5) return null;
  const pages=representativePages(thread.semanticPages || []);
  if(pages.length<4 || pages.length!==thread.tabs.length) return null;
  const groups:number[][]=[]; const unseen=new Set(pages.map((_,i)=>i));
  while(unseen.size){ const seed=unseen.values().next().value!;unseen.delete(seed);const group=[seed];
    for(let pos=0;pos<group.length;pos++) for(const j of [...unseen]) if(cosine(pages[group[pos]].vector,pages[j].vector)>=0.67){unseen.delete(j);group.push(j);}
    groups.push(group);
  }
  if(groups.length!==2 || groups.some(group=>group.length<2)) return null;
  for(const group of groups) for(const i of group) for(const j of group) if(i!==j && cosine(pages[i].vector,pages[j].vector)<0.72)return null;
  if(groups[0].some(i=>groups[1].some(j=>cosine(pages[i].vector,pages[j].vector)>=0.60)))return null;
  return groups.map(group=>group.map(i=>pages[i].url));
}
export function intentRevision(thread: IntentThread): string {
  return JSON.stringify([thread.id,thread.isManualCorrection ? thread.title : null,thread.status,!!thread.isLatent,!!thread.isManualCorrection,!!thread.preserveSemanticBoundary,
    thread.events.map(e=>e.id),thread.tabs.map(t=>[t.url,t.title,t.isClosed,t.lastAccessed])]);
}
