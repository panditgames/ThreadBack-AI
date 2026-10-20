import { describe, it, expect } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent, IntentThread } from '../../src/types';
let serial=0;
async function task(titles:readonly string[]):Promise<IntentThread>{
 const engine=new IntentEngine();let id='';
 for(const title of titles){const n=++serial;const event:ActivityEvent={id:'cross-'+n,tabId:n,url:'https://fixture.example/'+n,title,domain:'fixture.example',pathname:'/'+n,timestamp:Date.now(),eventType:'navigation',isInternalBrowserPage:false};
 const next=(await engine.processEvent(event))!;if(!id)id=next.id;else if(id!==next.id)engine.mergeThreads(id,next.id,false);}
 return engine.getThread(id)!;
}
export const crossSourcePairs=[
 [['Best mirrorless cameras for wildlife photography','Wildlife camera autofocus field test','Bird photography camera review'],['Help me choose a camera for photographing birds','Comparing mirrorless cameras for wildlife']],
 [['University admission requirements for international students','International student undergraduate application checklist'],['How do I apply to university as an international student?','Advice on international university admission requirements']],
 [['Bicycle chain skipping repair tutorial','Rear derailleur adjustment video'],['Why does my bicycle chain skip under load?','Help adjusting my rear derailleur']],
 [['Kyoto subway map and visitor rail passes','Kyoto train travel itinerary'],['Plan my Kyoto trip using public transport','Which Kyoto rail pass should I buy?']],
 [['React hydration mismatch troubleshooting documentation','Server rendering hydration bug report'],['Why does React show a hydration mismatch?','Help debugging React server client rendering differences']],
 [['Indoor tomato grow light experiments','Tomato seedling LED lighting tutorial'],['How much artificial light do indoor tomatoes need?','Plan LED lighting for my tomato plants']],
 [['Sourdough starter feeding instructions','Maintaining a healthy sourdough starter'],['Why is my sourdough starter not rising?','Help me establish a sourdough starter feeding routine']],
 [['French vowel pronunciation lesson','French vowel sound practice video'],['Help me pronounce French vowels correctly','Exercises to improve my French vowel pronunciation']],
 [['Acoustic guitar mixing EQ tutorial','Recorded guitar equalization guide'],['How should I EQ my recorded acoustic guitar?','Help mix acoustic guitar tracks']],
 [['Backyard telescope Mars photography settings','Planetary imaging exposure tutorial for Mars'],['How can I photograph Mars with my telescope?','Help choose camera settings for imaging Mars']]
] as const;
export const negativePairs=[
 [['Choose a wildlife camera','Compare cameras for bird photography'],['Repair broken camera autofocus','Camera autofocus motor replacement']],
 [['International university admission checklist','Apply for undergraduate university admission'],['Apply for a software internship','Software internship eligibility requirements']],
 [['Bicycle derailleur adjustment','Repair a skipping bicycle chain'],['Buy a commuter bicycle','Compare city bikes before buying']],
 [['Kyoto train travel itinerary','Kyoto rail passes for visitors'],['Implement a subway route planner','Shortest path algorithm for a rail network']],
 [['React hydration mismatch debugging','Server client React render difference'],['React authentication implementation','Add login and sessions to React']],
 [['Indoor tomato lighting schedule','Grow tomato seedlings under LEDs'],['Canning tomatoes safely','Water bath tomato preservation']],
 [['Maintain sourdough starter','Sourdough starter feeding routine'],['Sourdough sandwich recipes','Ideas for sourdough toast toppings']],
 [['French vowel pronunciation','Practice spoken French vowel sounds'],['Research French Revolution causes','French revolutionary political history']],
 [['Acoustic guitar mixing equalizer settings','Mix recorded guitar tracks'],['Repair acoustic guitar bridge','Replace a cracked guitar bridge']],
 [['Photograph Mars with a telescope','Mars planetary imaging camera settings'],['Calculate Mars transfer orbit','Mars spacecraft orbital mechanics']]
] as const;
// Controlled reconstruction only: three titles below were not supplied by the user.
export const reportedFixture=[['The 4 Best On-Ear Headphones of 2026','Best on-ear headphones review','On-ear headphones compared'],['Headphone Alternatives Comparison','Compare on-ear headphone alternatives']] as const;
describe('Cross-source production reconciliation',()=>{
 it('diagnoses controlled reconstruction of the reported five-page split',async()=>{
  const engine=new IntentEngine([await task(reportedFixture[0]),await task(reportedFixture[1])]);
  const started=performance.now();await engine.reconcileWorkspace();
  console.log('REPORTED_CONTROLLED '+JSON.stringify({ms:performance.now()-started,threads:engine.getThreads().length,diagnostics:engine.getReconciliationDiagnostics()}));
  expect(engine.getThreads()).toHaveLength(1);expect(engine.getThreads()[0].tabs).toHaveLength(5);
 });
 it('revisits old workflows across repeated worker restarts despite newer latent activity',async()=>{
  const a=await task(crossSourcePairs[0][0]),b=await task(crossSourcePairs[0][1]);
  a.updatedAt=Date.now()-20000;b.updatedAt=Date.now()-19000;
  const noise=[];for(const title of ['One-time calculator lookup','Random museum opening hours','One-time train arrival lookup','Calendar date reference'])noise.push(await task([title]));
  let saved=[a,b,...noise];
  for(let cycle=0;cycle<6;cycle++){const engine=new IntentEngine(structuredClone(saved));await engine.reconcileWorkspace(Date.now(),1);saved=engine.getThreads();}
  const workflow=saved.find(t=>t.tabs.some(p=>p.url===a.tabs[0].url))!;
  expect(workflow.tabs).toHaveLength(a.tabs.length+b.tabs.length);
 });
 it('evaluates ten cross-source positive pairs through the production engine',async()=>{
  const outcomes=[];for(const [a,b] of crossSourcePairs){const engine=new IntentEngine([await task(a),await task(b)]);await engine.reconcileWorkspace();outcomes.push({a:a[0],count:engine.getThreads().length,evidence:engine.getReconciliationDiagnostics().flatMap(d=>d.candidates).map(c=>c.evidence)});}
  console.log('CROSS_SOURCE '+JSON.stringify(outcomes));expect(outcomes.filter(o=>o.count===1)).toHaveLength(10);
 },180000);
 it('preserves ten close but different purposes',async()=>{
  const outcomes=[];for(const [a,b] of negativePairs){const engine=new IntentEngine([await task(a),await task(b)]);await engine.reconcileWorkspace();outcomes.push({a:a[0],count:engine.getThreads().length,evidence:engine.getReconciliationDiagnostics().flatMap(d=>d.candidates).map(c=>c.evidence)});}
  console.log('CROSS_NEGATIVE '+JSON.stringify(outcomes));expect(outcomes.filter(o=>o.count===2)).toHaveLength(10);
 },180000);
});
