import React, { useState, useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated as RNAnimated,
  Platform,
  FlatList,
  PanResponder,
  Pressable,
  BackHandler,
  useColorScheme,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  interpolateColor,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import SwipeableModal from './SwipeableModal';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  Music,
  Volume2,
  Heart,
  ListPlus,
  ListMusic,
  Library,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Download,
  Check,
  Repeat,
  Share2,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Format milliseconds to mm:ss format
const formatTime = (ms: number) => {
  if (isNaN(ms) || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Animated Waveform component to mimic audio pitch and energy
const PlaybackWaveform = React.memo(({ isPlaying }: { isPlaying: boolean }) => {
  const barsCount = 21;
  // Initialize scale values for each bar
  const anims = useRef(
    Array(barsCount)
      .fill(0)
      .map(() => new RNAnimated.Value(0.3))
  ).current;

  useEffect(() => {
    let animations: RNAnimated.CompositeAnimation[] = [];

    if (isPlaying) {
      animations = anims.map((anim) => {
        // Create random speeds and heights for organic waving motion
        const duration = 280 + Math.random() * 320;
        const targetValue = 0.4 + Math.random() * 1.5;

        return RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.timing(anim, {
              toValue: targetValue,
              duration: duration,
              useNativeDriver: true,
            }),
            RNAnimated.timing(anim, {
              toValue: 0.3,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        );
      });
      RNAnimated.parallel(animations).start();
    } else {
      // Settle down to uniform flat line when paused
      anims.forEach((anim) => {
        RNAnimated.timing(anim, {
          toValue: 0.25,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      anims.forEach((anim) => anim.stopAnimation());
    };
  }, [isPlaying]);

  return (
    <View style={styles.waveformContainer}>
      {anims.map((anim, idx) => (
        <RNAnimated.View
          key={idx}
          style={[
            styles.waveformBar,
            {
              transform: [{ scaleY: anim }],
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            },
          ]}
        />
      ))}
    </View>
  );
});

const AnimatedBlurView = RNAnimated.createAnimatedComponent(BlurView);

export default function AudioPlayer() {
  const colorScheme = useColorScheme();
  const systemScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    position,
    duration,
    togglePlayPause,
    seek,
    playNext,
    playPrevious,
    toggleFavorite,
    isFavorite,
    themeMode,
    addToPlaylist,
    removeFromPlaylist,
    addToQueue,
    playNextTrack,
    reorderQueue,
    removeFromQueue,
    trackList,
    playTrack,
    isPlayerExpanded,
    setIsPlayerExpanded,
    activeActionTrack,
    closeActionSheet,
    downloadTrack,
    downloadProgress,
    deleteDownloadedTrack,
    isDownloaded,
    saveTrackToDevice,
    shareTrack,
    repeatMode,
    toggleRepeatMode,
    skipInterval,
    updateSkipInterval,
    playbackRate,
    cyclePlaybackRate,
    dismissPlayer,
  } = useAudio();

  const expanded = isPlayerExpanded;
  const setExpanded = setIsPlayerExpanded;
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [miniPlayerState, setMiniPlayerState] = useState<'full' | 'collapsed' | 'hidden'>('full');
  const [showSkipMenu, setShowSkipMenu] = useState(false);
  const [showOfflineMenu, setShowOfflineMenu] = useState(false);

  const panXShared = useSharedValue(0);
  const expandAnimShared = useSharedValue(0);
  const dismissTimeoutRef = useRef<any>(null);
  const [renderFullPlayer, setRenderFullPlayer] = useState(expanded);

  // Sync expanded state with local rendering state and trigger transition animation
  useEffect(() => {
    if (expanded) {
      setRenderFullPlayer(true);
      expandAnimShared.value = withTiming(1, {
        duration: 280,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      expandAnimShared.value = withTiming(0, {
        duration: 280,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }, (finished) => {
        if (finished) {
          runOnJS(setRenderFullPlayer)(false);
        }
      });
    }
  }, [expanded]);

  // Handle hardware back button on Android to collapse the expanded player
  useEffect(() => {
    if (!expanded) return;

    const onBackPress = () => {
      setExpanded(false);
      return true; // intercept back press
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandler.remove();
  }, [expanded]);

  // Sync showQueueModal to a ref so PanResponder can access it
  const showQueueModalRef = useRef(showQueueModal);
  useEffect(() => {
    showQueueModalRef.current = showQueueModal;
  }, [showQueueModal]);
  
  const queueTranslateY = useRef(new RNAnimated.Value(0)).current;
  const queueScrollY = useRef(0);

  const queuePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only capture vertical downward drags (dy > 10) when list is at top
        if (gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          return queueScrollY.current <= 0;
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        // Only capture vertical downward drags (dy > 10) when list is at top
        if (gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          return queueScrollY.current <= 0;
        }
        return false;
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Only allow dragging downward (clamp at 0)
        if (gestureState.dy > 0) {
          queueTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          // Swipe threshold met — close queue
          RNAnimated.timing(queueTranslateY, {
            toValue: height, 
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setShowQueueModal(false);
            setTimeout(() => {
              queueTranslateY.setValue(0);
            }, 300);
          });
        } else {
          // Snap back
          RNAnimated.spring(queueTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const fullPlayerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Ignore if queue modal is open to prevent full player from closing
        if (showQueueModalRef.current) return false;

        // Capture vertical downward drags (dy > 4) and ignore horizontal swipes
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        // Ignore if queue modal is open to prevent full player from closing
        if (showQueueModalRef.current) return false;

        // Capture vertical downward drags (dy > 4) and ignore horizontal swipes
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Real-time direct manipulation: morph smoothly as finger moves
        if (gestureState.dy > 0) {
          const MAX_DRAG = 280;
          const progress = Math.max(0, Math.min(1, 1 - gestureState.dy / MAX_DRAG));
          expandAnimShared.value = progress;
        } else {
          expandAnimShared.value = 1;
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const isFlickDown = gestureState.vy > 0.25 || (gestureState.dy > 50 && gestureState.vy >= 0);
        const isFlickUp = gestureState.vy < -0.25;

        if (isFlickDown && !isFlickUp) {
          // Smoothly finish morphing into mini player with natural duration and bezier curve
          expandAnimShared.value = withTiming(0, {
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }, (finished) => {
            if (finished) {
              runOnJS(setRenderFullPlayer)(false);
            }
          });
          setExpanded(false);
        } else {
          // Spring snap back up to 100% full screen
          expandAnimShared.value = withSpring(1, {
            damping: 18,
            stiffness: 200,
            mass: 0.8,
          });
        }
      },
    })
  ).current;

  // Enforce correct visibility state when track/playback changes
  useEffect(() => {
    try {
      if (currentTrack || isPlaying) {
        if (miniPlayerState === 'hidden') {
          setMiniPlayerState('full');
        }
      } else if (!currentTrack && trackList.length === 0) {
        setMiniPlayerState('hidden');
      }
    } catch (err) {
      console.error('Error synchronizing player visibility state:', err);
      setMiniPlayerState('collapsed');
    }
  }, [currentTrack?.messageId, isPlaying, trackList.length, miniPlayerState]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Vertical upward drag/flick to expand
        const isVerticalUp = gestureState.dy < -6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        // Horizontal swipe to collapse
        const isHorizontal = Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        return isVerticalUp || isHorizontal;
      },
      onPanResponderGrant: () => {
        setRenderFullPlayer(true);
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy < 0) {
          // Direct manipulation upward drag from mini to full
          const MAX_DRAG = 280;
          const progress = Math.min(1, Math.abs(gestureState.dy) / MAX_DRAG);
          expandAnimShared.value = progress;
        } else if (Math.abs(gestureState.dx) > 0) {
          panXShared.value = gestureState.dx;
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        // Check if user was dragging or flicking vertically upward
        if (gestureState.dy < -10 || gestureState.vy < -0.25) {
          const isFlickUp = gestureState.vy < -0.25 || gestureState.dy < -40;
          if (isFlickUp) {
            // Expand to full screen smoothly
            expandAnimShared.value = withTiming(1, {
              duration: 280,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            });
            setExpanded(true);
          } else {
            // Snap back down to mini player
            expandAnimShared.value = withSpring(0, {
              damping: 18,
              stiffness: 200,
              mass: 0.8,
            }, (finished) => {
              if (finished) {
                runOnJS(setRenderFullPlayer)(false);
              }
            });
          }
          return;
        }

        if (gestureState.dx > 120) {
          // Swiped right: collapse player
          panXShared.value = withTiming(width, { duration: 200 }, (finished) => {
            if (finished) {
              runOnJS(setMiniPlayerState)('collapsed');
              panXShared.value = 0;
            }
          });
        } else if (gestureState.dx < -120) {
          // Swiped left: collapse player
          panXShared.value = withTiming(-width, { duration: 200 }, (finished) => {
            if (finished) {
              runOnJS(setMiniPlayerState)('collapsed');
              panXShared.value = 0;
            }
          });
        } else {
          // Reset position
          panXShared.value = withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          });
        }
      },
    })
  ).current;

  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const seekbarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDraggingSeek(true);
        const touchX = evt.nativeEvent.pageX;
        const barWidth = width - 80;
        const trackLeft = 40;
        const relativeX = touchX - trackLeft;
        const ratio = Math.max(0, Math.min(1, relativeX / barWidth));
        setDragProgress(ratio);
      },
      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.pageX;
        const barWidth = width - 80;
        const trackLeft = 40;
        const relativeX = touchX - trackLeft;
        const ratio = Math.max(0, Math.min(1, relativeX / barWidth));
        setDragProgress(ratio);
      },
      onPanResponderRelease: (evt) => {
        const touchX = evt.nativeEvent.pageX;
        const barWidth = width - 80;
        const trackLeft = 40;
        const relativeX = touchX - trackLeft;
        const ratio = Math.max(0, Math.min(1, relativeX / barWidth));
        
        const targetMs = ratio * durationRef.current;
        seek(targetMs);
        setIsDraggingSeek(false);
      },
      onPanResponderTerminate: () => {
        setIsDraggingSeek(false);
      }
    })
  ).current;

  // Determine active theme colors based on theme settings
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const actionSheetOptionStyle = {
    backgroundColor: activeScheme === 'dark' ? '#1e293b' : '#f8fafc',
    borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    borderWidth: 1,
  };

  // Safe Play/Pause Handler
  const handlePlayPause = async (e?: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    try {
      await togglePlayPause();
      if (miniPlayerState === 'hidden') {
        setMiniPlayerState('collapsed');
      }
    } catch (err) {
      console.error('Error in play/pause handler:', err);
      setMiniPlayerState('collapsed');
    }
  };

  // Safe Dismiss Handler
  const handleDismiss = async () => {
    try {
      await dismissPlayer();
    } catch (err) {
      console.error('Error dismissing player:', err);
    } finally {
      if (currentTrack || isPlaying) {
        setMiniPlayerState('collapsed');
      } else {
        setMiniPlayerState('hidden');
      }
    }
  };

  // Reanimated style for the outer morphing container
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const expandVal = expandAnimShared.value;
    const h = interpolate(expandVal, [0, 1], [74, height]);
    const w = interpolate(expandVal, [0, 1], [width - 32, width]);
    const l = interpolate(expandVal, [0, 1], [16, 0]);
    const b = interpolate(expandVal, [0, 1], [76 + insets.bottom, 0]);
    const br = interpolate(expandVal, [0, 1], [18, 0]);
    const bw = interpolate(expandVal, [0, 1], [activeScheme === 'dark' ? 1 : 0.5, 0]);

    return {
      width: w,
      height: h,
      left: l,
      bottom: b,
      borderRadius: br,
      borderWidth: bw,
      transform: [
        { translateX: panXShared.value },
      ],
    };
  });

  // Reanimated style for the full player background (fades in)
  const fullBackgroundAnimatedStyle = useAnimatedStyle(() => {
    const br = interpolate(expandAnimShared.value, [0, 1], [18, 0]);
    const opacityVal = interpolate(expandAnimShared.value, [0.05, 0.95], [0, 1], 'clamp');
    return {
      opacity: opacityVal,
      borderRadius: br,
    };
  });

  // Reanimated style for the mini player background / content wrapper (fades out)
  const miniPlayerContainerAnimatedStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(expandAnimShared.value, [0, 0.4], [1, 0], 'clamp');
    const br = interpolate(expandAnimShared.value, [0, 1], [18, 0]);
    return {
      opacity: opacityVal,
      borderRadius: br,
    };
  });

  // Reanimated style for the mini player content row
  const miniPlayerContentAnimatedStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(expandAnimShared.value, [0, 0.35], [1, 0], 'clamp');
    return {
      opacity: opacityVal,
    };
  });

  // Reanimated style for the full player content container (fades in)
  const fullPlayerContentAnimatedStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(expandAnimShared.value, [0.25, 0.85], [0, 1], 'clamp');
    const translateY = interpolate(expandAnimShared.value, [0.25, 1], [30, 0], 'clamp');
    return {
      opacity: opacityVal,
      transform: [{ translateY }],
    };
  });

  // Reanimated style for the shared artwork container
  const sharedArtworkAnimatedStyle = useAnimatedStyle(() => {
    const expandVal = expandAnimShared.value;
    const size = interpolate(expandVal, [0, 1], [40, width * 0.68]);
    const left = interpolate(expandVal, [0, 1], [12, (width - width * 0.68) / 2]);
    const top = interpolate(expandVal, [0, 1], [17, insets.top + 79]);
    const br = interpolate(expandVal, [0, 1], [8, (width * 0.68) / 2]);
    const bw = interpolate(expandVal, [0, 1], [0, 3]);
    const bc = interpolateColor(
      expandVal,
      [0, 1],
      ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']
    );
    const shadowOpacity = interpolate(expandVal, [0, 1], [0, 0.3]);
    const elevationVal = interpolate(expandVal, [0, 1], [0, 8]);

    return {
      width: size,
      height: size,
      left: left,
      top: top,
      borderRadius: br,
      borderWidth: bw,
      borderColor: bc,
      shadowOpacity: shadowOpacity,
      elevation: elevationVal,
    };
  });

  // Reanimated style for the artwork image
  const artworkImageAnimatedStyle = useAnimatedStyle(() => {
    const br = interpolate(expandAnimShared.value, [0, 1], [8, (width * 0.68) / 2]);
    return {
      borderRadius: br,
    };
  });

  // Reanimated style for the mini-artwork-placeholder opacity
  const placeholderMiniAnimatedStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(expandAnimShared.value, [0, 0.2], [1, 0], 'clamp');
    return {
      opacity: opacityVal,
    };
  });

  // Reanimated style for the full-artwork-placeholder opacity
  const placeholderFullAnimatedStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(expandAnimShared.value, [0.8, 1], [0, 1], 'clamp');
    return {
      opacity: opacityVal,
    };
  });

  try {
    const isAudioActive = currentTrack !== null || isPlaying;
    let resolvedState: 'full' | 'collapsed' | 'hidden' = miniPlayerState;

    if (isAudioActive && resolvedState === 'hidden') {
      resolvedState = 'collapsed';
    }
    if (!isAudioActive && trackList.length === 0) {
      resolvedState = 'hidden';
    }

    if (resolvedState === 'hidden' && !isAudioActive) {
      return null;
    }

    if (!currentTrack) {
      return null;
    }

    const progress = duration > 0 ? position / duration : 0;

    const currentProgress = isDraggingSeek ? dragProgress : progress;
    const currentPosition = isDraggingSeek ? dragProgress * duration : position;

    const handleSkipBack = () => {
      const target = Math.max(0, position - (skipInterval * 1000));
      seek(target);
    };

    const handleSkipForward = () => {
      const target = Math.min(duration, position + (skipInterval * 1000));
      seek(target);
    };

    const promptSkipInterval = () => {
      setShowSkipMenu(true);
    };

    const isFav = isFavorite(currentTrack);

    return (
      <>
        {/* FLOATING CIRCULAR COLLAPSED MINI PLAYER */}
        {!expanded && resolvedState === 'collapsed' && (
          <TouchableOpacity
            style={[
              styles.collapsedPlayer,
              {
                bottom: 76 + insets.bottom,
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(27, 84, 164, 0.08)',
                borderWidth: activeScheme === 'dark' ? 1.5 : 1,
              },
            ]}
            onPress={() => setMiniPlayerState('full')}
            activeOpacity={0.95}
          >
            {currentTrack.coverUrl ? (
              <Image source={{ uri: currentTrack.coverUrl }} style={styles.collapsedCover} />
            ) : (
              <View style={[styles.collapsedCoverPlaceholder, { backgroundColor: themeColors.primary }]}>
                <Music size={18} color="#ffffff" />
              </View>
            )}
            {/* Mini Play/Pause overlay badge */}
            <View style={[styles.collapsedBadge, { backgroundColor: themeColors.primary }]}>
              {isPlaying ? (
                <Play size={10} color="#ffffff" fill="#ffffff" style={{ marginLeft: 1 }} />
              ) : (
                <Pause size={10} color="#ffffff" fill="#ffffff" />
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* UNIFIED MORPHING PLAYER */}
        {resolvedState === 'full' && (
          <Animated.View
            style={[
              styles.morphingPlayerContainer,
              containerAnimatedStyle,
              {
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(27, 84, 164, 0.08)',
              },
            ]}
          >
            {/* FULL PLAYER BACKGROUND (fades in) */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }, fullBackgroundAnimatedStyle]}>
              {currentTrack.coverUrl ? (
                <>
                  <Image
                    source={{ uri: currentTrack.coverUrl }}
                    style={StyleSheet.absoluteFillObject}
                    blurRadius={45}
                  />
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15, 23, 42, 0.55)' }]} />
                </>
              ) : (
                <LinearGradient
                  colors={['#ffffff', '#002664']}
                  start={{ x: 0.1, y: 0.1 }}
                  end={{ x: 0.9, y: 0.9 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
            </Animated.View>

            {/* MINI PLAYER BACKGROUND (fades out) */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }, miniPlayerContainerAnimatedStyle]}>
              <BlurView
                intensity={Platform.OS === 'android' ? (activeScheme === 'dark' ? 65 : 85) : (activeScheme === 'dark' ? 70 : 90)}
                tint={activeScheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={
                  activeScheme === 'dark'
                    ? ['rgba(15, 23, 42, 0.45)', 'rgba(30, 41, 59, 0.3)']
                    : ['rgba(255, 255, 255, 0.5)', 'rgba(219, 234, 254, 0.25)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={
                  activeScheme === 'dark'
                    ? ['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.05)', 'transparent']
                    : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.25)', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={styles.miniGlossHighlight}
              />
            </Animated.View>

            {/* MINI PLAYER CONTENT */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                miniPlayerContentAnimatedStyle,
              ]}
              pointerEvents={expanded ? 'none' : 'auto'}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={() => setExpanded(true)}
                activeOpacity={0.9}
                {...panResponder.panHandlers}
              >
                <View style={styles.miniPlayerContent}>
                  {/* Placeholder for cover art */}
                  <View style={{ width: 40, height: 40, marginRight: 10 }} />

                  {/* Title / Info */}
                  <View style={styles.miniTextContainer}>
                    <Text style={[styles.miniNowPlaying, { color: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(27, 84, 164, 0.7)' }]} numberOfLines={1}>
                      NOW PLAYING
                    </Text>
                    <Text style={[styles.miniTitle, { color: themeColors.text }]} numberOfLines={1}>
                      {currentTrack.title}
                    </Text>
                    <Text style={[styles.miniSpeaker, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {currentTrack.originalTrackNumber ? `Track ${currentTrack.originalTrackNumber} • ` : ''}{currentTrack.speaker}
                    </Text>
                    
                    {/* Progress bar directly below speaker text */}
                    <View style={styles.miniProgressBarContainerInline}>
                      <View
                        style={[
                          styles.miniProgressBarFillInline,
                          { width: `${progress * 100}%`, backgroundColor: themeColors.primary },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Play/Pause Only + Duration */}
                  <View style={styles.miniRightColumn}>
                    <View style={styles.miniControlsRow}>
                      {isBuffering ? (
                        <ActivityIndicator size="small" color={themeColors.primary} style={styles.miniControlBtn} />
                      ) : (
                        <TouchableOpacity onPress={handlePlayPause} style={styles.miniPlayPauseBtn}>
                          {isPlaying ? (
                            <Pause size={18} color={themeColors.text} fill={themeColors.text} />
                          ) : (
                            <Play size={18} color={themeColors.text} fill={themeColors.text} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.miniDurationText, { color: themeColors.textSecondary }]}>
                      {formatTime(position)} / {formatTime(duration)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* FULL PLAYER CONTENT */}
            {renderFullPlayer && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  fullPlayerContentAnimatedStyle,
                ]}
                pointerEvents={expanded ? 'auto' : 'none'}
              >
                <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom || 16 }]} {...fullPlayerPanResponder.panHandlers}>
                  {/* Swipe indicator pill */}
                  <View style={styles.swipeIndicatorContainer}>
                    <View style={styles.swipeIndicatorPill} />
                  </View>
                  {/* Header */}
                  <View style={styles.fullHeader}>
                    <TouchableOpacity onPress={() => setExpanded(false)} style={styles.closeBtn}>
                      <ChevronDown size={28} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.fullHeaderTitle}>Now Playing</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity 
                        onPress={() => {
                          if (isDownloaded(currentTrack)) {
                            setShowOfflineMenu(!showOfflineMenu);
                          } else {
                            downloadTrack(currentTrack);
                          }
                        }} 
                        disabled={downloadProgress[currentTrack.messageId] !== undefined}
                        style={[styles.favoriteBtn, { marginRight: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                      >
                        {downloadProgress[currentTrack.messageId] !== undefined ? (
                          <>
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                              {Math.round(downloadProgress[currentTrack.messageId] * 100)}%
                            </Text>
                          </>
                        ) : isDownloaded(currentTrack) ? (
                          <Check size={22} color="#22c55e" />
                        ) : (
                          <Download size={22} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleFavorite(currentTrack)} style={styles.favoriteBtn}>
                        <Heart size={22} color={isFav ? '#e11d48' : '#ffffff'} fill={isFav ? '#e11d48' : 'transparent'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Artwork Placeholder View to preserve height spacing in vertical layout */}
                  <View style={styles.artworkContainer}>
                    <View style={{ width: width * 0.68, height: width * 0.68 }} />
                  </View>

                  {/* Track metadata */}
                  <View style={styles.metadataContainer}>
                    <Text style={styles.trackName} numberOfLines={2}>
                      {currentTrack.title}
                    </Text>
                    <Text style={styles.trackSpeaker}>
                      {currentTrack.originalTrackNumber ? `Track ${currentTrack.originalTrackNumber} • ` : ''}{currentTrack.speaker}
                    </Text>
                    {currentTrack.seriesName === 'Daily Devotional' && currentTrack.publishedDate && (
                      <View style={styles.devotionalDateBadge}>
                        <Text style={styles.devotionalDateText}>
                          {currentTrack.publishedDate}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Audio Waveform visualization */}
                  <PlaybackWaveform isPlaying={isPlaying && expanded} />

                  {/* Seekbar and Timestamps */}
                  <View style={styles.seekbarContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <TouchableOpacity onPress={cyclePlaybackRate} style={styles.speedBadge}>
                        <Text style={styles.speedText}>{playbackRate.toFixed(2)}x</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ height: 30, justifyContent: 'center' }} {...seekbarPanResponder.panHandlers}>
                      <View style={styles.seekbarTrack}>
                        <View style={[styles.seekbarFill, { width: `${currentProgress * 100}%` }]} />
                        <View style={[styles.seekbarThumb, { left: `${currentProgress * 98}%` }]} />
                      </View>
                    </View>
                    <View style={styles.timestampsRow}>
                      <Text style={styles.timestampText}>{formatTime(currentPosition)}</Text>
                      {isBuffering && (
                        <View style={styles.bufferingBox}>
                          <ActivityIndicator size="small" color="#ffffff" style={{ transform: [{ scale: 0.8 }] }} />
                          <Text style={styles.bufferingText}>Buffering...</Text>
                        </View>
                      )}
                      <Text style={styles.timestampText}>{formatTime(duration)}</Text>
                    </View>
                  </View>

                  {/* Unified Actions Row */}
                  <View style={styles.playerActionsRow}>
                    <TouchableOpacity onPress={() => addToPlaylist(currentTrack)} style={styles.actionIconButton}>
                      <View style={styles.actionIconCircle}>
                        <ListPlus size={22} color="#ffffff" />
                      </View>
                      <Text style={styles.actionIconLabel}>Playlist</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleRepeatMode} style={styles.actionIconButton}>
                      <View style={[
                        styles.actionIconCircle, 
                        repeatMode !== 'off' && { backgroundColor: 'rgba(32, 138, 239, 0.25)', borderColor: '#208AEF' }
                      ]}>
                        <Repeat size={22} color={repeatMode !== 'off' ? '#208AEF' : '#ffffff'} />
                        {repeatMode === 'one' && (
                          <View style={styles.repeatOneBadge}>
                            <Text style={styles.repeatOneText}>1</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.actionIconLabel, repeatMode !== 'off' && { color: '#208AEF', fontWeight: '600' }]}>
                        {repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
                        setExpanded(false);
                        router.push({
                          pathname: '/teachings',
                          params: {
                            autoSelectSeriesId: currentTrack.seriesId ? String(currentTrack.seriesId) : undefined,
                            autoSelectMessageId: String(currentTrack.messageId),
                          }
                        });
                      }} 
                      style={styles.actionIconButton}
                    >
                      <View style={styles.actionIconCircle}>
                        <Library size={22} color="#ffffff" />
                      </View>
                      <Text style={styles.actionIconLabel}>Series</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowQueueModal(true)} style={styles.actionIconButton}>
                      <View style={styles.actionIconCircle}>
                        <ListMusic size={22} color="#ffffff" />
                      </View>
                      <Text style={styles.actionIconLabel}>Queue</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Playback Controls */}
                  <View style={styles.controlsRow}>
                    <TouchableOpacity onPress={playPrevious} style={styles.controlBtn}>
                      <SkipBack size={26} color="#ffffff" fill="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSkipBack} onLongPress={promptSkipInterval} delayLongPress={500} style={styles.controlBtn}>
                      <Text style={styles.skipLabel}>{skipInterval}s</Text>
                      <SkipBack size={18} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePlayPause} style={styles.playBtnContainer}>
                      {isBuffering ? (
                        <ActivityIndicator size="small" color="#002664" />
                      ) : isPlaying ? (
                        <Pause size={28} color="#002664" fill="#002664" />
                      ) : (
                        <Play size={28} color="#002664" fill="#002664" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSkipForward} onLongPress={promptSkipInterval} delayLongPress={500} style={styles.controlBtn}>
                      <Text style={styles.skipLabel}>{skipInterval}s</Text>
                      <SkipForward size={18} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playNext} style={styles.controlBtn}>
                      <SkipForward size={26} color="#ffffff" fill="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* SHARED ARTWORK ELEMENT */}
            <Animated.View
              style={[
                styles.sharedArtworkContainer,
                sharedArtworkAnimatedStyle,
              ]}
              pointerEvents="none"
            >
              {currentTrack.coverUrl ? (
                <Animated.Image 
                  source={{ uri: currentTrack.coverUrl }} 
                  style={[
                    styles.sharedArtworkImage,
                    artworkImageAnimatedStyle,
                  ]} 
                />
              ) : (
                <Animated.View 
                  style={[
                    styles.sharedArtworkPlaceholder, 
                    artworkImageAnimatedStyle,
                    { 
                      backgroundColor: themeColors.primary,
                      width: '100%',
                      height: '100%',
                    }
                  ]}
                >
                  <Animated.View style={[{ position: 'absolute' }, placeholderMiniAnimatedStyle]}>
                    <Music size={14} color="#ffffff" />
                  </Animated.View>
                  <Animated.View style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, placeholderFullAnimatedStyle]}>
                    <Music size={90} color="#ffffff" />
                    <Animated.Text style={[styles.artworkText, { marginTop: 12 }, placeholderFullAnimatedStyle]}>Christ Pavilion</Animated.Text>
                  </Animated.View>
                </Animated.View>
              )}
            </Animated.View>

            {/* QUEUE OVERLAY (inline, not a separate Modal) */}
            {showQueueModal && (
              <View style={[StyleSheet.absoluteFillObject, { zIndex: 50, justifyContent: 'flex-end' }]}>  
                <TouchableOpacity 
                  style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                  activeOpacity={1} 
                  onPress={() => setShowQueueModal(false)} 
                />
                <RNAnimated.View 
                  style={[styles.queueModalContent, { backgroundColor: activeScheme === 'dark' ? '#0f172a' : '#f8fafc', transform: [{ translateY: queueTranslateY }] }]}
                  {...queuePanResponder.panHandlers}
                >
                  {/* Header */}
                  <View style={styles.queueHeader}>
                    <Text style={[styles.queueTitle, { color: themeColors.text }]}>Playback Queue</Text>
                    <TouchableOpacity onPress={() => setShowQueueModal(false)} style={styles.queueCloseBtn}>
                      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  {/* List */}
                  <FlatList
                    onScroll={(e) => { queueScrollY.current = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                    data={trackList}
                    keyExtractor={(item, idx) => `${item.messageId}-${idx}`}
                    renderItem={({ item, index }) => {
                      const isCurrent = currentTrack && String(item.messageId) === String(currentTrack.messageId);
                      return (
                        <View style={[
                          styles.queueItem,
                          isCurrent && { backgroundColor: activeScheme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(219, 234, 254, 0.6)' }
                        ]}>
                          <TouchableOpacity 
                            style={styles.queueItemTrackInfo}
                            onPress={() => playTrack(item, trackList)}
                          >
                            <Text style={[
                              styles.queueItemNumber, 
                              { color: isCurrent ? themeColors.primary : themeColors.textSecondary },
                              isCurrent && { fontWeight: 'bold' }
                            ]}>
                              {index + 1}
                            </Text>
                            {item.coverUrl ? (
                              <Image source={{ uri: item.coverUrl }} style={styles.queueItemArtwork} />
                            ) : (
                              <View style={[styles.queueItemArtworkPlaceholder, { backgroundColor: themeColors.primary }]}>
                                <Music size={12} color="#ffffff" />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text 
                                style={[
                                  styles.queueItemTitle, 
                                  { color: isCurrent ? themeColors.primary : themeColors.text },
                                  isCurrent && { fontWeight: 'bold' }
                                ]} 
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <Text style={[styles.queueItemSpeaker, { color: themeColors.textSecondary }]} numberOfLines={1}>
                                {item.originalTrackNumber ? `Track ${item.originalTrackNumber} • ` : ''}{item.speaker}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* Reorder / Remove Controls */}
                          <View style={styles.queueItemControls}>
                            <TouchableOpacity 
                              onPress={() => reorderQueue(index, 'up')} 
                              disabled={index === 0}
                              style={[styles.reorderBtn, index === 0 && { opacity: 0.3 }]}
                            >
                              <ArrowUp size={16} color={themeColors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => reorderQueue(index, 'down')} 
                              disabled={index === trackList.length - 1}
                              style={[styles.reorderBtn, index === trackList.length - 1 && { opacity: 0.3 }]}
                            >
                              <ArrowDown size={16} color={themeColors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => removeFromQueue(item.messageId)}
                              disabled={isCurrent}
                              style={[styles.removeBtn, isCurrent && { opacity: 0.3 }]}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }}
                    contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
                    ListEmptyComponent={
                      <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: themeColors.textSecondary }}>No tracks in queue</Text>
                      </View>
                    }
                  />
                </RNAnimated.View>
              </View>
            )}

            {/* Top-Anchored Floating Popover Menu (WhatsApp-Style) - Rendered on top of shared artwork */}
            {showOfflineMenu && isDownloaded(currentTrack) && expanded && (
              <View style={[StyleSheet.absoluteFillObject, { zIndex: 99999, elevation: 99 }]}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowOfflineMenu(false)} />
                <View style={[
                  styles.popoverMenuContainer,
                  {
                    backgroundColor: activeScheme === 'dark' ? '#1e293b' : '#ffffff',
                    borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(27, 84, 164, 0.12)',
                    top: (insets.top || 0) + 54,
                    right: 16,
                  }
                ]}>
                  <Text style={[styles.popoverMenuTitle, { color: activeScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                    Offline Options
                  </Text>

                  {/* Save to Device Files */}
                  <TouchableOpacity
                    style={styles.popoverMenuItem}
                    onPress={() => {
                      saveTrackToDevice(currentTrack);
                      setShowOfflineMenu(false);
                    }}
                  >
                    <Library size={16} color={themeColors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.popoverMenuText, { color: themeColors.text }]}>Save to Device Files</Text>
                  </TouchableOpacity>

                  {/* Share Teaching */}
                  <TouchableOpacity
                    style={styles.popoverMenuItem}
                    onPress={() => {
                      shareTrack(currentTrack);
                      setShowOfflineMenu(false);
                    }}
                  >
                    <Share2 size={16} color={themeColors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.popoverMenuText, { color: themeColors.text }]}>Share Teaching</Text>
                  </TouchableOpacity>

                  {/* Delete Download */}
                  <TouchableOpacity
                    style={[
                      styles.popoverMenuItem,
                      {
                        borderTopWidth: 1,
                        borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        marginTop: 4,
                        paddingTop: 8,
                      }
                    ]}
                    onPress={() => {
                      deleteDownloadedTrack(currentTrack.messageId);
                      setShowOfflineMenu(false);
                    }}
                  >
                    <Trash2 size={16} color="#ef4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.popoverMenuText, { color: '#ef4444' }]}>Delete Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bottom-Anchored Floating Popover Menu for Skip Interval */}
            {showSkipMenu && expanded && (
              <View style={[StyleSheet.absoluteFillObject, { zIndex: 99999, elevation: 99 }]}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSkipMenu(false)} />
                <View style={[
                  styles.skipMenuContainer,
                  {
                    backgroundColor: activeScheme === 'dark' ? '#1e293b' : '#ffffff',
                    borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(27, 84, 164, 0.12)',
                    bottom: (insets.bottom || 16) + 120,
                  }
                ]}>
                  <Text style={[styles.skipMenuTitle, { color: activeScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                    Skip Interval
                  </Text>

                  {[5, 10, 15, 30].map((sec) => {
                    const isSelected = skipInterval === sec;
                    return (
                      <TouchableOpacity
                        key={sec}
                        style={[
                          styles.skipMenuItem,
                          isSelected && {
                            backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(27, 84, 164, 0.08)',
                          }
                        ]}
                        onPress={() => {
                          updateSkipInterval(sec);
                          setShowSkipMenu(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.skipMenuText,
                            {
                              color: isSelected ? themeColors.primary : themeColors.text,
                              fontWeight: isSelected ? 'bold' : '500',
                              flex: 1,
                            }
                          ]}
                        >
                          {sec} seconds
                        </Text>
                        {isSelected && (
                          <Check size={16} color={themeColors.primary} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </Animated.View>
        )}


        {/* TRACK OPTIONS BOTTOM ACTION SHEET */}
        <SwipeableModal
          visible={activeActionTrack !== null}
          onClose={closeActionSheet}
          title={activeActionTrack?.title}
          subtitle={activeActionTrack?.speaker || 'Christ Pavilion'}
        >
          {activeActionTrack && (
            <View style={styles.actionSheetOptions}>
              {/* Play Next */}
              <TouchableOpacity
                style={[styles.actionSheetOption, actionSheetOptionStyle]}
                onPress={() => {
                  playNextTrack(activeActionTrack);
                  closeActionSheet();
                }}
              >
                <Play size={18} color={themeColors.primary} style={styles.actionSheetOptionIcon} />
                <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>Play Next</Text>
              </TouchableOpacity>

              {/* Add to Queue */}
              <TouchableOpacity
                style={[styles.actionSheetOption, actionSheetOptionStyle]}
                onPress={() => {
                  addToQueue(activeActionTrack);
                  closeActionSheet();
                }}
              >
                <Plus size={18} color={themeColors.primary} style={styles.actionSheetOptionIcon} />
                <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>Add to Queue</Text>
              </TouchableOpacity>

              {/* Favorite */}
              <TouchableOpacity
                style={[styles.actionSheetOption, actionSheetOptionStyle]}
                onPress={() => {
                  toggleFavorite(activeActionTrack);
                  closeActionSheet();
                }}
              >
                <Heart 
                  size={18} 
                  color={isFavorite(activeActionTrack) ? '#ef4444' : themeColors.primary} 
                  fill={isFavorite(activeActionTrack) ? '#ef4444' : 'transparent'} 
                  style={styles.actionSheetOptionIcon} 
                />
                <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>
                  {isFavorite(activeActionTrack) ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
              </TouchableOpacity>

              {/* Download / Delete */}
              <TouchableOpacity
                style={[styles.actionSheetOption, actionSheetOptionStyle]}
                onPress={() => {
                  if (isDownloaded(activeActionTrack)) {
                    deleteDownloadedTrack(activeActionTrack.messageId);
                  } else {
                    downloadTrack(activeActionTrack);
                  }
                  closeActionSheet();
                }}
              >
                {isDownloaded(activeActionTrack) ? (
                  <Trash2 size={18} color="#ef4444" style={styles.actionSheetOptionIcon} />
                ) : (
                  <Download size={18} color={themeColors.primary} style={styles.actionSheetOptionIcon} />
                )}
                <Text style={[styles.actionSheetOptionText, { color: isDownloaded(activeActionTrack) ? '#ef4444' : themeColors.text }]}>
                  {isDownloaded(activeActionTrack) ? 'Delete Download' : 'Download Offline'}
                </Text>
              </TouchableOpacity>

              {/* Save to Device Store */}
              <TouchableOpacity
                style={[styles.actionSheetOption, actionSheetOptionStyle]}
                onPress={() => {
                  saveTrackToDevice(activeActionTrack);
                  closeActionSheet();
                }}
              >
                <Library size={18} color={themeColors.primary} style={styles.actionSheetOptionIcon} />
                <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>Save to Device Files</Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                style={[styles.actionSheetOption, actionSheetOptionStyle]}
                onPress={() => {
                  shareTrack(activeActionTrack);
                  closeActionSheet();
                }}
              >
                <Share2 size={18} color={themeColors.primary} style={styles.actionSheetOptionIcon} />
                <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>Share Teaching</Text>
              </TouchableOpacity>
            </View>
          )}
        </SwipeableModal>
      </>
    );
  } catch (error) {
    console.error('AudioPlayer render error:', error);
    // Fallback: render the collapsed player UI with safe defaults
    return (
      <TouchableOpacity
        style={[
          styles.collapsedPlayer,
          {
            bottom: 76 + insets.bottom,
            borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(27, 84, 164, 0.08)',
            borderWidth: activeScheme === 'dark' ? 1.5 : 1,
            zIndex: 999,
          },
        ]}
        onPress={() => {
          try {
            setMiniPlayerState('full');
          } catch (e) {}
        }}
        activeOpacity={0.95}
      >
        <View style={[styles.collapsedCoverPlaceholder, { backgroundColor: themeColors.primary || '#1b54a4' }]}>
          <Music size={18} color="#ffffff" />
        </View>
        <View style={[styles.collapsedBadge, { backgroundColor: themeColors.primary || '#1b54a4' }]}>
          <Play size={10} color="#ffffff" fill="#ffffff" style={{ marginLeft: 1 }} />
        </View>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  morphingPlayerContainer: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 999,
    overflow: 'hidden',
  },
  sharedArtworkContainer: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
  },
  sharedArtworkImage: {
    width: '100%',
    height: '100%',
  },
  sharedArtworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 76, // dynamically set via inline style
    left: 16,
    right: 16,
    height: 74,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 999,
    overflow: 'hidden',
  },
  miniGlossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  miniPlayPauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProgressBarContainer: {
    height: 2,
    width: '100%',
    backgroundColor: 'transparent',
  },
  miniProgressBarFill: {
    height: '100%',
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniArtwork: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  miniArtworkPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  miniTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  miniSpeaker: {
    fontSize: 11,
    marginTop: 1,
  },
  miniActionBtn: {
    padding: 8,
  },
  miniNowPlaying: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  miniProgressBarContainerInline: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressBarFillInline: {
    height: '100%',
    borderRadius: 1,
  },
  miniRightColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  miniControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniControlBtn: {
    padding: 4,
  },
  miniDurationText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 3,
  },
  fullContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // dark blue/gray fallback
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  swipeIndicatorContainer: {
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    width: '100%',
    zIndex: 10,
  },
  swipeIndicatorPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 8,
  },
  fullHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  favoriteBtn: {
    padding: 8,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  artworkCircle: {
    width: width * 0.68,
    height: width * 0.68,
    borderRadius: (width * 0.68) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  artworkCirclePlaceholder: {
    width: width * 0.68,
    height: width * 0.68,
    borderRadius: (width * 0.68) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  artworkText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  metadataContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  trackName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    marginBottom: 6,
  },
  trackSpeaker: {
    fontSize: 15,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  devotionalDateBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  devotionalDateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 4,
    marginVertical: 12,
  },
  waveformBar: {
    width: 3.5,
    height: 32,
    borderRadius: 2,
  },
  seekbarContainer: {
    paddingHorizontal: 40,
  },
  seekbarControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seekbarControlBtn: {
    padding: 6,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#208AEF',
  },
  speedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  seekbarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    position: 'relative',
    justifyContent: 'center',
  },
  seekbarFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  seekbarThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  timestampsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timestampText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  bufferingBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingText: {
    marginLeft: 6,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 24 : 36,
  },
  controlBtn: {
    padding: 8,
    alignItems: 'center',
  },
  skipLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  playBtnContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  skipMenuContainer: {
    position: 'absolute',
    alignSelf: 'center',
    width: 220,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 10000,
  },
  skipMenuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  skipMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  skipMenuText: {
    fontSize: 13,
    fontWeight: '500',
  },
  popoverMenuContainer: {
    position: 'absolute',
    right: 16,
    width: 210,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  popoverMenuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  popoverMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  popoverMenuText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionSheetHeaderIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(156, 163, 175, 0.5)',
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
  },
  actionSheetSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
  },
  actionSheetOptions: {
    gap: 4,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionSheetOptionIcon: {
    marginRight: 14,
  },
  actionSheetOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionSheetCancelOption: {
    marginTop: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  queueOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  queueOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  queueModalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.15)',
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  queueCloseBtn: {
    padding: 4,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.08)',
  },
  queueItemNumber: {
    fontSize: 13,
    fontWeight: '500',
    width: 20,
    textAlign: 'center',
  },
  queueItemTrackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  queueItemArtwork: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  queueItemArtworkPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  queueItemSpeaker: {
    fontSize: 12,
    marginTop: 2,
  },
  queueItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderBtn: {
    padding: 6,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  playerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 20,
  },
  actionIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  actionIconLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  repeatOneBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#208AEF',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  repeatOneText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  collapsedPlayer: {
    position: 'absolute',
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 99,
  },
  collapsedCover: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  collapsedCoverPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});
