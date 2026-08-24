import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAudio } from '../contexts/AudioContext';

const { width } = Dimensions.get('window');

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export interface CustomDialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttons?: DialogButton[];
  dismissable?: boolean;
}

export default function CustomDialog({
  visible,
  onClose,
  title,
  message,
  buttons = [{ text: 'OK', style: 'primary' }],
  dismissable = true,
}: CustomDialogProps) {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const anim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        mass: 0.8,
      }).start();
    }
  }, [visible]);

  const handleClose = (callback?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      isClosingRef.current = false;
      if (callback) {
        callback();
      }
    });
  };

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!visible) return null;

  const isDark = activeScheme === 'dark';
  const isVerticalButtons = buttons.length > 2 || buttons.some(b => b.text.length > 14);

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        if (dismissable) handleClose();
      }}
    >
      <View style={styles.overlay}>
        {/* Animated backdrop */}
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              if (dismissable) handleClose();
            }}
          />
        </Animated.View>

        {/* Centered Dialog Card */}
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(27, 84, 164, 0.08)',
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          {title ? (
            <Text style={[styles.title, { color: themeColors.text }]}>
              {title}
            </Text>
          ) : null}

          {message ? (
            <Text style={[styles.message, { color: themeColors.textSecondary }]}>
              {message}
            </Text>
          ) : null}

          {/* Action Buttons */}
          <View style={[styles.buttonContainer, isVerticalButtons ? styles.buttonContainerVertical : styles.buttonContainerHorizontal]}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const isPrimary = btn.style === 'primary' || (!btn.style && index === buttons.length - 1 && !isCancel);

              let btnBg = 'transparent';
              let btnBorder = 'transparent';
              let textColor: string = themeColors.text;

              if (isDestructive) {
                btnBg = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2';
                btnBorder = isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5';
                textColor = '#ef4444';
              } else if (isPrimary) {
                btnBg = themeColors.primary;
                textColor = '#ffffff';
              } else if (isCancel) {
                btnBg = 'transparent';
                btnBorder = 'transparent';
                textColor = themeColors.textSecondary;
              } else {
                btnBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';
                btnBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0';
                textColor = themeColors.text;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isVerticalButtons ? styles.buttonVertical : styles.buttonHorizontal,
                    {
                      backgroundColor: btnBg,
                      borderColor: btnBorder,
                      borderWidth: btnBorder !== 'transparent' ? 1 : 0,
                      marginTop: isCancel && isVerticalButtons ? 4 : 0,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    handleClose(btn.onPress);
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: textColor,
                        fontWeight: isPrimary || isDestructive ? 'bold' : isCancel ? '500' : '600',
                      },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  dialogContainer: {
    width: Math.min(width - 56, 360),
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonVertical: {
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
