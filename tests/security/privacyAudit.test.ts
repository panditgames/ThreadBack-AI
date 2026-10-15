import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DEFAULT_PRIVACY_SETTINGS, StorageManager } from '../../src/storage/storageManager';

describe('Phase 8: Security & Privacy Compliance Audit', () => {
  it('ensures NO hardcoded API keys or secrets exist in src/ or public/', () => {
    const scanDir = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(scanDir(filePath));
        } else if (/\.(ts|tsx|js|json|html)$/.test(file)) {
          results.push(filePath);
        }
      }
      return results;
    };

    const files = [...scanDir(path.resolve('src')), path.resolve('public/manifest.json')];

    // Regex patterns for real secret leaks
    const secretPatterns = [
      /AIza[0-9A-Za-z-_]{35}/, // Google API Key
      /sk-[a-zA-Z0-9]{32,}/,   // OpenAI key
      /gsk_[a-zA-Z0-9]{32,}/,  // Groq key
      /ghp_[a-zA-Z0-9]{36}/,   // GitHub token
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of secretPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });

  it('guarantees page content analysis is OFF by default', () => {
    expect(DEFAULT_PRIVACY_SETTINGS.allowPageContentAnalysis).toBe(false);
  });

  it('confirms delete-all completely purges stored ThreadBack data', async () => {
    const storage = new StorageManager();
    await storage.saveThreads([
      { id: 't1', title: 'Sensitive Task', tabs: [], events: [], keywords: [] } as any,
    ]);

    await storage.clearAllData();
    const state = await storage.load();
    expect(Object.keys(state.threads).length).toBe(0);
    expect(state.events.length).toBe(0);
  });

  it('verifies manifest.json declares only minimal required permissions', () => {
    const manifestPath = path.resolve('public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Should NOT have dangerous host permissions like <all_urls> by default
    expect(manifest.host_permissions).toBeUndefined();

    // Required permissions should be restricted to tabs, storage, alarms
    expect(manifest.permissions).toContain('tabs');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).not.toContain('history');
    expect(manifest.permissions).toContain('alarms');
    expect(manifest.permissions).not.toContain('cookies');
    expect(manifest.permissions).not.toContain('webRequest');
    expect(manifest.permissions).not.toContain('debugger');
  });
});
