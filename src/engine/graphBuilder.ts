import { IntentGraph, IntentGraphEdge, IntentGraphNode, IntentThread } from '../types';

export function buildIntentGraph(thread: IntentThread): IntentGraph {
  const nodes: IntentGraphNode[] = [];
  const edges: IntentGraphEdge[] = [];

  // Root Goal Node
  const goalNodeId = `goal-${thread.id}`;
  nodes.push({
    id: goalNodeId,
    label: thread.title,
    type: 'goal',
    evidence: [
      `Intent identified with ${Math.round(thread.confidence * 100)}% confidence`,
      `${thread.tabs.length} tabs associated with this goal`,
    ],
  });

  // Collect steps from completed and unfinished steps
  const allSteps = [
    ...thread.completedSteps.map(s => ({ ...s, isCompleted: true })),
    ...thread.unfinishedSteps.map(s => ({ ...s, isCompleted: false })),
  ];

  if (allSteps.length === 0) {
    // If steps weren't pre-populated, derive them directly from events/tabs with evidence!
    const sortedEvents = [...thread.events].sort((a, b) => a.timestamp - b.timestamp);
    let prevNodeId = goalNodeId;

    if (sortedEvents.length === 0 && thread.tabs.length > 0) {
      // Derive from tabs
      thread.tabs.forEach((tab, index) => {
        const nodeId = `tab-step-${index}`;
        nodes.push({
          id: nodeId,
          label: tab.title.slice(0, 40) || tab.domain,
          type: index === thread.tabs.length - 1 ? 'current_step' : 'completed_step',
          evidence: [`Tab open: ${tab.url}`, `Domain: ${tab.domain}`],
          url: tab.url,
          timestamp: tab.lastAccessed,
        });
        edges.push({
          from: prevNodeId,
          to: nodeId,
          label: prevNodeId === goalNodeId ? 'Initial action' : 'Next action',
        });
        prevNodeId = nodeId;
      });
    } else {
      // Group events by domain or milestone
      const milestones: Array<{ label: string; evidence: string[]; url?: string; timestamp?: number; isCurrent: boolean }> = [];
      const seenDomains = new Set<string>();

      sortedEvents.forEach((ev, idx) => {
        const isLast = idx === sortedEvents.length - 1;
        if (!seenDomains.has(ev.domain) || isLast) {
          seenDomains.add(ev.domain);
          milestones.push({
            label: ev.searchQuery ? `Search: "${ev.searchQuery}"` : (ev.title.slice(0, 36) || ev.domain),
            evidence: [
              `Visited: ${ev.url}`,
              `Time: ${new Date(ev.timestamp).toLocaleTimeString()}`,
            ],
            url: ev.url,
            timestamp: ev.timestamp,
            isCurrent: isLast,
          });
        }
      });

      milestones.forEach((m, idx) => {
        const nodeId = `milestone-${idx}`;
        nodes.push({
          id: nodeId,
          label: m.label,
          type: m.isCurrent ? 'current_step' : 'completed_step',
          evidence: m.evidence,
          url: m.url,
          timestamp: m.timestamp,
        });
        edges.push({
          from: prevNodeId,
          to: nodeId,
          label: prevNodeId === goalNodeId ? 'Started with' : 'Followed by',
        });
        prevNodeId = nodeId;
      });
    }

    // Add inferred next action as remaining step if present
    if (thread.nextAction?.actionText) {
      const nextNodeId = `next-step-${thread.id}`;
      nodes.push({
        id: nextNodeId,
        label: thread.nextAction.actionText,
        type: 'remaining_step',
        evidence: [
          `Suggested next action (${thread.nextAction.confidence})`,
          thread.nextAction.rationale,
        ],
        url: thread.nextAction.suggestedUrl,
      });
      edges.push({
        from: prevNodeId,
        to: nextNodeId,
        label: 'Recommended next',
      });
    }

    return {
      goal: thread.title,
      nodes,
      edges,
    };
  }

  // If steps exist, convert them to nodes
  let lastNodeId = goalNodeId;
  allSteps.forEach((step, idx) => {
    const nodeId = `step-${step.id || idx}`;
    const isCurrent = !step.isCompleted && idx === thread.completedSteps.length;
    const type = step.isCompleted 
      ? 'completed_step' 
      : (isCurrent ? 'current_step' : 'remaining_step');

    nodes.push({
      id: nodeId,
      label: step.title,
      type,
      evidence: step.evidence.length > 0 ? step.evidence : ['Observed during browsing session'],
      url: step.url,
      timestamp: step.timestamp,
    });

    edges.push({
      from: lastNodeId,
      to: nodeId,
      label: lastNodeId === goalNodeId ? 'First step' : (step.isCompleted ? 'Completed' : 'Remaining'),
    });

    lastNodeId = nodeId;
  });

  return {
    goal: thread.title,
    nodes,
    edges,
  };
}
