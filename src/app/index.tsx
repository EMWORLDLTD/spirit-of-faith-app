import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { apiService, Devotional, Message, ChurchEvent, Category, Series } from '../services/api';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import {
  BookOpen,
  Play,
  Calendar,
  MapPin,
  ArrowRight,
  Radio,
  CreditCard,
  Bell,
  X,
  Copy,
  ChevronRight,
  Check,
  Search,
  Sun,
  Moon,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Church Account Details for Giving
const CHURCH_ACCOUNTS = [
  {
    bankName: 'Guaranty Trust Bank (GTB)',
    accountName: 'Christ Pavilion Church',
    accountNumber: '0124578963',
  },
  {
    bankName: 'Zenith Bank',
    accountName: 'Christ Pavilion (Media Ministry)',
    accountNumber: '1012345678',
  },
];

// Glossy glass reflection overlay for premium card backgrounds
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

const DevotionalSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <Animated.View style={[styles.devotionalCardFallback, { borderColor: themeColors.border || '#e2e8f0', opacity: pulseAnim }]}>
    <View style={[styles.skeletonLine, { width: '40%', height: 16, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 8, marginBottom: 16 }]} />
    <View style={[styles.skeletonLine, { width: '80%', height: 24, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 8, marginBottom: 12 }]} />
    <View style={[styles.skeletonLine, { width: '60%', height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 8, marginBottom: 12 }]} />
    <View style={[styles.skeletonLine, { width: '100%', height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.15, borderRadius: 8, marginBottom: 8 }]} />
    <View style={[styles.skeletonLine, { width: '90%', height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.15, borderRadius: 8, marginBottom: 8 }]} />
  </Animated.View>
);

const MessageSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
    {[1, 2, 3].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.messageCard,
          {
            borderColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
          }
        ]}
      >
        <View style={[styles.audioThumbnail, { backgroundColor: themeColors.textSecondary, opacity: 0.15 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 14, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginTop: 10, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
      </Animated.View>
    ))}
  </ScrollView>
);

const EventSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View>
    {[1, 2].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.eventCard,
          {
            borderColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
            flexDirection: 'row',
          }
        ]}
      >
        <View style={[styles.eventImage, { backgroundColor: themeColors.textSecondary, opacity: 0.15 }]} />
        <View style={[styles.eventDetails, { flex: 1, paddingVertical: 10 }]}>
          <View style={[styles.skeletonLine, { width: '80%', height: 16, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6, marginBottom: 6 }]} />
          <View style={[styles.skeletonLine, { width: '60%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
      </Animated.View>
    ))}
  </View>
);

