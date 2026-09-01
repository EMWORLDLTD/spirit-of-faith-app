import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';
import { X, ExternalLink, Bell } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { useAudio } from '../contexts/AudioContext';
import { AppAnnouncement } from '../services/announcementService';

const { width } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(width - 48, 380);

interface BroadcastModalProps {
  broadcast: AppAnnouncement | null;
  isVisible: boolean;
  onDismiss: () => void;
  onAction: () => void;
}

export default function BroadcastModal({
  broadcast,
  isVisible,
  onDismiss,
  onAction,
}: BroadcastModalProps) {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const router = useRouter();

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const isDark = activeScheme === 'dark';
  const themeColors = Colors[isDark ? 'dark' : 'light'];

  const [isMounted, setIsMounted] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  useEffect(() => {
    if (isVisible && broadcast) {
      setIsMounted(true);
      setIsClosing(false);
    }
  }, [isVisible, broadcast]);

  const handleClose = (callback?: () => void) => {
    if (isClosing) return;
    setIsClosing(true);
    // Callback fires after animation via onTransitionEnd
    pendingCallback.current = callback;
  };

  const pendingCallback = useRef<(() => void) | undefined>(undefined);

  const handleTransitionEnd = ({ finished }: { finished: boolean }) => {
    if (finished && isClosing) {
      setIsMounted(false);
      setIsClosing(false);
      if (pendingCallback.current) {
        const cb = pendingCallback.current;
        pendingCallback.current = undefined;
        cb();
      }
    }
  };

  const handleDismiss = () => {
    handleClose(onDismiss);
  };

  const handleAction = () => {
    handleClose(() => {
      onAction();
      if (broadcast?.actionRoute) {
        router.push(broadcast.actionRoute as any);
      }
    });
  };

  if (!broadcast || (!isVisible && !isMounted)) return null;

  const canDismiss = broadcast.isDismissible !== false;
  const hasImage = !!broadcast.imageUrl;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={isVisible || isMounted}
      onRequestClose={() => {
        if (canDismiss) handleDismiss();
      }}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Animated Backdrop */}
        <EaseView
          style={styles.backdrop}
          initialAnimate={{ opacity: 0 }}
          animate={{ opacity: isClosing ? 0 : 1 }}
          transition={{ type: 'timing', duration: 200, easing: 'easeInOut' }}
        >
          {canDismiss && (
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={handleDismiss}
            />
          )}
        </EaseView>

        {/* Modal Card */}
        <EaseView
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1A1D26' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,84,164,0.1)',
            },
          ]}
          initialAnimate={{ opacity: 0, scale: 0.9, translateY: 16 }}
          animate={{
            opacity: isClosing ? 0 : 1,
            scale: isClosing ? 0.94 : 1,
            translateY: isClosing ? 12 : 0,
          }}
          transition={
            isClosing
              ? { type: 'timing', duration: 180, easing: 'easeIn' }
              : { type: 'spring', damping: 22, mass: 0.85, stiffness: 130 }
          }
          onTransitionEnd={handleTransitionEnd}
        >
          {/* Image Header */}
          {hasImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: broadcast.imageUrl }}
                style={styles.bannerImage}
                contentFit="cover"
                transition={200}
              />
              {/* Gradient fade from image into card bg */}
              <View
                style={[
                  styles.imageGradientFade,
                  {
                    backgroundColor: isDark
                      ? 'rgba(26, 29, 38, 0.35)'
                      : 'rgba(255, 255, 255, 0.25)',
                  },
                ]}
              />
            </View>
          )}

          {/* Close Button (top-right, only if dismissible) */}
          {canDismiss && (
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.07)',
                  top: hasImage ? 12 : 16,
                },
              ]}
              onPress={handleDismiss}
              activeOpacity={0.75}
            >
              <X size={16} color={isDark ? '#FFFFFF' : '#1A1A2E'} strokeWidth={2.5} />
            </TouchableOpacity>
          )}

          {/* Body Content */}
          <View style={[styles.body, hasImage && styles.bodyWithImage]}>
            {/* Icon badge — shown when no image */}
            {!hasImage && (
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: isDark ? 'rgba(27,84,164,0.18)' : 'rgba(27,84,164,0.08)' },
                ]}
              >
                <Bell size={22} color={themeColors.primary} strokeWidth={1.8} />
              </View>
            )}

            <Text
              style={[
                styles.title,
                { color: themeColors.text },
                !hasImage && styles.titleCentered,
              ]}
              numberOfLines={3}
            >
              {broadcast.title}
            </Text>

            {broadcast.subtitle ? (
              <Text
                style={[styles.subtitle, { color: themeColors.primary }]}
                numberOfLines={2}
              >
                {broadcast.subtitle}
              </Text>
            ) : null}

            <Text
              style={[
                styles.message,
                { color: themeColors.textSecondary },
                !hasImage && styles.messageCentered,
              ]}
            >
              {broadcast.body}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Primary action button */}
            {broadcast.actionText && broadcast.actionRoute ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
                onPress={handleAction}
                activeOpacity={0.8}
              >
                <ExternalLink size={15} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.actionBtnText}>{broadcast.actionText}</Text>
              </TouchableOpacity>
            ) : null}

            {/* Dismiss / Later button — only when isDismissible is not false */}
            {canDismiss && (
              <TouchableOpacity
                style={[
                  styles.dismissBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
                  },
                ]}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.dismissBtnText, { color: themeColors.textSecondary }]}>
                  {broadcast.actionText ? 'Later' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </EaseView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    width: MODAL_WIDTH,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 28,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 4,
  },
  bodyWithImage: {
    paddingTop: 18,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  titleCentered: {
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  messageCentered: {
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
