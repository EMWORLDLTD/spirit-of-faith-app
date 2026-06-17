import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  TextInput,
  Alert,
  BackHandler,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, Series, Message, Category } from '../services/api';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Search, Play, Download, ChevronRight, ChevronLeft, Eye, Music, Award, Volume2, Pause, Check, LayoutGrid, LayoutList, Shuffle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BlurHeader from '../components/BlurHeader';

const { width } = Dimensions.get('window');

type ExtendedSeries = Series & {
  speaker?: string;
  categories?: Category[];
};

const GlossyOverlay = ({ isDark }: { isDark: boolean }) => (
  <>
    <LinearGradient
      colors={isDark
        ? ['rgba(15, 23, 42, 0.65)', 'rgba(27, 84, 164, 0.12)']
        : ['#ffffff', '#f3f8fe']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <LinearGradient
      colors={isDark
        ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)', 'transparent']
        : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.2)', 'transparent']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }}
    />
  </>
);

const SeriesGridSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.gridCard,
          {
            borderColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
            flex: 0,
            width: (width - 48) / 2,
            margin: 8,
          }
        ]}
      >
        <View style={[styles.seriesCover, { backgroundColor: themeColors.textSecondary, opacity: 0.15 }]} />
        <View style={styles.cardDetails}>
          <View style={[styles.skeletonLine, { width: '80%', height: 14, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '40%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
      </Animated.View>
    ))}
  </View>
);

const SeriesListSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View style={{ paddingHorizontal: 16 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.listCard,
          {
            borderColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
            marginBottom: 12,
          }
        ]}
      >
        <View style={[styles.listSeriesCover, { backgroundColor: themeColors.textSecondary, opacity: 0.15 }]} />
        <View style={styles.listCardDetails}>
          <View style={[styles.skeletonLine, { width: '70%', height: 16, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 12, backgroundColor: themeColors.primary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
      </Animated.View>
    ))}
  </View>
);

const TrackListSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View style={styles.tracksSection}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.trackRow,
          {
            borderBottomColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
            paddingVertical: 14,
          }
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.skeletonLine, { width: 20, height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.2, marginRight: 12 }]} />
          <View style={[styles.playIconBox, { backgroundColor: themeColors.textSecondary, opacity: 0.1, width: 28, height: 28, borderRadius: 14 }]} />
          <View style={[styles.trackTextInfo, { marginLeft: 12, flex: 1 }]}>
            <View style={[styles.skeletonLine, { width: '80%', height: 14, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
          </View>
        </View>
      </Animated.View>
    ))}
  </View>
);

let teachingsMainCache: { categories: Category[]; seriesList: ExtendedSeries[] } | null = null;

