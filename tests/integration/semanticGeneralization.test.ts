import { describe, expect, it } from 'vitest';
import { IntentEngine } from '../../src/engine/intentClusterer';
import { ActivityEvent } from '../../src/types';
const topics = [
  [
    "sourdough",
    "Feeding a sourdough starter for bread baking",
    "Maintaining a healthy sourdough starter",
    "Sourdough starter feeding schedule"
  ],
  [
    "bicycle",
    "Fix bicycle chain skipping",
    "Rear derailleur adjustment for a skipping bicycle chain",
    "Bicycle chain skipping under load repair"
  ],
  [
    "French",
    "Practice French vowel pronunciation",
    "French vowel sounds and pronunciation exercises",
    "Improve spoken French vowel pronunciation"
  ],
  [
    "tomatoes",
    "How to grow tomatoes indoors",
    "LED lighting schedule for tomato plants",
    "Growing indoor tomato plants under LED lights"
  ],
  [
    "camera",
    "Camera lens choices for street photography",
    "Choosing focal lengths for street photography lenses",
    "Street photography prime lens comparison"
  ],
  [
    "music",
    "Mixing recorded acoustic guitar tracks",
    "Equalizer settings for acoustic guitar recordings",
    "Acoustic guitar recording mix techniques"
  ],
  [
    "astronomy",
    "Photograph Mars through a backyard telescope",
    "Backyard telescope settings for Mars photography",
    "Mars telescope imaging and exposure settings"
  ],
  [
    "watercolor",
    "Paint mountain landscapes in watercolor",
    "Watercolor mountain landscape painting tutorial",
    "Mountain landscape watercolor painting techniques"
  ],
  [
    "fitness",
    "Safe deadlift technique and back position",
    "Correct deadlift posture to avoid back injury",
    "Deadlift form and lower back safety"
  ],
  [
    "puppy",
    "Crate training a new puppy at night",
    "Nighttime puppy crate training routine",
    "Help a puppy sleep in its crate"
  ],
  [
    "pottery",
    "Centering clay on a pottery wheel",
    "Pottery wheel clay centering techniques",
    "How to center clay before wheel throwing"
  ],
  [
    "knitting",
    "Knitting sock heels with short rows",
    "Short row heel construction for knitted socks",
    "Turn a knitted sock heel using short rows"
  ],
  [
    "rainwater",
    "Install a rainwater collection barrel",
    "Rain barrel installation and gutter connections",
    "Connect gutters to a rainwater storage barrel"
  ],
  [
    "budget",
    "Household budget and debt repayment planning",
    "Plan a household budget to pay off debt",
    "Monthly household debt repayment budget"
  ],
  [
    "printing",
    "Fix first layer adhesion on a PLA 3D print",
    "PLA first layer bed leveling and adhesion",
    "Improve PLA printing first layer adhesion"
  ],
  [
    "statistics",
    "Understand Bayesian posterior probability",
    "Bayesian prior and posterior probability examples",
    "Calculate posterior probabilities with Bayes theorem"
  ],
  [
    "Kyoto",
    "Plan Kyoto sightseeing using public transit",
    "Kyoto temple itinerary and subway routes",
    "Kyoto sightseeing route by subway and bus"
  ],
  [
    "espresso",
    "Dial in espresso grind size and extraction",
    "Espresso extraction time and grinder adjustment",
    "Adjust coffee grind for balanced espresso extraction"
  ],
  [
    "beekeeping",
    "Control varroa mites in a honeybee colony",
    "Honeybee varroa mite monitoring and treatment",
    "Varroa mite management for beehives"
  ],
  [
    "furniture",
    "Restore the finish on an old wooden table",
    "Refinishing a wooden dining table",
    "Strip and refinish an old wood table"
  ]
];
let sequence = 0;
const page = (title: string): ActivityEvent => ({
 id: 'general-' + (++sequence), tabId: sequence, windowId: 1,
 url: 'https://same.shared.example/page/' + sequence, title, domain: 'same.shared.example',
 pathname: '/page/' + sequence, timestamp: Date.now() + sequence,
 eventType: 'navigation', isInternalBrowserPage: false,
});
describe('Unseen-topic production BGE workflow evaluation', () => {
 it('evaluates 20 full interleaved workflows using the actual engine', async () => {
  const results: { topic: string; coherent: boolean; falseMerge: boolean }[] = [];
  for (let i = 0; i < topics.length; i++) {
   const a = topics[i], b = topics[(i + 7) % topics.length];
   const engine = new IntentEngine();
   const events = [page(a[1]), page(a[2]), page(b[1]), page(b[2]), page(a[3])];
   for (const event of events) await engine.processEvent(event);
   const owner = (url: string) => engine.getThreads().find(t => t.tabs.some(tab => tab.url === url))!;
   const aOwners = [0,1,4].map(index => owner(events[index].url).id);
   const bOwners = [2,3].map(index => owner(events[index].url).id);
   results.push({ topic: a[0], coherent: new Set(aOwners).size === 1 && new Set(bOwners).size === 1,
    falseMerge: aOwners.some(id => bOwners.includes(id)) });
  }
  console.log('GENERALIZATION_WORKFLOWS ' + JSON.stringify(results));
  expect(results.filter(r => r.falseMerge)).toEqual([]);
  // Ambiguous splits are allowed; every decision still goes through the same production BGE engine.
  expect(results.filter(r => r.coherent).length).toBeGreaterThanOrEqual(16);
 }, 180000);
});
