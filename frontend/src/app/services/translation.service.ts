import { Injectable, signal, inject } from '@angular/core';

export type Lang = 'en' | 'ru';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav & common
    settings: 'Settings',
    back: 'Back',
    signOut: 'Sign out',
    save: 'Save changes',
    cancel: 'Cancel',
    newChat: 'New Chat',
    noConversations: 'No conversations yet',
    older: 'Older',
    send: 'Send a message',

    // Settings tabs
    tabProfile: 'Profile',
    tabGeneral: 'General',

    // General
    general: 'General',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    language: 'Language',
    languageEn: 'English',
    languageRu: 'Русский',
    modelSettings: 'Model Settings',
    contextLength: 'Context Length',
    temperature: 'Temperature',
    resetDefaults: 'Reset to defaults',

    // API Keys
    apiKeys: 'OpenRouter API Keys',
    noKeys: 'No API keys added yet.',
    setDefault: 'Set Default',
    addKey: '+ Add Key',
    keyLabel: 'Label (e.g. Primary)',
    keyValue: 'sk-or-v1-...',
    defaultBadge: 'Default',

    // Profile
    displayName: 'Name',
    bio: 'About me',
    bioPlaceholder: 'Tell the AI a little about yourself...',
    bioHint: 'This information helps the AI understand your context better',
    gender: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    genderPreferNot: 'Prefer not to say',
    birthday: 'Date of Birth',
    changePassword: 'Change Password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    avatarColor: 'Color',
    avatarEmoji: 'Emoji',
    select: 'Select',

    // Chat
    you: 'You',
    assistant: 'Assistant',
    thinkLow: 'Low',
    thinkMed: 'Medium',
    thinkHigh: 'High',
    attachImage: 'Attach Image',
    noVision: 'This model does not support image inputs',

    // Errors / notifications
    chatNotFound: 'Chat not found or you don\'t have access to it.',
  },
  ru: {
    // Nav & common
    settings: 'Настройки',
    back: 'Назад',
    signOut: 'Выйти',
    save: 'Сохранить изменения',
    cancel: 'Отмена',
    newChat: 'Новый чат',
    noConversations: 'Нет разговоров',
    older: 'Старые',
    send: 'Отправить сообщение',

    // Settings tabs
    tabProfile: 'Профиль',
    tabGeneral: 'Основные',

    // General
    general: 'Основные',
    theme: 'Тема',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeSystem: 'Системная',
    language: 'Язык',
    languageEn: 'English',
    languageRu: 'Русский',
    modelSettings: 'Настройки модели',
    contextLength: 'Длина контекста',
    temperature: 'Температура',
    resetDefaults: 'Сбросить настройки',

    // API Keys
    apiKeys: 'API-ключи OpenRouter',
    noKeys: 'API-ключи ещё не добавлены.',
    setDefault: 'По умолчанию',
    addKey: '+ Добавить ключ',
    keyLabel: 'Название (например, Основной)',
    keyValue: 'sk-or-v1-...',
    defaultBadge: 'По умолчанию',

    // Profile
    displayName: 'Имя',
    bio: 'О себе',
    bioPlaceholder: 'Расскажите немного о себе...',
    bioHint: 'Эта информация поможет AI лучше понимать ваш контекст',
    gender: 'Пол',
    genderMale: 'Мужской',
    genderFemale: 'Женский',
    genderOther: 'Другой',
    genderPreferNot: 'Не указывать',
    birthday: 'Дата рождения',
    changePassword: 'Изменить пароль',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердите новый пароль',
    avatarColor: 'Цвет',
    avatarEmoji: 'Эмодзи',
    select: 'Выбрать',

    // Chat
    you: 'Вы',
    assistant: 'Ассистент',
    thinkLow: 'Низкий',
    thinkMed: 'Средний',
    thinkHigh: 'Высокий',
    attachImage: 'Прикрепить изображение',
    noVision: 'Данная модель не поддерживает файлы на входе',

    // Errors / notifications
    chatNotFound: 'Чат не найден или у вас нет к нему доступа.',
  },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  lang = signal<Lang>('en');

  init(lang: string) {
    const l = lang === 'ru' ? 'ru' : 'en';
    this.lang.set(l);
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    localStorage.setItem('lang', lang);
  }

  t(key: string): string {
    return translations[this.lang()][key] ?? key;
  }
}
