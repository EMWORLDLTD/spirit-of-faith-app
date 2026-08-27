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
}

const CACHE_KEY = 'sof_cached_announcements';
const LAST_READ_KEY = 'sof_last_read_announcement_id';

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
