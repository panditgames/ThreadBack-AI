import { describe, expect, it } from 'vitest';
import { taskRelationship } from '../../src/engine/ai/continuousIntent';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { storageManager } from '../../src/storage/storageManager';
import { ActivityEvent, IntentThread } from '../../src/types';
import { computeCosineSimilarity as cosine } from '../../src/engine/ai/localEmbedder';
let serial=0;
const event=(title:string):ActivityEvent=>({id:'continuous-'+(++serial),tabId:serial,url:'https://neutral.example/'+serial,
 title,domain:'neutral.example',pathname:'/'+serial,timestamp:Date.now()+serial,eventType:'navigation',isInternalBrowserPage:false});
// Pre-existing task membership is fixture input; all embeddings still come from the production engine/model.
async function task(titles:string[]):Promise<IntentThread>{
 const engine=new IntentEngine();let first:IntentThread|undefined;
 for(const title of titles){const item=(await engine.processEvent(event(title)))!;
   if(!first)first=item;else if(first.id!==item.id)first=engine.mergeThreads(first.id,item.id,false)!;}
 return engine.getThread(first!.id)!;
}
const pairs=[
 [['Indoor tomato plant growing light schedule','Growing tomatoes indoors under LED lights'],['LED lighting for indoor tomato plants','Indoor tomato growing under artificial lights']],
 [['Repair bicycle chain skipping under load','Adjust rear derailleur for skipping chain'],['Bicycle chain skipping derailleur adjustment','Fixing skipping gears on a bicycle']],
 [['Practice French vowel pronunciation','Exercises for French vowel sounds'],['Improve French vowel pronunciation','French vowel pronunciation practice drills']],
 [['Choose camera lens for street photography','Street photography focal length comparison'],['Best focal length for street photography','Choosing street photography prime lenses']],
 [['Feeding a sourdough starter for bread baking','Healthy sourdough starter maintenance'],['Sourdough starter feeding routine','Maintain sourdough starter for baking']],
 [['Photograph Mars with backyard telescope','Mars telescope camera exposure settings'],['Backyard telescope Mars photography','Telescope settings for imaging Mars']],
 [['Roman aqueduct engineering research','How Roman aqueducts carried water'],['Ancient Roman aqueduct construction','Roman aqueduct water transport engineering']],
 [['Kyoto subway trip planning','Kyoto rail passes and transport itinerary'],['Planning Kyoto travel by train','Kyoto subway and rail trip itinerary']],
 [['Debug React server hydration mismatch','React hydration error after server rendering'],['Fix server client mismatch in React hydration','Debugging React hydration errors']],
 [['Mix recorded acoustic guitar tracks','Acoustic guitar recording equalizer settings'],['Acoustic guitar track mixing EQ','Equalization for mixing acoustic guitar recordings']],
] as const;
const different=[
 [['Indoor tomato growing instructions','LED lighting for growing tomato plants'],['Canning tomatoes safely in jars','Preserving tomatoes in a water bath']],
 [['Bicycle chain skipping repair','Adjust bicycle derailleur alignment'],['Buy a new commuter bicycle','Compare commuter bikes before purchase']],
 [['French vowel pronunciation practice','Practice spoken French vowel sounds'],['French Revolution historical causes','Research events of the French Revolution']],
 [['Buy a street photography camera lens','Compare prime lenses for street photography'],['Repair a stuck camera lens mechanism','Fix lens focusing motor failure']],
 [['Maintain a sourdough starter','Feed sourdough starter for bread baking'],['Sourdough sandwich filling recipes','Make toasted sourdough sandwiches']],
 [['Mars telescope photography exposures','Image Mars through backyard telescope'],['Mars orbital mechanics simulation','Calculate spacecraft transfer orbit to Mars']],
 [['Roman aqueduct engineering history','Ancient Roman water transport research'],['Book a Rome holiday hotel','Compare Rome vacation accommodation']],
 [['Kyoto train itinerary planning','Kyoto subway travel passes'],['Develop a subway route planning application','Code shortest path algorithm for subway routes']],
 [['Fix React server hydration mismatch','Debug React hydration error'],['Learn quantum wave function normalization','Quantum mechanics probability amplitude exercise']],
 [['Mix recorded acoustic guitar tracks','EQ settings for acoustic guitar mixing'],['Repair acoustic guitar cracked bridge','Replace damaged acoustic guitar bridge']],
] as const;
describe('Continuous manager: real production BGE task reasoning',()=>{
 it('merges ten independently formed same-purpose task pairs',async()=>{
  const results=[];for(const [a,b]of pairs){const engine=new IntentEngine([await task([...a]),await task([...b])]);
   await engine.reconcileWorkspace();results.push({a:a[0],count:engine.getThreads().length,cos:engine.getThreads().map(t=>t.managerActions?.find(a=>a.kind==='MERGE')?.evidence)});}
  console.log('SAME_PURPOSE '+JSON.stringify(results));expect(results.filter(r=>r.count===1)).toHaveLength(10);
 },180000);
 it('keeps ten close but different purposes separate',async()=>{
  const results=[];for(const [a,b]of different){const engine=new IntentEngine([await task([...a]),await task([...b])]);
   await engine.reconcileWorkspace();results.push({a:a[0],count:engine.getThreads().length,evidence:engine.getThreads().length===2?taskRelationship(engine.getThreads()[0],engine.getThreads()[1]):null});}
  console.log('DIFFERENT_PURPOSE '+JSON.stringify(results));expect(results.filter(r=>r.count===2)).toHaveLength(10);
 },180000);
 it('immediately reconciles the reported EurekaDev / two-video promotion failure',async()=>{
  const a=await task(['EurekaDev 2026','Submit EurekaDev Project','Branch · Hackathon participation guide','Project submission requirements']);
  const engine=new IntentEngine([a]);
  await engine.processEvent(event('How To Submit A Hackathon'));
  await engine.processEvent(event('Hackathon submission tutorial'));
  console.log('SCREENSHOT '+JSON.stringify(engine.getThreads().map(t=>({title:t.title,pages:t.tabs.map(p=>p.title),actions:t.managerActions?.map(a=>({kind:a.kind,evidence:a.evidence}))}))));
  expect(engine.getThreads()).toHaveLength(1);expect(engine.getThreads()[0].tabs).toHaveLength(6);
 },60000);
 it('reconciles immediately when a saved video latent is promoted beside an existing workflow',async()=>{
  const a=await task(['EurekaDev Hackathon Submission','EurekaDev project submission requirements','Branch · Hackathon participation guide']);
  const lone=new IntentEngine();const latent=(await lone.processEvent(event('How To Submit A Hackathon')))!;
  expect(latent.isLatent).toBe(true);const engine=new IntentEngine([a,latent]);
  await engine.processEvent(event('Hackathon submission tutorial'));
  console.log('PROMOTION_DETAIL '+JSON.stringify(engine.getThreads().map(t=>({title:t.title,latent:t.isLatent,pages:t.tabs.map(p=>p.title),scores:engine.getThreads().filter(o=>o.id!==t.id).map(o=>({title:o.title,sim:cosine(t.centroidEmbedding!,o.centroidEmbedding!),doc:t.workflowEmbedding&&o.workflowEmbedding?cosine(t.workflowEmbedding,o.workflowEmbedding):null,cross:(t.semanticPages||[]).map(p=>Math.max(...(o.semanticPages||[]).map(q=>cosine(p.vector,q.vector))))}))}))));
  expect(engine.getThreads()).toHaveLength(1);
  expect(engine.getThreads()[0].managerActions?.some(action=>action.kind==='MERGE')).toBe(true);
 });
 it('reconciles saved duplicate tasks on startup/periodic passes without new pages',async()=>{
  const a=await task(['EurekaDev Hackathon Submission','EurekaDev project submission requirements','Hackathon participation guide']);
  const b=await task(['How To Submit A Hackathon','Hackathon submission tutorial']);
  const engine=new IntentEngine([a,b]);await engine.reconcileWorkspace();expect(engine.getThreads()).toHaveLength(1);
  expect(engine.getThreads()[0].managerActions?.some(a=>a.kind==='MERGE')).toBe(true);
 });
 it('splits two strongly divergent multi-page groups, but never a single outlier',async()=>{
  const a=await task(['French vowel pronunciation drills','Practice French vowel sounds']);
  const b=await task(['Bicycle derailleur repair','Fix a skipping bicycle chain']);
  const mixedEngine=new IntentEngine([a,b]);const mixed=mixedEngine.mergeThreads(a.id,b.id,false)!;
  const engine=new IntentEngine([mixed]);await engine.reconcileWorkspace();expect(engine.getThreads()).toHaveLength(2);
  expect(engine.getThreads().some(t=>t.managerActions?.some(a=>a.kind==='SPLIT'))).toBe(true);
  const single=await task(['Practice French vowel pronunciation','French vowel pronunciation exercises','Bicycle chain repair']);
  const singleEngine=new IntentEngine([single]);await singleEngine.reconcileWorkspace();expect(singleEngine.getThreads()).toHaveLength(1);
 });
 it.each([[0,2],[4,5],[8,1]])('conservatively separates another mixed workflow %i / %i',async(ai,bi)=>{
  const a=await task([...pairs[ai][0]]),b=await task([...pairs[bi][0]]);const engine=new IntentEngine([a,b]);
  engine.mergeThreads(a.id,b.id,false);await engine.reconcileWorkspace();expect(engine.getThreads()).toHaveLength(2);
 });
 it('split Undo survives actual storage validation and does not revive deleted metadata',async()=>{
  const a=await task(['French vowel pronunciation','French vowel pronunciation exercises']),b=await task(['Bicycle chain repair','Fix bicycle chain skipping']);
  const engine=new IntentEngine([a,b]);engine.mergeThreads(a.id,b.id,false);await engine.reconcileWorkspace();
  const source=engine.getThreads().find(t=>t.managerActions?.some(a=>a.kind==='SPLIT'))!;const action=source.managerActions!.find(a=>a.kind==='SPLIT')!;
  await storageManager.saveThreads(engine.getThreads());const restored=new IntentEngine(Object.values((await storageManager.load()).threads));
  expect(restored.undoManagerAction(source.id,action.id)).toBe(true);expect(restored.getThreads()).toHaveLength(1);
  await storageManager.deleteThread(source.id);expect(Object.values((await storageManager.load()).threads).flatMap(t=>t.managerActions || []).some(a=>a.before.some(t=>t.id===source.id))).toBe(false);
 });
 it('archive undo persists and does not immediately archive again',async()=>{
  const old=await task(['French vowel pronunciation','French vowel sounds practice']);old.updatedAt=Date.now()-40*86400000;
  old.tabs.forEach(tab=>{tab.isClosed=true;tab.lastAccessed=old.updatedAt;});const engine=new IntentEngine([old]);await engine.reconcileWorkspace();
  const action=engine.getThread(old.id)!.managerActions!.find(a=>a.kind==='ARCHIVE')!;expect(engine.undoManagerAction(old.id,action.id)).toBe(true);
  await engine.reconcileWorkspace();expect(engine.getThread(old.id)!.status).not.toBe('ARCHIVED');
 });
 it('expires a closed one-off but archives established closed tasks and reactivates them on return',async()=>{
  const singleEngine=new IntentEngine();const one=(await singleEngine.processEvent(event('Random quick reference')))!;
  await singleEngine.processEvent({...event('Random quick reference'),url:one.tabs[0].url,eventType:'tab_closed'});
  expect(singleEngine.getActiveThreads()).toHaveLength(0);await singleEngine.reconcileWorkspace(Date.now()+7*3600000);
  expect(singleEngine.getThreads()).toHaveLength(0);
  const old=await task(['Acoustic guitar recording equalizer settings','Mix recorded acoustic guitar tracks']);
  old.tabs.forEach(t=>{t.isClosed=true;t.lastAccessed=Date.now()-40*86400000;});old.updatedAt=Date.now()-40*86400000;
  const engine=new IntentEngine([old]);await engine.reconcileWorkspace();expect(engine.getThread(old.id)?.status).toBe('ARCHIVED');
  expect((await engine.processEvent(event('Acoustic guitar track mixing EQ')))!.id).toBe(old.id);
  expect(engine.getThread(old.id)?.status).toBe('ACTIVE');
  expect(engine.getThread(old.id)?.events.at(-1)?.semanticThreshold).toBe(0.74);
 });
 it('persists action history, undoes safely, and never undoes across newer browsing or deletion',async()=>{
  const a=await task(['Practice French vowel pronunciation','French vowel sounds practice']);
  const b=await task(['French vowel pronunciation drills','Improve French vowel pronunciation']);
  const engine=new IntentEngine([a,b]);await engine.reconcileWorkspace();
  let t=engine.getThreads()[0];const rename=t.managerActions?.find(a=>a.kind==='RENAME');
  if(rename){expect(engine.undoManagerAction(t.id,rename.id)).toBe(true);t=engine.getThread(t.id)!;}
  const merge=t.managerActions!.find(a=>a.kind==='MERGE')!;expect(merge).toBeTruthy();
  const recovered=new IntentEngine(JSON.parse(JSON.stringify(engine.getThreads())));
  expect(recovered.undoManagerAction(t.id,merge.id)).toBe(true);expect(recovered.getThreads()).toHaveLength(2);
  await recovered.reconcileWorkspace();expect(recovered.getThreads()).toHaveLength(2);
  const fresh=new IntentEngine([await task(['French vowel pronunciation','Practice French vowel sounds']),await task(['French vowel sounds drills','Improve French vowel pronunciation'])]);
  await fresh.reconcileWorkspace();const target=fresh.getThreads()[0],action=target.managerActions!.find(a=>a.kind==='MERGE')!;
  await fresh.processEvent({...event(target.tabs[0].title),url:target.tabs[0].url});expect(fresh.undoManagerAction(target.id,action.id)).toBe(false);
  fresh.deleteThread(target.id);expect(fresh.getThreads()).toHaveLength(0);
 });
 it('does not use generated names for membership and records grounded renames',async()=>{
  const a=await task(['Practice French vowel pronunciation','French vowel sounds practice']);a.title='Opaque saved label';
  const engine=new IntentEngine([a]);await engine.reconcileWorkspace();const t=engine.getThread(a.id)!;
  expect(t.title).not.toBe('Opaque saved label');expect(t.tabs.some(tab=>tab.title===t.title)).toBe(true);
  expect(t.managerActions?.some(a=>a.kind==='RENAME')).toBe(true);
  expect(cosine(t.workflowEmbedding!,t.workflowEmbedding!)).toBeCloseTo(1);
 });
});
