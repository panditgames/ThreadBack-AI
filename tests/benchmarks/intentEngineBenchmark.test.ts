import { describe, it, expect } from 'vitest';
import {
  tinySemanticClassifier,
  PageMetadataInput,
  CandidateThreadMetadataInput
} from '../../src/engine/localIntentClassifier';

interface BenchmarkTestCase {
  id: number;
  label: string;
  category: 'RELATED_EASY' | 'RELATED_AMBIGUOUS_CROSS_DOMAIN' | 'UNRELATED_SAME_DOMAIN' | 'UNRELATED_GENERIC_WORD_TRAPS' | 'UNRELATED_CROSS_DOMAIN';
  isAmbiguous: boolean;
  groundTruth: 'RELATED' | 'UNRELATED';
  page: PageMetadataInput;
  candidate: CandidateThreadMetadataInput;
}

export const BENCHMARK_CASES: BenchmarkTestCase[] = [
  // Curated development cases, not an independent held-out accuracy evaluation.
  {
    id: 1,
    label: 'EurekaDev submission vs hackathon strategy guide',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'How to Win a Hackathon - Strategy Guide', domain: 'medium.com' },
    candidate: { id: 't-1', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'submission'], recentTitles: ['EurekaDev Devpost Form'] }
  },
  {
    id: 2,
    label: 'EurekaDev Devpost vs EurekaDev Unstop',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'EurekaDev Hackathon 2026 - Unstop Competition', domain: 'unstop.com' },
    candidate: { id: 't-2', title: 'EurekaDev 2026 Hackathon on Devpost', keywords: ['eurekadev', 'hackathon', 'devpost'], recentTitles: ['Devpost EurekaDev Guidelines'] }
  },
  {
    id: 3,
    label: 'Google hackathon search vs YouTube demo video',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'EurekaDev Hackathon Project Demo Video - YouTube', domain: 'youtube.com' },
    candidate: { id: 't-3', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon'], recentTitles: ['EurekaDev hackathon submission - Google Search'], originatingSearchQuery: 'EurekaDev hackathon submission' }
  },
  {
    id: 4,
    label: 'ANC headphone search vs RTINGS review',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Sony WH-1000XM5 Noise Canceling Headphones Review - RTINGS.com', domain: 'rtings.com' },
    candidate: { id: 't-4', title: 'Compare ANC Headphones', keywords: ['headphones', 'anc', 'noise', 'cancelling'], recentTitles: ['best ANC headphones under budget - Google Search'], originatingSearchQuery: 'best ANC headphones' }
  },
  {
    id: 5,
    label: 'Amazon headphone product vs Reddit honest review',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Sony WH-1000XM5 Honest Long-Term Review : r/headphones', domain: 'reddit.com' },
    candidate: { id: 't-5', title: 'Compare ANC Headphones', keywords: ['headphones', 'wh 1000xm5', 'sony'], recentTitles: ['Sony WH-1000XM5 Wireless Headphones - Amazon'] }
  },
  {
    id: 6,
    label: 'Physics harmonic oscillator vs lecture notes',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Quantum Mechanics Lecture 1 Wavefunction Notes', domain: 'ocw.mit.edu' },
    candidate: { id: 't-6', title: 'Quantum Physics Study', keywords: ['quantum', 'physics', 'harmonic oscillator'], recentTitles: ['Quantum Physics Harmonic Oscillator - HyperPhysics'] }
  },
  {
    id: 7,
    label: 'Travel Tokyo search vs hotel comparison booking',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Best hotels in Shinjuku Tokyo 2026 - Booking.com', domain: 'booking.com' },
    candidate: { id: 't-7', title: 'Tokyo Trip Vacation Planning', keywords: ['tokyo', 'japan', 'travel', 'hotel'], recentTitles: ['Tokyo trip itinerary 7 days - Google Search'], originatingSearchQuery: 'Tokyo trip itinerary 7 days' }
  },
  {
    id: 8,
    label: 'Tokyo hotel reservation vs Tokyo subway route map',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Tokyo subway route map & navigation guide', domain: 'tokyometro.jp' },
    candidate: { id: 't-8', title: 'Tokyo Trip Vacation Planning', keywords: ['tokyo', 'japan', 'hotel', 'travel'], recentTitles: ['Tokyo Shinjuku Hotel Vacation Booking'] }
  },
  {
    id: 9,
    label: 'Generic recorder has no captured hackathon evidence',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'EurekaDev Hackathon Pitch Demo Recording Form', domain: 'devpost.com' },
    candidate: { id: 't-9', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'demo'], recentTitles: ['ScreenApp - Free Screen & Audio Recorder'] }
  },
  {
    id: 10,
    label: 'ChatGPT hackathon pitch vs Devpost rules rubric',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'EurekaDev Hackathon Rules and Rubric - Devpost', domain: 'devpost.com' },
    candidate: { id: 't-10', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'pitch'], recentTitles: ['ChatGPT - Hackathon project ideas and architecture'] }
  },
  {
    id: 11,
    label: 'Bose QC45 comparison vs Amazon headphone deals',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Bose QuietComfort 45 Headphones Deal - Amazon', domain: 'amazon.com' },
    candidate: { id: 't-11', title: 'Compare ANC Headphones', keywords: ['headphones', 'qc45', 'bose', 'rtings'], recentTitles: ['Bose QuietComfort 45 vs Sony WH-1000XM5 - RTINGS'] }
  },
  {
    id: 12,
    label: 'EurekaDev submission form vs GitHub repository',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'EurekaDev Hackathon Project GitHub Repository', domain: 'github.com' },
    candidate: { id: 't-12', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'submission'], recentTitles: ['Submit EurekaDev Project - Submission Form'] }
  },
  {
    id: 13,
    label: 'Quantum potential well vs Schrodinger equation',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'Solving the 1D Schrodinger Equation - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu' },
    candidate: { id: 't-13', title: 'Quantum Physics Study', keywords: ['quantum', 'schrodinger', 'physics'], recentTitles: ['Quantum mechanics potential well problems'] }
  },
  {
    id: 14,
    label: 'Flight search to Tokyo vs United Airlines booking',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'United Airlines Flight SFO to HND Booking', domain: 'united.com' },
    candidate: { id: 't-14', title: 'Tokyo Trip Vacation Planning', keywords: ['flight', 'tokyo', 'travel'], recentTitles: ['best flight deals San Francisco to Tokyo'] }
  },
  {
    id: 15,
    label: 'Earbuds noise cancellation review vs AirPods Pro Amazon',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'Apple AirPods Pro 2 Wireless Earbuds - Amazon', domain: 'amazon.com' },
    candidate: { id: 't-15', title: 'Compare ANC Headphones', keywords: ['earbuds', 'noise cancelling', 'anc'], recentTitles: ['Earbuds with active noise cancellation reviews'] }
  },
  {
    id: 16,
    label: 'EurekaDev Discord team match vs Devpost registration',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'EurekaDev Devpost Registration and Guidelines', domain: 'devpost.com' },
    candidate: { id: 't-16', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon'], recentTitles: ['EurekaDev Discord Announcement & Team Match'] }
  },
  {
    id: 17,
    label: 'Django REST Framework tutorial vs session auth docs',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'Django Session & Token Authentication Views - Django Docs', domain: 'docs.djangoproject.com' },
    candidate: { id: 't-17', title: 'Django Web Authentication', keywords: ['django', 'authentication', 'views'], recentTitles: ['Python Django REST Framework Tutorial'] }
  },
  {
    id: 18,
    label: 'Django CSRF token cookie vs auth middleware settings',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'Django Authentication Middleware Settings - GitHub', domain: 'github.com' },
    candidate: { id: 't-18', title: 'Django Web Authentication', keywords: ['django', 'authentication', 'csrf'], recentTitles: ['Django CSRF Token Cookie Setup - Stack Overflow'] }
  },
  {
    id: 19,
    label: 'Kepler laws planetary motion vs N-body orbital simulation',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'N-body Orbital Mechanics Simulation - NASA', domain: 'nasa.gov' },
    candidate: { id: 't-19', title: 'Astronomy Orbital Mechanics', keywords: ['orbital', 'kepler', 'astronomy'], recentTitles: ["Kepler's Laws of Planetary Motion"] }
  },
  {
    id: 20,
    label: 'Google Summer of Code guide vs GSoC organization proposals',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'GSoC Organization Proposals & Mentors - GitHub', domain: 'github.com' },
    candidate: { id: 't-20', title: 'Google Summer of Code 2026', keywords: ['gsoc', 'summer of code', 'proposals'], recentTitles: ['Google Summer of Code 2026 Student Guide'] }
  },
  {
    id: 21,
    label: 'Laptop buying guide dev vs MacBook Pro M3 specs',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'MacBook Pro M3 Max 16-inch Specs & Benchmarks - Apple', domain: 'apple.com' },
    candidate: { id: 't-21', title: 'Laptop Research and Purchase', keywords: ['laptop', 'macbook pro', 'specs'], recentTitles: ['Laptop buying guide for software development - Reddit'] }
  },
  {
    id: 22,
    label: 'MacBook Pro review RTINGS vs Apple Store Amazon deals',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'MacBook Pro 16 Apple Store Refurbished Deals - Amazon', domain: 'amazon.com' },
    candidate: { id: 't-21', title: 'Laptop Research and Purchase', keywords: ['macbook pro', 'laptop', 'rtings'], recentTitles: ['MacBook Pro 16 M3 Max Review - RTINGS'] }
  },
  {
    id: 23,
    label: 'Chrome extension Manifest V3 guide vs serviceWorker docs',
    category: 'RELATED_EASY',
    isAmbiguous: false,
    groundTruth: 'RELATED',
    page: { title: 'Chrome Extension serviceWorker and storage.local Guide', domain: 'github.com' },
    candidate: { id: 't-23', title: 'Chrome Extension Development', keywords: ['chrome extension', 'manifest v3', 'serviceworker'], recentTitles: ['How to build Chrome extensions with Manifest V3'] }
  },
  {
    id: 24,
    label: 'Generic upload form has no captured task evidence',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'YouTube Studio Upload Video Form', domain: 'studio.youtube.com' },
    candidate: { id: 't-24', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'demo'], recentTitles: ['EurekaDev AI Track Submission Video Demo - YouTube'] }
  },
  {
    id: 25,
    label: 'Unstop EurekaDev dashboard vs project slides Canva',
    category: 'RELATED_AMBIGUOUS_CROSS_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'RELATED',
    page: { title: 'EurekaDev Final Project Slide Deck - Canva', domain: 'canva.com' },
    candidate: { id: 't-25', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'unstop'], recentTitles: ['Unstop EurekaDev Hackathon Submissions Dashboard'] }
  },

  // Negative cases, including shared hosting and generic-word traps.
  {
    id: 26,
    label: 'Python Django auth vs Python astronomy orbital mechanics',
    category: 'UNRELATED_GENERIC_WORD_TRAPS',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Python Astronomy Orbital Mechanics Analysis and Simulation', domain: 'astronomy.org' },
    candidate: { id: 't-django', title: 'Python Django Authentication and OAuth Login', keywords: ['python', 'django', 'authentication', 'login'], recentTitles: ['Django Session Authentication'] }
  },
  {
    id: 27,
    label: 'Apply for hackathon vs Apply for software internship',
    category: 'UNRELATED_GENERIC_WORD_TRAPS',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Apply for Google Software Engineering Summer Internship', domain: 'careers.google.com' },
    candidate: { id: 't-hackathon', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'submission'], recentTitles: ['Apply for EurekaDev Hackathon 2026 - Unstop'] }
  },
  {
    id: 28,
    label: 'YouTube hackathon tutorial vs YouTube quantum physics lecture',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Introduction to Quantum Mechanics Lecture 1 - YouTube', domain: 'youtube.com' },
    candidate: { id: 't-yt-hack', title: 'Hackathon Submission Video Tutorial Demo', keywords: ['hackathon', 'submission', 'tutorial', 'youtube'], recentTitles: ['ScreenApp Hackathon Screen Recording'] }
  },
  {
    id: 29,
    label: 'ChatGPT hackathon pitch vs ChatGPT fix virtualenv error',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Fix Python Virtualenv Pip Installation Error - ChatGPT', domain: 'chatgpt.com' },
    candidate: { id: 't-gpt-hack', title: 'Hackathon Project Pitch and Judging Presentation', keywords: ['hackathon', 'pitch', 'chatgpt'], recentTitles: ['EurekaDev Elevator Pitch Ideas'] }
  },
  {
    id: 30,
    label: 'Sony WH-1000XM5 headphones vs Quantum harmonic oscillator',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Quantum Physics Harmonic Oscillator - HyperPhysics', domain: 'hyperphysics.phy-astr.gsu.edu' },
    candidate: { id: 't-headphones', title: 'Compare ANC Headphones', keywords: ['headphones', 'sony', 'wh 1000xm5'], recentTitles: ['Sony WH-1000XM5 Wireless Headphones Amazon'] }
  },
  {
    id: 31,
    label: 'Tokyo Shinjuku hotel vs Django REST auth',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Django REST Framework Token Authentication Views', domain: 'django-rest-framework.org' },
    candidate: { id: 't-travel', title: 'Tokyo Trip Vacation Planning', keywords: ['tokyo', 'hotel', 'japan'], recentTitles: ['Tokyo Shinjuku Hotel Vacation Booking'] }
  },
  {
    id: 32,
    label: 'NASA Apollo lunar project vs EurekaDev project submission',
    category: 'UNRELATED_GENERIC_WORD_TRAPS',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Project Apollo - NASA Lunar Landing Historical Archive', domain: 'nasa.gov' },
    candidate: { id: 't-hackathon', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'submission', 'project'], recentTitles: ['Devpost EurekaDev Submission Form'] }
  },
  {
    id: 33,
    label: 'Buying guide gaming laptops vs Beginner guide quantum physics',
    category: 'UNRELATED_GENERIC_WORD_TRAPS',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: "Beginner's Guide to Quantum Physics Principles", domain: 'physicsworld.com' },
    candidate: { id: 't-laptop', title: 'Laptop Buying Research Guide', keywords: ['laptop', 'buying', 'guide'], recentTitles: ['Ultimate Guide to Buying Gaming Laptops'] }
  },
  {
    id: 34,
    label: 'Astrophysics research papers vs Headphones market research',
    category: 'UNRELATED_GENERIC_WORD_TRAPS',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Top 10 Research Papers in Astrophysics 2026', domain: 'arxiv.org' },
    candidate: { id: 't-headphones', title: 'Compare ANC Headphones', keywords: ['headphones', 'anc', 'research'], recentTitles: ['Market Research on Wireless Headphones Market'] }
  },
  {
    id: 35,
    label: 'Apply video compression FFmpeg vs Apply software engineer internship',
    category: 'UNRELATED_GENERIC_WORD_TRAPS',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Apply for Software Engineer Internship at Apple', domain: 'jobs.apple.com' },
    candidate: { id: 't-ffmpeg', title: 'Video Processing Scripts', keywords: ['video', 'compression', 'apply'], recentTitles: ['How to Apply Video Compression Using FFmpeg'] }
  },
  {
    id: 36,
    label: 'YouTube homemade sourdough bread vs YouTube EurekaDev demo',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'How to Make Homemade Sourdough Bread - YouTube', domain: 'youtube.com' },
    candidate: { id: 't-yt-hack', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon', 'demo'], recentTitles: ['EurekaDev Hackathon Demo Presentation - YouTube'] }
  },
  {
    id: 37,
    label: 'YouTube quantum mechanics spin vs YouTube Sony headphones review',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Quantum Mechanics Spin States and Superposition - YouTube', domain: 'youtube.com' },
    candidate: { id: 't-headphones', title: 'Compare ANC Headphones', keywords: ['headphones', 'sony', 'wh 1000xm5'], recentTitles: ['Sony WH-1000XM5 Honest Audio Review - YouTube'] }
  },
  {
    id: 38,
    label: 'Reddit r/headphones ANC vs Reddit r/cscareerquestions internship',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'How to pass SWE summer internship technical interviews : r/cscareerquestions', domain: 'reddit.com' },
    candidate: { id: 't-headphones', title: 'Compare ANC Headphones', keywords: ['headphones', 'anc', 'reddit'], recentTitles: ['What is the best ANC under $200 : r/headphones'] }
  },
  {
    id: 39,
    label: 'Reddit r/django OAuth2 vs Reddit r/Tokyo ramen shops',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Best ramen shops in Shinjuku and Shibuya : r/Tokyo', domain: 'reddit.com' },
    candidate: { id: 't-django', title: 'Django Web Authentication', keywords: ['django', 'oauth', 'reddit'], recentTitles: ['Best practices for OAuth2 authentication : r/django'] }
  },
  {
    id: 40,
    label: 'Amazon Sony WH-1000XM5 vs Amazon Electrodynamics textbook',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Introduction to Electrodynamics Griffiths Physics Textbook - Amazon', domain: 'amazon.com' },
    candidate: { id: 't-headphones', title: 'Compare ANC Headphones', keywords: ['headphones', 'sony', 'amazon'], recentTitles: ['Sony WH-1000XM5 Noise Canceling Headphones - Amazon'] }
  },
  {
    id: 41,
    label: 'Amazon Japan travel guide vs Amazon Bose QC45 headphones',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Lonely Planet Japan Travel Guide Book - Amazon', domain: 'amazon.com' },
    candidate: { id: 't-headphones', title: 'Compare ANC Headphones', keywords: ['headphones', 'bose', 'qc45'], recentTitles: ['Bose QuietComfort 45 Headphones - Amazon'] }
  },
  {
    id: 42,
    label: 'Booking.com Tokyo hotel vs Devpost EurekaDev hackathon',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Hotel Sunroute Plaza Shinjuku Tokyo - Booking.com', domain: 'booking.com' },
    candidate: { id: 't-hackathon', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon'], recentTitles: ['EurekaDev Global AI Hackathon - Devpost'] }
  },
  {
    id: 43,
    label: 'Meta careers production internship vs RTINGS noise cancelling earbuds',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Production Engineering Internship Application - Meta Careers', domain: 'metacareers.com' },
    candidate: { id: 't-earbuds', title: 'Compare ANC Headphones', keywords: ['earbuds', 'noise cancelling', 'rtings'], recentTitles: ['Best Noise Cancelling Earbuds 2026 - RTINGS'] }
  },
  {
    id: 44,
    label: 'NASA JPL Mars orbital telemetry vs Unstop EurekaDev competition',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Mars Rover Orbital Telemetry Data - NASA JPL', domain: 'jpl.nasa.gov' },
    candidate: { id: 't-hackathon', title: 'Submit EurekaDev Project', keywords: ['eurekadev', 'hackathon'], recentTitles: ['EurekaDev Coding Competition Guidelines - Unstop'] }
  },
  {
    id: 45,
    label: 'PyPI django-cors-headers vs Expedia cheap flights Tokyo',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Cheap Flights to Tokyo Narita - Expedia', domain: 'expedia.com' },
    candidate: { id: 't-django', title: 'Django Web Authentication', keywords: ['django', 'pypi'], recentTitles: ['django-cors-headers package - PyPI'] }
  },
  {
    id: 46,
    label: 'GitHub cpython issue 12345 vs Booking.com Ryokan Kyoto',
    category: 'UNRELATED_CROSS_DOMAIN',
    isAmbiguous: false,
    groundTruth: 'UNRELATED',
    page: { title: 'Ryokan Kyoto Vacation Reservation - Booking.com', domain: 'booking.com' },
    candidate: { id: 't-cpython', title: 'Python Core Development', keywords: ['python', 'cpython', 'github'], recentTitles: ['python/cpython issue #12345 - GitHub'] }
  },
  {
    id: 47,
    label: 'Wikipedia quantum superposition vs Wikipedia headphones acoustics',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Noise-cancelling headphones acoustics and engineering - Wikipedia', domain: 'wikipedia.org' },
    candidate: { id: 't-quantum', title: 'Quantum Physics Study', keywords: ['quantum', 'superposition', 'wikipedia'], recentTitles: ['Quantum superposition and entanglement - Wikipedia'] }
  },
  {
    id: 48,
    label: 'Wikipedia Tokyo special wards vs Wikipedia hackathon culture',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'Tokyo Special Wards History and Geography - Wikipedia', domain: 'wikipedia.org' },
    candidate: { id: 't-hackathon', title: 'Submit EurekaDev Project', keywords: ['hackathon', 'wikipedia'], recentTitles: ['Hackathon culture and history - Wikipedia'] }
  },
  {
    id: 49,
    label: 'Google search python virtualenv vs Google search sushi Tokyo Station',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'best sushi restaurants near Tokyo Station - Google Search', domain: 'google.com', searchQuery: 'best sushi restaurants near Tokyo Station' },
    candidate: { id: 't-python', title: 'Python Development Environment', keywords: ['python', 'virtualenv'], recentTitles: ['python virtualenv activation script - Google Search'], originatingSearchQuery: 'python virtualenv activation script' }
  },
  {
    id: 50,
    label: 'Google search cheap flights Tokyo vs Google search headphones for flying',
    category: 'UNRELATED_SAME_DOMAIN',
    isAmbiguous: true,
    groundTruth: 'UNRELATED',
    page: { title: 'best noise cancelling headphones for flying - Google Search', domain: 'google.com', searchQuery: 'best noise cancelling headphones for flying' },
    candidate: { id: 't-travel', title: 'Tokyo Trip Vacation Planning', keywords: ['tokyo', 'flights', 'travel'], recentTitles: ['cheap flights to tokyo march 2026 - Google Search'], originatingSearchQuery: 'cheap flights to tokyo march 2026' }
  }
];

