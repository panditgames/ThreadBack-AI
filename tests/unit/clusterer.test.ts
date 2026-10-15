import { describe, it, expect, beforeEach } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { inferThreadStatus } from '../../src/engine/statusInferer';
import { inferNextAction } from '../../src/engine/nextActionInferer';
import { ActivityEvent, TabReference } from '../../src/types';

describe('IntentEngine & Clustering Lifecycle', () => {
  let engine: IntentEngine;

  beforeEach(() => {
    engine = new IntentEngine();
  });

  it('creates a new intent thread from initial browsing event', () => {
    const event: ActivityEvent = {
      id: 'ev-1',
      tabId: 1,
      windowId: 1,
      url: 'https://eurekadev.devpost.com/rules',
      title: 'Rules & Guidelines — EurekaDev Hackathon 2026',
      domain: 'eurekadev.devpost.com',
      pathname: '/rules',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const thread = engine.processEvent(event);
    expect(thread).not.toBeNull();
    expect(thread?.title).toContain('EurekaDev');
    expect(thread?.tabs.length).toBe(1);
    expect(thread?.status).toBe('ACTIVE');
  });

  it('clusters related navigation events into the same thread', () => {
    const now = Date.now();
    const eventA: ActivityEvent = {
      id: 'ev-1',
      tabId: 1,
      windowId: 1,
      url: 'https://eurekadev.devpost.com/rules',
      title: 'Rules — EurekaDev Hackathon 2026',
      domain: 'eurekadev.devpost.com',
      pathname: '/rules',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const eventB: ActivityEvent = {
      id: 'ev-2',
      tabId: 2,
      openerTabId: 1,
      windowId: 1,
      url: 'https://github.com/eurekadev-team/threadback-ai',
      title: 'GitHub - eurekadev-team/threadback-ai: EurekaDev Hackathon project',
      domain: 'github.com',
      pathname: '/eurekadev-team/threadback-ai',
      timestamp: now + 5 * 60000,
      eventType: 'tab_opened',
      isInternalBrowserPage: false,
    };

    const threadA = engine.processEvent(eventA);
    const threadB = engine.processEvent(eventB);

    expect(threadA?.id).toBe(threadB?.id);
    expect(threadB?.tabs.length).toBe(2);
    expect(engine.getThreads().length).toBe(1);
  });

  it('separates distinct tasks into separate intent threads', () => {
    const now = Date.now();
    const hackathonEvent: ActivityEvent = {
      id: 'ev-1',
      tabId: 1,
      windowId: 1,
      url: 'https://devpost.com/software/threadback',
      title: 'EurekaDev Hackathon Submission',
      domain: 'devpost.com',
      pathname: '/software/threadback',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const shoppingEvent: ActivityEvent = {
      id: 'ev-2',
      tabId: 2,
      windowId: 1,
      url: 'https://amazon.com/Sony-WH1000XM4/dp/B0863TXGM3',
      title: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Overhead Headphones - Amazon',
      domain: 'amazon.com',
      pathname: '/Sony-WH1000XM4/dp/B0863TXGM3',
      timestamp: now + 30 * 60000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const thread1 = engine.processEvent(hackathonEvent);
    const thread2 = engine.processEvent(shoppingEvent);

    expect(thread1?.id).not.toBe(thread2?.id);
    expect(engine.getThreads().length).toBe(2);
  });

  it('supports renaming an intent thread manually', () => {
    const event: ActivityEvent = {
      id: 'ev-1',
      tabId: 1,
      url: 'https://github.com/my-repo',
      title: 'My Project Repo',
      domain: 'github.com',
      pathname: '/my-repo',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };
    const thread = engine.processEvent(event)!;
    const renamed = engine.renameThread(thread.id, 'Custom Hackathon Sprint');
    expect(renamed?.title).toBe('Custom Hackathon Sprint');
    expect(renamed?.isManualCorrection).toBe(true);
  });

  it('supports merging two threads together', () => {
    const now = Date.now();
    const thread1 = engine.processEvent({
      id: 'ev-1',
      tabId: 1,
      url: 'https://rtings.com/headphones',
      title: 'Best Headphones Reviews',
      domain: 'rtings.com',
      pathname: '/headphones',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    })!;

    const thread2 = engine.processEvent({
      id: 'ev-2',
      tabId: 2,
      url: 'https://amazon.com/headphones',
      title: 'Headphones Deals Amazon',
      domain: 'amazon.com',
      pathname: '/headphones',
      timestamp: now + 4 * 3600000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    })!;

    expect(engine.getThreads().length).toBe(2);

    const merged = engine.mergeThreads(thread1.id, thread2.id);
    expect(merged).not.toBeNull();
    expect(engine.getThreads().length).toBe(1);
    expect(merged?.tabs.length).toBe(2);
    expect(merged?.isManualCorrection).toBe(true);
  });

  it('supports splitting selected tabs into a new intent thread', () => {
    const now = Date.now();
    const event1: ActivityEvent = {
      id: 'ev-1',
      tabId: 1,
      url: 'https://amazon.com/productA',
      title: 'Product A on Amazon',
      domain: 'amazon.com',
      pathname: '/productA',
      timestamp: now,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };
    const event2: ActivityEvent = {
      id: 'ev-2',
      tabId: 2,
      url: 'https://amazon.com/productB',
      title: 'Product B on Amazon',
      domain: 'amazon.com',
      pathname: '/productB',
      timestamp: now + 60000,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    };

    const thread = engine.processEvent(event1)!;
    engine.processEvent(event2);

    const result = engine.splitTabsFromThread(thread.id, ['https://amazon.com/productB'], 'Shortlisted Candidate B');
    expect(result).not.toBeNull();
    expect(engine.getThreads().length).toBe(2);
    expect(result?.sourceThread.tabs.length).toBe(1);
    expect(result?.newThread.tabs.length).toBe(1);
    expect(result?.newThread.title).toBe('Shortlisted Candidate B');
  });
});

describe('Status & Next Action Inference', () => {
  it('infers status as LIKELY_COMPLETE when order or submission confirmation detected', () => {
    const events: ActivityEvent[] = [{
      id: 'ev-done',
      tabId: 1,
      url: 'https://devpost.com/software/threadback/confirmation',
      title: 'Thank You! Submission Confirmed — Devpost',
      domain: 'devpost.com',
      pathname: '/software/threadback/confirmation',
      timestamp: Date.now(),
      eventType: 'navigation',
      isInternalBrowserPage: false,
    }];

    const status = inferThreadStatus(events, [{ id: '1', title: 'Submit', status: 'COMPLETED', confidence: 'Likely', evidence: [] }], []);
    expect(status).toBe('LIKELY_COMPLETE');
  });

  it('infers status as PAUSED when inactive for over 15 minutes with unfinished steps', () => {
    const oldTimestamp = Date.now() - (45 * 60 * 1000); // 45 min ago
    const events: ActivityEvent[] = [{
      id: 'ev-old',
      tabId: 1,
      url: 'https://devpost.com/software/threadback/edit',
      title: 'Edit Project',
      domain: 'devpost.com',
      pathname: '/software/threadback/edit',
      timestamp: oldTimestamp,
      eventType: 'navigation',
      isInternalBrowserPage: false,
    }];

    const status = inferThreadStatus(events, [], [{ id: 'u1', title: 'Upload video', status: 'LIKELY_REMAINING', confidence: 'Likely', evidence: [] }]);
    expect(status).toBe('PAUSED');
  });

  it('infers humble next action for shopping comparison tasks', () => {
    const tabs: TabReference[] = [
      { id: '1', url: 'https://amazon.com/p1', title: 'Sony WH-CH720N Review', domain: 'amazon.com', lastAccessed: Date.now(), isClosed: false, order: 0 },
      { id: '2', url: 'https://amazon.com/p2', title: 'Sennheiser Accentum Review', domain: 'amazon.com', lastAccessed: Date.now(), isClosed: false, order: 1 },
    ];
    const nextAction = inferNextAction('Compare ANC Headphones', [], tabs);
    expect(nextAction.actionText).toContain('Compare specifications');
    expect(['Likely', 'Possibly', 'Inferred from browsing activity']).toContain(nextAction.confidence);
  });
});
