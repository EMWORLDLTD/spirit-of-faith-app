import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BlurHeader from '../components/BlurHeader';
import ToggleSwitch from '../components/ToggleSwitch';
import { useAlert } from '../contexts/AlertContext';
import {
  ChevronLeft,
  Settings,
  Sun,
  Moon,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleDailyDevotionalReminder,
  cancelDailyDevotionalReminder,
  registerForPushNotificationsAsync,
  requestNotificationPermissionAsync,
  NOTIF_STORAGE_KEYS,
} from '../services/notificationService';

export default function SettingsScreen() {
  const systemScheme = useColorScheme();
  const { showAlert } = useAlert();
  const {
    themeMode,
    setThemeMode,
    showDevotionalCover,
    setShowDevotionalCover,
  } = useAudio();
  const insets = useSafeAreaInsets();

  const [devotionalReminder, setDevotionalReminder] = React.useState<boolean>(false);
  const [teachingNotifications, setTeachingNotifications] = React.useState<boolean>(true);

  React.useEffect(() => {
    AsyncStorage.getItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_REMINDER_ENABLED).then((val) => {
      if (val === 'true') setDevotionalReminder(true);
    });
    AsyncStorage.getItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED).then((val) => {
      if (val !== null) {
        setTeachingNotifications(val === 'true');
      } else {
        requestNotificationPermissionAsync().then((granted) => {
          setTeachingNotifications(granted);
          if (granted) {
            AsyncStorage.setItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED, 'true');
          }
        });
      }
    });
  }, []);

  const handleToggleDevotionalReminder = async (enabled: boolean) => {
    setDevotionalReminder(enabled);
    if (enabled) {
      const permissionGranted = await requestNotificationPermissionAsync();
      if (!permissionGranted) {
        setDevotionalReminder(false);
        await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.DEVOTIONAL_REMINDER_ENABLED, 'false');
        showAlert({
          title: 'Notifications Disabled',
          message: 'Please enable notification permissions in your device settings to receive daily devotional reminders.',
        });
        return;
      }
      await scheduleDailyDevotionalReminder(6, 30);
      showAlert({
        title: 'Morning Reminder Set',
        message: 'You will receive daily reminders at 6:30 AM to read the Spirit of Faith Devotional.',
      });
    } else {
      await cancelDailyDevotionalReminder();
    }
  };

  const handleToggleTeachingNotifications = async (enabled: boolean) => {
    setTeachingNotifications(enabled);
    if (enabled) {
      const result = await registerForPushNotificationsAsync();
      if (!result.permissionGranted) {
        setTeachingNotifications(false);
        await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED, 'false');
        showAlert({
          title: 'Notifications Disabled',
          message: 'Please enable notification permissions in your device settings to receive teaching updates.',
        });
      } else {
        await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED, 'true');
        showAlert({
          title: 'Teaching Alerts Enabled',
          message: 'You will receive notifications whenever new sermons, audio series, and teachings are published.',
        });
      }
    } else {
      await AsyncStorage.setItem(NOTIF_STORAGE_KEYS.TEACHING_NOTIFICATIONS_ENABLED, 'false');
    }
  };

  const [versionTapCount, setVersionTapCount] = React.useState(0);

  const handleVersionTap = async () => {
    const next = versionTapCount + 1;
    if (next >= 5) {
      setVersionTapCount(0);
      try {
        const token = await AsyncStorage.getItem(NOTIF_STORAGE_KEYS.PUSH_TOKEN);
        if (token) {
          const Clipboard = require('react-native').Clipboard;
          if (Clipboard && Clipboard.setString) {
            Clipboard.setString(token);
          }
          showAlert({
            title: 'Push Token Copied',
            message: `Your device push token has been copied to your clipboard:\n\n${token}`,
          });
        } else {
          showAlert({
            title: 'Push Token Unavailable',
            message: 'No push token is currently stored. Make sure notifications are allowed and you are running a native build.',
          });
        }
      } catch (e: any) {
        showAlert({
          title: 'Developer Diagnostic',
          message: `Error copying token: ${e?.message || 'Unknown error'}`,
        });
      }
    } else {
      setVersionTapCount(next);
    }
  };

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  const cardStyle = [
    styles.card,
    {
      backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff',
      borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    }
  ];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Absolute Glassmorphic Header */}
        <BlurHeader isDark={activeScheme === 'dark'}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.navigate('/more')} style={styles.backBtn}>
              <ChevronLeft size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>App Preferences</Text>
            <View style={styles.headerSpacer} />
          </View>
        </BlurHeader>

        {/* Scroll Content */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: 76 + insets.top, paddingBottom: 150 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION: THEME */}
          <View style={styles.group}>
            <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>
              APPEARANCE
            </Text>
            <View style={[
              styles.themeCard,
              {
                backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff',
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }
            ]}>
              {/* Auto */}
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  themeMode === 'system' && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.7}
              >
                <Settings size={15} color={themeMode === 'system' ? '#ffffff' : themeColors.textSecondary} />
                <Text style={[
                  styles.themeBtnText,
                  { color: themeMode === 'system' ? '#ffffff' : themeColors.text }
                ]}>
                  Auto
                </Text>
              </TouchableOpacity>

              {/* Light */}
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  themeMode === 'light' && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.7}
              >
                <Sun size={15} color={themeMode === 'light' ? '#ffffff' : themeColors.textSecondary} />
                <Text style={[
                  styles.themeBtnText,
                  { color: themeMode === 'light' ? '#ffffff' : themeColors.text }
                ]}>
                  Light
                </Text>
              </TouchableOpacity>

              {/* Dark */}
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  themeMode === 'dark' && { backgroundColor: themeColors.primary },
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.7}
              >
                <Moon size={15} color={themeMode === 'dark' ? '#ffffff' : themeColors.textSecondary} />
                <Text style={[
                  styles.themeBtnText,
                  { color: themeMode === 'dark' ? '#ffffff' : themeColors.text }
                ]}>
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION: DEVOTIONAL & NOTIFICATIONS */}
          <View style={styles.group}>
            <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>
              PREFERENCES
            </Text>
            <View style={cardStyle}>
              {/* Row 1: Devotional Cover */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: themeColors.text }]}>
                    Show cover banner
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: themeColors.textSecondary }]}>
                    Display cover graphic on devotional reader
                  </Text>
                </View>
                <ToggleSwitch
                  value={showDevotionalCover}
                  onValueChange={setShowDevotionalCover}
                  activeTrackColor={themeColors.primary}
                  inactiveTrackColor={activeScheme === 'dark' ? '#334155' : '#B0B7C3'}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              {/* Row 2: Sermons */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: themeColors.text }]}>
                    Teaching & sermon alerts
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: themeColors.textSecondary }]}>
                    Notify when new teachings are uploaded
                  </Text>
                </View>
                <ToggleSwitch
                  value={teachingNotifications}
                  onValueChange={handleToggleTeachingNotifications}
                  activeTrackColor={themeColors.primary}
                  inactiveTrackColor={activeScheme === 'dark' ? '#334155' : '#B0B7C3'}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              {/* Row 3: Devotional Reminder */}
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: themeColors.text }]}>
                    Daily devotional reminder
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: themeColors.textSecondary }]}>
                    Morning notification daily at 6:30 AM
                  </Text>
                </View>
                <ToggleSwitch
                  value={devotionalReminder}
                  onValueChange={handleToggleDevotionalReminder}
                  activeTrackColor={themeColors.primary}
                  inactiveTrackColor={activeScheme === 'dark' ? '#334155' : '#B0B7C3'}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* SECTION: ABOUT */}
          <View style={styles.group}>
            <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>
              ABOUT
            </Text>
            <View style={cardStyle}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleVersionTap}
                style={styles.settingRow}
              >
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: themeColors.text }]}>
                    App Version
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: themeColors.textSecondary }]}>
                    Christ Pavilion Official App
                  </Text>
                </View>
                <View style={[
                  styles.versionBadge,
                  { backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' }
                ]}>
                  <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>
                    v1.0.0
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  group: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  themeCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 5,
    gap: 6,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 14,
  },
  settingTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
