import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { apiService } from '../services/api';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BlurHeader from '../components/BlurHeader';
import { 
  Music, 
  Heart, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Download, 
  Trash2,
  CheckCircle2,
  FolderHeart
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LibraryScreen() {
  const systemScheme = useColorScheme();
  const { themeMode, downloadedTracks, playTrack, deleteDownloadedTrack } = useAudio();
  const insets = useSafeAreaInsets();

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>({});
  const [allSeries, setAllSeries] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchSeriesList = async () => {
      try {
        const series = await apiService.getAllSeries();
        setAllSeries(series);
      } catch (e) {
        console.warn('Error fetching all series in Library:', e);
      }
    };
    fetchSeriesList();
  }, []);

  const toggleExpandSeries = (seriesId: string | number) => {
    const key = String(seriesId);
    setExpandedSeries(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const groupedDownloads = React.useMemo(() => {
    const groups: Record<string, { seriesId: string | number; seriesName: string; coverUrl?: string; tracks: typeof downloadedTracks }> = {};
    const standalones: typeof downloadedTracks = [];

    downloadedTracks.forEach(track => {
      if (track.seriesId) {
        const key = String(track.seriesId);
        if (!groups[key]) {
          const matchedSeries = allSeries.find(s => String(s.seriesId) === String(track.seriesId));
          const name = matchedSeries?.seriesName || track.seriesName || 'Teaching Series';
          groups[key] = {
            seriesId: track.seriesId,
            seriesName: name,
            coverUrl: track.coverUrl,
            tracks: []
          };
        }
        groups[key].tracks.push(track);
      } else {
        standalones.push(track);
      }
    });

    const list = Object.values(groups);
    
    // Sort tracks in each series group by originalTrackNumber
    list.forEach(g => {
      g.tracks.sort((a, b) => (a.originalTrackNumber || 0) - (b.originalTrackNumber || 0));
    });

    if (standalones.length > 0) {
      list.push({
        seriesId: 'standalone_sermons',
        seriesName: 'Standalone Sermons',
        coverUrl: undefined,
        tracks: standalones
      });
    }
    return list;
  }, [downloadedTracks, allSeries]);

  const handlePlayTrack = (track: any, playlist: any[]) => {
    playTrack(track, playlist);
  };

  const handleDeleteDownload = (track: any) => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to remove "${track.title}" from your offline downloads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteDownloadedTrack(track.messageId) 
        }
      ]
    );
  };

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        
        {/* Custom Glassmorphic Header */}
        <BlurHeader isDark={activeScheme === 'dark'}>
          <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Library</Text>
          </View>
        </BlurHeader>

        {/* Scrollable Content */}
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* Main Library Navigation Shortcuts */}
          <View style={styles.section}>
            <View style={[
              styles.menuList, 
              { 
                backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0' 
              }
            ]}>
              
              {/* Playlists */}
              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
                onPress={() => router.push('/playlist')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconBox, { backgroundColor: 'rgba(27, 84, 164, 0.1)' }]}>
                    <Music size={18} color={themeColors.primary} />
                  </View>
                  <Text style={[styles.menuText, { color: themeColors.text }]}>My Playlists</Text>
                </View>
                <ChevronRight size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>

              {/* Favorites */}
              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
                onPress={() => router.push('/favorites')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconBox, { backgroundColor: 'rgba(225, 29, 72, 0.1)' }]}>
                    <Heart size={18} color="#e11d48" fill="#e11d48" />
                  </View>
                  <Text style={[styles.menuText, { color: themeColors.text }]}>My Favorites</Text>
                </View>
                <ChevronRight size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>

              {/* Devotionals */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/devotionals')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <BookOpen size={18} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.menuText, { color: themeColors.text }]}>Devotional Archives</Text>
                </View>
                <ChevronRight size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>

            </View>
          </View>

          {/* Section: Downloaded Teachings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Downloaded Teachings</Text>
            
            {groupedDownloads.length > 0 ? (
              <View style={styles.downloadList}>
                {groupedDownloads.map((group) => {
                  const isExpanded = !!expandedSeries[String(group.seriesId)];
                  return (
                    <View
                      key={group.seriesId}
                      style={[
                        styles.seriesGroupCard,
                        {
                          backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff',
                          borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                        }
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.seriesHeaderRow}
                        onPress={() => toggleExpandSeries(group.seriesId)}
                        activeOpacity={0.85}
                      >
                        {/* Artwork */}
                        {group.coverUrl ? (
                          <Image source={{ uri: group.coverUrl }} style={styles.seriesArtwork} />
                        ) : (
                          <View style={[styles.seriesArtworkPlaceholder, { backgroundColor: themeColors.primary }]}>
                            <Music size={20} color="#ffffff" />
                          </View>
                        )}

                        {/* Details */}
                        <View style={styles.seriesDetails}>
                          <Text style={[styles.seriesTitleText, { color: themeColors.text }]} numberOfLines={1}>
                            {group.seriesName}
                          </Text>
                          <Text style={[styles.seriesSubtitleText, { color: themeColors.textSecondary }]}>
                            {group.tracks.length} {group.tracks.length === 1 ? 'teaching' : 'teachings'} downloaded
                          </Text>
                        </View>

                        {/* Expand indicator */}
                        <View style={styles.expandIconContainer}>
                          <ChevronDown 
                            size={18} 
                            color={themeColors.textSecondary}
                            style={isExpanded && { transform: [{ rotate: '180deg' }] }}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Nested tracks list */}
                      {isExpanded && (
                        <View style={[styles.nestedTrackList, { borderTopColor: themeColors.border }]}>
                          {group.tracks.map((track) => (
                            <View 
                              key={track.messageId} 
                              style={[styles.nestedTrackRow, { borderBottomColor: themeColors.border }]}
                            >
                              <TouchableOpacity
                                style={styles.nestedTrackClickable}
                                onPress={() => handlePlayTrack(track, group.tracks)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.nestedTrackDetails}>
                                  <Text style={[styles.nestedTrackTitle, { color: themeColors.text }]} numberOfLines={1}>
                                    {track.title}
                                  </Text>
                                  <Text style={[styles.nestedTrackSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                                    {track.originalTrackNumber ? `Track ${track.originalTrackNumber} • ` : ''}{track.speaker || 'Pastor'}
                                  </Text>
                                </View>
                              </TouchableOpacity>

                              <View style={styles.nestedTrackActions}>
                                <CheckCircle2 size={14} color="#22c55e" style={{ marginRight: 6 }} />
                                <TouchableOpacity 
                                  onPress={() => handleDeleteDownload(track)} 
                                  style={styles.nestedDeleteBtn}
                                  activeOpacity={0.7}
                                >
                                  <Trash2 size={16} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[
                styles.emptyState, 
                { 
                  backgroundColor: activeScheme === 'dark' ? 'rgba(30, 41, 59, 0.25)' : '#ffffff',
                  borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
                }
              ]}>
                <Download size={48} color={themeColors.primary} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No downloaded teachings</Text>
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  Sermons you download for offline playback will appear here. Tap the download icon next to any sermon to save it.
                </Text>
              </View>
            )}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  downloadList: {
    gap: 12,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackSpeaker: {
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 8,
  },
  seriesGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  seriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  seriesArtwork: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  seriesArtworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seriesDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  seriesTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seriesSubtitleText: {
    fontSize: 12,
  },
  expandIconContainer: {
    padding: 4,
  },
  nestedTrackList: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  nestedTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  nestedTrackClickable: {
    flex: 1,
    paddingRight: 12,
  },
  nestedTrackDetails: {
    justifyContent: 'center',
  },
  nestedTrackTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  nestedTrackSubtitle: {
    fontSize: 11,
  },
  nestedTrackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nestedDeleteBtn: {
    padding: 6,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
