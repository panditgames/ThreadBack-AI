import { ActivityEvent, ActivityEventType, PrivacySettings } from '../types';
import { isInternalUrl, parseUrl } from '../engine/urlParser';

export type ActivityEventCallback = (event: ActivityEvent) => void;

export class ActivityCollector {
  private onEventCallback: ActivityEventCallback;
  private privacySettings: PrivacySettings;
  private isListening = false;
  private lastCapturedUrlByTab: Map<number, string> = new Map();

  constructor(
    onEvent: ActivityEventCallback,
    privacySettings: PrivacySettings
  ) {
    this.onEventCallback = onEvent;
    this.privacySettings = privacySettings;
  }

  public updatePrivacySettings(settings: PrivacySettings) {
    this.privacySettings = settings;
  }

  public startListening() {
    if (this.isListening || typeof chrome === 'undefined' || !chrome.tabs) {
      return;
    }

    this.isListening = true;

    // 1. Tab Updated (Navigation or title change)
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated);

    // 2. Tab Created (Opener relationships)
    chrome.tabs.onCreated.addListener(this.handleTabCreated);

    // 3. Tab Activated (Focus switch)
    chrome.tabs.onActivated.addListener(this.handleTabActivated);

    // 4. Tab Removed (Tab closed)
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved);
  }

  public stopListening() {
    if (!this.isListening || typeof chrome === 'undefined' || !chrome.tabs) {
      return;
    }

    this.isListening = false;
    chrome.tabs.onUpdated.removeListener(this.handleTabUpdated);
    chrome.tabs.onCreated.removeListener(this.handleTabCreated);
    chrome.tabs.onActivated.removeListener(this.handleTabActivated);
    chrome.tabs.onRemoved.removeListener(this.handleTabRemoved);
  }

  private isDomainExcluded(domain: string): boolean {
    if (!domain) return false;
    if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(domain) || domain.endsWith('.local')) return true;
    const clean = domain.toLowerCase();
    return this.privacySettings.excludedDomains.some(excluded => 
      clean === excluded || clean.endsWith(`.${excluded}`) || clean.includes(excluded)
    );
  }

  private createEvent(
    tab: chrome.tabs.Tab,
    eventType: ActivityEventType,
    overrideUrl?: string,
    overrideTitle?: string
  ): ActivityEvent | null {
    const rawUrl = overrideUrl || tab.url || tab.pendingUrl || '';
    if (tab.incognito || !rawUrl || isInternalUrl(rawUrl)) {
      return null;
    }

    const parsed = parseUrl(rawUrl);
    if (!parsed.isValid || this.isDomainExcluded(parsed.domain)) {
      return null;
    }

    return {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tabId: tab.id,
      windowId: tab.windowId,
      openerTabId: tab.openerTabId,
      url: parsed.rawUrl,
      title: overrideTitle || tab.title || parsed.domain,
      domain: parsed.domain,
      pathname: parsed.pathname,
      searchQuery: parsed.searchQuery,
      searchEngine: parsed.searchEngine,
      timestamp: Date.now(),
      eventType,
      isInternalBrowserPage: false,
    };
  }

  private handleTabUpdated = (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    // Only capture when title or URL changes and page has finished loading or URL is stable
    if (!changeInfo.url && !changeInfo.title) {
      return;
    }

    const currentUrl = changeInfo.url || tab.url || '';
    const lastUrl = this.lastCapturedUrlByTab.get(tabId);

    if (currentUrl && currentUrl === lastUrl && !changeInfo.title) {
      return; // prevent duplicate event for the same tab URL
    }

    if (currentUrl) {
      this.lastCapturedUrlByTab.set(tabId, currentUrl);
    }

    const event = this.createEvent(tab, 'navigation', currentUrl, changeInfo.title || tab.title);
    if (event) {
      this.onEventCallback(event);
    }
  };

  private handleTabCreated = (tab: chrome.tabs.Tab) => {
    if (!tab.url) return;
    const event = this.createEvent(tab, 'tab_opened');
    if (event) {
      this.onEventCallback(event);
    }
  };

  private handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (!tab || !tab.url) return;
      const event = this.createEvent(tab, 'tab_activated');
      if (event) {
        this.onEventCallback(event);
      }
    } catch {
      // Tab may have been closed in rapid succession
    }
  };

  private handleTabRemoved = (tabId: number) => {
    const lastUrl = this.lastCapturedUrlByTab.get(tabId);
    this.lastCapturedUrlByTab.delete(tabId);

    if (lastUrl && !isInternalUrl(lastUrl)) {
      const parsed = parseUrl(lastUrl);
      if (parsed.isValid && !this.isDomainExcluded(parsed.domain)) {
        this.onEventCallback({
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tabId,
          url: lastUrl,
          title: parsed.domain,
          domain: parsed.domain,
          pathname: parsed.pathname,
          searchQuery: parsed.searchQuery,
          searchEngine: parsed.searchEngine,
          timestamp: Date.now(),
          eventType: 'tab_closed',
          isInternalBrowserPage: false,
        });
      }
    }
  };
}
