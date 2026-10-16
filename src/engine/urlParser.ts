export interface ParsedUrlInfo {
  isValid: boolean;
  rawUrl: string;
  domain: string;
  baseDomain: string;
  pathname: string;
  searchQuery?: string;
  searchEngine?: string;
  isInternalBrowserPage: boolean;
}

const SEARCH_ENGINE_CONFIGS: Array<{
  name: string;
  domainPattern: RegExp;
  paramKey: string;
}> = [
  { name: 'Google', domainPattern: /(^|\.)google\.[a-z.]+$/i, paramKey: 'q' },
  { name: 'Bing', domainPattern: /(^|\.)bing\.com$/i, paramKey: 'q' },
  { name: 'DuckDuckGo', domainPattern: /(^|\.)duckduckgo\.com$/i, paramKey: 'q' },
  { name: 'YouTube', domainPattern: /(^|\.)youtube\.com$/i, paramKey: 'search_query' },
  { name: 'GitHub', domainPattern: /(^|\.)github\.com$/i, paramKey: 'q' },
  { name: 'Amazon', domainPattern: /(^|\.)amazon\.[a-z.]+$/i, paramKey: 'k' },
  { name: 'AmazonAlt', domainPattern: /(^|\.)amazon\.[a-z.]+$/i, paramKey: 'field-keywords' },
  { name: 'Yahoo', domainPattern: /(^|\.)yahoo\.com$/i, paramKey: 'p' },
  { name: 'Ecosia', domainPattern: /(^|\.)ecosia\.org$/i, paramKey: 'q' },
  { name: 'Baidu', domainPattern: /(^|\.)baidu\.com$/i, paramKey: 'wd' },
  { name: 'Wikipedia', domainPattern: /(^|\.)wikipedia\.org$/i, paramKey: 'search' },
];

const INTERNAL_PROTOCOLS = [
  'chrome:',
  'edge:',
  'about:',
  'chrome-extension:',
  'edge-extension:',
  'moz-extension:',
  'devtools:',
  'view-source:',
  'javascript:',
  'data:',
  'file:',
  'blob:',
  'filesystem:',
];

export function isInternalUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return true;
  const trimmed = urlStr.trim().toLowerCase();
  if (INTERNAL_PROTOCOLS.some(proto => trimmed.startsWith(proto))) {
    return true;
  }
  if (trimmed === 'about:blank' || trimmed === 'newtab') {
    return true;
  }
  // Safe web URLs must strictly begin with http:// or https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return true;
  }
  return false;
}

export function extractBaseDomain(hostname: string): string {
  if (!hostname) return '';
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '');
  const parts = cleanHost.split('.');
  if (parts.length <= 2) {
    return cleanHost;
  }
  // Handle two-part TLDs like .co.uk, .gov.in, .edu.au
  const twoPartTLDs = ['co.uk', 'gov.in', 'edu.au', 'com.au', 'org.uk', 'co.jp', 'co.in'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTLDs.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export function parseUrl(rawUrl: string): ParsedUrlInfo {
  if (!rawUrl || typeof rawUrl !== 'string' || isInternalUrl(rawUrl)) {
    return {
      isValid: false,
      rawUrl: rawUrl || '',
      domain: '',
      baseDomain: '',
      pathname: '',
      isInternalBrowserPage: isInternalUrl(rawUrl || ''),
    };
  }

  try {
    const urlObj = new URL(rawUrl);
    if (!['https:', 'http:'].includes(urlObj.protocol)) throw new Error('Unsupported protocol');
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const baseDomain = extractBaseDomain(domain);
    const pathname = urlObj.pathname;

    let searchQuery: string | undefined;
    let searchEngine: string | undefined;

    for (const config of SEARCH_ENGINE_CONFIGS) {
      if (config.domainPattern.test(urlObj.hostname)) {
        const queryParam = urlObj.searchParams.get(config.paramKey);
        if (queryParam && queryParam.trim().length > 0) {
          searchQuery = queryParam.trim();
          searchEngine = config.name.replace('Alt', '');
          break;
        }
      }
    }

    return {
      isValid: true,
      rawUrl,
      domain,
      baseDomain,
      pathname,
      searchQuery,
      searchEngine,
      isInternalBrowserPage: false,
    };
  } catch {
    // Malformed URL recovery
    return {
      isValid: false,
      rawUrl,
      domain: '',
      baseDomain: '',
      pathname: '',
      isInternalBrowserPage: false,
    };
  }
}
