const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each',
  'few', 'for', 'from', 'further',
  'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
  'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
  'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  // Common generic web filler
  'com', 'http', 'https', 'www', 'html', 'page', 'site', 'website', 'official', 'view', 'online', 'free', 'best', 'top',
  'login', 'sign', 'signin', 'signup', 'home', 'portal', 'account', 'tab', 'new', 'dashboard',
  'browsing', 'task', 'item', 'details', 'info', 'overview'
]);

export function cleanText(input: string): string {
  if (!input) return '';
  return input
    .replace(/-/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractTokens(text: string): string[] {
  if (!text) return [];
  const cleaned = cleanText(text);
  const words = cleaned.split(/[\s-]+/);
  return words
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

export function extractTitleKeywords(title: string): string[] {
  if (!title) return [];
  // Strip common trailing suffixes like " - Google Search", " | GitHub", " — Wikipedia"
  const stripped = title
    .replace(/\s*[-–—|•:]\s*(google search|github|wikipedia|amazon|youtube|stack overflow|reddit).*$/i, '')
    .trim();

  return extractTokens(stripped);
}

export function extractQueryKeywords(query?: string): string[] {
  if (!query) return [];
  return extractTokens(query);
}

export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

export function computeOverlapScore(arrA: string[], arrB: string[]): {
  score: number;
  sharedTokens: string[];
} {
  const setA = new Set(arrA);
  const setB = new Set(arrB);
  const shared: string[] = [];

  for (const item of setA) {
    if (setB.has(item)) {
      shared.push(item);
    }
  }

  const minLen = Math.min(setA.size, setB.size);
  if (minLen === 0) {
    return { score: 0, sharedTokens: [] };
  }

  // Use overlap coefficient: size(intersection) / min(size(A), size(B))
  // with a slight penalty if one set is disproportionately large
  const overlap = shared.length / minLen;
  const jaccard = computeJaccardSimilarity(setA, setB);
  const combined = (overlap * 0.7) + (jaccard * 0.3);

  return {
    score: Math.min(1.0, Math.max(0.0, combined)),
    sharedTokens: shared,
  };
}
