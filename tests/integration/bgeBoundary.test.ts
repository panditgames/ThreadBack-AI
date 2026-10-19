import { describe, expect, it } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent } from '../../src/types';
let sequence = 0;
const event = (title: string, domain: string, openerTabId?: number): ActivityEvent => ({
  id: 'bge-boundary-' + (++sequence), tabId: sequence, windowId: 1, url: 'https://' + domain + '/audit/' + sequence,
  title, domain, pathname: '/audit/' + sequence, timestamp: Date.now(), eventType: 'navigation', isInternalBrowserPage: false, openerTabId,
});
describe('BGE release: independently labelled negative controls', () => {
  it('keeps sequential ChatGPT controls separate and returns to the old intent', async () => {
    const engine = new IntentEngine();
    const first = (await engine.processEvent(event('EurekaDev Hackathon Submission', 'devpost.com')))!;
    await engine.processEvent(event('EurekaDev 2026 - Official Rules & Guidelines', 'eurekadev.devpost.com'));
    expect((await engine.processEvent(event('Branch · Hackathon participation guide', 'chatgpt.com')))!.id).toBe(first.id);
    const internship = (await engine.processEvent(event('Software internship application guide', 'chatgpt.com')))!;
    expect(internship.id).not.toBe(first.id);
    expect((await engine.processEvent(event('React hydration error debugging', 'chatgpt.com')))!.id).not.toBe(first.id);
    expect((await engine.processEvent(event('Quantum physics explanation', 'chatgpt.com')))!.id).not.toBe(first.id);
    const related = (await engine.processEvent(event('Google SWE internship requirements', 'careers.google.com')))!;
    expect(related.id).toBe(internship.id);
    expect(related.isLatent).toBe(false);
    expect((await engine.processEvent(event('EurekaDev hackathon submission guide', 'devpost.com')))!.id).toBe(first.id);
  });
  it.each(['software internship application guide', 'summer internship program application', 'student coding program application', 'project application guide'])(
    'keeps an unrelated application task separate: %s', async title => {
      const engine = new IntentEngine(); const first = (await engine.processEvent(event('EurekaDev Hackathon Submission', 'devpost.com')))!;
      await engine.processEvent(event('EurekaDev 2026 - Official Rules & Guidelines', 'eurekadev.devpost.com'));
      expect((await engine.processEvent(event(title, 'chatgpt.com')))!.id).not.toBe(first.id);
    });
  it.each([
    ['EurekaDev Hackathon Submission','devpost.com','Privacy Policy','policies.example'],
    ['EurekaDev Hackathon Submission','devpost.com','GitHub profile - open source developer','github.com'],
    ['ANC headphones product research','rtings.com','Headphones shipping and returns policy','shipping.example'],
    ['Quantum mechanics article reference','nature.com','Software internship application guide','careers.example'],
    ['EurekaDev Hackathon Submission','devpost.com','Software internship application guide','reddit.com'],
    ['EurekaDev Hackathon Submission','devpost.com','Software internship application guide','amazon.com'],
  ])('does not turn an incidental child link into task membership: %s → %s', async (parent, domain, title, childDomain) => {
    const engine = new IntentEngine(); const first = (await engine.processEvent(event(parent, domain)))!;
    expect((await engine.processEvent(event(title, childDomain, first.tabs[0].tabId)))!.id).not.toBe(first.id);
  });
});

it('does not let opener metadata change the decision for ambiguous topic-qualified pages', async () => {
  const outcomes: boolean[] = [];
  for (const opener of [false, true]) {
    const engine = new IntentEngine();
    const parent = (await engine.processEvent(event('EurekaDev Hackathon Submission', 'devpost.com')))!;
    const result = (await engine.processEvent(event('Privacy Policy for EurekaDev Hackathon', 'policies.example', opener ? parent.tabs[0].tabId : undefined)))!;
    outcomes.push(result.id === parent.id);
  }
  expect(outcomes[0]).toBe(outcomes[1]);
});
