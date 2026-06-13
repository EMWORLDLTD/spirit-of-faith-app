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
import {
  ChevronLeft,
  Settings,
  Sun,
  Moon,
  Volume2,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const systemScheme = useColorScheme();
  const { themeMode, setThemeMode, resumeFromStopped, setResumeFromStopped } = useAudio();
  const insets = useSafeAreaInsets();

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

              {/* Playback Settings */}
              <View style={[styles.settingsHeader, { marginTop: 24 }]}>
                <Volume2 size={18} color={themeColors.primary} />
                <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Playback Settings</Text>
              </View>
              <View style={styles.playbackRow}>
                <Text style={[styles.playbackLabel, { color: themeColors.text }]}>Remember playback position</Text>
                <Switch
                  value={resumeFromStopped}
                  onValueChange={setResumeFromStopped}
                  trackColor={{ false: '#767577', true: themeColors.primary }}
                  thumbColor={resumeFromStopped ? '#ffffff' : '#f4f3f4'}
                />
              </View>
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
});
