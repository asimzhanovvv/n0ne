import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { TranslationService, Lang } from '../../services/translation.service';
import { ApiKey, UserSettings } from '../../models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  chatService = inject(ChatService);
  auth = inject(AuthService);
  router = inject(Router);
  themeService = inject(ThemeService);
  i18n = inject(TranslationService);
  http = inject(HttpClient);

  activeTab: 'profile' | 'general' = 'general';

  settings = signal<Partial<UserSettings>>({
    theme: 'dark',
    language: 'en',
    context_length: 50,
    temperature: 0.7,
    display_name: '',
    bio: '',
    gender: '',
    birthday: null,
    avatar_color: '#006950',
    avatar_emoji: ''
  });
  apiKeys = signal<ApiKey[]>([]);
  saveMsg = '';
  saveError = signal('');
  savingSettings = signal(false);

  newKeyLabel = '';
  newKeyValue = '';
  addKeyError = '';

  // Password Change
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passChangeMsg = '';
  passChangeErr = false;

  // Avatar popover
  showAvatarMenu = false;
  colors = ['#006950', '#2563eb', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];
  
  // High-quality tech-focused SVG icons for avatar
  avatarIcons = [
    'bot', 'brain', 'sparkles', 'zap', 'cpu', 
    'terminal', 'code', 'command', 'activity', 'globe',
    'lightbulb', 'star', 'shield', 'lock', 'user'
  ];
  emojis: string[] = []; // for legacy support if needed, or I can just use avatarIcons

  contextMarks = [
    { label: '0', value: 0 },
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
  ];

  ngOnInit() {
    this.loadSettings();
    this.loadApiKeys();
  }

  @HostListener('document:click')
  closeMenus() {
    this.showAvatarMenu = false;
  }

  loadSettings() {
    this.chatService.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.themeService.apply((s.theme as ThemeMode) || 'system');
        this.i18n.setLang((s.language as Lang) || 'en');
        // sync the state silently.
      },
      error: () => {}
    });
  }

  loadApiKeys() {
    this.chatService.getApiKeys().subscribe({
      next: (k) => {
        this.apiKeys.set(k);
        const defaultKey = k.find(key => key.is_default) ?? k[0];
        if (defaultKey?.key) {
          localStorage.setItem('or_raw_key', defaultKey.key);
        }
      },
      error: () => {}
    });
  }

  updateTheme(theme: ThemeMode) {
    this.settings.update(s => ({ ...s, theme }));
    this.themeService.apply(theme);
    this.saveSettings();
  }

  updateLanguage(lang: Lang) {
    this.settings.update(s => ({ ...s, language: lang }));
    this.i18n.setLang(lang);
    this.saveSettings();
  }

  saveSettings() {
    this.savingSettings.set(true);
    this.chatService.updateSettings(this.settings()).subscribe({
      next: () => {
        this.savingSettings.set(false);
        this.saveMsg = 'Settings saved';
        setTimeout(() => this.saveMsg = '', 3000);
      },
      error: (err: Error) => { this.saveError.set(err.message); this.savingSettings.set(false); }
    });
  }

  resetDefaults() {
    const defaults: Partial<UserSettings> = {
      theme: 'dark', language: 'en', context_length: 50,
      temperature: 0.7
    };
    this.settings.set(defaults);
    this.saveSettings();
  }

  addKey() {
    this.addKeyError = '';
    const rawKey = this.newKeyValue.trim();
    if (!rawKey) { this.addKeyError = 'API key is required'; return; }
    const label = this.newKeyLabel.trim() || 'OpenRouter Key';
    this.chatService.addApiKey(label, rawKey).subscribe({
      next: () => { 
        localStorage.setItem('or_raw_key', rawKey);
        this.newKeyLabel = ''; 
        this.newKeyValue = ''; 
        this.loadApiKeys(); 
      },
      error: (err: Error) => { this.addKeyError = err.message; }
    });
  }

  deleteKey(id: number) {
    this.chatService.deleteApiKey(id).subscribe({
      next: () => this.loadApiKeys(),
      error: () => {}
    });
  }

  setDefaultKey(id: number) {
    this.chatService.setDefaultApiKey(id).subscribe({
      next: () => this.loadApiKeys(),
      error: () => {}
    });
  }

  getContextLabel(val?: number): string {
    const v = val ?? 50;
    const mark = this.contextMarks.find(m => m.value >= v);
    return mark?.label ?? '50';
  }

  changePassword() {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passChangeMsg = 'All fields are required';
      this.passChangeErr = true;
      return;
    }
    
    this.http.post('http://localhost:8000/api/auth/change-password/', {
      current_password: this.currentPassword,
      new_password: this.newPassword,
      confirm_password: this.confirmPassword
    }).subscribe({
      next: () => {
        this.passChangeMsg = 'Password changed successfully';
        this.passChangeErr = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => this.passChangeMsg = '', 4000);
      },
      error: (err) => {
        this.passChangeErr = true;
        this.passChangeMsg = err.error?.new_password?.[0] || err.error?.current_password || 'Error changing password';
      }
    });
  }

  setAvatarColor(color: string) {
    this.settings.update(s => ({ ...s, avatar_color: color }));
    this.showAvatarMenu = false;
    this.saveSettings();
  }

  setAvatarEmoji(emoji: string) {
    this.settings.update(s => ({ ...s, avatar_emoji: emoji }));
    this.showAvatarMenu = false;
    this.saveSettings();
  }
  
  // Map icon name to its tech-focused SVG path
  getIconPath(name: string): string {
    const paths: Record<string, string> = {
      bot: 'M12 8V4m0 0H8m4 0h4m-4 12v4m0 0H8m4 0h4M4 11h16M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z',
      brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.73-2.73 2.5 2.5 0 0 1-3.47-3.47 2.5 2.5 0 0 1 2.3-4.14 2.5 2.5 0 0 1 6.36-7.6ZM14.5 2A2.5 2.5 0 1 0 12 4.5v15a2.5 2.5 0 1 0 5-4 2.5 2.5 0 1 0-1-5 2.5 2.5 0 1 0-4-6Z',
      sparkles: 'M12 3 L12.5 8 L17 8.5 L12.5 9 L12 14 L11.5 9 L7 8.5 L11.5 8 Z M5 3 L5.5 5 L7.5 5.5 L5.5 6 L5 8 L4.5 6 L2.5 5.5 L4.5 5 Z M19 16 L19.5 18 L21.5 18.5 L19.5 19 L19 21 L18.5 19 L16.5 18.5 L18.5 18 Z',
      zap: 'M13 2 L3 14 H12 L11 22 L21 10 H12 L13 2 Z',
      cpu: 'M4 4h16v16H4V4ZM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3M9 9h6v6H9V9Z',
      terminal: 'm4 17 6-6-6-6M12 19h8',
      code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
      command: 'M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM6 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM18 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM6 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM9 6h6M9 18h6M6 9v6M18 9v6',
      activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
      globe: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z',
      lightbulb: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4',
      star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11Z',
      user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
    };
    return paths[name] || '';
  }

  getAvatarInitial() {
    const ds = this.settings().display_name;
    if (ds && ds.trim().length > 0) return ds.trim().charAt(0).toUpperCase();
    const uname = this.auth.currentUser()?.username;
    if (uname && uname.trim().length > 0) return uname.trim().charAt(0).toUpperCase();
    return 'U';
  }

  goBack() { this.router.navigate(['/chat']); }
}
