/* global chrome, process, setTimeout, setInterval, console, URL, document */
// Real MV3 browser audit. Only synthetic fixtures and an isolated profile are used.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.THREADBACK_PLAYWRIGHT_MODULE || 'playwright');
await fs.mkdir('release/screenshots', { recursive: true });
const profile = process.env.THREADBACK_AI_REUSE_PROFILE || await fs.mkdtemp(path.join(os.tmpdir(), 'threadback-ai-first-'));
if (process.env.THREADBACK_AI_REUSE_PROFILE) {
  assert.ok(path.basename(profile).startsWith('threadback-ai-first-'));
  assert.equal(path.dirname(path.resolve(profile)).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
}
const dist = path.resolve(process.env.THREADBACK_DIST || 'dist'), fixtures = new Map(), results = [], errors = [], requests = [];
let context, worker, dashboard, extensionId;
const options = { headless: true, executablePath: process.env.THREADBACK_CHROMIUM_EXECUTABLE,
  args: ['--disable-extensions-except=' + dist, '--load-extension=' + dist, '--host-resolver-rules=MAP * ~NOTFOUND', '--no-proxy-server'], viewport: { width: 1280, height: 900 } };
const state = () => dashboard.evaluate(async () => (await chrome.storage.local.get('threadback_data_v1')).threadback_data_v1);
const message = value => dashboard.evaluate(value => chrome.runtime.sendMessage(value), value);
const owner = async url => Object.values((await state()).threads).find(t => t.tabs.some(tab => tab.url === url));
async function until(fn, timeout = 60000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Timed out waiting for persisted browser state'); }
async function test(name, fn) { try { const detail = await fn(); results.push({ name, status: 'PASS', detail }); } catch (e) { results.push({ name, status: 'FAIL', error: e.message }); } console.log(JSON.stringify(results.at(-1))); }
async function guardWorker() {
  if (process.env.THREADBACK_AI_DIAG_KEEPALIVE) await worker.evaluate(() => { globalThis.__auditKeepAlive = setInterval(() => chrome.runtime.getPlatformInfo(), 10000); });
  worker.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_')) errors.push(m.text()); });
  await worker.evaluate(() => { globalThis.__modelRequests = []; globalThis.__auditRawEvents = []; chrome.tabs.onUpdated.addListener((id, info, tab) => globalThis.__auditRawEvents.push({ id, info, url: tab.url, title: tab.title, status: tab.status })); const original = globalThis.fetch; globalThis.fetch = (...args) => { const url = String(args[0]?.url || args[0]); globalThis.__modelRequests.push(url); if (/^https?:/i.test(url)) return Promise.reject(Error('Audit blocks external fetch: ' + url)); return original(...args); }; });
}
async function launch() {
  context = await chromium.launchPersistentContext(profile, options);
  context.on('request', request => { requests.push({url:request.url(),at:Date.now()}); if (/models\/|wasm\//.test(request.url())) console.log('MODEL_REQUEST ' + request.url()); });
  context.on('requestfinished', request => requests.push({url:request.url(),finished:true,at:Date.now()}));
  context.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_')) errors.push(m.text()); });
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  await context.route(/^https?:/, async route => { const title = fixtures.get(route.request().url()); if (title) await route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="utf-8"><title>' + title + '</title><h1>Synthetic audit fixture</h1>' }); else await route.abort(); });
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'); extensionId = new URL(worker.url()).host;
  worker.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_')) errors.push(m.text()); });
  await guardWorker(); dashboard = await context.newPage(); await dashboard.goto('chrome-extension://' + extensionId + '/dashboard.html');
  await message({ type: 'GET_ALL_THREADS' });
}
async function open(url, title, timeout = 60000) { fixtures.set(url, title); const page = await context.newPage(); await page.goto(url); await until(async () => (await owner(url))?.tabs.some(tab => tab.url === url && tab.title === title), timeout).catch(async error => { throw Error(error.message + ' ' + JSON.stringify({url, expectedTitle:title, documentTitle:await page.title(), savedTitle:(await owner(url))?.tabs.find(tab=>tab.url===url)?.title})); }); return page; }
async function restartWorker() {
  const marker = Date.now(); await worker.evaluate(marker => globalThis.__auditMarker = marker, marker);
  const cdp = await context.newCDPSession(dashboard), versions = [];
  cdp.on('ServiceWorker.workerVersionUpdated', p => versions.push(...p.versions)); await cdp.send('ServiceWorker.enable');
  const version = await until(async () => versions.find(v => v.scriptURL === worker.url() && v.runningStatus === 'running'));
  await cdp.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  await until(() => versions.some(v => v.versionId === version.versionId && v.runningStatus === 'stopped'));
  await until(async () => { await Promise.race([message({ type: 'GET_ALL_THREADS' }).catch(() => {}), new Promise(resolve => setTimeout(resolve, 250))]); for (const candidate of context.serviceWorkers()) { try { if (await candidate.evaluate(() => globalThis.__auditMarker) !== marker) { worker = candidate; return true; } } catch { /* Stopped workers reject evaluation. */ } } return false; }, 120000);
  await guardWorker(); await cdp.detach();
}
async function targetedRerun() {
  const first = await open('https://devpost.com/software/eurekadev', 'EurekaDev Hackathon Submission', 120000);
  await open('https://eurekadev.devpost.com/rules', 'EurekaDev 2026 - Official Rules & Guidelines');
  const target = await owner(first.url()); const url = first.url();
  await restartWorker(); await first.close();
  await test('closed-tab metadata after worker restart', async () => { await until(async () => (await owner(url)).tabs.find(t => t.url === url).isClosed, 3000); });
  await test('Resume actual reuse/reopen despite stale closed metadata', async () => {
    const result = await message({ type: 'RESUME_TASK', threadId: target.id }); assert.equal(result.success, true);
    assert.equal(result.briefing.restoredTabCount, 1);
    await until(async () => (await worker.evaluate(() => chrome.tabs.query({}))).some(t => t.url === url));
    await message({ type: 'RESUME_TASK', threadId: target.id });
    const tabs = await worker.evaluate(() => chrome.tabs.query({}));
    for (const tab of target.tabs) assert.equal(tabs.filter(t => t.url === tab.url).length, 1);
  });
  await test('unsafe schemes cannot restore through the real worker', async () => {
    const schemes = ['javascript:alert(1)', 'data:text/html,unsafe', 'file:///private', 'blob:https://example.test/id', 'filesystem:https://example.test/a', 'chrome://settings', 'edge://settings', 'about:blank', 'malformed'];
    await worker.evaluate(async ({ target, schemes }) => { const key = 'threadback_data_v1'; const data = (await chrome.storage.local.get(key))[key]; data.threads['unsafe-audit'] = { ...target, id: 'unsafe-audit', isLatent: false, tabs: schemes.map((url, i) => ({ ...target.tabs[0], id: 'unsafe-' + i, url })) }; await chrome.storage.local.set({ [key]: data }); }, { target, schemes });
    await until(async () => (await message({ type: 'GET_ALL_THREADS' })).threads.some(t => t.id === 'unsafe-audit'));
    const before = await worker.evaluate(() => chrome.tabs.query({})); const result = await message({ type: 'RESUME_TASK', threadId: 'unsafe-audit' });
    assert.equal(result.briefing.restoredTabCount, 0); assert.equal((await worker.evaluate(() => chrome.tabs.query({}))).length, before.length);
    await message({ type: 'DELETE_THREAD', threadId: 'unsafe-audit' });
  });
  await test('no unexpected console errors with startup network blocked', async () => assert.deepEqual(errors, []));
}

async function incidentalOpenerCheck(suffix = '') {
  const cases = [
    ['https://devpost.com/software/eurekadev', 'EurekaDev Hackathon Submission', 'https://policies.example/eurekadev', 'Privacy Policy'],
    ['https://rtings.com/audit-headphones', 'ANC headphones product research', 'https://shipping.example/policy', 'Headphones shipping and returns policy'],
  ];
  const observed = [];
  for (const [parentUrl, parentTitle, childBase, title] of cases) {
    let parent = (await worker.evaluate(() => chrome.tabs.query({}))).find(tab => tab.url === parentUrl);
    if (!parent) { await open(parentUrl, parentTitle, 360000); parent = (await worker.evaluate(() => chrome.tabs.query({}))).find(tab => tab.url === parentUrl); }
    const childUrl = childBase + suffix;
    fixtures.set(childUrl, title);
    // Attach Playwright routing before navigating; chrome.tabs.create(url) can race fixture interception.
    const newPage = context.waitForEvent('page');
    await worker.evaluate(openerTabId => chrome.tabs.create({ url: 'about:blank', openerTabId, active: true }), parent.id);
    const page = await newPage; await page.goto(childUrl);
    await until(async () => (await owner(childUrl))?.tabs.some(tab => tab.url === childUrl && tab.title === title), 120000).catch(async error => { throw Error(error.message + ' ' + JSON.stringify({url:childUrl, expectedTitle:title, documentTitle:await page.title(), savedTitle:(await owner(childUrl))?.tabs.find(tab=>tab.url===childUrl)?.title})); });
    const child = await owner(childUrl);
    assert.notEqual(child.id, (await owner(parentUrl)).id);
    assert.ok(child.events.some(event => event.url === childUrl && event.openerTabId === parent.id));
    observed.push({ title, persistedTitle: child.tabs.find(tab => tab.url === childUrl).title, actualOpener: true });
  }
  return observed;
}

async function stateAudit() {
  const data = await state();
  const find = url => Object.values(data.threads).find(thread => thread.tabs.some(tab => tab.url === url));
  const original = find('https://devpost.com/software/eurekadev');
  const rows = ['react', 'physics', 'internship'].map(slug => {
    const url = 'https://chatgpt.com/c/audit-' + slug, thread = find(url);
    return { slug, title: thread?.tabs.find(tab => tab.url === url)?.title, joinedOriginal: thread?.id === original?.id,
      assignment: thread?.events.find(event => event.url === url && Number.isFinite(event.semanticSimilarity))?.semanticSimilarity };
  });
  console.log('CONTROL_OWNERS ' + JSON.stringify(rows));
  await test('exact requested ChatGPT controls in persisted real-browser evidence', async () => {
    assert.ok(rows.filter(row => ['react', 'internship'].includes(row.slug)).every(row => !row.joinedOriginal), JSON.stringify(rows));
    return rows;
  });
  for (const url of ['https://policies.example/eurekadev','https://shipping.example/policy']) {
    const thread = find(url); console.log('OPENER_EVIDENCE ' + JSON.stringify({ url, events: thread?.events.filter(event => event.url === url).map(event => ({ title: event.title, type: event.eventType, score: event.semanticSimilarity })) }));
  }
  const response = await message({ type: 'LOAD_DEMO_DATA' }); const ids = response.threads.map(thread => thread.id);
  await test('isolated complete/archive/delete and worker restart', async () => {
    await message({ type: 'SET_THREAD_STATUS', threadId: ids[0], status: 'LIKELY_COMPLETE' });
    await message({ type: 'SET_THREAD_STATUS', threadId: ids[1], status: 'ARCHIVED' });
    await message({ type: 'DELETE_THREAD', threadId: ids[2] });
    await restartWorker(); const saved = await state();
    assert.equal(saved.threads[ids[0]].status, 'LIKELY_COMPLETE'); assert.equal(saved.threads[ids[1]].status, 'ARCHIVED'); assert.ok(!saved.threads[ids[2]]);
  });
  await test('isolated manual state persistence across browser restart', async () => {
    await context.close(); await launch(); const saved = await state();
    assert.equal(saved.threads[ids[0]].status, 'LIKELY_COMPLETE'); assert.equal(saved.threads[ids[1]].status, 'ARCHIVED'); assert.ok(!saved.threads[ids[2]]);
  });
}
async function continuousManagerAudit() {
  await test('controlled cross-source review/video and comparison workflows reconcile',async()=>{
    // Synthetic reconstruction only; original five titles/URLs were unavailable.
    const pages=[['https://rtings.com/controlled-v131/review','The 4 Best On-Ear Headphones of 2026'],
      ['https://youtube.com/watch?v=controlled-v131-a','Best on-ear headphones review'],
      ['https://youtube.com/watch?v=controlled-v131-b','On-ear headphones compared'],
      ['https://chatgpt.com/controlled-v131/a','Headphone Alternatives Comparison'],
      ['https://chatgpt.com/controlled-v131/b','Compare on-ear headphone alternatives']];
    for(const [url,title]of pages.slice(0,3))await open(url,title);
    const a=await owner(pages[0][0]);assert.equal(a.tabs.length,3);
    await dashboard.evaluate(async id=>{const key='threadback_data_v1',data=(await chrome.storage.local.get(key))[key];delete data.threads[id];await chrome.storage.local.set({[key]:data});},a.id);
    await message({type:'GET_ALL_THREADS'});
    for(const [url,title]of pages.slice(3))await open(url,title);
    const b=await owner(pages[3][0]);assert.equal(b.tabs.length,2);
    const start=Date.now();
    await dashboard.evaluate(async a=>{const key='threadback_data_v1',data=(await chrome.storage.local.get(key))[key];data.threads[a.id]=a;await chrome.storage.local.set({[key]:data});},a);
    await message({type:'RECONCILE_WORKSPACE'});
    const merged=await owner(pages[0][0]);assert.equal(merged.tabs.length,5);assert.equal(merged.status,'ACTIVE');
    assert.equal((await owner(pages[3][0])).id,merged.id);
    const diagnostics=(await message({type:'GET_RECONCILIATION_DIAGNOSTICS'})).diagnostics;
    const decision=diagnostics.find(d=>d.decision==='MERGE' && [a.id,b.id].includes(d.threadId));assert.ok(decision);
    assert.ok((await state()).threads[merged.id].lastReconciledAt);
    const ms=Date.now()-start;await restartWorker();assert.equal((await owner(pages[0][0])).tabs.length,5);
    return {controlledFixture:true,ms,cycles:1,decision};
  });

  await test('continuous: closed one-off stays hidden and expires without closing tabs', async () => {
    const p=await open('https://lookup.fixture.test/once','Random one-time lookup reference');const url=p.url();await p.close();
    await until(async()=>{
      const all=await dashboard.evaluate(()=>chrome.storage.local.get(null));
      const t=Object.values(all.threadback_data_v1?.threads || {}).find(t=>t.tabs.some(tab=>tab.url===url));
      const pending=[...(all.threadback_data_v1?.pendingEvents || []),...Object.entries(all).filter(([key])=>key.startsWith('threadback_pending_v1:')).map(([,event])=>event)];
      return t?.tabs.every(tab=>tab.isClosed) && !pending.some(event=>event.url===url) && Date.now()-t.updatedAt>1000;
    },15000);assert.equal((await owner(url)).isLatent,true);
    const count=(await worker.evaluate(()=>chrome.tabs.query({}))).length;
    await dashboard.evaluate(async url=>{const key='threadback_data_v1';const data=(await chrome.storage.local.get(key))[key];
      const t=Object.values(data.threads).find(t=>t.tabs.some(tab=>tab.url===url));const old=Date.now()-7*3600000;t.updatedAt=old;t.tabs.forEach(tab=>{tab.lastAccessed=old;});t.events.forEach(event=>{event.timestamp=old;});await chrome.storage.local.set({[key]:data});},url);
    await message({type:'RECONCILE_WORKSPACE'});await until(async()=>!await owner(url),5000);assert.equal((await worker.evaluate(()=>chrome.tabs.query({}))).length,count);
  });
  let a,splitSource,splitAction;
  await test('continuous: latent promotion immediately merges the duplicate EurekaDev/video workflow', async()=>{
    await open('https://devpost.com/continuous/submission','EurekaDev Hackathon Submission');
    await open('https://devpost.com/continuous/requirements','EurekaDev project submission requirements');
    await open('https://chatgpt.com/continuous/guide','Branch · Hackathon participation guide');
    a=await owner('https://devpost.com/continuous/submission');assert.equal(a.tabs.length,3);
    await dashboard.evaluate(async id=>{const key='threadback_data_v1';const data=(await chrome.storage.local.get(key))[key];delete data.threads[id];await chrome.storage.local.set({[key]:data});},a.id);
    await message({type:'GET_ALL_THREADS'});
    await open('https://youtube.com/watch?v=continuous-first','How To Submit A Hackathon');
    assert.equal((await owner('https://youtube.com/watch?v=continuous-first')).isLatent,true);
    await dashboard.evaluate(async a=>{const key='threadback_data_v1';const data=(await chrome.storage.local.get(key))[key];data.threads[a.id]=a;await chrome.storage.local.set({[key]:data});},a);
    await message({type:'GET_ALL_THREADS'});
    await open('https://youtube.com/watch?v=continuous-second','Hackathon submission tutorial');
    const merged=await owner('https://youtube.com/watch?v=continuous-second');assert.equal(merged.id,a.id);assert.equal(merged.tabs.length,5);
    assert.ok(merged.managerActions.some(action=>action.kind==='MERGE'));a=merged;
  });
  await test('continuous: distinct purposes and arbitrary-order returns remain separate',async()=>{
    await open('https://careers.fixture.test/guide','Software internship application guide');
    await open('https://careers.fixture.test/requirements','Google SWE internship requirements');
    const internship=await owner('https://careers.fixture.test/guide');assert.notEqual(internship.id,a.id);
    await open('https://shop.fixture.test/product','Sony WH-1000XM5 noise cancelling headphones');
    await open('https://review.fixture.test/product','Independent Sony WH-1000XM5 headphone review');
    const shopping=await owner('https://shop.fixture.test/product');assert.ok(![a.id,internship.id].includes(shopping.id));
    await open('https://devpost.com/continuous/return','EurekaDev hackathon submission guide');assert.equal((await owner('https://devpost.com/continuous/return')).id,a.id);
    await open('https://careers.fixture.test/return','Software engineering internship application requirements');assert.equal((await owner('https://careers.fixture.test/return')).id,internship.id);
    await message({type:'RECONCILE_WORKSPACE'});assert.notEqual((await owner('https://careers.fixture.test/guide')).id,(await owner('https://devpost.com/continuous/submission')).id);
  });
  await test('continuous: mixed multi-page workflow splits with real BGE evidence',async()=>{
    await open('https://language.fixture.test/one','Practice French vowel pronunciation');await open('https://language.fixture.test/two','French vowel pronunciation exercises');
    await open('https://repair.fixture.test/one','Bicycle derailleur repair');await open('https://repair.fixture.test/two','Fix a skipping bicycle chain');
    const left=await owner('https://language.fixture.test/one'),right=await owner('https://repair.fixture.test/one');assert.notEqual(left.id,right.id);
    await dashboard.evaluate(async({left,right})=>{const key='threadback_data_v1';const data=(await chrome.storage.local.get(key))[key];
      data.threads[left.id]={...left,tabs:[...left.tabs,...right.tabs],events:[...left.events,...right.events],semanticPages:undefined,centroidEmbedding:undefined,workflowEmbedding:undefined,workflowDocumentKey:undefined,embeddingModelVersion:undefined,isManualCorrection:false,preserveSemanticBoundary:false,isLatent:false};
      delete data.threads[right.id];await chrome.storage.local.set({[key]:data});},{left,right});
    await message({type:'RECONCILE_WORKSPACE'});splitSource=await owner('https://language.fixture.test/one');const other=await owner('https://repair.fixture.test/one');
    assert.notEqual(splitSource.id,other.id);splitAction=splitSource.managerActions.find(action=>action.kind==='SPLIT');assert.ok(splitAction);
  });
  await test('continuous: action history and Undo are usable in the actual Timeline',async()=>{
    await dashboard.reload();const source=await owner('https://language.fixture.test/one');
    const card=dashboard.locator('.task-card').filter({has:dashboard.getByRole('heading',{name:source.title,exact:true})}).first();
    await card.getByRole('button',{name:'Timeline',exact:true}).click();const dialog=dashboard.getByRole('dialog');await dialog.getByRole('button',{name:'Undo split',exact:true}).click();
    await until(async()=>(await owner('https://language.fixture.test/one')).id===(await owner('https://repair.fixture.test/one')).id);
    const merged=await owner('https://language.fixture.test/one');assert.equal(merged.tabs.length,4);assert.ok(merged.managerActions.some(action=>action.id===splitAction.id&&action.undone));
    const result=await message({type:'SPLIT_THREAD',sourceThreadId:merged.id,tabUrlsToExtract:['https://repair.fixture.test/one','https://repair.fixture.test/two'],newThreadTitle:'Controlled repair task'});assert.equal(result.success,true);
  });
  await test('continuous: closed stale promoted task archives and new evidence reactivates it',async()=>{
    for(const p of context.pages())if(p.url().startsWith('https://language.fixture.test/'))await p.close();
    await until(async()=>(await owner('https://language.fixture.test/one')).tabs.every(tab=>tab.isClosed));
    const source=await owner('https://language.fixture.test/one');
    await dashboard.evaluate(async id=>{const key='threadback_data_v1';const data=(await chrome.storage.local.get(key))[key];const t=data.threads[id],old=Date.now()-40*86400000;
      t.updatedAt=old;t.tabs.forEach(tab=>{tab.lastAccessed=old;});t.events.forEach(event=>{event.timestamp=old;});await chrome.storage.local.set({[key]:data});},source.id);
    await message({type:'RECONCILE_WORKSPACE'});assert.equal((await owner('https://language.fixture.test/one')).status,'ARCHIVED');
    await open('https://language.fixture.test/return','French vowel pronunciation practice drills');const returned=await owner('https://language.fixture.test/return');
    assert.equal(returned.id,source.id);assert.equal(returned.status,'ACTIVE');
  });
  await test('continuous: grounded rename follows grouping without changing membership',async()=>{
    const task=await owner('https://shop.fixture.test/product');const urls=task.tabs.map(tab=>tab.url).sort();
    await dashboard.evaluate(async id=>{const key='threadback_data_v1';const data=(await chrome.storage.local.get(key))[key];
      data.threads[id].title='Opaque imported label';data.threads[id].isManualCorrection=false;await chrome.storage.local.set({[key]:data});},task.id);
    await message({type:'RECONCILE_WORKSPACE'});const renamed=await owner('https://shop.fixture.test/product');
    assert.notEqual(renamed.title,'Opaque imported label');assert.deepEqual(renamed.tabs.map(tab=>tab.url).sort(),urls);
    assert.ok(renamed.managerActions.some(action=>action.kind==='RENAME'));
  });
  await test('continuous: history/cache persist and offline inference remains local',async()=>{
    await restartWorker();const returned=await owner('https://language.fixture.test/return');assert.ok(returned.managerActions.length);
    const diagnostics=(await message({type:'GET_ALL_THREADS'})).modelDiagnostics;assert.equal(diagnostics.blockedRequests,0);assert.ok(diagnostics.assets.every(url=>!/^https?:/.test(url)));
  });
}
let hackathon, physics, deletedId, archivedId;
try {
  await launch();
  if (process.env.THREADBACK_CONTINUOUS_ONLY) { await message({type:'CLEAR_ALL_DATA'}); await continuousManagerAudit(); await test('no unexpected console or worker errors',async()=>assert.deepEqual(errors,[])); } else if (process.env.THREADBACK_V120_OPENER_ONLY) { await test('real incidental opener links remain separate', () => incidentalOpenerCheck('?verified=1')); } else if (process.env.THREADBACK_BGE_STATE_AUDIT) { await stateAudit(); } else {
  await message({ type: 'CLEAR_ALL_DATA' });
  if (process.env.THREADBACK_AI_TARGETED) { await targetedRerun(); } else {
  await test('worker/dashboard/popup load', async () => { assert.ok(await dashboard.title()); const popup = await context.newPage(); await popup.setViewportSize({ width: 400, height: 650 }); await popup.goto('chrome-extension://' + extensionId + '/popup.html'); await popup.screenshot({ path: 'release/screenshots/ai-first-popup.png' }); await popup.keyboard.press('Tab'); assert.ok(await popup.evaluate(() => document.activeElement?.tagName !== 'BODY')); await popup.close(); });
  const start = Date.now();
  const first = await open('https://devpost.com/software/eurekadev', 'EurekaDev Hackathon Submission', process.env.THREADBACK_AI_BOOTSTRAP_ONLY ? 120000 : 360000);
  await test('local model inference/network off/latent singleton', async () => { hackathon = await owner(first.url()); assert.equal(hackathon.isLatent, true); assert.equal(hackathon.centroidEmbedding.length, 384); const diagnostics = (await message({type:'GET_ALL_THREADS'})).modelDiagnostics; const requests = diagnostics.assets; assert.equal(diagnostics.blockedRequests, 0); assert.ok(!requests.some(url => /^https?:/.test(url))); assert.ok(requests.some(url => url.includes('model_quantized.onnx'))); return { coldInitPlusFirstAssignmentMs: Date.now() - start, requests }; });
  await test('activation does not promote; popup hides singleton', async () => { await dashboard.bringToFront(); await first.bringToFront(); await message({ type: 'GET_ALL_THREADS' }); assert.equal((await owner(first.url())).isLatent, true); const p = await context.newPage(); await p.goto('chrome-extension://' + extensionId + '/popup.html'); assert.ok(!(await p.locator('body').innerText()).includes('Submit EurekaDev Project')); await p.close(); });
  if (!process.env.THREADBACK_AI_BOOTSTRAP_ONLY) {
  await open('https://eurekadev.devpost.com/rules', 'EurekaDev 2026 - Official Rules & Guidelines');
  await test('second related page promotes and preserves both pages', async () => { hackathon = await owner(first.url()); assert.equal(hackathon.isLatent, false); assert.equal(hackathon.tabs.length, 2); });
  await open('https://chatgpt.com/c/hackathon-branch-guide', 'Branch · Hackathon participation guide');
  await test('exact EurekaDev + ChatGPT guide', async () => { const t = await owner('https://chatgpt.com/c/hackathon-branch-guide'); const target = await owner(first.url()); const similarity = t.centroidEmbedding.reduce((sum, x, i) => sum + x * target.centroidEmbedding[i], 0); assert.equal(t.id, target.id, 'Separated at similarity ' + similarity); const observed = t.events.find(event => event.url === 'https://chatgpt.com/c/hackathon-branch-guide' && Number.isFinite(event.semanticSimilarity)); return { assignmentScore: observed?.semanticSimilarity, threshold: observed?.semanticThreshold }; });
  for (const [slug, title] of [['internship', 'Software internship application guide'], ['react', 'React hydration error debugging'], ['physics', 'Quantum physics explanation']]) await open('https://chatgpt.com/c/audit-' + slug, title);
  await test('unrelated ChatGPT controls', async () => { physics = await owner('https://chatgpt.com/c/audit-physics'); const ids = await Promise.all(['react','physics','internship'].map(async slug => (await owner('https://chatgpt.com/c/audit-' + slug)).id)); assert.equal(new Set(ids).size, 3); assert.ok(ids.every(id => id !== hackathon.id)); });
  await test('latent internship reconciliation', async () => {
    const url = 'https://chatgpt.com/c/audit-internship';
    const seed = await owner(url); assert.equal(seed.isLatent, true);
    await open('https://careers.google.com/audit-internship', 'Google SWE internship requirements');
    const promoted = await owner(url); assert.equal(promoted.isLatent, false);
    assert.equal((await owner('https://careers.google.com/audit-internship')).id, promoted.id);
  });
  await test('return to existing intent after unrelated tasks', async () => {
    await open('https://devpost.com/audit-return-submission', 'EurekaDev hackathon submission guide');
    assert.equal((await owner('https://devpost.com/audit-return-submission')).id, hackathon.id);
  });
  await test('independent product/review workflow excludes unrelated science', async () => {
    await open('https://products.fixture.test/sony', 'Buy Sony WH-1000XM5 noise cancelling headphones');
    await open('https://review.fixture.test/sony', 'Independent review of Sony WH-1000XM5 headphones');
    const task = await owner('https://products.fixture.test/sony');
    assert.equal(task.id, (await owner('https://review.fixture.test/sony')).id); assert.equal(task.isLatent, false);
    await open('https://science.fixture.test/neutron', 'Neutron star magnetic field physics');
    assert.notEqual((await owner('https://science.fixture.test/neutron')).id, task.id);
  });
  await test('new-topic tomato workflow and bicycle separation', async () => {
    await open('https://arbitrary.fixture.test/growing', 'How to grow tomatoes indoors');
    await open('https://arbitrary.fixture.test/lighting', 'LED lighting schedule for tomato plants');
    const task = await owner('https://arbitrary.fixture.test/growing');
    assert.equal(task.id, (await owner('https://arbitrary.fixture.test/lighting')).id); assert.equal(task.isLatent, false);
    await open('https://arbitrary.fixture.test/repair', 'Fix bicycle chain skipping');
    const unrelated = await owner('https://arbitrary.fixture.test/repair');
    assert.notEqual(unrelated.id, task.id); assert.equal(unrelated.isLatent, true);
  });
  await open('https://youtube.com/watch?v=hackathon-audit', 'YouTube hackathon demo walkthrough video');
  await open('https://youtube.com/watch?v=physics-audit', 'YouTube quantum physics lecture series chapter 4');
  await test('unrelated YouTube topics', async () => { assert.notEqual((await owner('https://youtube.com/watch?v=hackathon-audit')).id, (await owner('https://youtube.com/watch?v=physics-audit')).id); });
  await open('https://google.com/search?q=EurekaDev+hackathon+submission', 'EurekaDev hackathon submission - Google Search');
  await open('https://unstop.com/eurekadev', 'EurekaDev Hackathon Submission Requirements');
  await test('Google search to cross-domain result without opener', async () => assert.equal((await owner('https://google.com/search?q=EurekaDev+hackathon+submission')).id, (await owner('https://unstop.com/eurekadev')).id));
  await test('real incidental opener links remain separate', () => incidentalOpenerCheck());
  await test('Why/Graph/Timeline and keyboard Escape', async () => { await dashboard.bringToFront(); await dashboard.reload(); await dashboard.screenshot({ path: 'release/screenshots/ai-first-dashboard.png' }); const card = dashboard.locator('.task-card').filter({ has: dashboard.getByRole('heading', { name: hackathon.title, exact: true }) }).first(); for (const label of ['Why?', 'Graph', 'Timeline']) { await card.getByRole('button', { name: label, exact: true }).click(); await dashboard.getByRole('dialog').waitFor(); await dashboard.keyboard.press('Escape'); await dashboard.getByRole('dialog').waitFor({ state: 'hidden' }); } });
  await test('Resume reuses open tabs and reopens a missing tab once', async () => { const url = first.url(); await first.close(); await until(async () => (await owner(url)).tabs.find(t => t.url === url).isClosed); const response = await message({ type: 'RESUME_TASK', threadId: hackathon.id }); assert.equal(response.success, true); assert.equal(response.briefing.restoredTabCount, 1); await until(async () => (await worker.evaluate(() => chrome.tabs.query({}))).some(t => t.url === url)); await message({ type: 'RESUME_TASK', threadId: hackathon.id }); const tabs = await worker.evaluate(() => chrome.tabs.query({})); for (const tab of (await owner(url)).tabs) assert.equal(tabs.filter(openTab => openTab.url === tab.url).length, 1); });
  await test('rename/merge/split', async () => { assert.equal((await message({ type: 'RENAME_THREAD', threadId: hackathon.id, newTitle: 'Controlled hackathon audit' })).success, true); const source = await owner('https://chatgpt.com/c/audit-react'); assert.equal((await message({ type: 'MERGE_THREADS', targetThreadId: hackathon.id, sourceThreadId: source.id })).success, true); assert.equal((await message({ type: 'SPLIT_THREAD', sourceThreadId: hackathon.id, tabUrlsToExtract: ['https://chatgpt.com/c/audit-react'], newThreadTitle: 'Controlled React audit' })).success, true); });
  await test('complete/archive/delete and persistence after worker restart', async () => { archivedId = physics.id; const other = await owner('https://chatgpt.com/c/audit-internship'); deletedId = other.id; await message({ type: 'SET_THREAD_STATUS', threadId: hackathon.id, status: 'LIKELY_COMPLETE' }); await message({ type: 'SET_THREAD_STATUS', threadId: archivedId, status: 'ARCHIVED' }); await message({ type: 'DELETE_THREAD', threadId: deletedId }); await restartWorker(); const data = await state(); assert.equal(data.threads[hackathon.id].status, 'LIKELY_COMPLETE'); assert.equal(data.threads[archivedId].status, 'ARCHIVED'); assert.ok(!data.threads[deletedId]); });
  await test('privacy defaults and exclusion', async () => { const data = await state(); assert.equal(data.privacy.allowPageContentAnalysis, false); assert.equal(data.aiSettings.enabled, false); fixtures.set('https://paypal.com/audit', 'Private synthetic excluded fixture'); const p = await context.newPage(); await p.goto('https://paypal.com/audit'); await message({ type: 'GET_ALL_THREADS' }); assert.ok(!await owner(p.url())); });
  await test('browser restart persists complete/archive/delete/latents', async () => { const before = await state(); await context.close(); await launch(); const after = await state(); assert.equal(after.threads[hackathon.id].status, 'LIKELY_COMPLETE'); assert.equal(after.threads[archivedId].status, 'ARCHIVED'); assert.ok(!after.threads[deletedId]); for (const t of Object.values(before.threads).filter(t => t.isLatent)) assert.equal(after.threads[t.id].isLatent, true); });
  await test('latent expiry/pruning never closes browser tabs', async () => {
    const beforeTabs = await worker.evaluate(() => chrome.tabs.query({}));
    await worker.evaluate(async () => { const key = 'threadback_data_v1'; const data = (await chrome.storage.local.get(key))[key]; const template = Object.values(data.threads)[0];
      for (let i = 0; i < 53; i++) data.threads['prune-audit-' + i] = { ...template, id: 'prune-audit-' + i, status: 'ACTIVE', isLatent: true, updatedAt: Date.now() + i, tabs: [{ ...template.tabs[0], url: 'https://prune.test/' + i }], events: [] };
      data.threads['expired-audit'] = { ...template, id: 'expired-audit', status: 'ACTIVE', isLatent: true, updatedAt: Date.now() - 90000000 };
      await chrome.storage.local.set({ [key]: data }); await chrome.alarms.create('threadback_sync', { when: Date.now() + 1000 });
    });
    await until(async () => { const data = await state(); return !data.threads['expired-audit'] && Object.values(data.threads).filter(t => t.isLatent && t.status === 'ACTIVE').length <= 50; });
    const afterTabs = await worker.evaluate(() => chrome.tabs.query({}));
    assert.deepEqual(afterTabs.map(t => t.id).sort(), beforeTabs.map(t => t.id).sort());
  });
  await test('durable rapid captures survive termination during inference exactly once', async () => {
    await restartWorker();
    await worker.evaluate(() => {
      const original = chrome.runtime.sendMessage.bind(chrome.runtime);
      globalThis.__inferenceHeld = false;
      chrome.runtime.sendMessage = (message, ...args) => {
        const response = original(message, ...args);
        if (message?.target === 'threadback-local-model' && message.type === 'EMBED') {
          globalThis.__inferenceHeld = true;
          return Promise.resolve(response).then(() => new Promise(() => {}));
        }
        return response;
      };
    });
    const urls = Array.from({ length: 3 }, (_, i) => 'https://nature.com/audit-durable-' + i);
    for (const [i, url] of urls.entries()) fixtures.set(url, 'Mitochondrial cellular respiration ATP reference ' + i);
    await Promise.all(urls.map(async url => { const page = await context.newPage(); await page.goto(url); }));
    await until(() => worker.evaluate(() => globalThis.__inferenceHeld));
    const records = await until(async () => {
      const all = await dashboard.evaluate(() => chrome.storage.local.get(null));
      const pending = [...(all.threadback_data_v1?.pendingEvents || []), ...Object.entries(all).filter(([key]) => key.startsWith('threadback_pending_v1:')).map(([, event]) => event)].filter(event => urls.includes(event.url));
      return new Set(pending.map(event => event.url)).size === urls.length ? [...new Map(pending.map(event => [event.id, event])).values()] : null;
    }, 10000);
    const beforeReplay = Object.values((await state()).threads).flatMap(thread => thread.events);
    assert.ok(records.every(record => !beforeReplay.some(event => event.id === record.id)), 'Pending records must not already be committed');
    await restartWorker();
    await until(async () => (await Promise.all(urls.map(owner))).every(Boolean), 120000);
    const data = await state(); const events = Object.values(data.threads).flatMap(thread => thread.events);
    const lost = records.filter(record => !events.some(event => event.id === record.id)).length;
    const duplicates = records.reduce((sum, record) => sum + Math.max(0, events.filter(event => event.id === record.id).length - 1), 0);
    assert.equal(lost, 0); assert.equal(duplicates, 0);
    const all = await dashboard.evaluate(() => chrome.storage.local.get(null));
    assert.ok(records.every(record => !all['threadback_pending_v1:' + record.id]));
    return { persistedBeforeKill: records.length, requestedUrls: urls.length, lost, duplicates };
  });
  await test('Demo Data and erase-all survive worker restart', async () => {
    const demo = await message({type:'LOAD_DEMO_DATA'});
    assert.equal(demo.threads.length, 3); assert.ok(demo.threads.every(thread => thread.isDemo));
    await message({type:'CLEAR_ALL_DATA'});
    await restartWorker();
    const saved = await state(); assert.equal(Object.keys(saved.threads).length, 0);
    const contexts = await worker.evaluate(() => chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']}));
    assert.equal(contexts.length, 0);
  });
  await continuousManagerAudit();
  await test('no unexpected console or worker errors', async () => assert.deepEqual(errors, []));
  }
  }
  }
} catch (error) { 
  const storage = await dashboard?.evaluate(async () => ({storage:await chrome.storage.local.get(null),session:await chrome.storage.session.get(null),tabs:await chrome.tabs.query({})})).catch(e => e.message);
  const workerState = await Promise.race([worker?.evaluate(() => ({requests:globalThis.__modelRequests,events:globalThis.__auditRawEvents})),new Promise(resolve=>setTimeout(()=>resolve('Worker diagnostic timed out'),5000))]).catch(e=>e.message);
  const diagnostics = {storage,workerState,requests};
  await fs.writeFile('release/ai-first-diagnostics.json', JSON.stringify(diagnostics, null, 2));
  console.log('DIAGNOSTICS saved; last requests: ' + JSON.stringify(requests.slice(-8))); results.push({ name: 'browser audit infrastructure', status: 'FAIL', error: error.stack }); }
finally { if (context) await context.close(); await fs.mkdir('release', { recursive: true }); await fs.writeFile(process.env.THREADBACK_CONTINUOUS_ONLY ? 'release/continuous-smoke.json' : process.env.THREADBACK_V120_OPENER_ONLY ? 'release/v120-opener-smoke.json' : process.env.THREADBACK_BGE_STATE_AUDIT ? 'release/bge-state-audit.json' : process.env.THREADBACK_AI_TARGETED ? 'release/ai-first-targeted.json' : 'release/ai-first-smoke.json', JSON.stringify({ results, errors, isolatedProfile: true }, null, 2)); }
console.log(JSON.stringify({ passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status !== 'PASS').length }));
if (results.some(r => r.status !== 'PASS')) process.exitCode = 1;
