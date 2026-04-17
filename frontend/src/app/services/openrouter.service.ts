import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, UserSettings } from '../models';

export interface ModelFamily {
  id: string;
  name: string;
  vision?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OpenRouterService {
  private http = inject(HttpClient);
  private openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  availableModels: ModelFamily[] = [
    { id: 'Claude', name: 'Claude', vision: true },
    { id: 'ChatGPT', name: 'ChatGPT', vision: true },
    { id: 'Gemini', name: 'Gemini', vision: true },
    { id: 'Kimi', name: 'Kimi', vision: false },
    { id: 'Qwen', name: 'Qwen', vision: false },
    { id: 'n0ne', name: 'n0ne', vision: false },
  ];

  modelMapping: Record<string, Record<string, string>> = {
    'Claude': {
      'High': 'anthropic/claude-opus-4.6',
      'Medium': 'anthropic/claude-sonnet-4.6',
      'Low': 'anthropic/claude-haiku-4.5'
    },
    'ChatGPT': {
      'High': 'openai/gpt-5.4',
      'Medium': 'openai/gpt-5-mini',
      'Low': 'openai/gpt-oss-120b:free'
    },
    'Gemini': {
      'High': 'google/gemini-3.1-pro-preview',
      'Medium': 'google/gemini-2.0-flash-lite-001',
      'Low': 'google/gemma-4-31b-it:free'
    },
    'Kimi': {
      'High': 'moonshotai/kimi-k2.5',
      'Medium': 'moonshotai/kimi-k2-thinking',
      'Low': 'moonshotai/kimi-k2'
    },
    'Qwen': {
      'High': 'qwen/qwen3.6-plus',
      'Medium': 'qwen/qwen3.5-flash-02-23',
      'Low': 'qwen/qwen3-next-80b-a3b-instruct:free'
    },
    'n0ne': {
      'High': 'nvidia/nemotron-3-super-120b-a12b:free',
      'Medium': 'nvidia/nemotron-3-nano-30b-a3b:free',
      'Low': 'nvidia/nemotron-nano-9b-v2'
    }
  };

  resolveModelId(family: string, level: string): string {
    const fam = this.modelMapping[family] || this.modelMapping['ChatGPT'];
    return fam[level] || fam['Medium'];
  }

  getDisplayName(id: string): string {
    if (!id) return '';
    const sid = id.toLowerCase();
    
    // Priority keyword matching for n0ne rebranding
    if (sid.includes('super')) return 'infinity/n0ne-k1:free';
    if (sid.includes('nano-30b')) return 'infinity/n0ne-n1:free';
    if (sid.includes('nano-9b')) return 'infinity/n0ne-n0-preview';

    return id;
  }

  generateCompletion(messages: Message[], model: string, settings?: Partial<UserSettings>): Observable<any> {
    const rawKey = localStorage.getItem('or_raw_key')?.trim() || null;

    if (!rawKey) {
      return new Observable(subscriber => {
        subscriber.error(new Error('API key not found. Please go to Settings and re-add your OpenRouter API key.'));
      });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${rawKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'N0ne-K1 AI',
      'Content-Type': 'application/json'
    });

    const body: any = {
      model: model,
      messages: messages.map(m => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content || '(Image)' },
              ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      }),
      temperature: (!isNaN(Number(settings?.temperature))) ? Number(settings?.temperature) : 0.7,
    };

    return this.http.post(this.openRouterUrl, body, { headers });
  }
}
