import { useState, useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';

export interface UseAppUpdateResult {
  /** True if an OTA update is currently being downloaded in the background */
  isDownloading: boolean;
  /** True when a new update has downloaded and is ready to apply by reloading */
  isUpdateReady: boolean;
  /** Manually reload the app immediately to apply the new update */
  reloadApp: () => Promise<void>;
  /** Dismiss the banner notification for the current session */
  dismissBanner: () => void;
}

export function useAppUpdate(): UseAppUpdateResult {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // OTA updates only operate in standalone / production builds
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    try {
      const checkResult = await Updates.checkForUpdateAsync();
      if (checkResult.isAvailable) {
        setIsDownloading(true);
        const fetchResult = await Updates.fetchUpdateAsync();
        setIsDownloading(false);
        if (fetchResult.isNew) {
          setIsUpdateReady(true);
        }
      }
    } catch {
      // Non-critical: network issues or offline
      setIsDownloading(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const reloadApp = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.warn('Failed to reload app for update:', err);
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return {
    isDownloading,
    isUpdateReady: isUpdateReady && !isDismissed,
    reloadApp,
    dismissBanner,
  };
}
