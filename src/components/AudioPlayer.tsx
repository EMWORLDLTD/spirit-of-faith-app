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
  Animated,
  Platform,
  FlatList,
  PanResponder,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
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
const PlaybackWaveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const barsCount = 21;
  // Initialize scale values for each bar
  const anims = useRef(
    Array(barsCount)
      .fill(0)
      .map(() => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    let animations: Animated.CompositeAnimation[] = [];

    if (isPlaying) {
      animations = anims.map((anim, idx) => {
        // Create random speeds and heights for organic waving motion
        const duration = 300 + Math.random() * 400;
        const targetValue = 0.4 + Math.random() * 1.6;

        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: targetValue,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    } else {
      // Settle down to uniform flat line when paused
      anims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.25,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      if (isPlaying) {
        anims.forEach((anim) => anim.stopAnimation());
      }
    };
  }, [isPlaying]);

  return (
    <View style={styles.waveformContainer}>
      {anims.map((anim, idx) => (
        <Animated.View
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
};

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

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

  const pan = useRef(new Animated.ValueXY()).current;
  const fullPlayerTranslateY = useRef(new Animated.Value(0)).current;
  const dismissTimeoutRef = useRef<any>(null);

  // Sync showQueueModal to a ref so PanResponder can access it
  const showQueueModalRef = useRef(showQueueModal);
  useEffect(() => {
    showQueueModalRef.current = showQueueModal;
  }, [showQueueModal]);
  
  const queueTranslateY = useRef(new Animated.Value(0)).current;
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
          Animated.timing(queueTranslateY, {
            toValue: height, 
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setShowQueueModal(false);
            queueTranslateY.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(queueTranslateY, {
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

        // Only capture vertical downward drags (dy > 10) and ignore horizontal swipes
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        // Ignore if queue modal is open to prevent full player from closing
        if (showQueueModalRef.current) return false;

        // Only capture vertical downward drags (dy > 10) and ignore horizontal swipes
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Only allow dragging downward (clamp at 0)
        if (gestureState.dy > 0) {
          fullPlayerTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          // Swipe threshold met — animate out and close
          Animated.timing(fullPlayerTranslateY, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setExpanded(false);
            dismissTimeoutRef.current = setTimeout(() => {
              fullPlayerTranslateY.setValue(0);
              dismissTimeoutRef.current = null;
            }, 600);
          });
        } else {
          // Snap back
          Animated.spring(fullPlayerTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Reset full player translateY when it is expanded (opened)
  useEffect(() => {
    if (expanded) {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
      fullPlayerTranslateY.setValue(0);
    }
  }, [expanded]);

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
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Set pan responder only for horizontal drags greater than 10px
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 120) {
          // Swiped right: collapse player
          Animated.timing(pan.x, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setMiniPlayerState('collapsed');
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (gestureState.dx < -120) {
          // Swiped left: collapse player
          Animated.timing(pan.x, {
            toValue: -width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setMiniPlayerState('collapsed');
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          // Reset position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
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
        {/* FLOATING GLASSMORPHIC MINI PLAYER BAR */}
        {!expanded && resolvedState === 'full' && (
          <AnimatedBlurView
            intensity={Platform.OS === 'android' ? 0 : 75}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={[
              { 
                backgroundColor: Platform.OS === 'android'
                  ? (activeScheme === 'dark' ? 'rgba(3, 7, 24, 0.65)' : 'rgba(240, 246, 255, 0.65)')
                  : 'transparent' 
              },
              styles.miniPlayer,
              {
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(27, 84, 164, 0.08)',
                borderWidth: activeScheme === 'dark' ? 1 : 0.5,
                bottom: 76 + insets.bottom,
                elevation: Platform.OS === 'android' ? (activeScheme === 'dark' ? 2 : 1) : 0, // Lower elevation to prevent shadow bleed-through
                transform: [{ translateX: pan.x }],
              },
            ]}
            className="overflow-hidden"
            {...panResponder.panHandlers}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={() => setExpanded(true)}
              activeOpacity={0.9}
            >
              {/* Native blur backdrop for real glassmorphism */}
              <BlurView
                intensity={Platform.OS === 'android' ? (activeScheme === 'dark' ? 65 : 85) : (activeScheme === 'dark' ? 70 : 90)}
                tint={activeScheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Semi-transparent gradient overlay on top of blur */}
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

              {/* Glossy light reflection highlight at top edge */}
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

              <View style={styles.miniPlayerContent}>
                {/* Artwork / Cover */}
                {currentTrack.coverUrl ? (
                  <Image source={{ uri: currentTrack.coverUrl }} style={styles.miniArtwork} />
                ) : (
                  <View style={[styles.miniArtworkPlaceholder, { backgroundColor: themeColors.primary }]}>
                    <Music size={14} color="#ffffff" />
                  </View>
                )}

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
                    {/* Play/Pause */}
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
                  {/* Duration Text */}
                  <Text style={[styles.miniDurationText, { color: themeColors.textSecondary }]}>
                    {formatTime(position)} / {formatTime(duration)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </AnimatedBlurView>
        )}

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

        {/* FULL PLAYER MODAL */}
        <Modal
          visible={expanded}
          animationType="slide"
          transparent={true}
          presentationStyle="overFullScreen"
          onRequestClose={() => setExpanded(false)}
        >
          <Animated.View
            style={[
              styles.fullContainer,
              { transform: [{ translateY: fullPlayerTranslateY }] },
            ]}
            {...fullPlayerPanResponder.panHandlers}
          >
            {/* BACKGROUND BLUR OR BRAND GRADIENT */}
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

            <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom || 16 }]}>
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
                        setShowOfflineMenu(true);
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

              {/* Circular Cover Art */}
              <View style={styles.artworkContainer}>
                {currentTrack.coverUrl ? (
                  <Image source={{ uri: currentTrack.coverUrl }} style={styles.artworkCircle} />
                ) : (
                  <View style={[styles.artworkCirclePlaceholder, { backgroundColor: themeColors.primary }]}>
                    <Music size={90} color="#ffffff" />
                    <Text style={styles.artworkText}>Christ Pavilion</Text>
                  </View>
                )}
              </View>

              {/* Track metadata */}
              <View style={styles.metadataContainer}>
                <Text style={styles.trackName} numberOfLines={2}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.trackSpeaker}>
                  {currentTrack.originalTrackNumber ? `Track ${currentTrack.originalTrackNumber} • ` : ''}{currentTrack.speaker}
                </Text>
              </View>

              {/* Audio Waveform visualization */}
              <PlaybackWaveform isPlaying={isPlaying} />

              {/* Seekbar and Timestamps */}
              <View style={styles.seekbarContainer}>
                {/* Speed Control Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <TouchableOpacity onPress={cyclePlaybackRate} style={styles.speedBadge}>
                    <Text style={styles.speedText}>{playbackRate.toFixed(2)}x</Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{ height: 30, justifyContent: 'center' }}
                  {...seekbarPanResponder.panHandlers}
                >
                  <View style={styles.seekbarTrack}>
                    <View
                      style={[
                        styles.seekbarFill,
                        { width: `${currentProgress * 100}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.seekbarThumb,
                        { left: `${currentProgress * 98}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.timestampsRow}>
                  <Text style={styles.timestampText}>
                    {formatTime(currentPosition)}
                  </Text>
                  {isBuffering && (
                    <View style={styles.bufferingBox}>
                      <ActivityIndicator size="small" color="#ffffff" style={{ transform: [{ scale: 0.8 }] }} />
                      <Text style={styles.bufferingText}>
                        Buffering...
                      </Text>
                    </View>
                  )}
                  <Text style={styles.timestampText}>
                    {formatTime(duration)}
                  </Text>
                </View>
              </View>

              {/* Unified Premium Actions Row */}
              <View style={styles.playerActionsRow}>
                {/* Add to Playlist */}
                <TouchableOpacity 
                  onPress={() => addToPlaylist(currentTrack)} 
                  style={styles.actionIconButton}
                >
                  <View style={styles.actionIconCircle}>
                    <ListPlus size={22} color="#ffffff" />
                  </View>
                  <Text style={styles.actionIconLabel}>Playlist</Text>
                </TouchableOpacity>

                {/* Repeat Same Teaching */}
                <TouchableOpacity 
                  onPress={toggleRepeatMode} 
                  style={styles.actionIconButton}
                >
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

                {/* All Series Teachings Icon */}
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

                {/* Queue / Up Next */}
                <TouchableOpacity 
                  onPress={() => setShowQueueModal(true)} 
                  style={styles.actionIconButton}
                >
                  <View style={styles.actionIconCircle}>
                    <ListMusic size={22} color="#ffffff" />
                  </View>
                  <Text style={styles.actionIconLabel}>Queue</Text>
                </TouchableOpacity>
              </View>

              {/* Playback Controls */}
              <View style={styles.controlsRow}>
                {/* Prev */}
                <TouchableOpacity onPress={playPrevious} style={styles.controlBtn}>
                  <SkipBack size={26} color="#ffffff" fill="#ffffff" />
                </TouchableOpacity>

                {/* Skip Back Dynamic (Long Press to set) */}
                <TouchableOpacity 
                  onPress={handleSkipBack} 
                  onLongPress={promptSkipInterval}
                  delayLongPress={500}
                  style={styles.controlBtn}
                >
                  <Text style={styles.skipLabel}>{skipInterval}s</Text>
                  <SkipBack size={18} color="#ffffff" />
                </TouchableOpacity>

                {/* Play/Pause Button (White circle, brand blue icon) */}
                <TouchableOpacity
                  onPress={handlePlayPause}
                  style={styles.playBtnContainer}
                >
                  {isBuffering ? (
                    <ActivityIndicator size="small" color="#002664" />
                  ) : isPlaying ? (
                    <Pause size={28} color="#002664" fill="#002664" />
                  ) : (
                    <Play size={28} color="#002664" fill="#002664" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>

                {/* Skip Forward Dynamic (Long Press to set) */}
                <TouchableOpacity 
                  onPress={handleSkipForward} 
                  onLongPress={promptSkipInterval}
                  delayLongPress={500}
                  style={styles.controlBtn}
                >
                  <Text style={styles.skipLabel}>{skipInterval}s</Text>
                  <SkipForward size={18} color="#ffffff" />
                </TouchableOpacity>

                {/* Next */}
                <TouchableOpacity onPress={playNext} style={styles.controlBtn}>
                  <SkipForward size={26} color="#ffffff" fill="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {showSkipMenu && (
              <View style={StyleSheet.absoluteFillObject}>
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => setShowSkipMenu(false)}
                />
                <View style={[
                  styles.skipMenuContainer,
                  {
                    backgroundColor: activeScheme === 'dark' ? '#1e293b' : '#ffffff',
                    borderColor: activeScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(27,84,164,0.08)',
                  }
                ]}>
                  <Text style={[styles.skipMenuTitle, { color: activeScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                    Set Skip Interval
                  </Text>
                  {[5, 10, 15].map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[
                        styles.skipMenuItem,
                        skipInterval === sec && {
                          backgroundColor: activeScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(27,84,164,0.05)'
                        }
                      ]}
                      onPress={() => {
                        updateSkipInterval(sec);
                        setShowSkipMenu(false);
                      }}
                    >
                      <Text style={[
                        styles.skipMenuText,
                        { color: activeScheme === 'dark' ? '#f1f5f9' : '#334155' },
                        skipInterval === sec && { fontWeight: 'bold', color: themeColors.primary }
                      ]}>
                        {sec} Seconds
                      </Text>
                      {skipInterval === sec && (
                        <Check size={16} color={themeColors.primary} style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {showOfflineMenu && currentTrack && (
              <View style={StyleSheet.absoluteFillObject}>
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => setShowOfflineMenu(false)}
                />
                <View style={[
                  styles.offlineMenuContainer,
                  {
                    top: insets.top + (Platform.OS === 'ios' ? 48 : 84),
                    backgroundColor: activeScheme === 'dark' ? '#1e293b' : '#ffffff',
                    borderColor: activeScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(27,84,164,0.08)',
                  }
                ]}>
                  <Text style={[styles.offlineMenuTitle, { color: activeScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                    Offline Options
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.offlineMenuItem}
                    onPress={() => {
                      setShowOfflineMenu(false);
                      saveTrackToDevice(currentTrack);
                    }}
                  >
                    <Library size={16} color={themeColors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.offlineMenuText, { color: activeScheme === 'dark' ? '#f1f5f9' : '#334155' }]}>
                      Save to Device Store
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.offlineMenuItem}
                    onPress={() => {
                      setShowOfflineMenu(false);
                      shareTrack(currentTrack);
                    }}
                  >
                    <Share2 size={16} color={themeColors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.offlineMenuText, { color: activeScheme === 'dark' ? '#f1f5f9' : '#334155' }]}>
                      Share Track
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.offlineMenuItem}
                    onPress={() => {
                      setShowOfflineMenu(false);
                      deleteDownloadedTrack(currentTrack.messageId);
                    }}
                  >
                    <Trash2 size={16} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={[styles.offlineMenuText, { color: '#ef4444', fontWeight: 'bold' }]}>
                      Delete Download
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* QUEUE OVERLAY (inline, not a separate Modal) */}
            {showQueueModal && (
              <View style={[StyleSheet.absoluteFillObject, { zIndex: 50, justifyContent: 'flex-end' }]}>  
                <TouchableOpacity 
                  style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                  activeOpacity={1} 
                  onPress={() => setShowQueueModal(false)} 
                />
                <Animated.View 
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
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </Modal>

        {/* TRACK OPTIONS BOTTOM ACTION SHEET */}
        <Modal
          visible={activeActionTrack !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={closeActionSheet}
        >
          {activeActionTrack && (
            <View style={styles.actionSheetOverlay}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={closeActionSheet} />
              <View style={[
                styles.actionSheetContainer,
                { backgroundColor: activeScheme === 'dark' ? '#0f172a' : '#ffffff' }
              ]}>
                <View style={styles.actionSheetHeader}>
                  <View style={styles.actionSheetHeaderIndicator} />
                  {activeActionTrack.coverUrl ? (
                    <Image source={{ uri: activeActionTrack.coverUrl }} style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 12 }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                      <Music size={28} color="#ffffff" />
                    </View>
                  )}
                  <Text style={[styles.actionSheetTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {activeActionTrack.title}
                  </Text>
                  <Text style={[styles.actionSheetSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {activeActionTrack.speaker || 'Christ Pavilion'}
                  </Text>
                </View>

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

                {/* Close Button */}
                <TouchableOpacity
                  style={[
                    styles.actionSheetOption,
                    styles.actionSheetCancelOption,
                    {
                      backgroundColor: activeScheme === 'dark' ? '#1e293b99' : '#f1f5f9',
                      borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#cbd5e1',
                      borderWidth: 1,
                    }
                  ]}
                  onPress={closeActionSheet}
                >
                  <Text style={[styles.actionSheetCancelText, { color: themeColors.text, textAlign: 'center', width: '100%' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Modal>
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
    paddingBottom: 4,
    alignItems: 'center',
    zIndex: 10,
  },
  swipeIndicatorPill: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    bottom: 150,
    alignSelf: 'center',
    width: 220,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },
  skipMenuTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  skipMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  skipMenuText: {
    fontSize: 14,
  },
  offlineMenuContainer: {
    position: 'absolute',
    right: 20,
    width: 210,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  offlineMenuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  offlineMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 1,
  },
  offlineMenuText: {
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
