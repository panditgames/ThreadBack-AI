/* global console */
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { BENCHMARK_PAIRS, BENCHMARK_SEQUENCES } from './benchmarkData.mjs';
await fs.writeFile('.qa-audit-entry.ts', "export { IntentEngine } from './src/engine/intentClusterer';");
await build({entryPoints:['.qa-audit-entry.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.qa-engine.mjs'});
const {IntentEngine}=await import('../.qa-engine.mjs');
let n=0;
const event=page=>({ ...page, id:'audit-'+(++n), tabId:n, windowId:1, url:page.url||'https://'+page.domain+'/audit/'+n,
 pathname:'/', timestamp:Date.now()+n, eventType:'navigation', isInternalBrowserPage:false });
const owner=(engine,url)=>engine.getThreads().find(t=>t.tabs.some(tab=>tab.url===url))?.id;
const pairResults=[];
for(const pair of BENCHMARK_PAIRS){
 const engine=new IntentEngine(), seeds=pair.threadTabs.map(event), incoming=event(pair.incomingTab);
 for(const item of [...seeds,incoming])await engine.processEvent(item);
 const joined=owner(engine,incoming.url)===owner(engine,seeds[0].url);
 pairResults.push({id:pair.id,expected:pair.expected,joined});
}
const sequenceResults=[];
for(const sequence of BENCHMARK_SEQUENCES){
 const engine=new IntentEngine(), steps=sequence.steps.map(step=>({event:event(step.event),label:step.expectedThread}));
 for(const step of steps)await engine.processEvent(step.event);
 const byOwner=new Map(), byLabel=new Map();
 for(const step of steps){
  const id=owner(engine,step.event.url);
  if(!byOwner.has(id))byOwner.set(id,new Set()); byOwner.get(id).add(step.label);
  if(!byLabel.has(step.label))byLabel.set(step.label,new Set()); byLabel.get(step.label).add(id);
 }
 const falseMerges=[...byOwner.values()].reduce((sum,labels)=>sum+Math.max(0,labels.size-1),0);
 const falseSplits=[...byLabel.values()].reduce((sum,owners)=>sum+Math.max(0,owners.size-1),0);
 sequenceResults.push({id:sequence.id,falseMerges,falseSplits,passed:!falseMerges&&!falseSplits});
}
const summary={pairs:pairResults.length,falseMerges:pairResults.filter(p=>p.joined&&p.expected!=='JOIN').length,
 falseSplits:pairResults.filter(p=>!p.joined&&p.expected==='JOIN').length,sequences:sequenceResults.length,
 sequencesPassed:sequenceResults.filter(s=>s.passed).length};
await fs.writeFile('.qa-ai-benchmark-results.json',JSON.stringify({summary,pairResults,sequenceResults},null,2));
console.log(JSON.stringify(summary));
