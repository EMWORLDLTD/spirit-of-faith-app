import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  useColorScheme,
  DimensionValue,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { useAudio } from '../contexts/AudioContext';

export interface SwipeableModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: DimensionValue;
  showCloseButton?: boolean;
  hideHandle?: boolean;
}

export default function SwipeableModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '85%',
  showCloseButton = true,
  hideHandle = false,
}: SwipeableModalProps) {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const translateY = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      translateY.setValue(600);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          mass: 0.8,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      isClosingRef.current = false;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          backdropAnim.setValue(Math.max(0, 1 - gestureState.dy / 400));
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.4) {
          handleClose();
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 8,
            }),
            Animated.timing(backdropAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Animated backdrop with tap to close */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Modal Bottom Sheet with Swipe-down Gesture */}
        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              maxHeight,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag handle */}
          {!hideHandle && (
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
            </View>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title ? (
                <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
              ) : (
                <View />
              )}
              {showCloseButton && (
                <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                  <X size={20} color={themeColors.text} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Optional Subtitle */}
          {subtitle && (
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              {subtitle}
            </Text>
          )}

          {/* Modal Body */}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    width: '100%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
});
