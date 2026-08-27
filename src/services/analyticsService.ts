import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const ANALYTICS_KEYS = {
  FIRST_LAUNCH: "@spirit_first_launch_date",
  LAST_ACTIVE: "@spirit_last_active_date",
  SESSION_COUNT: "@spirit_total_sessions",
  DAILY_OPENS: "@spirit_daily_open_history",
};

export type AppUsageSummary = {
  firstLaunchDate: string | null;
  lastActiveDate: string | null;
  totalSessions: number;
  isNewUserToday: boolean;
};

class AnalyticsService {
  async trackAppOpen(): Promise<AppUsageSummary> {
    const today = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();

    try {
      const firstLaunch = await AsyncStorage.getItem(ANALYTICS_KEYS.FIRST_LAUNCH);
      const isNewUser = !firstLaunch;

      if (isNewUser) {
        await AsyncStorage.setItem(ANALYTICS_KEYS.FIRST_LAUNCH, timestamp);
      }

      await AsyncStorage.setItem(ANALYTICS_KEYS.LAST_ACTIVE, timestamp);

      const sessionCountStr = await AsyncStorage.getItem(ANALYTICS_KEYS.SESSION_COUNT);
      const sessionCount = (parseInt(sessionCountStr || "0", 10) || 0) + 1;
      await AsyncStorage.setItem(ANALYTICS_KEYS.SESSION_COUNT, sessionCount.toString());

      const dailyHistoryStr = await AsyncStorage.getItem(ANALYTICS_KEYS.DAILY_OPENS);
      let dailyHistory: Record<string, number> = dailyHistoryStr ? JSON.parse(dailyHistoryStr) : {};
      dailyHistory[today] = (dailyHistory[today] || 0) + 1;

      const keys = Object.keys(dailyHistory).sort();
      if (keys.length > 60) {
        const pruned: Record<string, number> = {};
        keys.slice(-60).forEach((k) => {
          pruned[k] = dailyHistory[k];
        });
        dailyHistory = pruned;
      }
      await AsyncStorage.setItem(ANALYTICS_KEYS.DAILY_OPENS, JSON.stringify(dailyHistory));

      return {
        firstLaunchDate: firstLaunch || timestamp,
        lastActiveDate: timestamp,
        totalSessions: sessionCount,
        isNewUserToday: isNewUser,
      };
    } catch (e) {
      console.warn("Analytics tracking error:", e);
      return {
        firstLaunchDate: null,
        lastActiveDate: null,
        totalSessions: 1,
        isNewUserToday: false,
      };
    }
  }

  logScreenView(screenName: string) {
    if (__DEV__) {
      console.log(`[Analytics] Screen View: ${screenName} on ${Platform.OS}`);
    }
  }

  logPlayback(trackTitle: string, preacher?: string) {
    if (__DEV__) {
      console.log(`[Analytics] Playback: "${trackTitle}" by ${preacher || "Unknown"}`);
    }
  }
}

export const analyticsService = new AnalyticsService();

