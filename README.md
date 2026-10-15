# ThreadBack AI 🧠⚡

> **Browser history remembers pages. Bookmarks remember URLs. ThreadBack AI remembers unfinished intentions.**

🏆 **Hackathon**: EurekaDev 2026  
🎯 **Track**: Coding → Computer Science + AI  
🧩 **Platform**: Google Chrome & Microsoft Edge Extension (Manifest V3)  
🛡️ **Privacy Architecture**: 100% Local-First by default • Zero telemetry • No external backend required • AI is completely optional  

---

## 📌 Executive Summary

Every developer, researcher, and knowledge worker suffers from **Tab Overload** and **Context Fragmentation**. When you open 30 tabs while tackling a hackathon project, comparing laptops, or researching a technical paper, closing the browser or switching tasks obliterates your cognitive momentum. Traditional tools fail:
- **Browser History** is a flat, unorganized chronological stream of thousands of URLs.
- **Bookmarks** are static graveyards requiring manual curation.
- **Tab Managers** save raw URLs into folders without understanding *what you were trying to do* or *where you left off*.

**ThreadBack AI** solves this problem by observing non-invasive browser activity metadata (titles, domains, timestamps, search queries) and reconstructing high-level **Intent Threads**. It automatically deduces:
1. **What you were trying to achieve** (e.g., *"Submit EurekaDev Project"*).
2. **Which tabs belong to that specific task**.
3. **What milestones were already accomplished** (backed by concrete browsing evidence).
4. **Where you stopped and what likely remains unfinished**.
5. **The exact next action** to regain flow.

With one click on **"Resume Task"**, ThreadBack AI reopens closed tabs, focuses active tabs in logical order, and displays a concise briefing so you immediately regain flow.

---

## ✨ Key Features

### 1. 🚀 Hero Feature: One-Click "Resume Task"
Restores your cognitive state in seconds. ThreadBack:
- Deduplicates open and closed tabs.
- Reopens closed tabs belonging to the task in priority order.
- Switches focus to the most relevant active tab.
- Generates a **Resume Briefing** with:
  - *You were working on:* High-level task objective.
  - *Last observed action:* Exactly where you paused.
  - *Likely completed milestones:* Verified by visited evidence.
  - *Likely remaining steps & Suggested next action:* Derived with honest probabilistic qualifiers (*Likely*, *Possibly*).

### 2. 🧮 Explainable "Why Was This Grouped?"
No black boxes. Clicking **"Why?"** on any thread displays transparent mathematical clustering factors:
- Exact keyword overlap between page titles.
- Shared domain relationships (e.g. `devpost.com` ↔ `github.com`).
- Search query alignment (e.g. *"eureka devpost demo video"*).
- Temporal proximity (e.g. visited within 6 minutes).
- Opener and navigation chains.

### 3. 🗺️ Structured Intent Graph
Visualizes your task progression as a Directed Acyclic Graph (DAG) with:
- **Completed milestones** (marked with checkmarks and concrete URL evidence).
- **In-progress milestones** (highlighted with active pulse).
- **Pending/Inferred next milestones**.

### 4. ⏸️ Interruption Recovery & Inactivity Detection
If you switch from working on your hackathon project to an urgent work Slack or social media tab, ThreadBack detects the interruption gap. When you return, it alerts you:
> *"You left 'Submit EurekaDev Project' 2 hours ago. 4 related tabs are ready to resume."*

### 5. 🔍 Omnisearch & Timeline Inspection
- Instant real-time substring search across active and archived intent threads.
- Chronological timeline inspection showing the exact sequence of queries and page interactions leading to task milestones.

### 6. 🛠️ Full Manual Controls
You are always in control:
- Rename threads.
- Mark tasks as **ACTIVE**, **PAUSED**, **LIKELY_COMPLETE**, or **ARCHIVED**.
- Merge mistakenly separated threads.
- Split incorrectly grouped tabs into new threads.
- Delete individual threads or purge all data.

### 7. 🎭 Deterministic Demo Mode
For hackathon judges and evaluators, a prominent **"Demo Data"** button instantly populates three realistic browsing scenarios:
1. **Submit EurekaDev Project** (Devpost, GitHub, ScreenApp, YouTube Studio).
2. **Compare ANC Headphones** (RTINGS, Amazon Sony WH-CH720N vs Sennheiser Accentum).
3. **Physics Assignment Research** (HyperPhysics and Wikipedia quantum harmonic oscillator).

---

## 🔒 Privacy & Security First

