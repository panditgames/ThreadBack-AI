import { describe, it, expect } from 'vitest';
import {
  tinySemanticClassifier,
  PageMetadataInput,
  CandidateThreadMetadataInput
} from '../../src/engine/localIntentClassifier';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent } from '../../src/types';

describe('TinySemanticClassifier behavior', () => {
  describe('8 Target Semantic Scenarios (Ambiguity Resolution)', () => {
    it('Scenario 1: "EurekaDev project submission" vs "How to win a hackathon" -> RELATED', () => {
      const page: PageMetadataInput = {
        title: 'How to Win a Hackathon - Strategy Guide',
        domain: 'medium.com'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 'thread-hackathon',
        title: 'Submit EurekaDev Project',
        keywords: ['eurekadev', 'hackathon', 'submission', 'project'],
        recentTitles: ['EurekaDev Hackathon 2026', 'Project Submission Form']
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('RELATED');
      expect(result.toolCalled).toBe('join_existing_thread');
      expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    });

    it('Scenario 2: "Python Django authentication" vs "Python astronomy orbital analysis" -> UNRELATED', () => {
      const page: PageMetadataInput = {
        title: 'Python Astronomy Orbital Mechanics Analysis and Simulation',
        domain: 'astronomy.org'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 'thread-django',
        title: 'Python Django Authentication and OAuth Login',
        keywords: ['python', 'django', 'authentication', 'oauth', 'login'],
        recentTitles: ['Django Session Authentication', 'OAuth2 Callback View']
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('Scenario 3: YouTube "Hackathon submission tutorial" vs "Quantum mechanics lecture" -> UNRELATED', () => {
      const page: PageMetadataInput = {
        title: 'Introduction to Quantum Mechanics Lecture 1 - YouTube',
        domain: 'youtube.com'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 'thread-yt-hack',
        title: 'Hackathon Submission Video Tutorial Demo',
        keywords: ['hackathon', 'submission', 'tutorial', 'demo', 'youtube'],
        recentTitles: ['ScreenApp Hackathon Screen Recording', 'Pitch Demo']
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
    });

    it('Scenario 4: ChatGPT "Hackathon project pitch" vs "Fix Python virtualenv" -> UNRELATED', () => {
      const page: PageMetadataInput = {
        title: 'Fix Python Virtualenv Pip Installation Error - ChatGPT',
        domain: 'chatgpt.com'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 'thread-gpt-pitch',
        title: 'Hackathon Project Pitch and Judging Presentation - ChatGPT',
        keywords: ['hackathon', 'pitch', 'judging', 'project', 'chatgpt'],
        recentTitles: ['EurekaDev Elevator Pitch Ideas']
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
    });

    it('Scenario 5: Search "best ANC headphones" across Amazon, RTINGS, Reddit, YouTube -> RELATED', () => {
      const candidate: CandidateThreadMetadataInput = {
        id: 'thread-shopping',
        title: 'Compare ANC Headphones',
        keywords: ['headphones', 'anc', 'noise', 'cancelling', 'compare'],
        recentTitles: ['best ANC headphones under budget - Google Search', 'Sony WH-1000XM5 Reviews - RTINGS.com'],
        originatingSearchQuery: 'best ANC headphones'
      };

      const pages: PageMetadataInput[] = [
        { title: 'Sony WH-1000XM5 Noise Canceling Headphones - Amazon', domain: 'amazon.com' },
        { title: 'Sony WH-1000XM5 Long Term Review : r/headphones - Reddit', domain: 'reddit.com' },
        { title: 'Sony WH-1000XM5 vs Bose QC45 Noise Cancelling Review - YouTube', domain: 'youtube.com' }
      ];

      for (const p of pages) {
        const result = tinySemanticClassifier.classify(p, candidate);
        expect(result.decision).toBe('RELATED');
        expect(result.toolCalled).toBe('join_existing_thread');
      }
    });

    it('Scenario 6: "Apply for EurekaDev hackathon" vs "Apply for software internship" -> UNRELATED', () => {
      const page: PageMetadataInput = {
        title: 'Apply for Google Software Engineering Summer Internship',
        domain: 'careers.google.com'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 'thread-hackathon',
        title: 'Submit EurekaDev Project',
        keywords: ['eurekadev', 'hackathon', 'submission'],
        recentTitles: ['Apply for EurekaDev Hackathon 2026 - Unstop']
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('Scenario 7: Generic words ("project", "guide", "apply", "video", "python") DO NOT dominate semantic decisions', () => {
      const pageA: PageMetadataInput = {
        title: 'Quick Guide: How to Apply Video Compression - Python Project',
        domain: 'ffmpeg-python.org'
      };
      const candidateB: CandidateThreadMetadataInput = {
        id: 'thread-diff',
        title: 'Submit EurekaDev Project Guide Video',
        keywords: ['eurekadev', 'hackathon', 'submission'],
        recentTitles: ['EurekaDev 2026 Hackathon']
      };

      const result = tinySemanticClassifier.classify(pageA, candidateB);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
    });

    it('Scenario 8: Multiple overlapping searches remain separated without cross-contamination', () => {
      const hackathonCandidate: CandidateThreadMetadataInput = {
        id: 't-hack',
        title: 'Submit EurekaDev Project',
        keywords: ['eurekadev', 'hackathon', 'submission'],
        recentTitles: ['EurekaDev Devpost']
      };
      const internshipCandidate: CandidateThreadMetadataInput = {
        id: 't-intern',
        title: 'Software Internship Applications',
        keywords: ['internship', 'software', 'careers'],
        recentTitles: ['Google SWE Intern']
      };
      const headphonesCandidate: CandidateThreadMetadataInput = {
        id: 't-phones',
        title: 'Compare ANC Headphones',
        keywords: ['headphones', 'anc', 'rtings'],
        recentTitles: ['Best ANC Headphones Reviews']
      };

      const newEvent: PageMetadataInput = {
        title: 'Meta Production Engineering Internship Application',
        domain: 'metacareers.com'
      };

      // Must be UNRELATED to Hackathon
      expect(tinySemanticClassifier.classify(newEvent, hackathonCandidate).decision).toBe('UNRELATED');
      // Must be UNRELATED to Headphones
      expect(tinySemanticClassifier.classify(newEvent, headphonesCandidate).decision).toBe('UNRELATED');
      // Must be RELATED to Internship
      expect(tinySemanticClassifier.classify(newEvent, internshipCandidate).decision).toBe('RELATED');
    });
  });

  describe('False-Positive Control & Conservative Thresholds', () => {
    it('abstains and chooses UNRELATED when confidence is mediocre or ambiguous', () => {
      const page: PageMetadataInput = {
        title: 'General Cooking Recipes and Kitchen Equipment',
        domain: 'recipes.com'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 't-random',
        title: 'Car Maintenance and Oil Change Guide',
        keywords: ['car', 'maintenance', 'oil', 'change'],
        recentTitles: ['DIY Oil Filter Replacement']
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
    });
  });

  describe('Model Failure & Heuristic Fallback Resilience', () => {
    it('falls back cleanly to heuristics when classifier receives corrupt or empty input', () => {
      const page: PageMetadataInput = {
        title: '',
        domain: ''
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 't-empty',
        title: '',
        keywords: [],
        recentTitles: []
      };

      const result = tinySemanticClassifier.classify(page, candidate);
      expect(result.decision).toBe('UNRELATED');
      expect(result.toolCalled).toBe('create_new_thread');
    });

    it('preserves normal engine event processing without blocked browsing or lost events during classifier fallback', () => {
      const engine = new IntentEngine();
      const now = Date.now();

      const ev1: ActivityEvent = {
        id: 'ev-1',
        tabId: 1,
        url: 'https://devpost.com/hackathons/eurekadev',
        title: 'EurekaDev Hackathon Submission',
        domain: 'devpost.com',
        pathname: '/hackathons/eurekadev',
        timestamp: now,
        eventType: 'navigation',
        isInternalBrowserPage: false
      };

      const ev2: ActivityEvent = {
        id: 'ev-2',
        tabId: 2,
        url: 'https://unstop.com/competitions/eurekadev',
        title: 'EurekaDev Hackathon 2026 - Unstop',
        domain: 'unstop.com',
        pathname: '/competitions/eurekadev',
        timestamp: now + 5000,
        eventType: 'navigation',
        isInternalBrowserPage: false
      };

      const res1 = engine.processEvent(ev1);
      const res2 = engine.processEvent(ev2);

      expect(res1).not.toBeNull();
      expect(res2).not.toBeNull();
      expect(engine.getThreads().length).toBe(1);
      expect(res2?.id).toBe(res1?.id);
    });
  });

  describe('Performance, Memory & Latency Benchmark', () => {
    it('executes 500 classifications within a generous 500ms sanity budget', () => {
      const page: PageMetadataInput = {
        title: 'EurekaDev Hackathon Project Ideas Discussion',
        domain: 'chatgpt.com'
      };
      const candidate: CandidateThreadMetadataInput = {
        id: 't-bench',
        title: 'Submit EurekaDev Project',
        keywords: ['eurekadev', 'hackathon', 'submission'],
        recentTitles: ['Devpost EurekaDev', 'Demo Video']
      };

      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        tinySemanticClassifier.classify(page, candidate);
      }
      const durationMs = performance.now() - start;

      // 500 calls must take < 500ms total (< 1ms per call)
      expect(durationMs).toBeLessThan(500);
    });
  });
});
