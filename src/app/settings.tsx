import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BlurHeader from '../components/BlurHeader';
import { useAlert } from '../contexts/AlertContext';
import {
  ChevronLeft,
  Settings,
  Sun,
  Moon,
  Volume2,
  BookOpen,
  Info,
  Bell,
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
    resumeFromStopped,
    setResumeFromStopped,
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

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Absolute Glassmorphic Header */}
        <BlurHeader isDark={activeScheme === 'dark'}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.navigate('/more')} style={styles.backBtn}>
              <ChevronLeft size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Settings</Text>
            <View style={styles.headerSpacer} />
          </View>
        </BlurHeader>

        {/* Scroll Content */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>App Preferences</Text>
            
            <View style={[
              styles.settingsCard,
              {
                backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff',
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                shadowRadius: 8,
                elevation: 2,
              }
            ]}>
              {/* Theme Settings */}
              <View style={styles.settingsHeader}>
                <Settings size={18} color={themeColors.primary} />
                <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Theme Settings</Text>
              </View>

              <View style={styles.themeSelectorRow}>
                {/* Auto */}
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    themeMode === 'system' && { backgroundColor: themeColors.primary },
                  ]}
                  onPress={() => setThemeMode('system')}
                >
                  <Settings size={14} color={themeMode === 'system' ? '#ffffff' : themeColors.text} />
                  <Text style={[styles.themeBtnText, { color: themeMode === 'system' ? '#ffffff' : themeColors.text }]}>
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
                >
                  <Sun size={14} color={themeMode === 'light' ? '#ffffff' : themeColors.text} />
                  <Text style={[styles.themeBtnText, { color: themeMode === 'light' ? '#ffffff' : themeColors.text }]}>
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
                >
                  <Moon size={14} color={themeMode === 'dark' ? '#ffffff' : themeColors.text} />
                  <Text style={[styles.themeBtnText, { color: themeMode === 'dark' ? '#ffffff' : themeColors.text }]}>
                    Dark
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Devotional Display Settings */}
              <View style={[styles.settingsHeader, { marginTop: 24 }]}>
                <BookOpen size={18} color={themeColors.primary} />
                <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Devotional Settings</Text>
              </View>
              <View style={styles.settingToggleRow}>
                <View style={styles.settingLabelGroup}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Show cover banner</Text>
                  <TouchableOpacity
                    onPress={() => showAlert({
                      title: 'Devotional Cover Banner',
                      message: 'Displays the graphic front design card at the top of the devotional reader screen. This setting does not affect the audio player banner.',
                    })}
                    style={styles.infoButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Info size={15} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
                <Switch
                  value={showDevotionalCover}
                  onValueChange={setShowDevotionalCover}
                  trackColor={{ false: '#767577', true: themeColors.primary }}
                  thumbColor={showDevotionalCover ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              {/* Notification Settings */}
              <View style={[styles.settingsHeader, { marginTop: 24 }]}>
                <Bell size={18} color={themeColors.primary} />
                <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Notifications</Text>
              </View>
              <View style={styles.settingToggleRow}>
                <View style={styles.settingLabelGroup}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Teaching & sermon alerts</Text>
                  <TouchableOpacity
                    onPress={() => showAlert({
                      title: 'Sermon Alerts',
                      message: 'Receive push notifications when new Sunday teachings or audio series are uploaded.',
                    })}
                    style={styles.infoButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Info size={15} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
                <Switch
                  value={teachingNotifications}
                  onValueChange={handleToggleTeachingNotifications}
                  trackColor={{ false: '#767577', true: themeColors.primary }}
                  thumbColor={teachingNotifications ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              <View style={styles.settingToggleRow}>
                <View style={styles.settingLabelGroup}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>Daily devotional reminder (6:30 AM)</Text>
                  <TouchableOpacity
                    onPress={() => showAlert({
                      title: 'Devotional Reminder',
                      message: 'A morning reminder to start your day reading the Spirit of Faith Devotional.',
                    })}
                    style={styles.infoButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Info size={15} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
                <Switch
                  value={devotionalReminder}
                  onValueChange={handleToggleDevotionalReminder}
                  trackColor={{ false: '#767577', true: themeColors.primary }}
                  thumbColor={devotionalReminder ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              {/* App Info & Hidden Dev 5-Tap Token Copy */}
              <View style={[styles.settingsHeader, { marginTop: 24 }]}>
                <Info size={18} color={themeColors.primary} />
                <Text style={[styles.settingsTitle, { color: themeColors.text }]}>App Information</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleVersionTap}
                style={styles.settingToggleRow}
              >
                <View style={styles.settingLabelGroup}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>App Version</Text>
                </View>
                <Text style={{ fontSize: 13, color: themeColors.text, opacity: 0.6, fontWeight: '500' }}>
                  v1.0.0
                </Text>
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
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    gap: 6,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  playbackLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoButton: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
