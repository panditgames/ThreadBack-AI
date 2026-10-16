/* global chrome */
const { chromium } = await import(process.env.THREADBACK_PLAYWRIGHT_MODULE || 'playwright');
import os from 'node:os';import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');const title=decodeURIComponent(req.url.slice(1)).replaceAll('-',' ');res.end('<!doctype html><title>'+title+'</title><h1>'+title+'</h1>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'threadback-smoke-'));
await fs.mkdir('release/screenshots',{recursive:true});
const dist=path.resolve('dist'),results=[],errors=[];let ctx,worker,dash,id;
const options={...(process.env.THREADBACK_CHROMIUM_EXECUTABLE ? {executablePath:process.env.THREADBACK_CHROMIUM_EXECUTABLE} : {channel:'chromium'}),headless:false,viewport:{width:1280,height:900},args:['--disable-extensions-except='+dist,'--load-extension='+dist,'--host-resolver-rules=MAP *.threadback.test 127.0.0.1','--no-proxy-server']};
async function launch(){ctx=await chromium.launchPersistentContext(profile,options);ctx.setDefaultTimeout(20000);ctx.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await ctx.route('https://**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/favicon.ico'){await route.fulfill({status:204});return;}const title=webFixtures.get(u.href);if(!title){errors.push('Unexpected external request: '+u.origin);await route.abort();return;}await route.fulfill({contentType:'text/html',body:'<!doctype html><title>'+title+'</title><h1>'+title+'</h1>'})});ctx.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})});worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');if(process.env.THREADBACK_SMOKE_DEBUG)await worker.evaluate(()=>{globalThis.__threadbackEvents=[];chrome.tabs.onUpdated.addListener((id,info,tab)=>{globalThis.__threadbackEvents.push({id,info,url:tab.url,title:tab.title,status:tab.status});globalThis.__threadbackEvents=globalThis.__threadbackEvents.slice(-100)})});id=new URL(worker.url()).host;dash=await ctx.newPage();await dash.goto('chrome-extension://'+id+'/dashboard.html');await dash.keyboard.press('Escape')}
const state=()=>worker.evaluate(async()=>(await chrome.storage.local.get('threadback_data_v1')).threadback_data_v1);
async function until(fn){const end=Date.now()+20000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('condition timeout')}
async function test(name,fn){if(process.env.THREADBACK_SMOKE_TEST&&!new RegExp(process.env.THREADBACK_SMOKE_TEST).test(name))return;try{await fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message});console.log('PAGES '+JSON.stringify(ctx.pages().map(p=>p.url())));if(process.env.THREADBACK_SMOKE_DEBUG){console.log('TAB_METADATA '+JSON.stringify(await worker.evaluate(()=>chrome.tabs.query({})).catch(()=>[])));console.log('EVENTS '+JSON.stringify(await worker.evaluate(()=>globalThis.__threadbackEvents||[]).catch(()=>[])))}await fs.writeFile('release/smoke-failure-state.json',JSON.stringify(await state().catch(()=>null),null,2));await dash.keyboard.press('Escape').catch(()=>{})}console.log(JSON.stringify(results.at(-1)))}
const btn=(p,name)=>p.getByRole('button',{name,exact:true});

const webFixtures = new Map();
const searchUrls = [], searchOwners = [];
let completedId, archivedId, deletedId;
async function openFixture(url, title) {
  webFixtures.set(url, title);
  const opened=ctx.waitForEvent('page');
  await worker.evaluate(()=>chrome.tabs.create({url:'about:blank',active:true}));
  const p=await opened;
  await p.goto(url);
  await until(async () => Object.values((await state()).threads).some(t => t.tabs.some(x => x.url === url && x.title === title)));
  return p;
}
const ownerOf = async url => Object.values((await state()).threads).find(t => t.tabs.some(x => x.url === url));
const taskCard = async threadId => dash.locator('.task-card').filter({has:dash.getByRole('heading',{name:(await state()).threads[threadId].title,exact:true})});
async function taskAction(threadId, action) {
  await dash.bringToFront();
  const card = await taskCard(threadId);
  await btn(card,'Task actions').click();
  await btn(card,action).click();
}

