import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification Storage Keys
export const NOTIF_STORAGE_KEYS = {
  PUSH_TOKEN: 'sof_user_push_token',
  TEACHING_NOTIFICATIONS_ENABLED: 'sof_teaching_notifications_enabled',
  DEVOTIONAL_REMINDER_ENABLED: 'sof_devotional_reminder_enabled',
  DEVOTIONAL_REMINDER_TIME: 'sof_devotional_reminder_time', // { hour: 6, minute: 30 }
  DEVOTIONAL_NOTIFICATION_ID: 'sof_devotional_notification_id',
};

// Live Cloudflare Notification Hub Worker URL
export const DEFAULT_NOTIFICATION_WORKER_URL = 'https://spirit-of-faith-notifications-hub.emworldlive.workers.dev';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Check and request device notification permissions
 */
export async function requestNotificationPermissionAsync(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Configure Android Notification Channels
 */
export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('teachings', {
    name: 'Audio Teachings & Sermons',
    description: 'Notifications for new Sunday sermons, midweek teachings, and audio releases.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B54A4',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('devotionals', {
    name: 'Daily Devotionals',
    description: 'Daily morning devotional reading reminders and confessions.',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('announcements', {
    name: 'Church Events & Announcements',
    description: 'Special church events, prayer meetings, and announcements.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export type PushRegistrationResult = {
  success: boolean;
  permissionGranted: boolean;
  token: string | null;
  isExpoGo: boolean;
  error?: string;
};

/**
 * Register device for Push Notifications & retrieve Expo Push Token
 */
export async function registerForPushNotificationsAsync(
  workerUrl: string = DEFAULT_NOTIFICATION_WORKER_URL
): Promise<PushRegistrationResult> {
  try {
    await setupAndroidNotificationChannels();

    // 1. Verify system notification permissions
    const permissionGranted = await requestNotificationPermissionAsync();
    if (!permissionGranted) {
      console.log('Push notification permission denied by user.');
      return {
        success: false,
        permissionGranted: false,
        token: null,
        isExpoGo: false,
        error: 'permission_denied',
      };
    }

    // 2. Direct Expo Push Token Acquisition for Development Client & Standalone APK
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'e3248356-d9ed-4556-bef2-235a7f475a41';

    let token: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData?.data || null;
    } catch (tokenErr: any) {
      console.warn('getExpoPushTokenAsync failed:', tokenErr);
    }

    if (token) {
      await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.PUSH_TOKEN, token);
      await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED, 'true');

      // Register with Cloudflare Notification Worker
      await syncTokenWithWorker(token, workerUrl);
    }

    return {
      success: !!token,
      permissionGranted: true,
      token: token || null,
      isExpoGo: false,
    };
  } catch (error: any) {
    console.warn('Error obtaining push notification token:', error);
    const { status } = await Notifications.getPermissionsAsync();
    const permissionGranted = status === 'granted';
    if (permissionGranted) {
      await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED, 'true');
    }
    return {
      success: permissionGranted,
      permissionGranted,
      token: null,
      isExpoGo: false,
      error: error?.message || 'unknown_error',
    };
  }
}

/**
 * Sync push token to Cloudflare Worker
 */
export async function syncTokenWithWorker(token: string, workerUrl: string = DEFAULT_NOTIFICATION_WORKER_URL) {
  try {
    if (!workerUrl || !token) return;
    const cleanUrl = workerUrl.replace(/\/+$/, '');

    await fetch(`${cleanUrl}/api/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceModel: Device.modelName || 'Unknown Device',
        appVersion: Constants?.expoConfig?.version || '1.0.0',
      }),
    });
  } catch (err) {
    console.warn('Failed to sync push token with worker:', err);
  }
}

/**
 * Schedule Local Daily Devotional Reminder (Client-Side / Offline)
 */
export async function scheduleDailyDevotionalReminder(
  hour: number = 6,
  minute: number = 30
): Promise<string | null> {
  try {
    // Cancel existing reminder if any
    const existingId = await AsyncStorage.getItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_NOTIFICATION_ID);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today's Spirit of Faith Devotional",
        body: "Begin your day with God's Word, faith confession, and prayer focus.",
        sound: 'default',
        data: {
          type: 'devotional',
          source: 'local_reminder',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'devotionals',
      },
    });

    await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_NOTIFICATION_ID, notificationId);
    await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_REMINDER_ENABLED, 'true');
    await AsyncStorage.setItem(
      NOTIF_STORAGE_KEYS.DEVOTIONAL_REMINDER_TIME,
      JSON.stringify({ hour, minute })
    );

    return notificationId;
  } catch (error) {
    console.warn('Error scheduling daily devotional reminder:', error);
    return null;
  }
}

/**
 * Cancel Local Daily Devotional Reminder
 */
export async function cancelDailyDevotionalReminder(): Promise<void> {
  try {
    const existingId = await AsyncStorage.getItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_NOTIFICATION_ID);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_NOTIFICATION_ID);
    }
    await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_REMINDER_ENABLED, 'false');
  } catch (error) {
    console.warn('Error cancelling devotional reminder:', error);
  }
}

/**
 * Get Saved Push Token from Local Storage
 */
export async function getSavedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(NOTIF_STORAGE_KEYS.PUSH_TOKEN);
}
