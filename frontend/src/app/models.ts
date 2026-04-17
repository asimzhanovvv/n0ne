export interface User {
  id: number;
  username: string;
  email: string;
  date_joined: string;
}

export interface Chat {
  id: number;
  title: string;
  model: string;
  message_count: number;
  last_message?: {
    role: string;
    content: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Message {
  id?: number;
  chat?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  model_used?: string | null;
  tokens_used?: number;
  created_at?: string;
}

export interface ApiKey {
  id: number;
  label: string;
  key?: string;
  masked_key: string;
  is_default: boolean;
  created_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ru';
  default_model: string;
  context_length: number;
  max_tokens: number;
  temperature: number;
  updated_at: string;
  // Profile fields
  display_name: string;
  bio: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';
  birthday: string | null; // ISO Date YYYY-MM-DD
  avatar_color: string;
  avatar_emoji: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}