try{await launch();
await test('native toolbar popup',async()=>{const popupContexts=await worker.evaluate(async()=>{const t=(await chrome.tabs.query({url:chrome.runtime.getURL('dashboard.html')})).at(-1);await chrome.tabs.update(t.id,{active:true});await chrome.windows.update(t.windowId,{focused:true});await chrome.action.openPopup();for(let n=0;n<20;n++){const c=await chrome.runtime.getContexts({contextTypes:['POPUP']});if(c.length)return c;await new Promise(r=>setTimeout(r,50))}return []});console.log('POPUP CONTEXTS '+JSON.stringify(popupContexts));assert.ok(popupContexts.some(c=>c.documentUrl.endsWith('/popup.html')));await dash.bringToFront();await dash.keyboard.press('Escape')});
await btn(dash,'Privacy Center').click();await btn(dash,'Erase All ThreadBack Data').click();await btn(dash,'Yes, Erase Everything').click();await until(async()=>Object.keys((await state()).threads).length===0);
const groups=[['hackathon','EurekaDev-hackathon-submission','code','EurekaDev-hackathon-project-repository'],['shopping','noise-cancelling-headphones-shopping','reviews','noise-cancelling-headphones-review'],['study','quantum-physics-assignment-notes','education','quantum-physics-assignment-reference']];const urls=groups.map(g=>[0,2].map(n=>'http://'+g[n]+'.threadback.test:'+port+'/'+g[n+1]));
await test('automatic tracking + three mixed intent threads',async()=>{for(const group of urls)for(const url of group){const p=await ctx.newPage();await p.goto(url);await until(async()=>Object.values((await state()).threads).some(t=>t.tabs.some(x=>x.url===url)))}const threads=Object.values((await state()).threads);console.log('THREADS '+JSON.stringify(threads.map(t=>({id:t.id,title:t.title,urls:t.tabs.map(x=>x.url)}))));assert.equal(threads.length,3);const matches=urls.map(g=>threads.filter(t=>g.some(u=>t.tabs.some(x=>x.url===u))));assert.ok(matches.every(x=>x.length===1));assert.equal(new Set(matches.map(x=>x[0].id)).size,3)});
await test('Resume Task + closed-tab restoration + open-tab reuse',async()=>{const thread=Object.values((await state()).threads).find(t=>t.tabs.some(x=>x.url===urls[0][0]));assert.ok(thread);const c=dash.locator('.task-card').filter({has:dash.getByRole('heading',{name:thread.title,exact:true})});const first=ctx.pages().find(p=>p.url()===urls[0][0]);await first.close();await dash.bringToFront();await btn(c,'Resume Task').click({noWaitAfter:true});await dash.getByRole('dialog',{name:'Resume briefing'}).waitFor();await until(()=>Promise.resolve(ctx.pages().some(p=>p.url()===urls[0][0])));assert.ok(await dash.getByRole('dialog').innerText().then(t=>t.includes(thread.title)));await dash.keyboard.press('Escape');await dash.bringToFront();const before=ctx.pages().filter(p=>urls[0].includes(p.url())).length;await btn(c,'Resume Task').click({noWaitAfter:true});await dash.getByRole('dialog',{name:'Resume briefing'}).waitFor();assert.equal(ctx.pages().filter(p=>urls[0].includes(p.url())).length,before);await dash.keyboard.press('Escape')});

await test('real Google fixtures keep three overlapping searches separate',async()=>{
  const queries=['EurekaDev hackathon software submission','software engineering internship','ANC headphones'];
  for(const query of queries){
    const url='https://www.google.com/search?q='+encodeURIComponent(query);
    searchUrls.push(url);
    await openFixture(url,query+' - Google Search');
    searchOwners.push((await ownerOf(url)).id);
  }
  assert.equal(new Set(searchOwners).size,3);
});
await test('actual MV3 worker termination safely recovers saved search evidence',async()=>{
  const marker='audit-'+Date.now();
  await worker.evaluate(marker=>{globalThis.__threadbackSmokeMarker=marker},marker);
  const cdp=await ctx.newCDPSession(dash);
  const versions=[];
  cdp.on('ServiceWorker.workerVersionUpdated',p=>versions.push(...p.versions));
  await cdp.send('ServiceWorker.enable');
  await until(async()=>versions.some(v=>v.scriptURL===worker.url()&&v.runningStatus==='running'));
  const version=versions.filter(v=>v.scriptURL===worker.url()&&v.runningStatus==='running').at(-1);
  await cdp.send('ServiceWorker.stopWorker',{versionId:version.versionId});
  await until(async()=>{
    await dash.evaluate(()=>chrome.runtime.sendMessage({type:'GET_ALL_THREADS'})).catch(()=>{});
    for(const candidate of ctx.serviceWorkers()){
      try{if(await candidate.evaluate(()=>globalThis.__threadbackSmokeMarker)!==marker){worker=candidate;return true}}catch{/* A stopped worker can reject evaluation while its replacement starts. */}
    }
    return false;
  });
  await cdp.detach();
  const result='https://devpost.com/software/eurekadev-audit';
  await openFixture(result,'EurekaDev Hackathon Submission - Devpost');
  assert.equal((await ownerOf(result)).id,searchOwners[0]);
});
await test('interleaved no-opener results retain cross-domain context without fabricated queries',async()=>{
  const fixtures=[
    ['https://careers.example/internship','Software Engineering Internship Careers',1],
    ['https://unstop.com/hackathons/eurekadev-audit','Apply EurekaDev Hackathon Submission - Unstop',0],
    ['https://www.youtube.com/watch?v=eurekadev-audit','EurekaDev Hackathon Demo - YouTube',0],
    ['https://reviews.example/anc','ANC Headphones Comparison',2],
    ['https://github.com/team/eurekadev-audit','EurekaDev Hackathon Repository - GitHub',0],
    ['https://chatgpt.com/c/eurekadev-audit','EurekaDev Hackathon Architecture - ChatGPT',0],
  ];
  for(const [url,title,owner] of fixtures){
    await openFixture(url,title);
    const thread=await ownerOf(url);
    assert.equal(thread.id,searchOwners[owner],title);
    assert.equal(thread.events.filter(e=>e.url===url).some(e=>e.searchQuery),false);
    assert.equal(await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url)?.openerTabId,url),undefined);
  }
});
await test('unrelated YouTube and ChatGPT topics sharing Python remain separate',async()=>{
  const ids=[];
  for(const [url,title] of [
    ['https://www.youtube.com/watch?v=python-astronomy','Python Astronomy Orbital Analysis - YouTube'],
    ['https://www.youtube.com/watch?v=python-auth','Python Django Authentication - YouTube'],
    ['https://chatgpt.com/c/python-astronomy','Python Astronomy Orbital Analysis - ChatGPT'],
    ['https://chatgpt.com/c/python-baking','Python Sourdough Baking Timer - ChatGPT'],
  ]){
    await openFixture(url,title);ids.push((await ownerOf(url)).id);
  }
  assert.notEqual(ids[0],ids[1]);
  assert.notEqual(ids[2],ids[3]);
  assert.ok(ids.every(id=>!searchOwners.includes(id)));
});
await test('real worker Resume rejects stored dangerous URI fixtures',async()=>{
  const threadId=searchOwners[0];
  const unsafe=['javascript:alert(1)','data:text/html,unsafe','file:///tmp/unsafe','blob:https://example.com/id','filesystem:https://example.com/temporary/x','chrome://settings','edge://settings','about:blank','malformed URL'];
  await worker.evaluate(async({threadId,unsafe})=>{
    const key='threadback_data_v1',s=(await chrome.storage.local.get(key))[key];
    s.threads[threadId].tabs.push(...unsafe.map((url,i)=>({id:'unsafe-'+i,url,title:'Unsafe fixture',domain:'',lastAccessed:Date.now(),isClosed:true,order:100+i})));
    await chrome.storage.local.set({[key]:s});
  },{threadId,unsafe});
  await until(async()=> (await dash.evaluate(threadId=>chrome.runtime.sendMessage({type:'GET_THREAD_BY_ID',threadId}),threadId)).thread.tabs.some(t=>t.id==='unsafe-0'));
  const before=await worker.evaluate(()=>chrome.tabs.query({}));
  const response=await dash.evaluate(threadId=>chrome.runtime.sendMessage({type:'RESUME_TASK',threadId}),threadId);
  assert.equal(response.success,true);
  assert.ok(response.briefing.restoredTabs.every(t=>/^https?:\/\//i.test(t.url)));
  assert.ok(!response.briefing.restoredTabs.some(t=>unsafe.includes(t.url)));
  assert.equal((await worker.evaluate(()=>chrome.tabs.query({}))).length,before.length);
  await worker.evaluate(async threadId=>{
    const key='threadback_data_v1',s=(await chrome.storage.local.get(key))[key];
    s.threads[threadId].tabs=s.threads[threadId].tabs.filter(t=>!t.id.startsWith('unsafe-'));
    await chrome.storage.local.set({[key]:s});
  },threadId);
});
await test('manual completion, archive and deletion survive later real activity',async()=>{
  completedId=searchOwners[0];archivedId=searchOwners[2];
  deletedId=(await ownerOf(urls[2][0])).id;assert.equal(new Set([completedId,archivedId,deletedId]).size,3);
  await taskAction(completedId,'Mark Complete');
  await until(async()=>(await state()).threads[completedId].status==='LIKELY_COMPLETE');
  const markedAt=(await state()).threads[completedId].updatedAt;
  const active=ctx.pages().find(p=>p.url()===urls[0][0]);
  await active.bringToFront();
  await until(async()=>(await state()).threads[completedId].events.some(e=>e.timestamp>=markedAt&&e.eventType==='tab_activated'));
  assert.equal((await state()).threads[completedId].status,'LIKELY_COMPLETE');
  await taskAction(archivedId,'Archive');
  await until(async()=>(await state()).threads[archivedId].status==='ARCHIVED');
  await taskAction(deletedId,'Delete Thread');
  await until(async()=>!(await state()).threads[deletedId]);
});

await test('fixed-code persistence after browser restart',async()=>{const before=await state();await ctx.close();await launch();const after=await state();assert.deepEqual(Object.keys(after.threads).sort(),Object.keys(before.threads).sort());assert.equal(after.privacy.allowPageContentAnalysis,false);assert.equal(after.threads[completedId].status,'LIKELY_COMPLETE');assert.equal(after.threads[archivedId].status,'ARCHIVED');assert.equal(after.threads[deletedId],undefined);await taskAction(completedId,'Mark Active');await until(async()=>(await state()).threads[completedId].status==='ACTIVE')});
await test('one final actual-extension smoke',async()=>{await btn(dash,'Demo Data').click();await until(async()=>await dash.locator('.task-card').count()===3);await btn(dash,'Why?').first().click();await dash.getByRole('dialog').waitFor();await dash.keyboard.press('Escape');await dash.screenshot({path:'release/screenshots/dashboard.png'});const popup=await ctx.newPage();await popup.setViewportSize({width:380,height:600});await popup.goto('chrome-extension://'+id+'/popup.html');await btn(popup,'Resume Task Context').waitFor();await popup.screenshot({path:'release/screenshots/popup.png'});await popup.close();await btn(dash,'Privacy Center').click();assert.equal(await dash.getByLabel('Page content analysis (unavailable)').isChecked(),false);await dash.keyboard.press('Escape');assert.deepEqual(errors,[])});
}catch(e){results.push({name:'runtime',status:'BLOCKED',error:e.stack})}finally{await ctx?.close().catch(()=>{});server.close();await fs.writeFile('release/smoke-results.json',JSON.stringify({results,errors},null,2));assert.ok(profile.startsWith(path.join(os.tmpdir(),'threadback-smoke-')));await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});console.log('SUMMARY '+JSON.stringify(results));if(results.some(r=>r.status!=='PASS'))process.exitCode=1}
