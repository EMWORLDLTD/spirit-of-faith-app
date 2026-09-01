import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_NOTIFICATION_WORKER_URL } from './notificationService';

export interface AppAnnouncement {
  id: string;
  title: string;
  body: string;
  subtitle?: string;
  type: 'announcement' | 'event' | 'audio' | 'devotional';
  imageUrl?: string;
  createdAt: string;
  expiresAt?: string;
  linkUrl?: string;
  priority?: 'normal' | 'high';
  // --- Broadcast / Pop-up fields ---
  /** Controls how the announcement is displayed. 'inline' = announcements tab only (default). 'popup_modal' = full screen pop-up on app launch. */
  displayType?: 'inline' | 'popup_modal';
  /** Style of the pop-up modal. 'card' = standard card with title/body/buttons. 'image_only' = full-bleed clickable flyer with floating close button. */
  popupStyle?: 'card' | 'image_only';
  /** Label for the primary action button, e.g. "View Event Details", "Listen Now" */
  actionText?: string;
  /** Expo Router route to navigate to when action button is tapped, e.g. "/events", "/teachings" */
  actionRoute?: string;
  /** Whether the user can dismiss the modal with a "Later" button. false = forced/mandatory. */
  isDismissible?: boolean;
  /** If true, only shows once per device. Once dismissed, never shows again for this announcement id. */
  showOnce?: boolean;
}

const CACHE_KEY = 'sof_cached_announcements';
const LAST_READ_KEY = 'sof_last_read_announcement_id';
const DISMISSED_BROADCAST_PREFIX = 'sof_dismissed_broadcast_';

export const announcementService = {
  /**
   * Fetch announcements from Cloudflare Worker with local cache fallback
   */
  async getAnnouncements(): Promise<AppAnnouncement[]> {
    try {
      const response = await fetch(`${DEFAULT_NOTIFICATION_WORKER_URL}/api/announcements`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.announcements)) {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.announcements));
          return data.announcements;
        }
      }
    } catch (err) {
      console.log('Error fetching announcements from worker, falling back to cache:', err);
    }

    // Fallback to local storage cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return [];
  },

  /**
   * Fetch and return the first active broadcast pop-up announcement (displayType === 'popup_modal').
   * Filters out expired announcements and, for showOnce broadcasts, skips ones the user
   * has already dismissed on this device.
   * Returns null if no active broadcast should be shown.
   */
  async getActiveBroadcast(): Promise<AppAnnouncement | null> {
    try {
      const all = await this.getAnnouncements();
      const now = new Date();

      const broadcasts = all.filter((a) => a.displayType === 'popup_modal');

      for (const broadcast of broadcasts) {
        // Skip expired broadcasts
        if (broadcast.expiresAt && new Date(broadcast.expiresAt) < now) {
          continue;
        }

        // Skip if already dismissed (showOnce)
        if (broadcast.showOnce) {
          const dismissedKey = `${DISMISSED_BROADCAST_PREFIX}${broadcast.id}`;
          const dismissed = await AsyncStorage.getItem(dismissedKey);
          if (dismissed === 'true') {
            continue;
          }
        }

        // Return the first valid broadcast
        return broadcast;
      }
    } catch (err) {
      console.warn('Error fetching active broadcast:', err);
    }

    return null;
  },

  /**
   * Mark a broadcast as permanently dismissed on this device.
   * Only applies to showOnce broadcasts.
   */
  async dismissBroadcast(broadcastId: string): Promise<void> {
    try {
      const dismissedKey = `${DISMISSED_BROADCAST_PREFIX}${broadcastId}`;
      await AsyncStorage.setItem(dismissedKey, 'true');
    } catch {}
  },

  /**
   * Mark announcements as read by storing the latest announcement id
   */
  async markAsRead(latestId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_READ_KEY, latestId);
    } catch {}
  },

  /**
   * Check if there are unread announcements
   */
  async hasUnreadAnnouncements(announcements: AppAnnouncement[]): Promise<boolean> {
    if (!announcements || announcements.length === 0) return false;
    try {
      const lastReadId = await AsyncStorage.getItem(LAST_READ_KEY);
      if (!lastReadId) return true;
      const latest = announcements[0];
      return latest.id !== lastReadId;
    } catch {
      return false;
    }
  },
};