ThreadBack AI is built upon strict non-negotiable privacy principles:
- **Zero Full-Page Content Inspection by Default**: The extension inspects only URL metadata, tab titles, domains, timestamps, and search query parameters.
- **Page-content analysis**: OFF. Extraction is not implemented and its reserved control is disabled.
- **Domain Exclusion List**: Automatically skips sensitive internal pages (`chrome://`, `edge://`, `about:blank`, `localhost`, `127.0.0.1`, banking domains).
- **100% Local Storage**: Stored inside browser `chrome.storage.local`. No external server, no database, no telemetry, no analytics.
- **Zero Hardcoded Secrets**: Completely free of API keys or proprietary endpoints.
- **Optional AI**: A provider adapter exists but is not connected to the extension workflow; its reserved UI control is disabled.

---

## 🏗️ Architecture Overview

ThreadBack AI is structured into 8 modular layers:

```
┌────────────────────────────────────────────────────────┐
│                   Extension UI Layer                   │
│   Popup (Quick Bar) • Full Dashboard • Side Panel       │
│   Modals: Resume Briefing, Why?, Graph, Timeline, Privacy │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│               Task State & Resume Engine               │
│   • Resume Tab Selector    • Status Inferer            │
│   • Next Action Inferer    • Interruption Detector     │
│   • Intent Graph Generator • Why Explainer             │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│              Deterministic Clustering Engine           │
│   Multi-Signal Similarity Score (Title, Domain,         │
│   Query, Temporal Proximity, Opener Hierarchy)         │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│           Browser Activity Collector (MV3)             │
│   chrome.tabs metadata events  │
│   Privacy Filters • Query Extractor • Normalizer       │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│          Storage Layer (chrome.storage.local)          │
│   Schema validation • Corrupt fallback       │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js 22 or later recommended
- npm (v9.x or later)
- Google Chrome, Microsoft Edge, Brave, or any Chromium Manifest V3 compatible browser

### 1. Build the Extension
```bash
# Install dependencies
npm install

# Run the comprehensive test suite (including release regressions)
npm test

# Build production bundle for Chrome/Edge
npm run build
```
The compiled, production-ready extension will be output to the `dist/` directory.

### 2. Load into Chrome / Edge
1. Open your browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode** (toggle switch in the top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the `dist` directory inside the project root:
   `<project>/dist`
5. ThreadBack AI will now appear in your browser toolbar with its icon.
6. Click the extension icon to view the **Popup**, or click **"Open Full Dashboard"** (or inspect `dashboard.html`).

---

## 🧪 Testing & Verification

The codebase includes an extensive 10-phase verification suite powered by **Vitest**:
```bash
# Run all test suites
npx vitest run
```

### Test Coverage Highlights:
- **Unit Tests**: Title tokenization, query extraction, multi-signal scoring weights, temporal decay, and domain normalization.
- **Adversarial & Edge Cases**: Empty tab sessions, rapid burst of 200 concurrent events, malformed URLs, and storage corruption resilience.
- **Large-scale benchmark**: Includes 10,000 events with a 90-second engine processing budget. Browser rendering performance is separate.
- **Security/privacy audit**: Checks secrets, minimal permissions (tabs, storage, alarms), and privacy defaults.
- **UI & Workflow Tests**: Component rendering, substring filtering, modal interactions, and end-to-end judge hero workflows.

---

## ⚖️ Limitations & Honest AI Disclosure

- **Privacy-Constrained Heuristics**: Because ThreadBack refuses to silently scrape full webpage text, clustering is computed purely from URL structures, search queries, navigation timing, and page titles. Occasional ambiguous titles (e.g. *"Home"*, *"Dashboard"*) are grouped using domain relationship and temporal continuity.
- **Tab Lifecycle**: When restoring tabs closed days ago, some web applications requiring active session tokens may require the user to log in again.
- **AI enhancement**: Provider code is experimental and not invoked by the extension UI. Content extraction, automatic retention, JSON export and registered browser side-panel integration are not implemented.

---

## 📄 License
Created for EurekaDev 2026. No license file has been provided.

## Permissions and judge demo

- tabs: capture metadata and restore relevant URLs.
- storage: persist tasks and settings locally.
- alarms: synchronize saved state periodically. No host permissions or content scripts.

Open Dashboard and click **Demo Data**, then inspect the three synthetic cards using Timeline, Why?, Graph, Resume Task, search, and the card menu to complete/archive a task. Demo Data replaces saved threads. Use a separate browser profile for evaluation. Demo URLs are illustrative and some require login or may no longer resolve. Web preview shows briefings but cannot restore browser tabs.

URLs and titles can contain personal data. Domain exclusions apply to future events; clear existing data separately. Browser storage is not application-encrypted. Search uses substring matching.

AI assistance disclosure: Antigravity generated the initial implementation. OpenAI Codex assisted final QA, targeted debugging, regression tests and documentation corrections. Runtime intent inference uses deterministic local heuristics.
