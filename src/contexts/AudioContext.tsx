import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Alert, AppState, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Message, apiService } from '../services/api';

interface AudioContextType {
  currentTrack: Message | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number; // in milliseconds
  duration: number; // in milliseconds
  trackList: Message[];
  favorites: Message[];
  playlist: Message[];
  themeMode: 'system' | 'light' | 'dark';
  activeActionTrack: Message | null;
  playTrack: (track: Message, list?: Message[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleFavorite: (track: Message) => void;
  isFavorite: (track: Message) => boolean;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  
  // Custom Playlist actions
  addToPlaylist: (track: Message) => void;
  removeFromPlaylist: (trackId: string | number) => void;

  // Active Playback Queue actions
  addToQueue: (track: Message) => void;
  playNextTrack: (track: Message) => void;
  reorderQueue: (index: number, direction: 'up' | 'down') => void;
  removeFromQueue: (trackId: string | number) => void;

  // Long-Press Action Sheet actions
  showActionSheet: (track: Message) => void;
  closeActionSheet: () => void;

  // Download actions
  downloadedTracks: Message[];
  downloadProgress: Record<string | number, number>;
  downloadTrack: (track: Message) => Promise<void>;
  deleteDownloadedTrack: (trackId: string | number) => Promise<void>;
  isDownloaded: (track: Message) => boolean;
  saveTrackToDevice: (track: Message) => Promise<void>;
  shareTrack: (track: Message) => Promise<void>;

  // Playback settings
  resumeFromStopped: boolean;
  setResumeFromStopped: (value: boolean) => Promise<void>;

  // Global Player Expanded State
  isPlayerExpanded: boolean;
  setIsPlayerExpanded: (value: boolean) => void;

  // Playback Control States
  repeatMode: 'off' | 'all' | 'one';
  toggleRepeatMode: () => void;
  skipInterval: number;
  updateSkipInterval: (seconds: number) => Promise<void>;
  playbackRate: number;
  cyclePlaybackRate: () => void;
  dismissPlayer: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Message | null>(null);
  const [trackList, setTrackList] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [favorites, setFavorites] = useState<Message[]>([]);
  const [playlist, setPlaylist] = useState<Message[]>([]);
  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');
  const [activeActionTrack, setActiveActionTrack] = useState<Message | null>(null);
  const [downloadedTracks, setDownloadedTracks] = useState<Message[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string | number, number>>({});
  const [resumeFromStopped, setResumeFromStoppedState] = useState<boolean>(true);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [skipInterval, setSkipInterval] = useState<number>(15);
  const [playbackRate, setPlaybackRateState] = useState<number>(1.0);

  const soundRef = useRef<AudioPlayer | null>(null);
  const subscriptionRef = useRef<any>(null);
  const savedPositionsRef = useRef<Record<string, number>>({});
  const lastSavedTimeRef = useRef<number>(0);

  const repeatModeRef = useRef<'off' | 'all' | 'one'>('off');
  const playNextRef = useRef<() => Promise<void>>(async () => {});
  const playPreviousRef = useRef<() => Promise<void>>(async () => {});

  // Load favorites, playlist & theme mode on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const storedFavs = await AsyncStorage.getItem('SOF_FAVORITES');
        if (storedFavs) {
          setFavorites(JSON.parse(storedFavs));
        }
        const storedPlaylist = await AsyncStorage.getItem('SOF_PLAYLIST');
        if (storedPlaylist) {
          setPlaylist(JSON.parse(storedPlaylist));
        }
        const storedTheme = await AsyncStorage.getItem('SOF_THEME');
        if (storedTheme) {
          setThemeModeState(storedTheme as any);
        }
        const storedDownloads = await AsyncStorage.getItem('SOF_DOWNLOADED_REGISTRY');
        if (storedDownloads) {
          setDownloadedTracks(JSON.parse(storedDownloads));
        }
        // Load last played track and playlist on startup to show the mini player
        const storedLastTrack = await AsyncStorage.getItem('SOF_LAST_PLAYED_TRACK');
        if (storedLastTrack) {
          setCurrentTrack(JSON.parse(storedLastTrack));
        }
        const storedLastPlaylist = await AsyncStorage.getItem('SOF_LAST_PLAYLIST');
        if (storedLastPlaylist) {
          setTrackList(JSON.parse(storedLastPlaylist));
        }
        const storedResumeSetting = await AsyncStorage.getItem('SOF_SETTINGS_RESUME_PLAYBACK');
        if (storedResumeSetting !== null) {
          setResumeFromStoppedState(JSON.parse(storedResumeSetting));
        }
        const storedPositions = await AsyncStorage.getItem('SOF_PLAYBACK_POSITIONS');
        if (storedPositions) {
          savedPositionsRef.current = JSON.parse(storedPositions);
        }
        const storedSkipInterval = await AsyncStorage.getItem('SOF_SKIP_INTERVAL');
        if (storedSkipInterval) {
          setSkipInterval(Number(storedSkipInterval));
        }
        const storedRepeatMode = await AsyncStorage.getItem('SOF_REPEAT_MODE');
        if (storedRepeatMode) {
          setRepeatMode(storedRepeatMode as any);
        }
      } catch (e) {
        console.warn('AsyncStorage not available, using in-memory state:', e);
      }
    };
    loadPersistedData();
  }, []);

  // Initialize Audio mode for background playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: true,
        });
      } catch (error) {
        console.warn('Error setting up audio mode:', error);
      }
    };
    setupAudio();

    // AppState listener to expand the player when returning from background while playing
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && soundRef.current && soundRef.current.playing) {
        setIsPlayerExpanded(true);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSub.remove();
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      if (soundRef.current) {
        soundRef.current.remove();
      }
    };
  }, []);

  // Background resolver for missing series track numbers
  useEffect(() => {
    let active = true;
    const resolveTrackNumbers = async () => {
      const tracksToResolve = trackList.filter(t => t.seriesId && !t.originalTrackNumber);
      if (tracksToResolve.length === 0) return;

      let updated = false;
      const newTrackList = [...trackList];

      for (const track of tracksToResolve) {
        try {
          const seriesId = track.seriesId!;
          const result = await apiService.getSeriesById(seriesId);
          const seriesMsgs = result.messages || [];
          
          const foundInSeries = seriesMsgs.find(m => String(m.messageId) === String(track.messageId));
          if (foundInSeries && foundInSeries.originalTrackNumber) {
            const idx = newTrackList.findIndex(t => String(t.messageId) === String(track.messageId));
            if (idx !== -1) {
              newTrackList[idx] = {
                ...newTrackList[idx],
                originalTrackNumber: foundInSeries.originalTrackNumber,
              };
              updated = true;
            }
          }
        } catch (e) {
          console.warn('Error resolving track number in background:', e);
        }
      }

      if (active && updated) {
        setTrackList(newTrackList);
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(newTrackList)).catch(() => {});

        if (currentTrack && currentTrack.seriesId && !currentTrack.originalTrackNumber) {
          const matchingCurrent = newTrackList.find(t => String(t.messageId) === String(currentTrack.messageId));
          if (matchingCurrent && matchingCurrent.originalTrackNumber) {
            setCurrentTrack(matchingCurrent);
            AsyncStorage.setItem('SOF_LAST_PLAYED_TRACK', JSON.stringify(matchingCurrent)).catch(() => {});
          }
        }
      }
    };

    resolveTrackNumbers();
    return () => {
      active = false;
    };
  }, [trackList, currentTrack?.messageId]);

  // Background resolver for missing downloaded series track numbers and series names
  useEffect(() => {
    let active = true;
    const resolveDownloadedMetadata = async () => {
      const tracksToResolve = downloadedTracks.filter(t => t.seriesId && (!t.originalTrackNumber || !t.seriesName));
      if (tracksToResolve.length === 0) return;

      let updated = false;
      const newDownloads = [...downloadedTracks];

      let allSeries: any[] = [];
      try {
        allSeries = await apiService.getAllSeries();
      } catch (e) {}

      for (const track of tracksToResolve) {
        try {
          const seriesId = track.seriesId!;
          let seriesName = track.seriesName;
          if (!seriesName) {
            const matchedSeries = allSeries.find(s => String(s.seriesId) === String(seriesId));
            if (matchedSeries) {
              seriesName = matchedSeries.seriesName;
            }
          }

          const result = await apiService.getSeriesById(seriesId);
          const seriesMsgs = result.messages || [];
          
          if (!seriesName && result.series?.seriesName) {
            seriesName = result.series.seriesName;
          }

          const foundInSeries = seriesMsgs.find(m => String(m.messageId) === String(track.messageId));
          const originalTrackNumber = foundInSeries?.originalTrackNumber || track.originalTrackNumber;

          const idx = newDownloads.findIndex(t => String(t.messageId) === String(track.messageId));
          if (idx !== -1) {
            const currentItem = newDownloads[idx];
            if (currentItem.originalTrackNumber !== originalTrackNumber || currentItem.seriesName !== seriesName) {
              newDownloads[idx] = {
                ...currentItem,
                originalTrackNumber,
                seriesName,
              };
              updated = true;
            }
          }
        } catch (e) {
          console.warn('Error resolving download metadata in background:', e);
        }
      }

      if (active && updated) {
        setDownloadedTracks(newDownloads);
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('SOF_DOWNLOADED_REGISTRY', JSON.stringify(newDownloads)).catch(() => {});
      }
    };

    const timer = setTimeout(() => {
      resolveDownloadedMetadata();
    }, 3000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [downloadedTracks.length]);

  const setResumeFromStopped = async (value: boolean) => {
    setResumeFromStoppedState(value);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_SETTINGS_RESUME_PLAYBACK', JSON.stringify(value));
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleRepeatMode = () => {
    let nextMode: 'off' | 'all' | 'one';
    if (repeatMode === 'off') {
      nextMode = 'all';
    } else if (repeatMode === 'all') {
      nextMode = 'one';
    } else {
      nextMode = 'off';
    }
    setRepeatMode(nextMode);
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem('SOF_REPEAT_MODE', nextMode).catch(() => {});

    if (soundRef.current) {
      soundRef.current.loop = nextMode === 'one';
    }
  };

  const updateSkipInterval = async (seconds: number) => {
    setSkipInterval(seconds);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_SKIP_INTERVAL', String(seconds));
    } catch (e) {
      console.warn(e);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRateState(nextRate);
    if (soundRef.current) {
      soundRef.current.setPlaybackRate(nextRate);
    }
  };


  const playTrack = async (track: Message, list: Message[] = []) => {
    try {
      // Click safety protection: click on the active track toggles pause/resume instead of restarting
      if (soundRef.current && currentTrack && String(currentTrack.messageId) === String(track.messageId)) {
        await togglePlayPause();
        return;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (list.length > 0) {
        setTrackList(list);
        AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(list)).catch(() => {});
      } else {
        // If not passing a list, ensure the track is in the queue
        setTrackList(prev => {
          const updated = prev.some(t => String(t.messageId) === String(track.messageId)) ? prev : [...prev, track];
          AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      }

      // Cleanup old subscription
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.remove();
        } catch (e) {}
        subscriptionRef.current = null;
      }

      // Unload existing track if any
      if (soundRef.current) {
        try {
          soundRef.current.pause();
        } catch (e) {
          console.warn('Error pausing player during cleanup:', e);
        }
        try {
          soundRef.current.release();
        } catch (e) {
          console.warn('Error releasing player during cleanup:', e);
        }
        try {
          soundRef.current.remove();
        } catch (e) {}
        soundRef.current = null;
      }

      setCurrentTrack(track);
      AsyncStorage.setItem('SOF_LAST_PLAYED_TRACK', JSON.stringify(track)).catch(() => {});
      setIsBuffering(true);
      setPosition(0);
      setDuration(0);

      // Intercept URI to play from local private offline file if downloaded
      const isLocal = downloadedTracks.some(t => String(t.messageId) === String(track.messageId));
      let playUri = track.audioUrl;
      if (isLocal) {
        const filename = `track_${track.messageId}.mp3`;
        const localPath = `${FileSystem.documentDirectory}${filename}`;
        
        // Verify that the file actually exists on disk before playing
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          playUri = localPath;
        } else {
          console.warn(`Downloaded file not found at ${localPath}, falling back to remote url.`);
        }
      }

      // Lookup saved position if resume playback position option is on
      let initialPosition = 0;
      const trackId = String(track.messageId);
      if (resumeFromStopped && savedPositionsRef.current[trackId]) {
        initialPosition = savedPositionsRef.current[trackId];
      }

      // Load and play new track using expo-audio createAudioPlayer
      const player = createAudioPlayer({ uri: playUri });
      soundRef.current = player;

      // Enable system Lock Screen & Control Center media notification
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.speaker || 'Spirit of Faith',
        albumTitle: track.seriesName || 'Teachings',
        artworkUrl: track.coverUrl || undefined,
      });

      // Subscribe to playback status updates
      subscriptionRef.current = player.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(status.playing);
        setIsBuffering(status.isBuffering);
        
        // currentTime and duration are in seconds in expo-audio status, we scale to milliseconds
        const currentPos = (status.currentTime || 0) * 1000;
        const totalDur = (status.duration || 0) * 1000;
        
        setPosition(currentPos);
        setDuration(totalDur);

        // Save position periodically (every 5 seconds)
        if (trackId && currentPos > 0) {
          if (totalDur > 0 && totalDur - currentPos > 5000) {
            savedPositionsRef.current[trackId] = currentPos;
            const now = Date.now();
            if (now - lastSavedTimeRef.current > 5000) {
              lastSavedTimeRef.current = now;
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              AsyncStorage.setItem('SOF_PLAYBACK_POSITIONS', JSON.stringify(savedPositionsRef.current)).catch(() => {});
            }
          } else {
            // If near end or finished, clean cached position
            if (savedPositionsRef.current[trackId]) {
              delete savedPositionsRef.current[trackId];
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              AsyncStorage.setItem('SOF_PLAYBACK_POSITIONS', JSON.stringify(savedPositionsRef.current)).catch(() => {});
            }
          }
        }

        // If track finishes, automatically play the next one
        if (status.didJustFinish) {
          if (repeatModeRef.current === 'one') {
            player.seekTo(0).then(() => player.play()).catch(() => {});
            return;
          }
          playNextRef.current();
        }
      });

      // Start playing with saved controls
      player.loop = repeatMode === 'one';
      player.setPlaybackRate(playbackRate);
      player.play();

      // Recover position if saved
      if (initialPosition > 0) {
        try {
          await player.seekTo(initialPosition / 1000);
        } catch (e) {
          console.warn('Initial seek failed, retrying in 500ms...', e);
          setTimeout(async () => {
            try {
              if (soundRef.current) {
                await soundRef.current.seekTo(initialPosition / 1000);
              }
            } catch (err) {
              console.warn('Delayed initial seek failed:', err);
            }
          }, 500);
        }
      }

    } catch (error) {
      console.error('Error playing track:', error);
      setIsBuffering(false);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) {
      if (currentTrack) {
        await playTrack(currentTrack, trackList);
      }
      return;
    }

    try {
      if (isPlaying) {
        soundRef.current.pause();
        // Save current progress immediately to AsyncStorage when pausing
        if (currentTrack) {
          const trackId = String(currentTrack.messageId);
          savedPositionsRef.current[trackId] = position;
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('SOF_PLAYBACK_POSITIONS', JSON.stringify(savedPositionsRef.current)).catch(() => {});
        }
      } else {
        soundRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const seek = async (positionMs: number) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.seekTo(positionMs / 1000);
    } catch (error) {
      console.error('Error seeking track:', error);
    }
  };

  const playNext = async () => {
    if (!currentTrack || trackList.length === 0) return;

    const currentIndex = trackList.findIndex(t => String(t.messageId) === String(currentTrack.messageId));
    if (currentIndex !== -1) {
      if (currentIndex < trackList.length - 1) {
        const nextTrack = trackList[currentIndex + 1];
        await playTrack(nextTrack);
      } else if (repeatMode === 'all') {
        // Wrap around to first track
        const firstTrack = trackList[0];
        await playTrack(firstTrack);
      }
    }
  };

  const playPrevious = async () => {
    if (!currentTrack || trackList.length === 0) return;

    const currentIndex = trackList.findIndex(t => String(t.messageId) === String(currentTrack.messageId));
    if (currentIndex !== -1) {
      if (currentIndex > 0) {
        const prevTrack = trackList[currentIndex - 1];
        await playTrack(prevTrack);
      } else if (repeatMode === 'all') {
        // Wrap around to last track
        const lastTrack = trackList[trackList.length - 1];
        await playTrack(lastTrack);
      }
    }
  };

  // Sync refs to prevent stale closures in event listeners
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
  }); // runs on every render to ensure latest values are captured

  const toggleFavorite = async (track: Message) => {
    const isFav = favorites.some(t => String(t.messageId) === String(track.messageId));
    let nextFavs: Message[];
    if (isFav) {
      nextFavs = favorites.filter(t => String(t.messageId) !== String(track.messageId));
      Alert.alert('Favorites Updated', `"${track.title}" has been removed from your favorites.`);
    } else {
      nextFavs = [...favorites, track];
      Alert.alert('Favorites Updated', `"${track.title}" has been added to your favorites.`);
    }
    setFavorites(nextFavs);

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_FAVORITES', JSON.stringify(nextFavs));
    } catch (e) {
      // In-memory fallback
    }
  };

  const isFavorite = (track: Message) => {
    return favorites.some(t => String(t.messageId) === String(track.messageId));
  };

  const setThemeMode = async (mode: 'system' | 'light' | 'dark') => {
    setThemeModeState(mode);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_THEME', mode);
    } catch (e) {
      // In-memory fallback
    }
  };

  // Custom Playlist actions
  const addToPlaylist = async (track: Message) => {
    if (playlist.some(t => String(t.messageId) === String(track.messageId))) {
      Alert.alert('Already in Playlist', 'This teaching is already in your playlist.');
      return;
    }
    const nextList = [...playlist, track];
    setPlaylist(nextList);
    Alert.alert('Playlist Updated', `"${track.title}" has been added to your playlist.`);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_PLAYLIST', JSON.stringify(nextList));
    } catch (e) {}
  };

  const removeFromPlaylist = async (trackId: string | number) => {
    const targetTrack = playlist.find(t => String(t.messageId) === String(trackId));
    const nextList = playlist.filter(t => String(t.messageId) !== String(trackId));
    setPlaylist(nextList);
    if (targetTrack) {
      Alert.alert('Playlist Updated', `"${targetTrack.title}" has been removed from your playlist.`);
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_PLAYLIST', JSON.stringify(nextList));
    } catch (e) {}
  };

  // Active Playback Queue actions
  const addToQueue = (track: Message) => {
    setTrackList(prev => {
      if (prev.some(t => String(t.messageId) === String(track.messageId))) return prev;
      const nextList = [...prev, track];
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });
  };

  const playNextTrack = (track: Message) => {
    setTrackList(prev => {
      // Remove it from current list position
      const filtered = prev.filter(t => String(t.messageId) !== String(track.messageId));
      if (!currentTrack) {
        const nextList = [track];
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(nextList)).catch(() => {});
        return nextList;
      }
      // Locate active track index
      const currentIndex = filtered.findIndex(t => String(t.messageId) === String(currentTrack.messageId));
      if (currentIndex === -1) {
        const nextList = [...filtered, track];
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(nextList)).catch(() => {});
        return nextList;
      }
      const nextList = [...filtered];
      // Splice immediately after the active track
      nextList.splice(currentIndex + 1, 0, track);
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });
  };

  const reorderQueue = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === trackList.length - 1) return;
    const nextList = [...trackList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = temp;
    setTrackList(nextList);

    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(nextList)).catch(() => {});
  };

  const removeFromQueue = (trackId: string | number) => {
    setTrackList(prev => {
      const nextList = prev.filter(t => String(t.messageId) !== String(trackId));
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem('SOF_LAST_PLAYLIST', JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });
  };

  // Long-Press Actions
  const showActionSheet = (track: Message) => {
    setActiveActionTrack(track);
  };

  const closeActionSheet = () => {
    setActiveActionTrack(null);
  };

  // Download actions
  const downloadTrack = async (track: Message) => {
    try {
      const filename = `track_${track.messageId}.mp3`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Initialize progress to 0
      setDownloadProgress(prev => ({ ...prev, [track.messageId]: 0 }));
      
      const downloadResumable = FileSystem.createDownloadResumable(
        track.audioUrl,
        localUri,
        {},
        (downloadProgressData) => {
          const totalBytesExpected = downloadProgressData.totalBytesExpectedToWrite;
          const totalBytesWritten = downloadProgressData.totalBytesWritten;
          
          if (totalBytesExpected > 0) {
            const progress = totalBytesWritten / totalBytesExpected;
            setDownloadProgress(prev => ({
              ...prev,
              [track.messageId]: progress,
            }));
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.status === 200) {
        const newDownload = { ...track, coverUrl: track.coverUrl || '' };
        const updatedDownloads = [...downloadedTracks, newDownload];
        setDownloadedTracks(updatedDownloads);
        
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('SOF_DOWNLOADED_REGISTRY', JSON.stringify(updatedDownloads));
        
        Alert.alert('Download Complete', `"${track.title}" is now available offline.`);
      } else {
        throw new Error('Download failed or status is invalid');
      }
    } catch (error) {
      console.error('Error downloading track:', error);
      Alert.alert('Download Failed', 'Could not complete the download. Please check your network connection.');
    } finally {
      // Clean up progress entry when finished (or failed)
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[track.messageId];
        return next;
      });
    }
  };

  const deleteDownloadedTrack = async (trackId: string | number) => {
    try {
      const target = downloadedTracks.find(t => String(t.messageId) === String(trackId));
      if (!target) return;
      
      const filename = `track_${target.messageId}.mp3`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
      
      const updatedDownloads = downloadedTracks.filter(t => String(t.messageId) !== String(trackId));
      setDownloadedTracks(updatedDownloads);
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('SOF_DOWNLOADED_REGISTRY', JSON.stringify(updatedDownloads));
      
      Alert.alert('Download Removed', `"${target.title}" download has been deleted from your device.`);
    } catch (error) {
      console.error('Error deleting download:', error);
      Alert.alert('Error', 'Could not delete the download file.');
    }
  };

  const isDownloaded = (track: Message) => {
    return downloadedTracks.some(t => String(t.messageId) === String(track.messageId));
  };

  const dismissPlayer = async () => {
    if (soundRef.current) {
      try {
        soundRef.current.pause();
      } catch (e) {}
    }
    setCurrentTrack(null);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('SOF_LAST_PLAYED_TRACK');
    } catch (e) {}
  };

  const saveTrackToDevice = async (track: Message) => {
    try {
      const filename = `track_${track.messageId}.mp3`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        Alert.alert('Not Found', 'Please download the track first before saving to device.');
        return;
      }
      
      if (Platform.OS === 'android') {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const directoryUri = permissions.directoryUri;
          const safeTitle = track.title.replace(/[/\\?%*:|"<>]/g, '_');
          const fileUri = await StorageAccessFramework.createFileAsync(
            directoryUri,
            safeTitle,
            'audio/mpeg'
          );
          const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Success', `"${track.title}" has been saved to your selected folder.`);
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, {
            mimeType: 'audio/mpeg',
            dialogTitle: `Save "${track.title}" to Device`,
            UTI: 'public.mp3',
          });
        } else {
          Alert.alert('Unsupported', 'Sharing or saving files is not supported on this platform.');
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Could not save the file to device.');
    }
  };

  const shareTrack = async (track: Message) => {
    try {
      const filename = `track_${track.messageId}.mp3`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      
      if (fileInfo.exists && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'audio/mpeg',
          dialogTitle: `Share "${track.title}"`,
          UTI: 'public.mp3',
        });
      } else {
        const { Share } = require('react-native');
        await Share.share({
          message: `Listen to "${track.title}" by ${track.speaker || 'Pastor'}: ${track.audioUrl}`,
          title: track.title,
        });
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Could not share the track.');
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        position,
        duration,
        trackList,
        favorites,
        playlist,
        themeMode,
        activeActionTrack,
        playTrack,
        togglePlayPause,
        seek,
        playNext,
        playPrevious,
        toggleFavorite,
        isFavorite,
        setThemeMode,
        addToPlaylist,
        removeFromPlaylist,
        addToQueue,
        playNextTrack,
        reorderQueue,
        removeFromQueue,
        showActionSheet,
        closeActionSheet,
        downloadedTracks,
        downloadProgress,
        downloadTrack,
        deleteDownloadedTrack,
        isDownloaded,
        saveTrackToDevice,
        shareTrack,
        resumeFromStopped,
        setResumeFromStopped,
        isPlayerExpanded,
        setIsPlayerExpanded,
        repeatMode,
        toggleRepeatMode,
        skipInterval,
        updateSkipInterval,
        playbackRate,
        cyclePlaybackRate,
        dismissPlayer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
