import { AISettings, ActivityEvent, InferredNextAction, TabReference } from '../../types';
import { deriveThreadTitle } from '../intentClusterer';
import { inferNextAction } from '../nextActionInferer';

export interface AIEnhancementResult {
  title?: string;
  summary?: string;
  nextAction?: InferredNextAction;
  source: 'ai' | 'local_fallback';
  error?: string;
}

export class AIProviderService {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  public updateSettings(settings: AISettings) {
    this.settings = settings;
  }

  public async enhanceThread(
    currentTitle: string,
    events: ActivityEvent[],
    tabs: TabReference[]
  ): Promise<AIEnhancementResult> {
    // Non-negotiable principle: Fallback to local heuristic by default
    if (!this.settings.enabled || !this.settings.apiKey || this.settings.provider === 'local_heuristic') {
      const localTitle = deriveThreadTitle(events, currentTitle);
      const localNextAction = inferNextAction(localTitle.title, events, tabs);
      return {
        title: localTitle.title,
        summary: localTitle.summary,
        nextAction: localNextAction,
        source: 'local_fallback',
      };
    }

    try {
      if (this.settings.provider === 'gemini') {
        return await this.callGemini(currentTitle, events, tabs);
      } else if (this.settings.provider === 'openai' || this.settings.provider === 'groq') {
        return await this.callOpenAICompatible(currentTitle, events, tabs);
      }
    } catch (err: any) {
      console.warn('[ThreadBack AI Provider] Optional enhancement failed, falling back to local engine:', err);
      const localTitle = deriveThreadTitle(events, currentTitle);
      const localNextAction = inferNextAction(localTitle.title, events, tabs);
      return {
        title: localTitle.title,
        summary: localTitle.summary,
        nextAction: localNextAction,
        source: 'local_fallback',
        error: err.message || 'Remote AI request failed',
      };
    }

    const localTitle = deriveThreadTitle(events, currentTitle);
    const localNextAction = inferNextAction(localTitle.title, events, tabs);
    return {
      title: localTitle.title,
      summary: localTitle.summary,
      nextAction: localNextAction,
      source: 'local_fallback',
    };
  }

  private async callGemini(
    currentTitle: string,
    events: ActivityEvent[],
    tabs: TabReference[]
  ): Promise<AIEnhancementResult> {
    const prompt = this.buildPrompt(currentTitle, events, tabs);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.settings.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(candidateText);
    return {
      title: parsed.title || currentTitle,
      summary: parsed.summary,
      nextAction: {
        actionText: parsed.nextAction || 'Continue task',
        confidence: 'Likely',
        rationale: parsed.rationale || 'Enhanced via Gemini model',
      },
      source: 'ai',
    };
  }

  private async callOpenAICompatible(
    currentTitle: string,
    events: ActivityEvent[],
    tabs: TabReference[]
  ): Promise<AIEnhancementResult> {
    const prompt = this.buildPrompt(currentTitle, events, tabs);
    const endpoint = this.settings.customEndpoint || (this.settings.provider === 'groq' 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions');

    const model = this.settings.modelName || (this.settings.provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an intent synthesis assistant. Output valid JSON only with keys: title, summary, nextAction, rationale.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || currentTitle,
      summary: parsed.summary,
      nextAction: {
        actionText: parsed.nextAction || 'Continue task',
        confidence: 'Likely',
        rationale: parsed.rationale || 'Enhanced via AI model',
      },
      source: 'ai',
    };
  }

  private buildPrompt(currentTitle: string, events: ActivityEvent[], tabs: TabReference[]): string {
    const tabList = tabs.map(t => `- Title: "${t.title}" | Domain: "${t.domain}"`).join('\n');
    const queryList = events.filter(e => e.searchQuery).map(e => `- Query: "${e.searchQuery}"`).join('\n');

    return `Synthesize the user's unfinished browsing intention into JSON.
Current Title: ${currentTitle}
Search Queries:
${queryList || 'None'}
Visited Tabs:
${tabList}

Respond with JSON:
{
  "title": "Concise high-level goal (e.g. Submit EurekaDev Project)",
  "summary": "1-2 sentence description of what the user is trying to accomplish",
  "nextAction": "The immediate single next action to resume the task",
  "rationale": "Why this next action was suggested"
}`;
  }
}
