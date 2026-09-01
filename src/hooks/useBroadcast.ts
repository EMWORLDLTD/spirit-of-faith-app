import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { announcementService, AppAnnouncement } from '../services/announcementService';

export interface UseBroadcastResult {
  /** The active broadcast to display, or null if none is pending. */
  broadcast: AppAnnouncement | null;
  /** Whether the modal is currently visible. */
  isVisible: boolean;
  /** Call this when the user taps "Later" or the close button. Persists dismissal for showOnce broadcasts. */
  dismissBroadcast: () => void;
  /** Call this when the user taps the action button. Navigates externally; still dismisses the modal. */
  actOnBroadcast: () => void;
}

/**
 * Fetches and manages the lifecycle of a remote broadcast pop-up announcement.
 *
 * On mount, checks the backend for any active popup_modal announcement.
 * Respects showOnce (already-dismissed broadcasts are not shown again).
 * Re-checks whenever the app comes back to the foreground (AppState active).
 */
export function useBroadcast(): UseBroadcastResult {
  const [broadcast, setBroadcast] = useState<AppAnnouncement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const checkForBroadcast = useCallback(async () => {
    // ─── DEV TEST BROADCAST ────────────────────────────────────────────────
    // This block only runs in development builds (Expo dev client / Metro).
    // It is automatically stripped out in production builds.
    // Remove or set to false once you've confirmed the modal works end-to-end.
    if (__DEV__) {
      const DEV_BROADCAST = {
        id: 'dev-test-broadcast-001',
        title: 'Annual Faith Convention 2026',
        subtitle: 'Friday 5th September · 6:00 PM',
        body: "Join us for 3 power-packed days of life-changing ministry. Invite a friend and come expectant.",
        type: 'event' as const,
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
        displayType: 'popup_modal' as const,
        actionText: 'View Event Details',
        actionRoute: '/events',
        isDismissible: true,
        showOnce: false, // set to false during dev so it always re-shows for testing
        createdAt: new Date().toISOString(),
        expiresAt: '2099-12-31T23:59:59Z',
      };
      setBroadcast(DEV_BROADCAST);
      setIsVisible(true);
      return; // skip real API call in dev
    }
    // ─── END DEV TEST BROADCAST ────────────────────────────────────────────

    try {
      const active = await announcementService.getActiveBroadcast();
      if (active) {
        setBroadcast(active);
        setIsVisible(true);
      }
    } catch (err) {
      console.warn('useBroadcast: failed to check for broadcast', err);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkForBroadcast();
  }, [checkForBroadcast]);

  // Re-check whenever the app returns to the foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkForBroadcast();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkForBroadcast]);

  const dismissBroadcast = useCallback(() => {
    if (!broadcast) return;
    setIsVisible(false);
    if (broadcast.showOnce) {
      announcementService.dismissBroadcast(broadcast.id).catch(() => {});
    }
    // Clear broadcast after modal animates out
    setTimeout(() => setBroadcast(null), 350);
  }, [broadcast]);

  const actOnBroadcast = useCallback(() => {
    if (!broadcast) return;
    setIsVisible(false);
    // Always persist dismissal when user takes the action — they've seen it
    announcementService.dismissBroadcast(broadcast.id).catch(() => {});
    setTimeout(() => setBroadcast(null), 350);
  }, [broadcast]);

  return { broadcast, isVisible, dismissBroadcast, actOnBroadcast };
}
