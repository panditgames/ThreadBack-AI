import { IntentEngine } from '../../src/engine/intentClusterer';
import { describe, it, expect, beforeAll } from 'vitest';
import { getExtractor } from '../../src/engine/ai/localEmbedder';

describe('AI-First Intent Clustering Benchmark (100+ Cases)', () => {
  beforeAll(async () => {
    // Warm up the production BGE pipeline
    await getExtractor();
  }, 30000);

  const BENCHMARK_CASES = [
    // --- 1. Critical Real-World Test Case ---
    {
      name: 'Critical Real-World: EurekaDev Devpost + ChatGPT Hackathon Guide',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [
        { title: 'EurekaDev Hackathon Submission', domain: 'devpost.com' },
        { title: 'EurekaDev 2026 - Official Rules & Guidelines', domain: 'eurekadev.devpost.com' },
        { title: 'ScreenApp - Free Online Screen Recorder & Studio', domain: 'screenapp.io' }
      ],
      incomingTab: { title: 'Branch · Hackathon participation guide', domain: 'chatgpt.com' },
      expected: 'JOIN',
      category: 'critical_real_world'
    },

    // --- 2. Cross-Domain Related Tasks (SHOULD JOIN) ---
    {
      name: 'EurekaDev Devpost -> GitHub Repo',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com' }],
      incomingTab: { title: 'GitHub - eurekadev-team/threadback-ai', domain: 'github.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'EurekaDev Devpost -> Unstop Portal',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com' }],
      incomingTab: { title: 'Unstop EurekaDev Hackathon 2026 Registration & Timeline', domain: 'unstop.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Sony Headphones Amazon -> RTINGS Review',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', domain: 'amazon.com', searchQuery: 'sony wh1000xm5' }],
      incomingTab: { title: 'Sony WH-1000XM5 Wireless Headphones Review - RTINGS.com', domain: 'rtings.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Bose QC Ultra SoundGuys -> Reddit Discussion',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [
        { title: 'Bose QuietComfort Ultra Headphones Review', domain: 'soundguys.com' },
        { title: 'Sony WH-1000XM5 Review', domain: 'rtings.com' }
      ],
      incomingTab: { title: 'Bose QC Ultra vs Sony WH-1000XM5 ANC comparison', domain: 'reddit.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Sony Headphones Amazon -> Best Buy Price Comparison',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Sony WH-1000XM5 Wireless Headphones', domain: 'amazon.com' }],
      incomingTab: { title: 'Sony WH-1000XM5 Wireless Over-Ear Headphones - Best Buy', domain: 'bestbuy.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Physics Assignment University -> HyperPhysics Reference',
      threadTitle: 'Physics Assignment Research: Quantum mechanics and Doppler effect',
      threadTabs: [{ title: 'Quantum Mechanics Problem Set 3 - Wavefunctions', domain: 'physics.university.edu' }],
      incomingTab: { title: 'Schrodinger Equation and Particle in a Box - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Doppler Effect LibreTexts -> WolframAlpha Solver',
      threadTitle: 'Physics Assignment Research: Quantum mechanics and Doppler effect',
      threadTabs: [{ title: 'Relativistic Doppler Effect Formulas and Examples', domain: 'libretexts.org' }],
      incomingTab: { title: 'Doppler Effect Calculator and Frequency Shift Solver', domain: 'wolframalpha.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Google Flights Tokyo -> Booking.com Shinjuku Hotel',
      threadTitle: 'Plan Travel Trip: Tokyo vacation flights, hotels, and itinerary',
      threadTabs: [{ title: 'Google Flights: San Francisco to Tokyo Haneda (HND)', domain: 'google.com', searchQuery: 'flights sfo to tokyo' }],
      incomingTab: { title: 'Top 10 Hotels in Shinjuku, Tokyo - Booking.com', domain: 'booking.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Tokyo Hotels Booking.com -> Japan Rail Pass',
      threadTitle: 'Plan Travel Trip: Tokyo vacation flights, hotels, and itinerary',
      threadTabs: [
        { title: 'Hotels in Shinjuku, Tokyo - Booking.com', domain: 'booking.com' },
        { title: '7-Day Tokyo Itinerary for First Timers', domain: 'japan-guide.com' }
      ],
      incomingTab: { title: 'Japan Rail Pass (JR Pass) Official Order & Eligibility', domain: 'japanrailpass.net' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Frontend Intern LinkedIn -> Amazon Jobs Portal',
      threadTitle: 'Software Internship Applications: Reviewing developer job postings',
      threadTabs: [{ title: 'Frontend Software Engineer Intern - Summer 2026', domain: 'linkedin.com' }],
      incomingTab: { title: 'Software Engineering Intern - Campus Recruiting 2026', domain: 'amazon.jobs' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'Stripe Careers -> LeetCode Interview Prep',
      threadTitle: 'Software Internship Applications: Reviewing developer job postings',
      threadTabs: [{ title: 'Software Engineer Internship - Careers at Stripe', domain: 'stripe.com' }],
      incomingTab: { title: 'How to prepare for coding interviews - LeetCode Guide', domain: 'leetcode.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'React 19 Official Docs -> Vite Setup Guide',
      threadTitle: 'React 19 Migration: Exploring server actions and compiler',
      threadTabs: [{ title: 'React 19 Release Notes & Migration Guide', domain: 'react.dev' }],
      incomingTab: { title: 'Migrating to React 19 in Vite and TypeScript', domain: 'github.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },
    {
      name: 'PostgreSQL Docker Hub -> StackOverflow Compose Setup',
      threadTitle: 'Dockerized PostgreSQL Setup: Container configuration and volumes',
      threadTabs: [{ title: 'PostgreSQL - Official Docker Image', domain: 'hub.docker.com' }],
      incomingTab: { title: 'docker-compose.yml example for postgres and pgadmin', domain: 'stackoverflow.com' },
      expected: 'JOIN',
      category: 'cross_domain_related'
    },

    // --- 3. Search-to-Result Continuations (SHOULD JOIN) ---
    {
      name: 'Google Search -> RTINGS Headphones Review',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Google Search: rtings best wireless noise cancelling headphones 2026', domain: 'google.com', searchQuery: 'rtings best wireless noise cancelling headphones 2026' }],
      incomingTab: { title: 'The 7 Best Noise Cancelling Headphones - Spring 2026 Reviews', domain: 'rtings.com' },
      expected: 'JOIN',
      category: 'search_to_result'
    },
    {
      name: 'Google Search -> Booking.com Tokyo Hotels',
      threadTitle: 'Plan Travel Trip: Tokyo vacation flights, hotels, and itinerary',
      threadTabs: [{ title: 'Google Search: tokyo shinjuku hotels booking com', domain: 'google.com', searchQuery: 'tokyo shinjuku hotels booking com' }],
      incomingTab: { title: 'Hotels in Shinjuku, Tokyo - Reserve on Booking.com', domain: 'booking.com' },
      expected: 'JOIN',
      category: 'search_to_result'
    },
    {
      name: 'DuckDuckGo Search -> HyperPhysics Doppler',
      threadTitle: 'Physics Assignment Research: Quantum mechanics and Doppler effect',
      threadTabs: [{ title: 'DuckDuckGo: relativistic doppler shift derivation hyperphysics', domain: 'duckduckgo.com', searchQuery: 'relativistic doppler shift derivation hyperphysics' }],
      incomingTab: { title: 'Relativistic Doppler Effect - HyperPhysics Concepts', domain: 'hyperphysics.phy-astr.gsu.edu' },
      expected: 'JOIN',
      category: 'search_to_result'
    },

    // --- 4. Same-Domain Unrelated (SHOULD SEPARATE) ---
    {
      name: 'Amazon Headphones vs Amazon Chemistry Textbook',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Sony WH-1000XM5 Wireless Headphones', domain: 'amazon.com' }],
      incomingTab: { title: 'Organic Chemistry 8th Edition Textbook Hardcover - Amazon', domain: 'amazon.com' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },
    {
      name: 'YouTube Hackathon Demo vs YouTube Lo-Fi Music',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'EurekaDev Demo Recording - YouTube Studio', domain: 'youtube.com' }],
      incomingTab: { title: 'Relaxing Lo-Fi Hip Hop Radio - Beats to Study To', domain: 'youtube.com' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },
    {
      name: 'GitHub Project Repo vs GitHub Linux Kernel',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'GitHub - eurekadev-team/threadback-ai', domain: 'github.com' }],
      incomingTab: { title: 'GitHub - torvalds/linux: Linux kernel source tree', domain: 'github.com' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },
    {
      name: 'Wikipedia Quantum Mechanics vs Wikipedia Ottoman Empire',
      threadTitle: 'Physics Assignment Research: Quantum mechanics and Doppler effect',
      threadTabs: [{ title: 'Quantum mechanics - Wikipedia', domain: 'en.wikipedia.org' }],
      incomingTab: { title: 'History of the Ottoman Empire - Wikipedia', domain: 'en.wikipedia.org' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },
    {
      name: 'Reddit Headphones vs Reddit Tomato Blight',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Reddit: /r/headphones - Sony XM5 vs Bose QC Ultra', domain: 'reddit.com' }],
      incomingTab: { title: 'Reddit: /r/gardening - How to treat tomato early blight', domain: 'reddit.com' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },
    {
      name: 'LinkedIn Software Intern vs LinkedIn Real Estate Sales',
      threadTitle: 'Software Internship Applications: Reviewing developer job postings',
      threadTabs: [{ title: 'Frontend Software Engineer Intern - LinkedIn', domain: 'linkedin.com' }],
      incomingTab: { title: 'Real Estate Sales Agent - Miami Luxury Properties - LinkedIn', domain: 'linkedin.com' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },
    {
      name: 'Google Flights Tokyo vs Google Civic Car Battery Search',
      threadTitle: 'Plan Travel Trip: Tokyo vacation flights, hotels, and itinerary',
      threadTabs: [{ title: 'Google Flights: SFO to Tokyo Haneda', domain: 'google.com' }],
      incomingTab: { title: 'Google Search: how to replace car battery in 2012 honda civic', domain: 'google.com', searchQuery: 'how to replace car battery in 2012 honda civic' },
      expected: 'SEPARATE',
      category: 'same_domain_unrelated'
    },

    // --- 5. Cross-Domain Unrelated (SHOULD SEPARATE) ---
    {
      name: 'Hackathon Submission vs Headphones Review',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com' }],
      incomingTab: { title: 'Sony WH-1000XM5 Wireless Headphones Review', domain: 'rtings.com' },
      expected: 'SEPARATE',
      category: 'cross_domain_unrelated'
    },
    {
      name: 'Hackathon Submission vs Cancun Vacation',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com' }],
      incomingTab: { title: 'Cheap Flights to Cancun, Mexico - Expedia', domain: 'expedia.com' },
      expected: 'SEPARATE',
      category: 'cross_domain_unrelated'
    },
    {
      name: 'Headphones Shopping vs Calculus Problem Set',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Sony WH-1000XM5 Headphones - Amazon', domain: 'amazon.com' }],
      incomingTab: { title: 'Calculus III Multiple Integrals Problem Set', domain: 'mit.edu' },
      expected: 'SEPARATE',
      category: 'cross_domain_unrelated'
    },
    {
      name: 'Physics Assignment vs Tahoe Cabin Rental',
      threadTitle: 'Physics Assignment Research: Quantum mechanics and Doppler effect',
      threadTabs: [{ title: 'Relativistic Doppler Effect - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu' }],
      incomingTab: { title: 'AirBnb: Cozy 2-Bedroom Cabin in Lake Tahoe', domain: 'airbnb.com' },
      expected: 'SEPARATE',
      category: 'cross_domain_unrelated'
    },
    {
      name: 'Software Internship vs Chicken Curry Recipe',
      threadTitle: 'Software Internship Applications: Reviewing developer job postings',
      threadTabs: [{ title: 'Stripe Software Engineer Internship 2026', domain: 'stripe.com' }],
      incomingTab: { title: 'Instant Pot Chicken Tikka Masala Recipe', domain: 'seriouseats.com' },
      expected: 'SEPARATE',
      category: 'cross_domain_unrelated'
    },

    // --- 6. Generic Title Traps (SHOULD SEPARATE) ---
    {
      name: 'Hackathon Submission vs Sign In Google',
      threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
      threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com' }],
      incomingTab: { title: 'Sign In - Google Accounts', domain: 'accounts.google.com' },
      expected: 'SEPARATE',
      category: 'generic_title_trap'
    },
    {
      name: 'Headphones vs Dashboard Stripe',
      threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
      threadTabs: [{ title: 'Sony WH-1000XM5 Wireless Headphones', domain: 'amazon.com' }],
      incomingTab: { title: 'Dashboard', domain: 'dashboard.stripe.com' },
      expected: 'SEPARATE',
      category: 'generic_title_trap'
    },
    {
      name: 'Travel Planning vs GitHub Settings',
      threadTitle: 'Plan Travel Trip: Tokyo vacation flights, hotels, and itinerary',
      threadTabs: [{ title: 'Hotels in Shinjuku, Tokyo - Booking.com', domain: 'booking.com' }],
      incomingTab: { title: 'Settings - Preferences', domain: 'github.com' },
      expected: 'SEPARATE',
      category: 'generic_title_trap'
    },
    {
      name: 'Physics Assignment vs Notion Pricing',
      threadTitle: 'Physics Assignment Research: Quantum mechanics and Doppler effect',
      threadTabs: [{ title: 'Quantum Mechanics Problem Set 3', domain: 'university.edu' }],
      incomingTab: { title: 'Pricing & Plans', domain: 'notion.so' },
      expected: 'SEPARATE',
      category: 'generic_title_trap'
    },
    {
      name: 'Internship Search vs Medium 404',
      threadTitle: 'Software Internship Applications: Reviewing developer job postings',
      threadTabs: [{ title: 'Frontend Software Engineer Intern', domain: 'linkedin.com' }],
      incomingTab: { title: '404 Page Not Found', domain: 'medium.com' },
      expected: 'SEPARATE',
      category: 'generic_title_trap'
    }
  ];

  // Programmatic expansion to reach 104 total cases
  const expansionTopics = [
    { name: 'Machine Learning Research', t1: 'PyTorch transformer tutorial', t2: 'HuggingFace model fine-tuning', u1: 'Sourdough bread recipe', u2: 'Best running shoes 2026' },
    { name: 'Home Renovation Kitchen', t1: 'Quartz vs granite countertop durability', t2: 'IKEA kitchen cabinet planning guide', u1: 'Python Django REST framework', u2: 'Quantum computing qubits' },
    { name: 'Guitar Learning Practice', t1: 'Major pentatonic scale guitar shapes', t2: 'JustinGuitar beginner chord practice', u1: 'Electric car tax credits', u2: 'PostgreSQL index optimization' },
    { name: 'Tax Return Filing', t1: 'TurboTax federal return 1040 deductions', t2: 'IRS standard deduction 2025 limits', u1: 'Flight to Honolulu Hawaii', u2: 'React Native vs Flutter' },
    { name: 'Fitness Marathon Training', t1: '16 week half marathon training plan', t2: 'Hal Higdon beginner marathon schedule', u1: 'Kubernetes cluster ingress setup', u2: 'Mechanical keyboard switches' },
    { name: 'Mechanical Keyboard Build', t1: 'Lubing Gateron yellow switches guide', t2: 'Keychron Q1 custom keyboard review', u1: 'Greek mythology Zeus Poseidon', u2: 'Sourdough starter feeding' },
    { name: 'Coffee Brewing Espresso', t1: 'Dialing in espresso grind size guide', t2: 'Breville Barista Express espresso extraction guide', u1: 'C++ memory leak valgrind', u2: 'Paris museum pass booking' },
    { name: 'Interior House Painting', t1: 'Benjamin Moore vs Sherwin Williams paint review', t2: 'House painting tips for clean ceiling lines', u1: 'Async await in JavaScript', u2: 'Dog obedience leash training' },
    { name: 'Dog Training Puppy', t1: 'Crate training schedule 8 week puppy', t2: 'Puppy potty training positive reinforcement guide', u1: 'Solar panel tax credit 2026', u2: 'Rust borrow checker lifetime' },
    { name: 'Solar Energy Home Install', t1: 'Tesla Solar Roof cost per watt', t2: 'Residential solar panel inverter installation guide', u1: 'Italian pasta carbonara authentic', u2: 'Docker multi-stage build' },
    { name: 'Cryptocurrency Hardware Wallet', t1: 'Ledger Nano X vs Trezor Safe 3 review', t2: 'Crypto seed phrase recovery offline security', u1: 'Vegetable garden raised bed soil', u2: 'NextJS server components' },
    { name: 'Vegetable Gardening Raised Bed', t1: 'Square foot vegetable gardening spacing chart', t2: 'Best soil mix for raised bed organic tomatoes', u1: 'Typescript utility types Record', u2: 'Car brake pad replacement' },
    { name: 'Car Maintenance Brake Pads', t1: 'How to change front ceramic brake pads', t2: 'Torque wrench specs for car wheel lug nuts', u1: 'Go channel concurrency pattern', u2: 'Watercolor painting tutorial' },
    { name: 'Watercolor Landscape Painting', t1: 'Wet on wet watercolor wash technique', t2: 'Arches 140lb cold press watercolor paper review', u1: 'Kafka distributed event streaming', u2: 'Camping tent waterproofing' },
    { name: 'Backpacking Gear Ultralight', t1: 'Ultralight backpacking gear checklist', t2: 'Thermarest NeoAir ultralight sleeping pad review', u1: 'GraphQL schema federation', u2: 'Espresso milk frothing microfoam' },
    { name: 'Spanish Language Learning', t1: 'Subjunctive mood Spanish grammar practice', t2: 'Duolingo Spanish intermediate grammar stories', u1: 'Nginx reverse proxy ssl config', u2: 'Baking sourdough baguettes' },
    { name: 'Sourdough Bread Artisan', t1: 'Tartine sourdough bread loaf recipe', t2: 'Dutch oven steam baking sourdough bread crust', u1: 'Terraform AWS ECS deployment', u2: 'Bass guitar slap technique' },
    { name: 'Woodworking Hand Planes', t1: 'Restoring vintage Stanley No 4 hand plane', t2: 'Sharpening woodworking hand plane blades on waterstones', u1: 'MongoDB aggregation pipeline', u2: 'Origami crane folding instructions' }
  ];

  for (const t of expansionTopics) {
    BENCHMARK_CASES.push({
      name: `${t.name}: Continuation`,
      threadTitle: `${t.name}: Research and implementation notes`,
      threadTabs: [{ title: t.t1, domain: 'guide.org' }],
      incomingTab: { title: t.t2, domain: 'reference.com' },
      expected: 'JOIN',
      category: 'topic_expansion_related'
    });
    BENCHMARK_CASES.push({
      name: `${t.name} vs Unrelated 1`,
      threadTitle: `${t.name}: Research and implementation notes`,
      threadTabs: [{ title: t.t1, domain: 'guide.org' }],
      incomingTab: { title: t.u1, domain: 'other.com' },
      expected: 'SEPARATE',
      category: 'topic_expansion_unrelated'
    });
    BENCHMARK_CASES.push({
      name: `${t.name} vs Unrelated 2`,
      threadTitle: `${t.name}: Research and implementation notes`,
      threadTabs: [{ title: t.t2, domain: 'reference.com' }],
      incomingTab: { title: t.u2, domain: 'random.com' },
      expected: 'SEPARATE',
      category: 'topic_expansion_unrelated'
    });
    BENCHMARK_CASES.push({
      name: `${t.name} vs Same-Domain Trap`,
      threadTitle: `${t.name}: Research and implementation notes`,
      threadTabs: [{ title: t.t1, domain: 'youtube.com' }],
      incomingTab: { title: t.u1, domain: 'youtube.com' },
      expected: 'SEPARATE',
      category: 'topic_expansion_same_domain'
    });
  }

  it('reports the frozen 106-case observed-metadata benchmark using IntentEngine directly', async () => {
    let falseMerges = 0, falseSplits = 0;
    let criticalPassed = false;
    let eventSeq = 0;

    for (const tc of BENCHMARK_CASES) {
      const engine = new IntentEngine();
      const seedEvent = {
        id: `bench-${++eventSeq}`,
        tabId: eventSeq,
        windowId: 1,
        url: 'https://' + tc.threadTabs[0].domain + `/benchmark/seed/${eventSeq}`,
        title: tc.threadTabs[0].title,
        domain: tc.threadTabs[0].domain,
        pathname: `/benchmark/seed/${eventSeq}`,
        searchQuery: (tc.threadTabs[0] as any).searchQuery,
        timestamp: Date.now() - 60000,
        eventType: 'navigation',
        isInternalBrowserPage: false,
      } as const;
      await engine.processEvent(seedEvent);

      for (let i = 1; i < tc.threadTabs.length; i++) {
        await engine.processEvent({
          id: `bench-${++eventSeq}`,
          tabId: eventSeq,
          windowId: 1,
          url: 'https://' + tc.threadTabs[i].domain + `/benchmark/seed/${eventSeq}`,
          title: tc.threadTabs[i].title,
          domain: tc.threadTabs[i].domain,
          pathname: `/benchmark/seed/${eventSeq}`,
          searchQuery: (tc.threadTabs[i] as any).searchQuery,
          timestamp: Date.now() - 30000,
          eventType: 'navigation',
          isInternalBrowserPage: false,
        });

      }

      const incomingThread = await engine.processEvent({
        id: `bench-${++eventSeq}`,
        tabId: eventSeq,
        windowId: 1,
        url: 'https://' + tc.incomingTab.domain + `/benchmark/incoming/${eventSeq}`,
        title: tc.incomingTab.title,
        domain: tc.incomingTab.domain,
        pathname: `/benchmark/incoming/${eventSeq}`,
        searchQuery: (tc.incomingTab as any).searchQuery,
        timestamp: Date.now(),
        eventType: 'navigation',
        isInternalBrowserPage: false,
      });

      const finalSeed = engine.getThreads().find(thread => thread.tabs.some(tab => tab.url === seedEvent.url));
      const joined = incomingThread?.id === finalSeed?.id;
      if (tc.category === 'critical_real_world') {
        criticalPassed = joined;
      }
      if (joined && tc.expected !== 'JOIN') falseMerges++;
      if (!joined && tc.expected === 'JOIN') falseSplits++;
    }

    console.log(JSON.stringify({ cases: BENCHMARK_CASES.length, falseMerges, falseSplits, criticalPassed }));
    expect(criticalPassed).toBe(true);
    expect(falseMerges).toBe(0);
  }, 120000);
});
