import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, switchMap, tap, of } from 'rxjs';
import { Chat, Message, ApiKey, UserSettings } from '../models';
import { OpenRouterService } from './openrouter.service';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private aiService = inject(OpenRouterService);
  private i18n = inject(TranslationService);
  private apiUrl = 'http://localhost:8000/api';

  /** Global user settings signal accessed by sidebar, settings, and chat components */
  public userSettings = signal<UserSettings | null>(null);

  constructor() {
    this.refreshSettings();
  }

  public refreshSettings() {
    this.getSettings().subscribe({
      next: (s) => this.userSettings.set(s),
      error: () => this.userSettings.set(null)
    });
    
    // Restore or_raw_key if it exists on backend but not in localStorage
    this.getApiKeys().subscribe({
      next: (keys) => {
        const defaultKey = keys.find(k => k.is_default) || keys[0];
        if (defaultKey && defaultKey.key) {
           localStorage.setItem('or_raw_key', defaultKey.key);
        }
      },
      error: () => {}
    });
  }

  public activeGenerations = new Set<number>();
  public newMessageEvent = new Subject<{chatId: number, message: Message}>();
  public errorEvent = new Subject<{chatId: number, error: string}>();
  public chatListRefresh = new Subject<void>();

  public requestCompletion(chatId: number, allMessages: Message[], model: string) {
    this.activeGenerations.add(chatId);

    // Guard: Check if API key is present in local storage
    const rawKey = localStorage.getItem('or_raw_key')?.trim() || null;
    if (!rawKey) {
      setTimeout(() => {
        const warning: Message = { 
          role: 'assistant', 
          content: 'Пожалуйста, добавьте свой OpenRouter API-ключ в настройках, чтобы начать общение с ИИ.' 
        };
        this.activeGenerations.delete(chatId);
        this.saveMessage(chatId, warning).subscribe({
          next: (saved) => this.newMessageEvent.next({ chatId, message: saved })
        });
      }, 800);
      return;
    }
    
    this.getSettings().pipe(
      switchMap(settings => {
        // 1. Context length truncation
        const contextLen = parseInt(settings.context_length as any, 10);
        const resolvedContextLen = isNaN(contextLen) ? 50 : contextLen;
        
        const messagesToSend = resolvedContextLen === 0 
          ? allMessages.slice(-1) 
          : allMessages.slice(-resolvedContextLen);

        // 2. System prompt construction
        const sysContext: string[] = [];
        if (settings.display_name) sysContext.push(`Name: ${settings.display_name}`);
        if (settings.bio) sysContext.push(`Bio: ${settings.bio}`);
        if (settings.gender) sysContext.push(`Gender: ${settings.gender}`);
        if (settings.birthday) sysContext.push(`Birthday: ${settings.birthday}`);

        if (sysContext.length > 0) {
          const sysMsg: Message = {
            role: 'system',
            content: `The following is user context you should be aware of:\n${sysContext.join('\n')}`
          };
          messagesToSend.unshift(sysMsg);
        }

        return this.aiService.generateCompletion(messagesToSend, model, settings);
      })
    ).subscribe({
      next: (res: any) => {
        const content = res.choices?.[0]?.message?.content || 'No response';
        const aiMsg: Message = { role: 'assistant', content, model_used: model };

        this.activeGenerations.delete(chatId);
        this.saveMessage(chatId, aiMsg).subscribe({
          next: (saved) => {
            this.newMessageEvent.next({ chatId, message: saved });
          },
          error: (err) => {
            console.error('Error saving AI message:', err);
            this.newMessageEvent.next({ chatId, message: aiMsg });
          }
        });
      },
      error: (err: any) => {
        this.activeGenerations.delete(chatId);
        this.errorEvent.next({ chatId, error: err.message || 'Unknown error' });
      }
    });
  }

  // --- Chats ---
  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}/chats/`);
  }

  getChat(id: number): Observable<Chat> {
    return this.http.get<Chat>(`${this.apiUrl}/chats/${id}/`);
  }

  createChat(title: string, model: string): Observable<Chat> {
    return this.http.post<Chat>(`${this.apiUrl}/chats/`, { title, model });
  }

  updateChat(id: number, data: Partial<Chat>): Observable<Chat> {
    return this.http.patch<Chat>(`${this.apiUrl}/chats/${id}/`, data);
  }

  deleteChat(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/chats/${id}/`);
  }

  // --- Messages ---
  getMessages(chatId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/chats/${chatId}/messages/`);
  }

  saveMessage(chatId: number, message: Message): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/chats/${chatId}/messages/`, message);
  }

  // --- API Keys ---
  getApiKeys(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(`${this.apiUrl}/apikeys/`);
  }

  addApiKey(label: string, key: string): Observable<ApiKey> {
    return this.http.post<ApiKey>(`${this.apiUrl}/apikeys/`, { label, key }).pipe(
      tap(k => {
        if (k.key && (k.is_default || localStorage.getItem('or_raw_key') === null)) {
          localStorage.setItem('or_raw_key', k.key);
        }
      })
    );
  }

  deleteApiKey(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/apikeys/${id}/`).pipe(
      tap(() => {
        this.refreshSettings();
      })
    );
  }

  setDefaultApiKey(id: number): Observable<ApiKey> {
    return this.http.patch<ApiKey>(`${this.apiUrl}/apikeys/${id}/`, { is_default: true }).pipe(
      tap(k => {
        if (k.key) localStorage.setItem('or_raw_key', k.key);
      })
    );
  }

  // --- Settings ---
  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.apiUrl}/settings/`);
  }

  updateSettings(settings: Partial<UserSettings>): Observable<UserSettings> {
    return this.http.put<UserSettings>(`${this.apiUrl}/settings/`, settings).pipe(
      tap(res => this.userSettings.set(res))
    );
  }
}
