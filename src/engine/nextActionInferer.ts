import { ActivityEvent, InferredNextAction, TabReference } from '../types';

export function inferNextAction(
  title: string,
  events: ActivityEvent[],
  tabs: TabReference[]
): InferredNextAction {
  if (events.length === 0 && tabs.length === 0) {
    return {
      actionText: 'Resume browsing task',
      confidence: 'Possibly',
      rationale: 'No recent events recorded in this thread.',
    };
  }

  const latestEvent = events.length > 0 
    ? events.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest, events[0])
    : null;

  const combinedText = [
    title,
    ...events.map(e => `${e.title} ${e.searchQuery || ''} ${e.domain}`),
    ...tabs.map(t => `${t.title} ${t.domain}`),
  ].join(' ').toLowerCase();

  // Pattern 1: Hackathon / Project submission
  if (
    combinedText.includes('devpost') ||
    combinedText.includes('hackathon') ||
    combinedText.includes('eurekadev') ||
    combinedText.includes('submission')
  ) {
    const hasGithub = events.some(e => e.domain.includes('github.com'));
    const hasYoutube = events.some(e => e.domain.includes('youtube.com') || e.domain.includes('screenapp'));
    const hasDevpostEdit = events.some(e => e.url.includes('/edit') || e.url.includes('/submissions') || e.url.includes('devpost'));

    if (hasYoutube && hasDevpostEdit) {
      return {
        actionText: 'Upload demo video and paste link into Devpost submission',
        confidence: 'Likely',
        rationale: 'Observed active Devpost submission form and video recording tool.',
        suggestedUrl: events.find(e => e.domain.includes('devpost.com'))?.url,
      };
    }
    if (hasGithub && !hasYoutube) {
      return {
        actionText: 'Record project demo video',
        confidence: 'Likely',
        rationale: 'Repository and project description ready; video walkthrough remains.',
        suggestedUrl: 'https://screenapp.io',
      };
    }
    return {
      actionText: 'Finalize project submission details',
      confidence: 'Likely',
      rationale: 'Identified hackathon submission flow in progress.',
    };
  }

  // Pattern 2: Product Comparison / Shopping
  if (
    combinedText.includes('headphones') ||
    combinedText.includes('laptop') ||
    combinedText.includes('compare') ||
    combinedText.includes('amazon') ||
    combinedText.includes('price') ||
    combinedText.includes('reviews')
  ) {
    const productTabs = tabs.filter(t => 
      t.domain.includes('amazon.') || 
      t.domain.includes('bestbuy.') || 
      t.domain.includes('rtings.com') ||
      t.title.toLowerCase().includes('review')
    );

    if (productTabs.length >= 2) {
      return {
        actionText: 'Compare specifications and pricing between shortlisted models',
        confidence: 'Likely',
        rationale: `Found ${productTabs.length} product candidate pages open across reviews and retailers.`,
        suggestedUrl: productTabs[0]?.url,
      };
    }
    return {
      actionText: 'Check top-rated user reviews and price history',
      confidence: 'Possibly',
      rationale: 'Browsing products; comparative evaluation step recommended.',
    };
  }

  // Pattern 3: Academic / Assignment / Homework
  if (
    combinedText.includes('assignment') ||
    combinedText.includes('physics') ||
    combinedText.includes('homework') ||
    combinedText.includes('paper') ||
    combinedText.includes('research') ||
    combinedText.includes('wikipedia')
  ) {
    return {
      actionText: 'Synthesize reference notes and complete assignment write-up',
      confidence: 'Inferred from browsing activity',
      rationale: 'Multiple reference materials and problem statement tabs detected.',
      suggestedUrl: tabs[0]?.url,
    };
  }

  // Pattern 4: Job / Internship Application
  if (
    combinedText.includes('internship') ||
    combinedText.includes('job') ||
    combinedText.includes('careers') ||
    combinedText.includes('apply') ||
    combinedText.includes('linkedin')
  ) {
    return {
      actionText: 'Review application requirements and upload resume',
      confidence: 'Likely',
      rationale: 'Career portal and application pages detected.',
      suggestedUrl: tabs.find(t => t.url.includes('apply') || t.url.includes('career'))?.url,
    };
  }

  // Default fallback based on last observed event
  if (latestEvent) {
    return {
      actionText: `Continue from ${latestEvent.domain || 'last opened page'}`,
      confidence: 'Inferred from browsing activity',
      rationale: `Last action was on "${latestEvent.title.slice(0, 45)}...".`,
      suggestedUrl: latestEvent.url,
    };
  }

  return {
    actionText: 'Resume task flow',
    confidence: 'Possibly',
    rationale: 'Inferred from previous browsing session.',
  };
}
