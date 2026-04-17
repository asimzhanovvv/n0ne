import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private enabled = false;

  /** Call this after loading user settings to set the initial state. */
  setEnabled(value: boolean) {
    this.enabled = value;
    if (value && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Request browser permission and update enabled state.
   * Returns true if permission was granted.
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  /**
   * Send a browser notification if:
   *  - Notifications are enabled by the user
   *  - Browser permission is granted
   *  - User is NOT currently viewing the page (document hidden) OR
   *    the currently active chat id differs from the response chat id
   */
  notify(title: string, body: string, chatId?: number, activeChatId?: number | null) {
    if (!this.enabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Send notification if page is hidden OR user is in a different chat
    const isHidden = document.visibilityState === 'hidden';
    const isDifferentChat = chatId !== undefined && chatId !== activeChatId;

    if (isHidden || isDifferentChat) {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `chat-${chatId}`,
      });
      // Auto-close after 6 seconds
      setTimeout(() => n.close(), 6000);
    }
  }
}
