import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BlurHeaderProps {
  children: React.ReactNode;
  isDark: boolean;
  borderColor?: string;
}

export default function BlurHeader({ children, isDark, borderColor }: BlurHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      styles.wrapper,
      {
        paddingTop: insets.top,
        borderBottomColor: borderColor ?? (isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(27,84,164,0.12)'),
      }
    ]}>
      {Platform.OS === 'android' ? (
        <>
          <BlurView
            intensity={isDark ? 70 : 85}
            tint={isDark ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[StyleSheet.absoluteFillObject, {
            backgroundColor: isDark
              ? 'rgba(3,7,24,0.55)'
              : 'rgba(240,246,255,0.55)',
          }]} />
        </>
      ) : (
        <BlurView
          intensity={isDark ? 70 : 85}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
});