export default function HomeScreen() {
  const systemScheme = useColorScheme();
  const { playTrack, themeMode, setThemeMode, isDownloaded } = useAudio();
  const insets = useSafeAreaInsets();

  const pathname = usePathname();

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  // Core content states
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEvent[]>([]);

  // Search states
  const [isSearching, setIsSearching] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  // Modal visibility states
  const [givingModalVisible, setGivingModalVisible] = useState(false);
  const [announcementsModalVisible, setAnnouncementsModalVisible] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loading) {
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
  }, [loading]);

  const fetchData = async () => {
    try {
      const [devResult, msgResult, eventResult, seriesResult] = await Promise.allSettled([
        apiService.getTodaysDevotional(),
        apiService.getRecentMessages(100),
        apiService.getUpcomingEvents(),
        apiService.getAllSeries(),
      ]);

      if (devResult.status === 'fulfilled') {
        setDevotional(devResult.value);
      }
      
      let allSeries: Series[] = [];
      if (seriesResult.status === 'fulfilled') {
        allSeries = seriesResult.value;
      }

      if (msgResult.status === 'fulfilled') {
        const mappedMsgs = msgResult.value.map((m: Message) => {
          if (!m.coverUrl && m.seriesId) {
            const series = allSeries.find(s => String(s.seriesId) === String(m.seriesId));
            if (series && series.seriesCoverUrl) {
              return { ...m, coverUrl: series.seriesCoverUrl };
            }
          }
          return m;
        });
        setAllMessages(mappedMsgs);
        setRecentMessages(mappedMsgs.slice(0, 5));
      }
      if (eventResult.status === 'fulfilled') {
        setUpcomingEvents(eventResult.value.slice(0, 3)); // show top 3
      }
    } catch (error) {
      console.error('Error fetching home screen data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectSermon = (track: Message) => {
    router.push({
      pathname: '/teachings',
      params: {
        autoSelectSeriesId: track.seriesId ? String(track.seriesId) : undefined,
        autoSelectMessageId: String(track.messageId),
      }
    });
  };

  // Play Live Radio (dummy stream linked to global player)
  const handlePlayLiveRadio = () => {
    const liveRadioTrack: Message = {
      messageId: -999, // Special identifier for radio
      title: 'Live Service Broadcast',
      speaker: 'Christ Pavilion Live',
      audioUrl: 'http://stream.zeno.fm/0w8cz4s6e0hvv', // ZenoRadio stream url
      publishedDate: new Date().toISOString(),
    };
    playTrack(liveRadioTrack, [liveRadioTrack]);
    Alert.alert('Live Radio Started', 'Connecting to Christ Pavilion Live Broadcast...');
  };

  const handleCopyAccount = async (accountNumber: string) => {
    await Clipboard.setStringAsync(accountNumber);
    if (Platform.OS === 'android') {
      Alert.alert('Copied', 'Account number copied to clipboard.');
    } else {
      Alert.alert('Copied', 'Account number copied to clipboard.');
    }
  };


  const filteredMessages = allMessages.filter(msg => 
    msg.title.toLowerCase().includes(homeSearchQuery.toLowerCase()) ||
    (msg.speaker && msg.speaker.toLowerCase().includes(homeSearchQuery.toLowerCase()))
  );

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
          }
        >
          {/* Welcome Header or Search Header */}
          <View style={styles.header}>
            {isSearching ? (
              <View style={[styles.searchContainer, { backgroundColor: themeColors.backgroundElement }]}>
                <Search size={18} color={themeColors.textSecondary} style={{ marginLeft: 12 }} />
                <TextInput
                  style={[styles.searchInput, { color: themeColors.text }]}
                  placeholder="Search teachings..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={homeSearchQuery}
                  onChangeText={setHomeSearchQuery}
                  autoFocus
                />
                <TouchableOpacity 
                  style={styles.searchCloseBtn}
                  onPress={() => {
                    setIsSearching(false);
                    setHomeSearchQuery('');
                  }}
                >
                  <X size={18} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.headerLeft}>
                  <Text style={[styles.welcomeText, { color: themeColors.text }]}>Welcome Back</Text>
                  <Text style={[styles.subText, { color: themeColors.textSecondary }]}>
                    Nourishing your faith today
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity 
                    style={[styles.bellBtn, { backgroundColor: themeColors.backgroundElement }]}
                    onPress={() => setThemeMode(activeScheme === 'dark' ? 'light' : 'dark')}
                    activeOpacity={0.7}
                  >
                    {activeScheme === 'dark' ? (
                      <Sun size={20} color={themeColors.text} />
                    ) : (
                      <Moon size={20} color={themeColors.text} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.bellBtn, { backgroundColor: themeColors.backgroundElement }]}
                    onPress={() => setAnnouncementsModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Bell size={20} color={themeColors.text} />
                    <View style={styles.bellBadge} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {isSearching ? (
            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              {homeSearchQuery.trim() === '' ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>
                    Type to search teachings...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.sectionTitleHeader, { color: themeColors.text, marginBottom: 16 }]}>
                    Search Results ({filteredMessages.length})
                  </Text>
                  {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg) => (
                      <TouchableOpacity
                        key={msg.messageId}
                        style={[
                          styles.searchResultCard, 
                          { 
                            backgroundColor: themeColors.backgroundElement,
                            borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                          }
                        ]}
                        onPress={() => {
                          playTrack(msg, filteredMessages);
                        }}
                      >
                        <GlossyOverlay isDark={activeScheme === 'dark'} />
                        {msg.coverUrl ? (
                          <Image source={{ uri: msg.coverUrl }} style={styles.searchResultImage} />
                        ) : (
                          <View style={[styles.searchResultPlaceholder, { backgroundColor: themeColors.primary }]}>
                            <Play size={20} color="#ffffff" />
                          </View>
                        )}
                        <View style={styles.searchResultDetails}>
                          <Text style={[styles.searchResultTitle, { color: themeColors.text }]} numberOfLines={2}>
                            {msg.title}
                          </Text>
                          <Text style={[styles.searchResultSpeaker, { color: themeColors.textSecondary }]}>
                            {msg.speaker || 'Pastor'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                     <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>
                        No results found for &quot;{homeSearchQuery}&quot;
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <>
              {/* Daily Devotional Card (Linear Gradient Style) */}
              <View style={styles.section}>
                {loading ? (
                  <DevotionalSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
                ) : devotional && devotional.title && devotional.content ? (
                  <TouchableOpacity
                    style={styles.devotionalTouch}
                    onPress={() => router.push('/devotionals')}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={activeScheme === 'dark' ? ['rgba(15, 23, 42, 0.65)', 'rgba(27, 84, 164, 0.25)'] : ['#ffffff', '#f3f8fe']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.devotionalGradient, { borderWidth: 1, borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0', borderRadius: 18, overflow: 'hidden' }]}
                    >
                      {/* Glossy light reflection */}
                      <LinearGradient
                        colors={activeScheme === 'dark'
                          ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)', 'transparent']
                          : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.2)', 'transparent']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.7, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', borderTopLeftRadius: 18, borderTopRightRadius: 18 }}
                      />
                      <View style={[styles.devotionalBadge, { backgroundColor: activeScheme === 'dark' ? 'rgba(27, 84, 164, 0.25)' : 'rgba(27, 84, 164, 0.1)' }]}>
                        <BookOpen size={14} color={themeColors.primary} />
                        <Text style={[styles.devotionalBadgeText, { color: themeColors.primary }]}>TODAY&apos;S WORD</Text>
                      </View>
                      <Text style={[styles.devotionalTitle, { color: themeColors.text }]}>{devotional.title}</Text>
                      <Text style={[styles.devotionalDate, { color: themeColors.textSecondary }]}>{devotional.date}</Text>
                      <Text style={[styles.devotionalExcerpt, { color: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.75)' : '#334155' }]} numberOfLines={3}>
                        {(devotional.content || '').replace(/<[^>]*>/g, '')}
                      </Text>
                      <View style={styles.devotionalFooter}>
                        <Text style={[styles.readNowText, { color: themeColors.primary }]}>Read Devotional</Text>
                        <ArrowRight size={14} color={themeColors.primary} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.devotionalCardFallback, { borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0' }]}>
                    <GlossyOverlay isDark={activeScheme === 'dark'} />
                    <Text style={[styles.devotionalTitleFallback, { color: themeColors.text }]}>Nourishing Your Faith</Text>
                    <Text style={[styles.devotionalExcerptFallback, { color: themeColors.textSecondary }]}>
                      Stay tuned for today&apos;s daily devotional. Pull down to refresh.
                    </Text>
                  </View>
                )}
              </View>

              {/* Quick Action Grid (3-Tiles) */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitleHeader, { color: themeColors.text }]}>Quick Toolbox</Text>
                <View style={styles.gridRow}>
                  {/* Live Radio */}
                  <TouchableOpacity 
                    style={[
                      styles.gridTile, 
                      { 
                        borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                        shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                      }
                    ]}
                    onPress={handlePlayLiveRadio}
                  >
                    <GlossyOverlay isDark={activeScheme === 'dark'} />
                    <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(225, 29, 72, 0.1)' }]}>
                      <Radio size={22} color="#e11d48" />
                    </View>
                    <Text 
                      style={[styles.tileText, { color: themeColors.text }]} 
                      numberOfLines={1}
                    >
                      Live Radio
                    </Text>
                  </TouchableOpacity>

                  {/* Find a Branch */}
                  <TouchableOpacity 
                    style={[
                      styles.gridTile, 
                      { 
                        borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                        shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                      }
                    ]}
                    onPress={() => router.navigate('/locations')}
                  >
                    <GlossyOverlay isDark={activeScheme === 'dark'} />
                    <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <MapPin size={22} color="#10b981" />
                    </View>
                    <Text 
                      style={[styles.tileText, { color: themeColors.text }]} 
                      numberOfLines={1}
                    >
                      Find Branch
                    </Text>
                  </TouchableOpacity>

                  {/* Giving */}
                  <TouchableOpacity 
                    style={[
                      styles.gridTile, 
                      { 
                        borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                        shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                      }
                    ]}
                    onPress={() => setGivingModalVisible(true)}
                  >
                    <GlossyOverlay isDark={activeScheme === 'dark'} />
                    <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <CreditCard size={22} color="#f59e0b" />
                    </View>
                    <Text 
                      style={[styles.tileText, { color: themeColors.text }]} 
                      numberOfLines={1}
                    >
                      Giving
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recent Messages (Teachings List) */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Teachings</Text>
                  <TouchableOpacity onPress={() => router.push('/teachings')} style={styles.seeAllButton}>
                    <Text style={[styles.seeAllLink, { color: themeColors.primary }]}>All Teachings</Text>
                    <ArrowRight size={14} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <MessageSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
                ) : recentMessages.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {recentMessages.map((msg) => (
                      <TouchableOpacity
                        key={msg.messageId}
                        style={[
                          styles.messageCard, 
                          { 
                            borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                            shadowRadius: 6,
                            elevation: 1,
                          }
                        ]}
                        onPress={() => handleSelectSermon(msg)}
                      >
                        <GlossyOverlay isDark={activeScheme === 'dark'} />
                        <View style={{ position: 'relative' }}>
                          {msg.coverUrl ? (
                            <Image source={{ uri: msg.coverUrl }} style={styles.audioThumbnail} />
                          ) : (
                            <View style={[styles.audioThumbnail, { backgroundColor: themeColors.primary }]}>
                              <Play size={24} color="#ffffff" />
                            </View>
                          )}
                          {isDownloaded(msg) && (
                            <View style={styles.downloadBadgeMini}>
                              <Check size={10} color="#ffffff" strokeWidth={3} />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.messageTitle, { color: themeColors.text }]} numberOfLines={2}>
                          {msg.title}
                        </Text>
                        <Text style={[styles.messageSpeaker, { color: themeColors.textSecondary }]}>
                          {msg.speaker || 'Pastor'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                    No teachings found. Pull to refresh.
                  </Text>
                )}
              </View>

              {/* Upcoming Events */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Upcoming Events</Text>
                  <TouchableOpacity onPress={() => router.push('/events')} style={styles.seeAllButton}>
                    <Text style={[styles.seeAllLink, { color: themeColors.primary }]}>All Events</Text>
                    <ArrowRight size={14} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <EventSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
                ) : upcomingEvents.length > 0 ? (
                  upcomingEvents.map((evt) => (
                    <TouchableOpacity
                      key={evt.eventId}
                      style={[
                        styles.eventCard, 
                        { 
                          borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                          shadowRadius: 6,
                          elevation: 1,
                        }
                      ]}
                      onPress={() => router.push('/events')}
                    >
                      <GlossyOverlay isDark={activeScheme === 'dark'} />
                      {evt.bannerImageUrl ? (
                        <Image source={{ uri: evt.bannerImageUrl }} style={styles.eventImage} />
                      ) : (
                        <View style={[styles.eventPlaceholder, { backgroundColor: themeColors.primary }]} />
                      )}
                      <View style={styles.eventDetails}>
                        <Text style={[styles.eventTitle, { color: themeColors.text }]} numberOfLines={1}>
                          {evt.title}
                        </Text>
                        <View style={styles.eventInfoRow}>
                          <Calendar size={12} color={themeColors.textSecondary} />
                          <Text style={[styles.eventInfoText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                            {new Date(evt.startDate).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.eventInfoRow}>
                          <MapPin size={12} color={themeColors.textSecondary} />
                          <Text style={[styles.eventInfoText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                            {evt.location}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                    No upcoming events at this time.
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* GIVING ACCOUNT DETAILS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={givingModalVisible}
        onRequestClose={() => setGivingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Church Giving Accounts</Text>
              <TouchableOpacity 
                style={styles.closeModalBtn} 
                onPress={() => setGivingModalVisible(false)}
              >
                <X size={20} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
              You can support the church ministry by transferring tithes, offerings, or donations to any of the accounts below:
            </Text>

            {CHURCH_ACCOUNTS.map((acc, index) => (
              <View 
                key={index}
                style={[styles.accountCard, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
              >
                <View style={styles.accountCardHeader}>
                  <Text style={[styles.accountBank, { color: themeColors.primary }]}>{acc.bankName}</Text>
                  <TouchableOpacity 
                    style={styles.copyBtn} 
                    onPress={() => handleCopyAccount(acc.accountNumber)}
                  >
                    <Copy size={16} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.accountLabel, { color: themeColors.textSecondary }]}>Account Number:</Text>
                <Text style={[styles.accountNumber, { color: themeColors.text }]}>{acc.accountNumber}</Text>
                <Text style={[styles.accountLabel, { color: themeColors.textSecondary }]}>Account Name:</Text>
                <Text style={[styles.accountName, { color: themeColors.text }]}>{acc.accountName}</Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* ANNOUNCEMENTS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={announcementsModalVisible}
        onRequestClose={() => setAnnouncementsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Announcements</Text>
              <TouchableOpacity 
                style={styles.closeModalBtn} 
                onPress={() => setAnnouncementsModalVisible(false)}
              >
                <X size={20} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.announcementsList} showsVerticalScrollIndicator={false}>
              <View style={[styles.announcementItem, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.announcementTitle, { color: themeColors.text }]}>Welcome to Christ Pavilion!</Text>
                <Text style={[styles.announcementDate, { color: themeColors.textSecondary }]}>June 5, 2026</Text>
                <Text style={[styles.announcementDesc, { color: themeColors.textSecondary }]}>
                  We are delighted to welcome you to our official mobile app. Browse daily devotionals, stream teachings, and keep up with our branches!
                </Text>
              </View>

              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((evt) => (
                  <View 
                    key={evt.eventId}
                    style={[styles.announcementItem, { borderBottomColor: themeColors.border }]}
                  >
                    <Text style={[styles.announcementTitle, { color: themeColors.text }]}>{evt.title}</Text>
                    <Text style={[styles.announcementDate, { color: themeColors.textSecondary }]}>
                      Starts: {new Date(evt.startDate).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.announcementDesc, { color: themeColors.textSecondary }]} numberOfLines={2}>
                      {evt.description}
                    </Text>
                    <TouchableOpacity 
                      style={styles.eventLink}
                      onPress={() => {
                        setAnnouncementsModalVisible(false);
                        router.push('/events');
                      }}
                    >
                      <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 13 }}>View Details</Text>
                      <ChevronRight size={14} color={themeColors.primary} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.center}>
                  <Text style={{ color: themeColors.textSecondary, fontStyle: 'italic', marginVertical: 20 }}>
                    No announcements at this time.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 110, // room for floating audio player
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 14,
    marginTop: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e11d48', // bright rose notification dot
  },
  section: {
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  sectionTitleHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  devotionalTouch: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  devotionalGradient: {
    padding: 24,
  },
  devotionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  devotionalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 6,
  },
  devotionalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  devotionalDate: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 16,
  },
  devotionalExcerpt: {
    fontSize: 14,
    lineHeight: 22,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 20,
  },
  devotionalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readNowText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },
  devotionalCardFallback: {
    borderRadius: 18,
    overflow: 'hidden',
    padding: 24,
    borderWidth: 1,
  },
  devotionalTitleFallback: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  devotionalExcerptFallback: {
    fontSize: 14,
    lineHeight: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridTile: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  tileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tileText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  messageCard: {
    width: width * 0.4,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  audioThumbnail: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  messageTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    height: 36,
  },
  messageSpeaker: {
    fontSize: 11,
    textAlign: 'center',
  },
  downloadBadgeMini: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    height: 90,
  },
  eventImage: {
    width: 90,
    height: 90,
  },
  eventPlaceholder: {
    width: 90,
    height: 90,
  },
  eventDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventInfoText: {
    fontSize: 11,
    marginLeft: 6,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    padding: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  accountCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountBank: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  copyBtn: {
    padding: 6,
  },
  accountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
  },
  announcementsList: {
    marginTop: 10,
  },
  announcementItem: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 11,
    marginBottom: 8,
  },
  announcementDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  eventLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  searchCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    height: 80,
    alignItems: 'center',
    position: 'relative',
  },
  searchResultImage: {
    width: 80,
    height: 80,
  },
  searchResultPlaceholder: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultDetails: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchResultSpeaker: {
    fontSize: 11,
  },
  skeletonLine: {
    borderRadius: 4,
  },
});