export default function TeachingsScreen() {
  const systemScheme = useColorScheme();
  const { playTrack, showActionSheet, currentTrack, isPlaying, themeMode, isDownloaded, downloadTrack, downloadProgress, deleteDownloadedTrack, saveTrackToDevice, shareTrack } = useAudio();
  const { autoSelectSeriesId, autoSelectMessageId } = useLocalSearchParams<{
    autoSelectSeriesId?: string;
    autoSelectMessageId?: string;
  }>();
  const insets = useSafeAreaInsets();

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  // Search & Categories state
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(null);

  // View state (defaults to true for Grid View)
  const [isGridView, setIsGridView] = useState(true);

  // Series state
  const [seriesList, setSeriesList] = useState<ExtendedSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);

  // Detailed view state
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [seriesMessages, setSeriesMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < 0) {
      if (!isPulling) setIsPulling(true);
    } else {
      if (isPulling) setIsPulling(false);
    }
  };

  const lastAutoSelectedRef = useRef<{ seriesId?: string; messageId?: string }>({});

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedSeries) {
      await handleSelectSeries(selectedSeries, true);
    } else {
      await fetchInitialData(true);
    }
    setRefreshing(false);
  };

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (seriesLoading || messagesLoading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [seriesLoading, messagesLoading]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (selectedSeries) {
        setSelectedSeries(null);
        setSeriesMessages([]);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedSeries]);

  useEffect(() => {
    const handleAutoSelect = async () => {
      if (seriesList.length === 0) return;

      const hasNewSeries = autoSelectSeriesId && lastAutoSelectedRef.current.seriesId !== autoSelectSeriesId;
      const hasNewMessage = autoSelectMessageId && lastAutoSelectedRef.current.messageId !== autoSelectMessageId;

      if (hasNewSeries) {
        const series = seriesList.find(s => String(s.seriesId) === String(autoSelectSeriesId));
        if (series) {
          lastAutoSelectedRef.current.seriesId = autoSelectSeriesId;
          handleSelectSeries(series);
          router.setParams({ autoSelectSeriesId: undefined, autoSelectMessageId: undefined });
        }
      } else if (hasNewMessage) {
        lastAutoSelectedRef.current.messageId = autoSelectMessageId;
        setMessagesLoading(true);
        try {
          const msg = await apiService.getMessageById(autoSelectMessageId);
          if (msg) {
            if (msg.seriesId) {
              const series = seriesList.find(s => String(s.seriesId) === String(msg.seriesId));
              if (series) {
                lastAutoSelectedRef.current.seriesId = String(msg.seriesId);
                handleSelectSeries(series);
                router.setParams({ autoSelectSeriesId: undefined, autoSelectMessageId: undefined });
                return;
              }
            }
            // Create a mock series for this standalone message
            const singleSeries: Series = {
              seriesId: `single_${msg.messageId}`,
              seriesName: msg.title,
              seriesCoverUrl: msg.coverUrl || undefined,
              publishedMessagesCount: 1,
            };
            setSelectedSeries(singleSeries);
            setSeriesMessages([msg]);
            router.setParams({ autoSelectSeriesId: undefined, autoSelectMessageId: undefined });
          }
        } catch (error) {
          console.error('Error auto-selecting single message:', error);
        } finally {
          setMessagesLoading(false);
        }
      }
    };

    handleAutoSelect();
  }, [autoSelectSeriesId, autoSelectMessageId, seriesList]);

  const fetchInitialData = async (forceRefresh = false) => {
    if (!forceRefresh && teachingsMainCache) {
      setCategories(teachingsMainCache.categories);
      setSeriesList(teachingsMainCache.seriesList);
      setSeriesLoading(false);
      return;
    }
    setSeriesLoading(true);
    try {
      const [categoriesData, seriesData, messagesData] = await Promise.all([
        apiService.getCategories(forceRefresh),
        apiService.getAllSeries(forceRefresh),
        apiService.getRecentMessages(100, forceRefresh), // Get all messages to count tracks
      ]);

      // Calculate track counts, speaker, and category tags dynamically
      const seriesWithCounts = seriesData.map((s: Series) => {
        const seriesMessages = messagesData.filter((m: Message) => String(m.seriesId) === String(s.seriesId));
        const count = seriesMessages.length;
        
        // Find speaker from messages
        const speaker = seriesMessages.length > 0 ? seriesMessages[0].speaker : 'Christ Pavilion';
        
        // Find categories
        const categoryIds = Array.from(new Set(seriesMessages.flatMap(m => m.categoryIds || [])));
        const seriesCategories = categoriesData.filter(c => categoryIds.includes(c.categoryId));

        return {
          ...s,
          publishedMessagesCount: count || s.publishedMessagesCount || 0,
          speaker,
          categories: seriesCategories,
        };
      });

      setCategories(categoriesData);
      setSeriesList(seriesWithCounts);
      teachingsMainCache = { categories: categoriesData, seriesList: seriesWithCounts };
    } catch (error) {
      console.error('Error fetching teachings screen data:', error);
    } finally {
      setSeriesLoading(false);
    }
  };

  const handleSelectSeries = async (series: Series, forceRefresh = false) => {
    setSelectedSeries(series);
    setMessagesLoading(true);
    try {
      const result = await apiService.getSeriesById(series.seriesId, forceRefresh);
      const messages = result.messages || [];
      setSeriesMessages(messages);
    } catch (error) {
      console.error('Error fetching series messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handlePlayMessage = async (msg: Message) => {
    // Play message in global player and pass the series playlist
    await playTrack(msg, seriesMessages);
    // Track stats increment
    apiService.incrementView(msg.messageId).catch(() => {});
  };

  const handlePlayAll = async () => {
    if (seriesMessages.length === 0) return;
    await playTrack(seriesMessages[0], seriesMessages);
    apiService.incrementView(seriesMessages[0].messageId).catch(() => {});
  };

  const handleShufflePlay = async () => {
    if (seriesMessages.length === 0) return;
    const shuffled = [...seriesMessages].sort(() => Math.random() - 0.5);
    await playTrack(shuffled[0], shuffled);
    apiService.incrementView(shuffled[0].messageId).catch(() => {});
  };

  const handleDownloadMessage = async (msg: Message) => {
    if (isDownloaded(msg)) {
      Alert.alert(
        'Offline Track',
        `"${msg.title}" is already downloaded.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete Download', style: 'destructive', onPress: () => deleteDownloadedTrack(msg.messageId) },
          { text: 'Save to Device Store', onPress: () => saveTrackToDevice(msg) },
          { text: 'Share Track', onPress: () => shareTrack(msg) }
        ]
      );
    } else {
      Alert.alert(
        'Download Sermon',
        `Would you like to download "${msg.title}" to your device for offline playback?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Download', 
            onPress: async () => {
              try {
                await downloadTrack(msg);
                apiService.incrementDownload(msg.messageId).catch(() => {});
              } catch (err) {
                console.error(err);
              }
            }
          }
        ]
      );
    }
  };

  // Filter series list based on search and categories
  const filteredSeries = seriesList.filter(s => {
    const matchesSearch = s.seriesName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || (s.categories && s.categories.some(c => String(c.categoryId) === String(selectedCategory)));
    return matchesSearch && matchesCategory;
  });

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      {selectedSeries && (
        /* Transparent Header Wrapper for Series Details */
        <View style={{ 
          paddingTop: insets.top,
          height: 56 + insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}>
          <TouchableOpacity
            onPress={() => {
              setSelectedSeries(null);
              setSeriesMessages([]);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
          >
            <ChevronLeft size={24} color={themeColors.text} />
            <Text style={{ color: themeColors.text, fontWeight: '600', marginLeft: 4, fontSize: 16 }}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedSeries ? (
        /* SERIES DETAIL VIEW */
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: 56 + insets.top + 24, paddingBottom: 150 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
          style={{ zIndex: isPulling ? 11 : 0 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={themeColors.primary} 
              progressViewOffset={Platform.OS === 'android' ? 56 + insets.top + 24 : undefined}
            />
          }
        >

          <View style={styles.seriesDetailHeader}>
            {selectedSeries.seriesCoverUrl ? (
              <Image source={{ uri: selectedSeries.seriesCoverUrl }} style={styles.detailCover} />
            ) : (
              <View style={[styles.detailCoverPlaceholder, { backgroundColor: themeColors.primary }]}>
                <Music size={48} color="#ffffff" />
              </View>
            )}
            <View style={styles.detailHeaderInfo}>
              <Text style={[styles.detailTitle, { color: themeColors.text }]}>
                {selectedSeries.seriesName}
              </Text>
              <Text style={[styles.detailMets, { color: themeColors.textSecondary }]}>
                {selectedSeries.publishedMessagesCount || seriesMessages.length || 0} tracks available
              </Text>
            </View>
          </View>

          {messagesLoading ? (
            <TrackListSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
          ) : seriesMessages.length > 0 ? (
            <>
              {/* Play All & Shuffle Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.playAllButton, { backgroundColor: themeColors.primary }]}
                  onPress={handlePlayAll}
                  activeOpacity={0.8}
                >
                  <Play size={18} color="#ffffff" fill="#ffffff" />
                  <Text style={[styles.buttonText, { color: '#ffffff' }]}>Play All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shuffleButton,
                    {
                      borderColor: themeColors.primary,
                      backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(27, 84, 164, 0.04)',
                    },
                  ]}
                  onPress={handleShufflePlay}
                  activeOpacity={0.8}
                >
                  <Shuffle size={18} color={themeColors.primary} />
                  <Text style={[styles.buttonText, { color: themeColors.primary }]}>Shuffle</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tracksSection}>
                <Text style={[styles.tracksHeader, { color: themeColors.text }]}>Tracks</Text>
              {seriesMessages.map((msg, index) => {
                const isCurrent = currentTrack && String(currentTrack.messageId) === String(msg.messageId);
                return (
                  <View
                    key={msg.messageId}
                    style={[styles.trackRow, { borderBottomColor: themeColors.border }]}
                  >
                    <TouchableOpacity
                      style={styles.trackPlayButton}
                      onPress={() => handlePlayMessage(msg)}
                      onLongPress={() => showActionSheet(msg)}
                      delayLongPress={350}
                    >
                      <Text style={[styles.trackNumberText, { color: themeColors.textSecondary }]}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                      <View style={[
                        styles.playIconBox, 
                        { backgroundColor: isCurrent ? 'rgba(27, 84, 164, 0.15)' : themeColors.backgroundElement }
                      ]}>
                        {isCurrent && isPlaying ? (
                          <Volume2 size={14} color={themeColors.primary} />
                        ) : (
                          <Play 
                            size={14} 
                            color={isCurrent ? themeColors.primary : themeColors.primary} 
                            fill={isCurrent ? themeColors.primary : themeColors.primary} 
                          />
                        )}
                      </View>
                      <View style={styles.trackTextInfo}>
                        <Text 
                          style={[
                            styles.trackTitle, 
                            { color: isCurrent ? themeColors.primary : themeColors.text },
                            isCurrent && { fontWeight: 'bold' }
                          ]} 
                          numberOfLines={1}
                        >
                          {msg.title}
                        </Text>
                        <Text style={[styles.trackMetaText, { color: themeColors.textSecondary }]}>
                          {msg.speaker} {msg.duration ? `• ${msg.duration}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.trackActions}>
                      <TouchableOpacity
                        onPress={() => handleDownloadMessage(msg)}
                        disabled={downloadProgress[msg.messageId] !== undefined}
                        style={[styles.actionButton, downloadProgress[msg.messageId] !== undefined && { flexDirection: 'row', gap: 2, paddingHorizontal: 4 }]}
                      >
                        {downloadProgress[msg.messageId] !== undefined ? (
                          <>
                            <ActivityIndicator size="small" color={themeColors.primary} />
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: themeColors.primary }}>
                              {Math.round(downloadProgress[msg.messageId] * 100)}%
                            </Text>
                          </>
                        ) : isDownloaded(msg) ? (
                          <Check size={18} color="#22c55e" strokeWidth={3} />
                        ) : (
                          <Download size={18} color={themeColors.primary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: themeColors.textSecondary, marginTop: 40 }]}>
              No tracks found in this series.
            </Text>
          )}
        </ScrollView>
      ) : (
        /* SERIES MAIN LIST VIEW */
        <View style={{ flex: 1 }}>
          {/* Absolute Glassmorphic Header Wrapper */}
          <BlurHeader isDark={activeScheme === 'dark'}>
            {/* Search Bar & View Switcher */}
            <View style={[styles.searchContainer, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={[styles.searchBox, { flex: 1, backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(27, 84, 164, 0.06)' }]}>
                <Search size={18} color={themeColors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: themeColors.text }]}
                  placeholder="Search teachings, themes..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleBtn, 
                  { backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(27, 84, 164, 0.06)' }
                ]}
                onPress={() => setIsGridView(!isGridView)}
              >
                {isGridView ? (
                  <LayoutList size={20} color={themeColors.text} />
                ) : (
                  <LayoutGrid size={20} color={themeColors.text} />
                )}
              </TouchableOpacity>
            </View>

            {/* Categories bar */}
            {categories.length > 0 && (
              <View style={styles.categoriesWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryBadge,
                      selectedCategory === null
                        ? { backgroundColor: themeColors.primary }
                        : { backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(27, 84, 164, 0.08)' },
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === null ? { color: '#ffffff', fontWeight: 'bold' } : { color: themeColors.text },
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.categoryId}
                      style={[
                        styles.categoryBadge,
                        selectedCategory === cat.categoryId
                          ? { backgroundColor: themeColors.primary }
                          : { backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(27, 84, 164, 0.08)' },
                      ]}
                      onPress={() => setSelectedCategory(cat.categoryId)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === cat.categoryId ? { color: '#ffffff', fontWeight: 'bold' } : { color: themeColors.text },
                        ]}
                      >
                        {cat.categoryName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </BlurHeader>

          {/* Series Grid / List */}
          {seriesLoading ? (
            <View style={{ paddingTop: 140 + insets.top }}>
              {isGridView ? (
                <SeriesGridSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
              ) : (
                <SeriesListSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
              )}
            </View>
          ) : filteredSeries.length > 0 ? (
            <FlatList
              key={isGridView ? 'grid' : 'list'}
              style={{ zIndex: isPulling ? 11 : 0 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor={themeColors.primary} 
                  progressViewOffset={Platform.OS === 'android' ? 140 + insets.top : undefined}
                />
              }
              data={filteredSeries}
              keyExtractor={(item) => item.seriesId.toString()}
              numColumns={isGridView ? 2 : 1}
              contentContainerStyle={[
                isGridView ? styles.gridContainer : styles.listContainer, 
                { paddingTop: 140 + insets.top, paddingBottom: 150 + insets.bottom }
              ]}
              renderItem={({ item }) => isGridView ? (
                <TouchableOpacity
                  style={[
                    styles.gridCard, 
                    { 
                      backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
                      borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    }
                  ]}
                  onPress={() => handleSelectSeries(item)}
                >
                  <GlossyOverlay isDark={activeScheme === 'dark'} />
                  {item.seriesCoverUrl ? (
                    <Image source={{ uri: item.seriesCoverUrl }} style={styles.seriesCover} />
                  ) : (
                    <View style={[styles.seriesCoverPlaceholder, { backgroundColor: themeColors.primary }]}>
                      <Music size={32} color="#ffffff" />
                    </View>
                  )}
                  <View style={styles.cardDetails}>
                    <Text style={[styles.seriesName, { color: themeColors.text }]} numberOfLines={2}>
                      {item.seriesName}
                    </Text>
                    <Text style={[styles.trackCount, { color: themeColors.textSecondary }]}>
                      {item.publishedMessagesCount || 0} tracks
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.listCard, 
                    { 
                      backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
                      borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    }
                  ]}
                  onPress={() => handleSelectSeries(item)}
                >
                  <GlossyOverlay isDark={activeScheme === 'dark'} />
                  {item.seriesCoverUrl ? (
                    <Image source={{ uri: item.seriesCoverUrl }} style={styles.listSeriesCover} />
                  ) : (
                    <View style={[styles.listSeriesCoverPlaceholder, { backgroundColor: themeColors.primary }]}>
                      <Music size={24} color="#ffffff" />
                    </View>
                  )}
                  <View style={styles.listCardDetails}>
                    <Text style={[styles.listSeriesName, { color: themeColors.text }]} numberOfLines={1}>
                      {item.seriesName}
                    </Text>
                    <Text style={[styles.listSeriesSpeaker, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {item.speaker || 'Christ Pavilion'}
                    </Text>
                    <Text style={[styles.listTrackCount, { color: themeColors.primary }]}>
                      {item.publishedMessagesCount || 0} tracks
                    </Text>
                    {item.categories && item.categories.length > 0 && (
                      <View style={styles.listCategoriesContainer}>
                        {item.categories.slice(0, 2).map((cat) => (
                          <View key={cat.categoryId} style={[styles.listCategoryTag, { backgroundColor: activeScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(27,84,164,0.08)' }]}>
                            <Text style={[styles.listCategoryTagText, { color: themeColors.textSecondary }]}>
                              {cat.categoryName}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.center}>
              <Text style={{ color: themeColors.textSecondary }}>No teachings or series found.</Text>
            </View>
          )}
        </View>
      )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesWrapper: {
    height: 48,
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingBottom: 100, // room for bottom audio player
  },
  gridCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    maxWidth: (width - 32) / 2,
  },
  seriesCover: {
    width: '100%',
    height: 140,
  },
  seriesCoverPlaceholder: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    padding: 12,
  },
  seriesName: {
    fontSize: 14,
    fontWeight: 'bold',
    height: 38,
  },
  trackCount: {
    fontSize: 12,
    marginTop: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 110,
  },
  backLink: {
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  seriesDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailCover: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  detailCoverPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailMets: {
    fontSize: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  playAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shuffleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  tracksSection: {
    marginTop: 8,
  },
  tracksHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trackPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  trackNumberText: {
    fontSize: 13,
    fontWeight: '600',
    width: 22,
    marginRight: 8,
    textAlign: 'center',
  },
  playIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackTextInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackMetaText: {
    fontSize: 12,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 11,
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  toggleBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
    position: 'relative',
    height: 80,
  },
  listSeriesCover: {
    width: 80,
    height: 80,
  },
  listSeriesCoverPlaceholder: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardDetails: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  listSeriesName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  listSeriesSpeaker: {
    fontSize: 12,
    marginBottom: 4,
  },
  listTrackCount: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  listCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listCategoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listCategoryTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  skeletonLine: {
    borderRadius: 4,
  },
});
