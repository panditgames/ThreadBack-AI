# ThreadBack AI privacy

Tab metadata is processed locally. No telemetry, analytics, server, content script, or automatic external AI request is part of the extension workflow.

## Data

Stored data includes page URLs (including query strings), titles, domains, extracted search queries, timestamps, tab/opener identifiers, inferred tasks, and settings. URLs/titles can contain sensitive information; do not assume secrets or tracking parameters are stripped. Page bodies, form inputs, cookies and keystrokes are not read.

Storage uses chrome.storage.local in the extension and localStorage in the web preview. It is not application-encrypted. Browser profile isolation is not encryption.

## Controls

Page-content analysis defaults OFF. Extraction is not implemented; the reserved switch is disabled. The Privacy Center supports comma-separated domain exclusions, thread deletion, clearing browsing intelligence, and erasing all ThreadBack data. Clear-all persists an empty marker to prevent demo restoration on reload. Exclusions apply to future capture, not existing saved events. Automatic age purge and JSON export are not implemented.

The collector excludes internal/extension protocols, non-HTTP(S) pages, incognito tabs, localhost, loopback addresses and .local hosts. Default domain exclusions are bank (substring), paypal.com and accounts.google.com. This is not a complete list of sensitive websites.

## Local semantic model

A tiny curated concept classifier is bundled with the extension. It reads only existing titles and genuinely observed search queries, in memory. Loading the JSON asset accesses the extension's own files, not a server. It collects no page bodies, cookies, forms or extra metadata, persists no embeddings/training examples, and adds no telemetry or permissions. Failure uses existing heuristics. No API key or remote inference is required. Browser-local storage remains unencrypted.

## AI and network

The experimental provider adapter is not connected to the extension workflow; its UI switch is disabled. If invoked directly by a developer with enabled settings and a key, it sends titles, domains and queries to the selected provider and falls back locally on request errors. Stored keys are not encrypted. No key is required for the product.

Resume Task opens selected task URLs, making normal browser requests to those sites. Demo URLs are synthetic but may open external websites. Use a separate browser profile for evaluation to avoid collecting personal browsing metadata.

## Permissions

Only tabs, storage and alarms are requested. History import, content injection and host permissions are absent. Tests cover defaults, deletion, exclusions, unsafe URLs, denied tab access and offline AI fallback. See HANDOFF.md for actual release results and browser limitations.

TinySemanticClassifier is a second-stage, deterministic metadata resolver. It adds no network requests, backend, API key, telemetry, browser permissions, content extraction or persistent training examples. Domain strings cannot establish its semantic topic, and query context must match an observed search URL. Malformed input or classifier errors preserve the heuristic decision.
