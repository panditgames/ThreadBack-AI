import { ActivityEvent, ClusterEvidence, TabReference } from '../types';
import { extractTitleKeywords } from './keywords';
import { computeEventSimilarity } from './scoring';

export function generateWhyExplanation(events: ActivityEvent[], tabs: TabReference[]): ClusterEvidence {
  // Count each page once: a tab and its navigation event are the same evidence.
  const pages = new Map<string, { title: string; domain: string }>();
  for (const page of [...events, ...tabs]) pages.set(page.url.split('#')[0], page);
  const counts = new Map<string, number>();
  for (const page of pages.values()) for (const word of new Set(extractTitleKeywords(page.title))) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const sharedKeywords = [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([word]) => word);
  const primaryDomains = [...new Set([...pages.values()].map(p => p.domain).filter(Boolean))];
  const searchQueries = [...new Set(events.map(e => e.searchQuery).filter((q): q is string => !!q))];
  const times = events.map(e => e.timestamp).filter(Number.isFinite);
  const timeSpanMinutes = times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 60000) : 0;
  const openerRelationshipFound = events.some(child => child.openerTabId !== undefined && events.some(parent => parent.tabId === child.openerTabId));
  const points: string[] = [];
  if (sharedKeywords.length) points.push('Keywords shared across distinct pages: ' + sharedKeywords.slice(0, 3).join(', '));
  if (searchQueries.length) points.push('Observed search query: "' + searchQueries[0] + '"');
  if (times.length > 1) points.push('Observed activity spans ' + timeSpanMinutes + ' minutes');
  if (openerRelationshipFound) points.push('Child tabs have a captured parent tab in this thread');
  if (primaryDomains.length) points.push('Observed domains: ' + primaryDomains.slice(0, 5).join(', '));
  if (!points.length) points.push('No captured grouping signals; this thread may have been created manually.');
  const uniqueEvents = [...new Map(events.map(e => [e.url.split('#')[0], e])).values()];
  const scores = uniqueEvents.slice(1).map((event, i) => computeEventSimilarity(uniqueEvents[i], event));
  const average = (key: 'temporalSimilarity' | 'domainSimilarity' | 'querySimilarity' | 'titleSimilarity') => scores.length ? scores.reduce((sum, score) => sum + score[key], 0) / scores.length : 0;
  return { sharedKeywords: sharedKeywords.slice(0, 6), primaryDomains: primaryDomains.slice(0, 5), searchQueries, timeSpanMinutes,
    temporalContinuityScore: average('temporalSimilarity'), domainSimilarityScore: average('domainSimilarity'),
    querySimilarityScore: average('querySimilarity'), titleSimilarityScore: average('titleSimilarity'),
    openerRelationshipFound, explanationPoints: points };
}