describe('TinySemanticClassifier curated development benchmark (50 cases)', () => {
  it('measures the classifier directly (not production routing) on all 50 ground-truth cases', () => {
    let correct = 0;
    let falseMerges = 0; // Predicted RELATED, ground truth UNRELATED (DANGEROUS)
    let falseSplits = 0;  // Predicted UNRELATED, ground truth RELATED
    let ambiguousTotal = 0;
    let ambiguousCorrect = 0;

    for (const testCase of BENCHMARK_CASES) {
      const decision = tinySemanticClassifier.classify(testCase.page, testCase.candidate);
      const isCorrect = decision.decision === testCase.groundTruth;

      if (isCorrect) {
        correct++;
      } else {
        if (decision.decision === 'RELATED' && testCase.groundTruth === 'UNRELATED') {
          falseMerges++;
        } else if (decision.decision === 'UNRELATED' && testCase.groundTruth === 'RELATED') {
          falseSplits++;
        }
      }

      if (testCase.isAmbiguous) {
        ambiguousTotal++;
        if (isCorrect) ambiguousCorrect++;
      }
    }

    const accuracyPct = (correct / BENCHMARK_CASES.length) * 100;
    const negatives = BENCHMARK_CASES.filter(c => c.groundTruth === 'UNRELATED').length;
    const positives = BENCHMARK_CASES.length - negatives;
    const falseMergeRatePct = (falseMerges / negatives) * 100;
    const falseSplitRatePct = (falseSplits / positives) * 100;
    const ambiguousAccuracyPct = (ambiguousCorrect / ambiguousTotal) * 100;

    console.log('[CURATED DEVELOPMENT BENCHMARK: TinySemanticClassifier]');
    console.log(`- Total Cases: ${BENCHMARK_CASES.length}`);
    console.log(`- Accuracy: ${accuracyPct.toFixed(1)}% (${correct}/${BENCHMARK_CASES.length})`);
    console.log(`- False Merge Rate: ${falseMergeRatePct.toFixed(1)}% (${falseMerges}/${negatives})`);
    console.log(`- False Split Rate: ${falseSplitRatePct.toFixed(1)}% (${falseSplits}/${positives})`);
    console.log(`- Ambiguous-Case Accuracy: ${ambiguousAccuracyPct.toFixed(1)}% (${ambiguousCorrect}/${ambiguousTotal})`);

    // Strict requirements: Zero or near-zero false merges (false merges are strictly penalized)
    expect(accuracyPct).toBeGreaterThanOrEqual(92);
    expect(falseMergeRatePct).toBe(0); // No false merges allowed on this curated development set
    expect(ambiguousAccuracyPct).toBeGreaterThanOrEqual(88);
  });

  it('measures inference latency over 1,000 iterations for Candidate A', () => {
    const sampleCase = BENCHMARK_CASES[0];
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      tinySemanticClassifier.classify(sampleCase.page, sampleCase.candidate);
    }
    const totalMs = performance.now() - start;
    const avgMsPerCall = totalMs / iterations;

    console.log(`[TINY CLASSIFIER LATENCY] ${iterations} iterations took ${totalMs.toFixed(2)}ms (avg ${avgMsPerCall.toFixed(4)}ms / call)`);
    expect(avgMsPerCall).toBeLessThan(5); // Generous sanity gate; report measured latency, not a hardware guarantee
  });

});
