import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, RefreshCw, X } from 'lucide-react-native';
import { useAudio } from '../contexts/AudioContext';

interface UpdateBannerProps {
  isVisible: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  isVisible,
  onReload,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const { themeMode } = useAudio();
  const isDark = themeMode === 'dark';

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 6, 16),
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconCircle}>
          <Sparkles size={16} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            Update Ready
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            A new version has been downloaded.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onReload}
          style={styles.restartButton}
        >
          <RefreshCw size={12} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.restartText}>Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDismiss}
          style={[styles.dismissButton, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      },
    }),
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1B54A4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B54A4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
