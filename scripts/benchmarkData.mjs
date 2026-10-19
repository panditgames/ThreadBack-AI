/**
 * ThreadBack AI - Shared Fair Model Tournament Benchmark Suite
 * 160 curated semantic intent pairs + 25 multi-step browsing sequences
 * Covers all required domains:
 * - hackathons, programming, school/study, physics, mathematics, shopping, headphones,
 *   travel, YouTube research, ChatGPT conversations, GitHub projects, internships/jobs,
 *   news/research, general browsing.
 */

export const BENCHMARK_PAIRS = [
  // ==========================================
  // 1. CRITICAL REAL-WORLD CASE (MUST PASS)
  // ==========================================
  {
    id: 'crit-1',
    category: 'hackathons',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [
      { title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com/software/eurekadev' },
      { title: 'EurekaDev 2026 - Official Rules & Guidelines', domain: 'eurekadev.devpost.com', url: 'https://eurekadev.devpost.com/rules' },
    ],
    incomingTab: {
      title: 'Branch · Hackathon participation guide',
      domain: 'chatgpt.com',
      url: 'https://chatgpt.com/c/hackathon-branch-guide',
    },
    expected: 'JOIN',
    isCritical: true,
  },

  // ==========================================
  // 2. HACKATHONS (RELATED & UNRELATED)
  // ==========================================
  {
    id: 'hack-rel-1',
    category: 'hackathons',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com/eurekadev' }],
    incomingTab: { title: 'GitHub - team/eurekadev-ai: Intent Memory Chrome Extension', domain: 'github.com', url: 'https://github.com/team/eurekadev-ai' },
    expected: 'JOIN',
  },
  {
    id: 'hack-rel-2',
    category: 'hackathons',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com/eurekadev' }],
    incomingTab: { title: 'ScreenApp Online Screen Recorder for Hackathon Demo', domain: 'screenapp.io', searchQuery: 'best online screen recorder hackathon demo', url: 'https://screenapp.io' },
    expected: 'JOIN',
  },
  {
    id: 'hack-rel-3',
    category: 'hackathons',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com/eurekadev' }],
    incomingTab: { title: 'YouTube Studio - Upload Hackathon Demo Video', domain: 'studio.youtube.com', url: 'https://studio.youtube.com/upload' },
    expected: 'JOIN',
  },
  {
    id: 'hack-rel-4',
    category: 'hackathons',
    threadTitle: 'EurekaDev submission requirements',
    threadTabs: [{ title: 'EurekaDev submission requirements', domain: 'devpost.com', url: 'https://devpost.com' }],
    incomingTab: { title: 'How to win a hackathon - Devpost Blog', domain: 'devpost.com', url: 'https://devpost.com/blog' },
    expected: 'JOIN',
  },
  {
    id: 'hack-rel-5',
    category: 'hackathons',
    threadTitle: 'Hackathon pitch deck preparation',
    threadTabs: [{ title: 'Hackathon Pitch Deck Template', domain: 'canva.com', url: 'https://canva.com/design' }],
    incomingTab: { title: 'Unstop EurekaDev Hackathon 2026 Registration & Timeline', domain: 'unstop.com', url: 'https://unstop.com/hackathons/eurekadev' },
    expected: 'JOIN',
  },
  {
    id: 'hack-unrel-1',
    category: 'hackathons',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com/eurekadev' }],
    incomingTab: { title: 'NASA Apollo Project Historic Missions', domain: 'nasa.gov', url: 'https://nasa.gov/apollo' },
    expected: 'SEPARATE',
  },
  {
    id: 'hack-unrel-2',
    category: 'hackathons',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com/eurekadev' }],
    incomingTab: { title: 'Software Engineering Summer Internship 2026 - Google Careers', domain: 'careers.google.com', url: 'https://careers.google.com/jobs/intern' },
    expected: 'SEPARATE',
  },
  {
    id: 'hack-unrel-3',
    category: 'hackathons',
    threadTitle: 'Hackathon application guide',
    threadTabs: [{ title: 'Apply for EurekaDev Hackathon 2026', domain: 'unstop.com', url: 'https://unstop.com/eurekadev' }],
    incomingTab: { title: 'Apply for software internship - Stripe Careers', domain: 'stripe.com', url: 'https://stripe.com/jobs' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 3. PROGRAMMING & GITHUB
  // ==========================================
  {
    id: 'prog-rel-1',
    category: 'programming',
    threadTitle: 'Django OAuth authentication: Implementing social login in Django REST Framework',
    threadTabs: [{ title: 'Django OAuth authentication documentation', domain: 'docs.djangoproject.com', url: 'https://docs.djangoproject.com/auth' }],
    incomingTab: { title: 'DRF token auth setup guide and middleware', domain: 'django-rest-framework.org', url: 'https://django-rest-framework.org/api-guide/authentication/' },
    expected: 'JOIN',
  },
  {
    id: 'prog-rel-2',
    category: 'programming',
    threadTitle: 'ThreadBack extension Manifest V3: Migration from background scripts to service workers',
    threadTabs: [{ title: 'ThreadBack extension Manifest V3 migration', domain: 'developer.chrome.com', url: 'https://developer.chrome.com/docs/extensions/mv3/intro/' }],
    incomingTab: { title: 'Chrome service worker lifecycle and storage persistence', domain: 'developer.chrome.com', url: 'https://developer.chrome.com/docs/extensions/mv3/service_workers/' },
    expected: 'JOIN',
  },
  {
    id: 'prog-rel-3',
    category: 'programming',
    threadTitle: 'React 19 Server Components Migration',
    threadTabs: [{ title: 'React 19 Upgrade Guide and Hooks', domain: 'react.dev', url: 'https://react.dev/blog/2024/react-19' }],
    incomingTab: { title: 'GitHub - facebook/react: React 19 changelog and release notes', domain: 'github.com', url: 'https://github.com/facebook/react/releases' },
    expected: 'JOIN',
  },
  {
    id: 'prog-rel-4',
    category: 'programming',
    threadTitle: 'Rust WebAssembly ONNX runtime optimization',
    threadTabs: [{ title: 'Wasm-bindgen guide for Rust browser execution', domain: 'rustwasm.github.io', url: 'https://rustwasm.github.io/docs/wasm-bindgen/' }],
    incomingTab: { title: 'ONNX Runtime Web WebAssembly SIMD performance benchmarks', domain: 'onnxruntime.ai', url: 'https://onnxruntime.ai/docs/tutorials/web/' },
    expected: 'JOIN',
  },
  {
    id: 'prog-unrel-1',
    category: 'programming',
    threadTitle: 'Python Django authentication: Web application security and tokens',
    threadTabs: [{ title: 'Python Django authentication setup', domain: 'docs.djangoproject.com', url: 'https://docs.djangoproject.com' }],
    incomingTab: { title: 'Python orbital simulation using SymPy and Kepler mechanics', domain: 'astropy.org', url: 'https://astropy.org/orbits' },
    expected: 'SEPARATE',
  },
  {
    id: 'prog-unrel-2',
    category: 'programming',
    threadTitle: 'Chrome extension development: Manifest V3 background service workers',
    threadTabs: [{ title: 'Chrome extension development guide', domain: 'developer.chrome.com', url: 'https://developer.chrome.com' }],
    incomingTab: { title: 'Google Summer of Code projects and student stipend proposals', domain: 'summerofcode.withgoogle.com', url: 'https://summerofcode.withgoogle.com' },
    expected: 'SEPARATE',
  },
  {
    id: 'prog-unrel-3',
    category: 'programming',
    threadTitle: 'Django OAuth authentication',
    threadTabs: [{ title: 'Django OAuth token setup', domain: 'docs.djangoproject.com', url: 'https://docs.djangoproject.com' }],
    incomingTab: { title: 'Tokyo hotel booking - Shinjuku Prince Hotel', domain: 'booking.com', url: 'https://booking.com/tokyo' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 4. PHYSICS & MATHEMATICS
  // ==========================================
  {
    id: 'phys-rel-1',
    category: 'physics',
    threadTitle: 'Quantum mechanics harmonic oscillator: Problem set derivation and lecture notes',
    threadTabs: [{ title: 'harmonic oscillator notes and Hamiltonian derivation', domain: 'ocw.mit.edu', url: 'https://ocw.mit.edu/courses/physics' }],
    incomingTab: { title: 'quantum mechanics lecture Schrödinger wave equation solutions', domain: 'en.wikipedia.org', url: 'https://en.wikipedia.org/wiki/Quantum_harmonic_oscillator' },
    expected: 'JOIN',
  },
  {
    id: 'phys-rel-2',
    category: 'physics',
    threadTitle: 'Relativistic Doppler effect derivation: Frequency shift in special relativity',
    threadTabs: [{ title: 'Relativistic Doppler Effect - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu', url: 'https://hyperphysics.phy-astr.gsu.edu/hbase/relativ/reldop.html' }],
    incomingTab: { title: 'Lorentz transformation and wave 4-vector kinematics', domain: 'feynmanlectures.caltech.edu', url: 'https://feynmanlectures.caltech.edu/I_34.html' },
    expected: 'JOIN',
  },
  {
    id: 'math-rel-1',
    category: 'mathematics',
    threadTitle: 'Linear algebra eigenvalue decomposition and spectral theorem',
    threadTabs: [{ title: 'Eigenvalues and Eigenvectors - MIT OpenCourseWare', domain: 'ocw.mit.edu', url: 'https://ocw.mit.edu/18-06' }],
    incomingTab: { title: 'Singular Value Decomposition (SVD) visual explanation and matrix proofs', domain: '3blue1brown.com', url: 'https://3blue1brown.com/topics/linear-algebra' },
    expected: 'JOIN',
  },
  {
    id: 'math-rel-2',
    category: 'mathematics',
    threadTitle: 'Multivariable calculus Stokes theorem: Surface integrals and curl',
    threadTabs: [{ title: 'Stokes Theorem definition and proof', domain: 'mathworld.wolfram.com', url: 'https://mathworld.wolfram.com/StokesTheorem.html' }],
    incomingTab: { title: 'Evaluating line integrals around boundary surfaces in vector calculus', domain: 'khanacademy.org', url: 'https://khanacademy.org/math/multivariable-calculus' },
    expected: 'JOIN',
  },
  {
    id: 'phys-unrel-1',
    category: 'physics',
    threadTitle: 'Quantum mechanics lecture on energy eigenfunctions',
    threadTabs: [{ title: 'Quantum mechanics lecture energy problems', domain: 'youtube.com', url: 'https://youtube.com/watch?v=qm1' }],
    incomingTab: { title: 'Hackathon demo preparation and submission walkthrough', domain: 'youtube.com', url: 'https://youtube.com/watch?v=hack1' },
    expected: 'SEPARATE',
  },
  {
    id: 'phys-unrel-2',
    category: 'physics',
    threadTitle: 'Quantum physics harmonic oscillator assignment',
    threadTabs: [{ title: 'Quantum harmonic oscillator derivation', domain: 'hyperphysics.phy-astr.gsu.edu', url: 'https://hyperphysics.phy-astr.gsu.edu' }],
    incomingTab: { title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Amazon', domain: 'amazon.com', url: 'https://amazon.com/dp/B09XS7JWHH' },
    expected: 'SEPARATE',
  },
  {
    id: 'math-unrel-1',
    category: 'mathematics',
    threadTitle: 'Linear algebra eigenvalue matrix computation',
    threadTabs: [{ title: 'Eigenvalue problem set solution', domain: 'ocw.mit.edu', url: 'https://ocw.mit.edu' }],
    incomingTab: { title: 'Cheapest flights from New York to Paris - Google Flights', domain: 'google.com', url: 'https://google.com/travel/flights' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 5. SHOPPING & HEADPHONES
  // ==========================================
  {
    id: 'shop-rel-1',
    category: 'headphones',
    threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
    threadTabs: [{ title: 'Sony WH-1000XM5 review - RTINGS.com', domain: 'rtings.com', url: 'https://rtings.com/headphones/reviews/sony/wh-1000xm5' }],
    incomingTab: { title: 'best ANC headphones 2026 buying guide and sound comparison', domain: 'soundguys.com', url: 'https://soundguys.com/best-noise-cancelling-headphones' },
    expected: 'JOIN',
  },
  {
    id: 'shop-rel-2',
    category: 'headphones',
    threadTitle: 'Compare ANC Headphones: Evaluating wireless noise-cancelling headphones',
    threadTabs: [{ title: 'Bose QuietComfort 45 vs Sony WH-1000XM5 comparison', domain: 'youtube.com', url: 'https://youtube.com/watch?v=hp1' }],
    incomingTab: { title: 'Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones - Amazon', domain: 'amazon.com', url: 'https://amazon.com/dp/B09XS7JWHH' },
    expected: 'JOIN',
  },
  {
    id: 'shop-rel-3',
    category: 'shopping',
    threadTitle: 'Ergonomic office chair review and pricing comparison',
    threadTabs: [{ title: 'Herman Miller Aeron vs Steelcase Gesture review', domain: 'wirecutter.com', url: 'https://wirecutter.com/reviews/best-office-chair' }],
    incomingTab: { title: 'Steelcase Gesture Chair with Headrest - Official Store', domain: 'steelcase.com', url: 'https://steelcase.com/products/gesture' },
    expected: 'JOIN',
  },
  {
    id: 'shop-unrel-1',
    category: 'shopping',
    threadTitle: 'Compare ANC Headphones: Wireless active noise cancellation headsets',
    threadTabs: [{ title: 'Sony WH-1000XM5 Wireless Headphones', domain: 'amazon.com', url: 'https://amazon.com/dp/B09XS7JWHH' }],
    incomingTab: { title: 'Nike Air Zoom Pegasus 40 Men Running Shoes - Amazon', domain: 'amazon.com', url: 'https://amazon.com/dp/B01SHOES' },
    expected: 'SEPARATE',
  },
  {
    id: 'shop-unrel-2',
    category: 'shopping',
    threadTitle: 'Headphones research and reviews',
    threadTabs: [{ title: 'Bose QC Ultra headphone sound quality', domain: 'rtings.com', url: 'https://rtings.com' }],
    incomingTab: { title: 'Astrophysics research: James Webb Space Telescope discoveries', domain: 'space.com', url: 'https://space.com/jwst' },
    expected: 'SEPARATE',
  },
  {
    id: 'shop-unrel-3',
    category: 'shopping',
    threadTitle: 'Compare ANC Headphones',
    threadTabs: [{ title: 'best noise cancelling headphones - Google Search', domain: 'google.com', url: 'https://google.com/search?q=best+anc+headphones' }],
    incomingTab: { title: 'Tokyo Shinjuku hotel reservations - Booking.com', domain: 'booking.com', url: 'https://booking.com/hotel/tokyo' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 6. TRAVEL PLANNING
  // ==========================================
  {
    id: 'trav-rel-1',
    category: 'travel',
    threadTitle: 'Tokyo vacation planning: Flights, hotels, and tourist itinerary',
    threadTabs: [{ title: 'Tokyo Shinjuku hotel recommendations - Booking.com', domain: 'booking.com', url: 'https://booking.com/hotel/tokyo' }],
    incomingTab: { title: 'Tokyo subway route map and Suica IC transit guide', domain: 'japan-guide.com', url: 'https://japan-guide.com/e/e2017.html' },
    expected: 'JOIN',
  },
  {
    id: 'trav-rel-2',
    category: 'travel',
    threadTitle: 'Tokyo vacation planning: Flights, hotels, and tourist itinerary',
    threadTabs: [{ title: 'Flights to Tokyo Haneda (HND) - Expedia', domain: 'expedia.com', url: 'https://expedia.com/flights/tokyo' }],
    incomingTab: { title: 'Top 10 things to do in Shibuya and Akihabara - TripAdvisor', domain: 'tripadvisor.com', url: 'https://tripadvisor.com/tokyo-attractions' },
    expected: 'JOIN',
  },
  {
    id: 'trav-unrel-1',
    category: 'travel',
    threadTitle: 'Tokyo hotel booking: Shinjuku accommodation search',
    threadTabs: [{ title: 'Tokyo hotel booking - Booking.com', domain: 'booking.com', url: 'https://booking.com' }],
    incomingTab: { title: 'Django OAuth authentication documentation - Django Project', domain: 'docs.djangoproject.com', url: 'https://docs.djangoproject.com' },
    expected: 'SEPARATE',
  },
  {
    id: 'trav-unrel-2',
    category: 'travel',
    threadTitle: 'Tokyo vacation planning',
    threadTabs: [{ title: 'Tokyo flights and hotel guide', domain: 'tripadvisor.com', url: 'https://tripadvisor.com' }],
    incomingTab: { title: 'Quantum mechanics wavefunction normalization problem set', domain: 'hyperphysics.phy-astr.gsu.edu', url: 'https://hyperphysics.phy-astr.gsu.edu' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 7. CHATGPT & YOUTUBE CONVERSATIONS
  // ==========================================
  {
    id: 'gpt-rel-1',
    category: 'ChatGPT conversations',
    threadTitle: 'EurekaDev Hackathon Architecture: Designing an Intent Memory extension',
    threadTabs: [{ title: 'EurekaDev Hackathon Brainstorming & Architecture - ChatGPT', domain: 'chatgpt.com', url: 'https://chatgpt.com/c/hackathon-arch' }],
    incomingTab: { title: 'Intent clustering algorithms and vector embeddings prompt - ChatGPT', domain: 'chatgpt.com', url: 'https://chatgpt.com/c/intent-clustering' },
    expected: 'JOIN',
  },
  {
    id: 'gpt-unrel-1',
    category: 'ChatGPT conversations',
    threadTitle: 'ChatGPT coding error fix: Python virtualenv installation bug',
    threadTabs: [{ title: 'ChatGPT coding error fix - ChatGPT', domain: 'chatgpt.com', url: 'https://chatgpt.com/c/python-bug' }],
    incomingTab: { title: 'ChatGPT hackathon planning and pitch outline - ChatGPT', domain: 'chatgpt.com', url: 'https://chatgpt.com/c/hackathon-pitch' },
    expected: 'SEPARATE',
  },
  {
    id: 'gpt-unrel-2',
    category: 'ChatGPT conversations',
    threadTitle: 'ChatGPT conversation on laptop specs comparison',
    threadTabs: [{ title: 'Compare Gaming Laptop GPU Benchmarks - ChatGPT', domain: 'chatgpt.com', url: 'https://chatgpt.com/c/laptop' }],
    incomingTab: { title: 'Drafting resignation email letter professional - ChatGPT', domain: 'chatgpt.com', url: 'https://chatgpt.com/c/letter' },
    expected: 'SEPARATE',
  },
  {
    id: 'yt-unrel-1',
    category: 'YouTube research',
    threadTitle: 'YouTube hackathon demo walkthrough',
    threadTabs: [{ title: 'YouTube hackathon demo walkthrough video', domain: 'youtube.com', url: 'https://youtube.com/watch?v=demo1' }],
    incomingTab: { title: 'YouTube quantum physics lecture series chapter 4', domain: 'youtube.com', url: 'https://youtube.com/watch?v=physics1' },
    expected: 'SEPARATE',
  },
  {
    id: 'yt-unrel-2',
    category: 'YouTube research',
    threadTitle: 'Python Django tutorial series',
    threadTabs: [{ title: 'Python Django tutorial - Build a Blog - YouTube', domain: 'youtube.com', url: 'https://youtube.com/watch?v=django' }],
    incomingTab: { title: 'Python orbital simulation with Pygame - YouTube', domain: 'youtube.com', url: 'https://youtube.com/watch?v=orbit' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 8. INTERNSHIPS & JOBS
  // ==========================================
  {
    id: 'job-rel-1',
    category: 'internships/jobs',
    threadTitle: 'Software Engineering Summer Internship Applications: Tech job portals',
    threadTabs: [{ title: 'Google Software Engineering Summer Internship 2026', domain: 'careers.google.com', url: 'https://careers.google.com/jobs/swe-intern' }],
    incomingTab: { title: 'Microsoft Software Engineer Intern University Hiring Portal', domain: 'careers.microsoft.com', url: 'https://careers.microsoft.com/intern' },
    expected: 'JOIN',
  },
  {
    id: 'job-rel-2',
    category: 'internships/jobs',
    threadTitle: 'Software Engineering Summer Internship Applications',
    threadTabs: [{ title: 'Meta University SWE Internship application', domain: 'metacareers.com', url: 'https://metacareers.com' }],
    incomingTab: { title: 'Resume formatting and technical interview preparation - LeetCode', domain: 'leetcode.com', url: 'https://leetcode.com/interview' },
    expected: 'JOIN',
  },
  {
    id: 'job-unrel-1',
    category: 'internships/jobs',
    threadTitle: 'Software Engineering Summer Internship Applications',
    threadTabs: [{ title: 'Google Software Engineering Summer Internship', domain: 'careers.google.com', url: 'https://careers.google.com' }],
    incomingTab: { title: 'Sourdough bread baking temperature and crumb structure', domain: 'seriouseats.com', url: 'https://seriouseats.com/sourdough' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 9. SCHOOL & STUDY
  // ==========================================
  {
    id: 'study-rel-1',
    category: 'school/study',
    threadTitle: 'Cellular biology: Krebs cycle and oxidative phosphorylation study notes',
    threadTabs: [{ title: 'Citric Acid Cycle (Krebs Cycle) biochemical pathway diagram', domain: 'khanacademy.org', url: 'https://khanacademy.org/biology/cellular-respiration' }],
    incomingTab: { title: 'Electron transport chain ATP synthesis in mitochondria', domain: 'ncbi.nlm.nih.gov', url: 'https://ncbi.nlm.nih.gov/books/NBK26882/' },
    expected: 'JOIN',
  },
  {
    id: 'study-unrel-1',
    category: 'school/study',
    threadTitle: 'Cellular biology Krebs cycle notes',
    threadTabs: [{ title: 'Cellular biology Krebs cycle notes', domain: 'khanacademy.org', url: 'https://khanacademy.org' }],
    incomingTab: { title: 'Best noise cancelling headphones under budget - RTINGS', domain: 'rtings.com', url: 'https://rtings.com' },
    expected: 'SEPARATE',
  },

  // ==========================================
  // 10. NEWS & GENERAL BROWSING
  // ==========================================
  {
    id: 'gen-rel-1',
    category: 'news/research',
    threadTitle: 'Renewable energy transition and solar battery storage market analysis',
    threadTabs: [{ title: 'Global solar energy installation trends 2026 - IEA Report', domain: 'iea.org', url: 'https://iea.org/reports/solar-2026' }],
    incomingTab: { title: 'Grid-scale lithium battery storage cost curves - BloombergNEF', domain: 'bnef.com', url: 'https://bnef.com/battery-storage' },
    expected: 'JOIN',
  },
  {
    id: 'gen-unrel-1',
    category: 'general browsing',
    threadTitle: 'General browsing and research',
    threadTabs: [{ title: 'BBC World News Headlines Today', domain: 'bbc.com', url: 'https://bbc.com/news' }],
    incomingTab: { title: 'Quantum mechanics Schrödinger equation lecture', domain: 'wikipedia.org', url: 'https://en.wikipedia.org/wiki/Schrodinger_equation' },
    expected: 'SEPARATE',
  },
  {
    id: 'gen-unrel-2',
    category: 'general browsing',
    threadTitle: 'Submit EurekaDev Project: Hackathon submission, rules, and demo video',
    threadTabs: [{ title: 'EurekaDev Hackathon Submission', domain: 'devpost.com', url: 'https://devpost.com' }],
    incomingTab: { title: 'Sign In - Google Accounts', domain: 'accounts.google.com', url: 'https://accounts.google.com/signin' },
    expected: 'SEPARATE',
  },
  {
    id: 'gen-unrel-3',
    category: 'general browsing',
    threadTitle: 'Compare ANC Headphones',
    threadTabs: [{ title: 'Sony WH-1000XM5 Wireless Headphones', domain: 'amazon.com', url: 'https://amazon.com' }],
    incomingTab: { title: 'Dashboard - Stripe Billing and Payments', domain: 'dashboard.stripe.com', url: 'https://dashboard.stripe.com' },
    expected: 'SEPARATE',
  },
];

// Dynamically generate expanded topic permutations to exceed 160 rigorous pairs
const DOMAINS_AND_TOPICS = [
  { topic: 'Computer Graphics Ray Tracing', rel: ['BVH acceleration structure building in C++', 'Path tracing Monte Carlo lighting algorithms', 'GLSL compute shader ray-triangle intersection'], unrel: ['French pastry croissant folding technique', 'House plant watering schedule for winter', 'Honda Civic oil change filter replacement'] },
  { topic: 'Deep Learning Transformer Attention', rel: ['FlashAttention 2 kernel optimization in CUDA', 'Rotary Position Embedding (RoPE) implementation', 'Multi-head query-key-value projection explained'], unrel: ['Best hiking boots for Rocky Mountains', 'How to prune tomato vines in greenhouse', 'Vintage acoustic guitar tuning peg repair'] },
  { topic: 'Kubernetes Cluster Administration', rel: ['Configuring ingress-nginx controller with cert-manager', 'Kubernetes persistent volume claims and CSI driver', 'Etcd snapshot backup and restore on control plane'], unrel: ['Chocolate chip cookie recipe browned butter', 'Scuba diving certification requirements PADI', 'Sourdough starter feeding ratio guide'] },
  { topic: 'Organic Chemistry Synthesis', rel: ['Grignard reagent reaction with benzaldehyde mechanism', 'Aldol condensation thermodynamic vs kinetic control', 'NMR spectroscopy chemical shift interpretation'], unrel: ['Best budget 4K gaming monitor 144Hz review', 'Credit card travel reward point redemption', 'Cat litter box odor elimination tips'] },
  { topic: 'World War II Pacific Theater', rel: ['Battle of Midway naval aviation tactical breakdown', 'Guadalcanal campaign logistics and airfield defense', 'Codebreaking at Station HYPO and JN-25 decrypts'], unrel: ['CSS Flexbox vs Grid layout tutorial and examples', 'Ergonomic mechanical keyboard split PCB design', 'Subaru Outback brake pad replacement guide'] },
  { topic: 'Astrophysics Exoplanet Detection', rel: ['Transit photometry light curve depth and limb darkening', 'Radial velocity Doppler wobble spectroscopic analysis', 'James Webb transmission spectrum of exoplanet atmosphere'], unrel: ['How to brew pour-over coffee V60 ratio', 'Income tax deduction charitable contribution limits', 'Electric standing desk dual motor assembly'] },
  { topic: 'Ancient Rome Epigraphy', rel: ['Deciphering Latin inscriptions on Trajan Column', 'CIL volume VI monumental inscriptions of Rome', 'Imperial Roman honorific titles on milestones'], unrel: ['Docker multi-stage build cache optimization', 'Best wireless mouse for competitive gaming', 'Espresso machine descaling vinegar vs citric acid'] },
  { topic: 'Cryptocurrency Proof of Stake', rel: ['Ethereum beacon chain validator slashing rules', 'Casper FFG consensus finality epochs', 'MEV-Boost builder auction block construction'], unrel: ['Winter coat waterproof down parka comparison', 'Home brewing IPA dry hopping schedule', 'Indoor succulent propagation leaf cuttings'] },
  { topic: 'Biomedical CRISPR Gene Editing', rel: ['Cas9 guide RNA design and off-target cleavage assay', 'Prime editing reverse transcriptase pegRNA efficiency', 'AAV viral vector delivery for in vivo gene therapy'], unrel: ['Tesla Model Y tire pressure rotation guide', 'Budget airline carry-on luggage dimensions', 'Woodworking mortise and tenon joint carving'] },
  { topic: 'Neuroscience Synaptic Plasticity', rel: ['Long-term potentiation (LTP) NMDA receptor calcium flux', 'Dendritic spine remodeling during memory consolidation', 'Optogenetic stimulation of hippocampal engram neurons'], unrel: ['Mechanical watch automatic movement calibration', 'Beginner sourdough bread baking hydration level', 'Bicycle disc brake bleeding mineral oil kit'] },
  { topic: 'Thermodynamics Statistical Mechanics', rel: ['Carnot engine efficiency limit and entropy generation', 'Maxwell-Boltzmann vs Fermi-Dirac energy distribution', 'Gibbs free energy change in chemical equilibrium'], unrel: ['Best noise cancelling headphones comparison', 'Tokyo subway pass Suica card instructions', 'Chocolate chip cookies recipe vanilla extract'] },
  { topic: 'Rust Systems Programming', rel: ['Rust ownership borrow checker lifetimes syntax', 'Tokio asynchronous task spawn and channels in Rust', 'Zero-cost abstractions and SIMD auto-vectorization in Rust'], unrel: ['How to prepare for coding hackathon pitch deck', 'Nike running shoes discount promo code', 'Grand Canyon hiking trail permits guide'] },
  { topic: 'Economics Microeconomics Markets', rel: ['Price elasticity of demand and consumer surplus curve', 'Monopolistic competition deadweight loss calculation', 'Cournot duopoly game theory Nash equilibrium'], unrel: ['Python Django authentication token middleware', 'Sony WH-1000XM5 wireless headphone review', 'How to change car engine air filter'] },
  { topic: 'Web Accessibility WCAG Compliance', rel: ['ARIA role landmarks and screen reader announcements', 'Keyboard focus management modal trap WCAG 2.2', 'Color contrast ratio 4.5 to 1 compliance test'], unrel: ['Quantum mechanics harmonic oscillator derivation', 'French croissant butter lamination technique', 'Best flights from London to Tokyo Haneda'] },
  { topic: 'Optics and Photonics Lasers', rel: ['Stimulated emission population inversion ruby laser', 'Diffraction grating angular dispersion Fraunhofer diffraction', 'Single-mode optical fiber chromatic dispersion waveguide'], unrel: ['EurekaDev hackathon submission form Devpost', 'How to make authentic pizza dough at home', 'Used car valuation Kelly Blue Book calculator'] },
  { topic: 'Computer Networking Protocols', rel: ['TCP three-way handshake SYN ACK packet capture Wireshark', 'BGP autonomous system routing table convergence', 'TLS 1.3 cryptographic handshake key exchange curve25519'], unrel: ['Astrophysics James Webb Space Telescope galaxies', 'Best office chair ergonomic lumbar support', 'Sourdough starter daily feeding schedule'] },
  { topic: 'Database Storage B-Trees', rel: ['B-plus tree index leaf node splitting concurrency', 'Log-Structured Merge (LSM) tree write amplification RocksDB', 'Database buffer pool eviction LRU page cache'], unrel: ['Tokyo Shinjuku hotel reservations Booking', 'Croissant baking steam injection temperature', 'Electric standing desk dual motor assembly'] },
  { topic: 'Climate Science Carbon Budget', rel: ['Atmospheric CO2 radiative forcing feedback mechanisms', 'IPCC emissions pathway net zero warming threshold', 'Arctic permafrost methane release climate sensitivity'], unrel: ['Rust borrow checker lifetime annotations', 'Bose QuietComfort 45 vs Sony XM5 review', 'Nike Zoom Pegasus running sneakers'] }
];

let counter = 1;
for (const dt of DOMAINS_AND_TOPICS) {
  // Related pairs
  for (let i = 0; i < dt.rel.length; i++) {
    BENCHMARK_PAIRS.push({
      id: `synth-rel-${counter++}`,
      category: dt.topic,
      threadTitle: `${dt.topic}: Research, papers, and reference documentation`,
      threadTabs: [{ title: dt.rel[i], domain: 'scholar.google.com', url: 'https://scholar.google.com' }],
      incomingTab: { title: dt.rel[(i + 1) % dt.rel.length], domain: 'arxiv.org', url: 'https://arxiv.org/abs/test' },
      expected: 'JOIN',
    });
  }
  // Unrelated pairs
  for (let i = 0; i < dt.unrel.length; i++) {
    BENCHMARK_PAIRS.push({
      id: `synth-unrel-${counter++}`,
      category: dt.topic,
      threadTitle: `${dt.topic}: Research, papers, and reference documentation`,
      threadTabs: [{ title: dt.rel[i], domain: 'scholar.google.com', url: 'https://scholar.google.com' }],
      incomingTab: { title: dt.unrel[i], domain: 'youtube.com', url: 'https://youtube.com' },
      expected: 'SEPARATE',
    });
  }
}

// Same-domain traps across major multi-purpose platforms
const PLATFORMS = ['youtube.com', 'chatgpt.com', 'wikipedia.org', 'reddit.com', 'amazon.com'];
for (const p of PLATFORMS) {
  BENCHMARK_PAIRS.push({
    id: `trap-same-domain-${p}`,
    category: 'same-domain trap',
    threadTitle: `Researching Quantum Mechanics Lectures on ${p}`,
    threadTabs: [{ title: `Quantum Mechanics Wavefunction - ${p}`, domain: p, url: `https://${p}/quantum` }],
    incomingTab: { title: `Python Django Authentication Middleware - ${p}`, domain: p, url: `https://${p}/django` },
    expected: 'SEPARATE',
  });
  BENCHMARK_PAIRS.push({
    id: `trap-weak-word-${p}`,
    category: 'weak word trap',
    threadTitle: `EurekaDev Hackathon Submission Guide on ${p}`,
    threadTabs: [{ title: `Hackathon Project Pitch Submission - ${p}`, domain: p, url: `https://${p}/hackathon` }],
    incomingTab: { title: `Camera Photography Photo Contest Submission - ${p}`, domain: p, url: `https://${p}/photo` },
    expected: 'SEPARATE',
  });
}

// ==========================================
// 25 REALISTIC MULTI-STEP BROWSING SEQUENCES
// ==========================================
export const BENCHMARK_SEQUENCES = [
  {
    id: 'seq-1',
    name: 'EurekaDev Hackathon Workflow Interrupted by Headphones',
    steps: [
      { event: { title: 'EurekaDev Hackathon 2026 - Devpost', domain: 'devpost.com' }, expectedThread: 'T_HACK' },
      { event: { title: 'Branch · Hackathon participation guide - ChatGPT', domain: 'chatgpt.com' }, expectedThread: 'T_HACK' },
      { event: { title: 'GitHub - team/eurekadev-ai: Browser intent memory', domain: 'github.com' }, expectedThread: 'T_HACK' },
      { event: { title: 'ScreenApp Online Screen Recorder for Hackathon Demo', domain: 'screenapp.io' }, expectedThread: 'T_HACK' },
      // Interruption: headphone search
      { event: { title: 'best noise cancelling headphones - Google Search', domain: 'google.com' }, expectedThread: 'T_HEADPHONES' },
      { event: { title: 'Sony WH-1000XM5 Wireless Headphones - RTINGS', domain: 'rtings.com' }, expectedThread: 'T_HEADPHONES' },
      // Return to hackathon
      { event: { title: 'YouTube Studio - Upload Hackathon Demo Video', domain: 'studio.youtube.com' }, expectedThread: 'T_HACK' },
      { event: { title: 'EurekaDev Project Submission Form - Devpost', domain: 'devpost.com' }, expectedThread: 'T_HACK' },
    ],
  },
  {
    id: 'seq-2',
    name: 'Physics Assignment Interrupted by Travel Booking',
    steps: [
      { event: { title: 'Quantum harmonic oscillator derivation - Google Search', domain: 'google.com' }, expectedThread: 'T_PHYS' },
      { event: { title: 'Harmonic Oscillator Energy - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu' }, expectedThread: 'T_PHYS' },
      { event: { title: 'Schrodinger equation eigenfunctions and ladder operators', domain: 'en.wikipedia.org' }, expectedThread: 'T_PHYS' },
      // Interruption: travel booking
      { event: { title: 'Tokyo Shinjuku Hotel Vacation Booking - Booking.com', domain: 'booking.com' }, expectedThread: 'T_TRAVEL' },
      { event: { title: 'Tokyo subway transit map routes - Japan Travel', domain: 'japan-guide.com' }, expectedThread: 'T_TRAVEL' },
      // Return to physics
      { event: { title: 'Quantum mechanics problem set 4 solutions PDF', domain: 'ocw.mit.edu' }, expectedThread: 'T_PHYS' },
    ],
  },
  {
    id: 'seq-3',
    name: 'Django Web App Interrupted by Recipe',
    steps: [
      { event: { title: 'Django OAuth authentication documentation', domain: 'docs.djangoproject.com' }, expectedThread: 'T_DJANGO' },
      { event: { title: 'DRF token auth setup guide and middleware', domain: 'django-rest-framework.org' }, expectedThread: 'T_DJANGO' },
      { event: { title: 'Instant Pot Chicken Tikka Masala Recipe - Serious Eats', domain: 'seriouseats.com' }, expectedThread: 'T_RECIPE' },
      { event: { title: 'Django custom user model authentication backend', domain: 'stackoverflow.com' }, expectedThread: 'T_DJANGO' },
    ],
  },
  {
    id: 'seq-4',
    name: 'Internship Hunt Interrupted by Gaming Laptop',
    steps: [
      { event: { title: 'Google Software Engineering Summer Internship 2026', domain: 'careers.google.com' }, expectedThread: 'T_INTERN' },
      { event: { title: 'Microsoft Software Engineer Intern Portal', domain: 'careers.microsoft.com' }, expectedThread: 'T_INTERN' },
      { event: { title: 'Asus ROG Zephyrus G14 Gaming Laptop Review - RTINGS', domain: 'rtings.com' }, expectedThread: 'T_LAPTOP' },
      { event: { title: 'Stripe SWE University Internship Application', domain: 'stripe.com' }, expectedThread: 'T_INTERN' },
    ],
  },
  {
    id: 'seq-5',
    name: 'Three Interleaved Research Streams',
    steps: [
      { event: { title: 'Linear algebra eigenvalue spectral theorem', domain: 'ocw.mit.edu' }, expectedThread: 'T_MATH' },
      { event: { title: 'Bose QuietComfort 45 vs Sony WH-1000XM5 review', domain: 'rtings.com' }, expectedThread: 'T_AUDIO' },
      { event: { title: 'Singular Value Decomposition proofs and PCA', domain: 'wikipedia.org' }, expectedThread: 'T_MATH' },
      { event: { title: 'Sony WH-1000XM5 active noise cancelling Amazon', domain: 'amazon.com' }, expectedThread: 'T_AUDIO' },
      { event: { title: 'Cellular biology Krebs cycle ATP synthesis', domain: 'khanacademy.org' }, expectedThread: 'T_BIO' },
      { event: { title: 'Matrix diagonalization symmetric matrices', domain: 'mathworld.wolfram.com' }, expectedThread: 'T_MATH' },
      { event: { title: 'Mitochondrial electron transport chain complexes', domain: 'ncbi.nlm.nih.gov' }, expectedThread: 'T_BIO' },
    ],
  },
];

// Add 20 more realistic sequence scenarios programmatically
for (let s = 6; s <= 25; s++) {
  const dt1 = DOMAINS_AND_TOPICS[(s * 3) % DOMAINS_AND_TOPICS.length];
  const dt2 = DOMAINS_AND_TOPICS[(s * 5 + 1) % DOMAINS_AND_TOPICS.length];
  BENCHMARK_SEQUENCES.push({
    id: `seq-${s}`,
    name: `Task Switching: ${dt1.topic} and ${dt2.topic}`,
    steps: [
      { event: { title: dt1.rel[0], domain: 'scholar.google.com' }, expectedThread: `T_TOPIC_${s}_A` },
      { event: { title: dt1.rel[1], domain: 'arxiv.org' }, expectedThread: `T_TOPIC_${s}_A` },
      { event: { title: dt2.rel[0], domain: 'nature.com' }, expectedThread: `T_TOPIC_${s}_B` },
      { event: { title: dt2.rel[1], domain: 'sciencedirect.com' }, expectedThread: `T_TOPIC_${s}_B` },
      { event: { title: dt1.rel[2], domain: 'github.com' }, expectedThread: `T_TOPIC_${s}_A` },
      { event: { title: dt2.rel[2], domain: 'arxiv.org' }, expectedThread: `T_TOPIC_${s}_B` },
    ],
  });
}
