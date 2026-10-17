import { afterEach, describe, expect, it, vi } from 'vitest';
import { tinySemanticClassifier, resolveIntentAmbiguity } from '../../src/engine/localIntentClassifier';
import { IntentEngine } from '../../src/engine/intentClusterer';
import * as scoring from '../../src/engine/scoring';
import { ActivityEvent } from '../../src/types';
const candidate=(title: string)=>({id:'candidate',title,keywords:[],recentTitles:[title]});
let id=0;
const event=(title: string): ActivityEvent=>({id:'audit-'+ ++id,title,url:'https://fixture.example/'+id,domain:'fixture.example',pathname:'/'+id,timestamp:1800000000000+id*1000,windowId:1,tabId:id,eventType:'navigation',isInternalBrowserPage:false});
afterEach(()=>vi.restoreAllMocks());
describe('independent resolver audit',()=>{
  it.each([
    ['GSoC organization project proposals','Chrome extension project Manifest V3'],
    ['Camera competition project submission','Hackathon project submission'],
    ['Demographic population research','Hackathon demo submission'],
    ['3D models and camera views','Django authentication'],
    ['Sony camera lens comparison','ANC headphone research'],
    ['Chromosome sequence analysis','Chrome extension development'],
    ['Python research project guide','Python project research tutorial'],
    ['Wireless network router setup','Headphone reviews'],
    ['Tokyo hotel booking','Chrome extension Manifest V3'],
  ])('does not merge weak/subword/domain traps: %s', (title,other)=>{
    const result=tinySemanticClassifier.classify({title,domain:'headphones.example'},candidate(other));
    expect(result.decision==='RELATED'&&result.confidence>=0.65&&result.ambiguityResolved).toBe(false);
  });
  it('preserves a heuristic join when the classifier returns its fallback result',()=>{
    const engine=new IntentEngine();const first=engine.processEvent(event('Cobalt pottery shapes'))!;
    const original=scoring.computeEventSimilarity;
    vi.spyOn(scoring,'computeEventSimilarity').mockImplementation((a,b)=>({...original(a,b),totalScore:0.44}));
    vi.spyOn(tinySemanticClassifier,'classify').mockReturnValue({decision:'UNRELATED',confidence:0.5,source:'heuristic_fallback',toolCalled:'create_new_thread',ambiguityResolved:false});
    expect(engine.processEvent(event('Amber orchard pruning'))?.id).toBe(first.id);
  });
  it.each([0.64,0.65])('requires semantic confidence >= 0.65, got %s', confidence=>{
    const engine=new IntentEngine();const first=engine.processEvent(event('Cobalt pottery shapes'))!;
    const original=scoring.computeEventSimilarity;
    vi.spyOn(scoring,'computeEventSimilarity').mockImplementation((a,b)=>({...original(a,b),totalScore:0.35}));
    vi.spyOn(tinySemanticClassifier,'classify').mockReturnValue({decision:'RELATED',confidence,source:'tiny_semantic',toolCalled:'join_existing_thread',ambiguityResolved:true});
    expect(engine.processEvent(event('Amber orchard pruning'))?.id===first.id).toBe(confidence>=0.65);
  });
  it('preserves the captured event and heuristic result on an actual classifier exception',()=>{
    const engine=new IntentEngine();const first=engine.processEvent(event('Cobalt pottery shapes'))!;
    const original=scoring.computeEventSimilarity;
    vi.spyOn(scoring,'computeEventSimilarity').mockImplementation((a,b)=>({...original(a,b),totalScore:0.44}));
    vi.spyOn(tinySemanticClassifier,'classify').mockImplementation(()=>{throw new Error('controlled classifier failure')});
    const second=event('Amber orchard pruning');
    expect(engine.processEvent(second)?.id).toBe(first.id);
    expect(engine.getThread(first.id)?.events.some(e=>e.id===second.id)).toBe(true);
  });
  it.each([0.24,0.25,0.49,0.50])('invokes only inside the ambiguity band at %s',score=>{
    const engine=new IntentEngine();engine.processEvent(event('Cobalt pottery shapes'));
    const original=scoring.computeEventSimilarity;
    vi.spyOn(scoring,'computeEventSimilarity').mockImplementation((a,b)=>({...original(a,b),totalScore:score}));
    const spy=vi.spyOn(tinySemanticClassifier,'classify');engine.processEvent(event('Amber orchard pruning'));
    expect(spy.mock.calls.length).toBe(score>=0.25&&score<0.5?1:0);
  });
  it('executes the real ambiguity resolver for related travel metadata',()=>{
    const a=event('Tokyo hotel reservation'),b=event('Tokyo subway route map');
    b.domain='metro.example';b.url='https://metro.example/routes';
    expect(scoring.computeEventSimilarity(a,b).totalScore).toBeGreaterThanOrEqual(0.25);
    expect(scoring.computeEventSimilarity(a,b).totalScore).toBeLessThan(0.4);
    const spy=vi.spyOn(tinySemanticClassifier,'classify');const engine=new IntentEngine();engine.processEvent(a);engine.processEvent(b);
    expect(spy).toHaveBeenCalled();expect(engine.getThreads()).toHaveLength(1);
  });
  it('does not treat inferred page queries as observed search evidence',()=>{
    const engine=new IntentEngine();const thread=engine.processEvent(event('Cobalt pottery shapes'))!;
    const a=event('Unrelated orchid watering');a.searchQuery='Cobalt pottery shapes';
    const result=resolveIntentAmbiguity(a,thread);
    expect(result.decision==='RELATED'&&result.ambiguityResolved).toBe(false);
    expect(a.searchQuery).toBe('Cobalt pottery shapes');
  });
  it('handles missing metadata without throwing or asserting a semantic decision',()=>{
    const bad=undefined as unknown as Parameters<typeof resolveIntentAmbiguity>[0];
    expect(()=>resolveIntentAmbiguity(bad,{} as never)).not.toThrow();
    expect(tinySemanticClassifier.classify({title:undefined,domain:undefined} as never,{title:'',keywords:undefined,recentTitles:undefined} as never).ambiguityResolved).toBe(false);
  });
});
