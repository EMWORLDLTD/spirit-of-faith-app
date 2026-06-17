import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, ChurchEvent, EventSession } from '../services/api';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudio } from '../contexts/AudioContext';
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight, User } from 'lucide-react-native';
import BlurHeader from '../components/BlurHeader';

const { width } = Dimensions.get('window');

const EventListSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View style={{ gap: 16, paddingHorizontal: 16 }}>
    {[1, 2, 3].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.eventItemCard,
          {
            borderColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
            marginBottom: 12,
          }
        ]}
      >
        <View style={[styles.eventBannerImage, { backgroundColor: themeColors.textSecondary, opacity: 0.15 }]} />
        <View style={[styles.eventItemDetails, { flex: 1, paddingVertical: 12 }]}>
          <View style={[styles.skeletonLine, { width: '80%', height: 16, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6, marginBottom: 6 }]} />
          <View style={[styles.skeletonLine, { width: '60%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
        <View style={styles.chevronBox}>
          <View style={[styles.skeletonLine, { width: 14, height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 7 }]} />
        </View>
      </Animated.View>
    ))}
  </View>
);

const EventScheduleSkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View style={styles.timelineContainer}>
    {[1, 2, 3].map((i, index) => (
      <Animated.View key={i} style={[styles.timelineNode, { opacity: pulseAnim }]}>
        {/* Left Timeline bar */}
        <View style={styles.timelineIndicators}>
          <View style={[styles.timelineDot, { backgroundColor: themeColors.border || '#e2e8f0' }]} />
          {index < 2 && (
            <View style={[styles.timelineLine, { backgroundColor: themeColors.border || '#e2e8f0' }]} />
          )}
        </View>

        {/* Right Timeline Content */}
        <View style={[
          styles.timelineCard,
          {
            backgroundColor: themeColors.backgroundElement,
            borderColor: themeColors.border || '#e2e8f0',
          }
        ]}>
          <View style={[styles.skeletonLine, { width: '80%', height: 15, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
      </Animated.View>
    ))}
  </View>
);

let eventsMainCache: ChurchEvent[] | null = null;
const eventSessionsCache: Record<string, EventSession[]> = {};

export default function EventsScreen() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const insets = useSafeAreaInsets();
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const autoSelectedRef = useRef<string | null>(null);

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected event for session timeline view
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedEvent) {
      await handleSelectEvent(selectedEvent, true);
    } else {
      await fetchEvents(true);
    }
    setRefreshing(false);
  };

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loading || sessionsLoading) {
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
  }, [loading, sessionsLoading]);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle deep link / parameter passing for auto-selecting an event from the Home screen
  useEffect(() => {
    if (events.length > 0) {
      if (eventId) {
        if (autoSelectedRef.current !== eventId) {
          const matchedEvent = events.find(e => String(e.eventId) === String(eventId));
          if (matchedEvent) {
            autoSelectedRef.current = String(eventId);
            handleSelectEvent(matchedEvent);
          }
        }
      } else {
        autoSelectedRef.current = null;
      }
    }
  }, [events, eventId]);

  const fetchEvents = async (forceRefresh = false) => {
    if (!forceRefresh && eventsMainCache) {
      setEvents(eventsMainCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiService.getUpcomingEvents(forceRefresh);
      setEvents(data);
      eventsMainCache = data;
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (event: ChurchEvent, forceRefresh = false) => {
    setSelectedEvent(event);
    const cacheKey = String(event.eventId);
    if (!forceRefresh && eventSessionsCache[cacheKey]) {
      setSessions(eventSessionsCache[cacheKey]);
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    try {
      const sessionsData = await apiService.getSessions(event.eventId);
      setSessions(sessionsData);
      eventSessionsCache[cacheKey] = sessionsData;
    } catch (error) {
      console.error('Error fetching event sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    // If it's a full ISO string, parse it
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {}
    return timeStr; // fallback to raw string if it's already a time string (e.g. 09:00 AM)
  };

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      {selectedEvent ? (
        /* SESSIONS TIMELINE VIEW */
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: 150 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
          }
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedEvent(null);
              setSessions([]);
              autoSelectedRef.current = null;
              try {
                router.setParams({ eventId: undefined });
              } catch (e) {
                console.warn('Error clearing eventId params:', e);
              }
            }}
            style={styles.backLink}
          >
            <ChevronLeft size={16} color={themeColors.primary} />
            <Text style={{ color: themeColors.primary, fontWeight: '500', marginLeft: 4 }}>Back to Events</Text>
          </TouchableOpacity>

          {selectedEvent.bannerImageUrl ? (
            <Image source={{ uri: selectedEvent.bannerImageUrl }} style={styles.detailBanner} />
          ) : (
            <View style={[styles.detailBannerPlaceholder, { backgroundColor: themeColors.primary }]}>
              <Calendar size={48} color="#ffffff" />
            </View>
          )}

          <View style={styles.eventInfoSection}>
            <Text style={[styles.detailTitle, { color: themeColors.text }]}>{selectedEvent.title}</Text>
            
            <View style={styles.detailRow}>
              <Calendar size={16} color={themeColors.primary} />
              <Text style={[styles.detailRowText, { color: themeColors.text }]}>
                {formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={16} color={themeColors.primary} />
              <Text style={[styles.detailRowText, { color: themeColors.text }]}>
                {selectedEvent.location}
              </Text>
            </View>

            <Text style={[styles.detailDesc, { color: themeColors.textSecondary }]}>
              {selectedEvent.description}
            </Text>
          </View>

          <View style={styles.timelineSection}>
            <Text style={[styles.timelineHeader, { color: themeColors.text }]}>Program Schedule</Text>

            {sessionsLoading ? (
              <EventScheduleSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
            ) : sessions.length > 0 ? (
              <View style={styles.timelineContainer}>
                {sessions.map((session, index) => (
                  <View key={session.sessionId} style={styles.timelineNode}>
                    {/* Left Timeline bar */}
                    <View style={styles.timelineIndicators}>
                      <View style={[styles.timelineDot, { backgroundColor: themeColors.primary }]} />
                      {index < sessions.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: themeColors.border }]} />
                      )}
                    </View>

                    {/* Right Timeline Content */}
                    <View style={[
                      styles.timelineCard, 
                      { 
                        backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
                        borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      }
                    ]}>
                      <Text style={[styles.sessionTitle, { color: themeColors.text }]}>
                        {session.title}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <Clock size={12} color={themeColors.textSecondary} />
                        <Text style={[styles.sessionMetaText, { color: themeColors.textSecondary }]}>
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </Text>
                      </View>
                      {session.topic && (
                        <Text style={[styles.sessionTopic, { color: themeColors.textSecondary }]}>
                          Topic: {session.topic}
                        </Text>
                      )}
                      {session.speaker && (
                        <View style={styles.speakerRow}>
                          <User size={12} color={themeColors.primary} />
                          <Text style={[styles.speakerText, { color: themeColors.primary }]}>
                            {session.speaker}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: themeColors.textSecondary, marginTop: 10 }]}>
                No sessions scheduled for this event.
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        /* MAIN EVENTS LIST VIEW */
        <View style={{ flex: 1 }}>
          {/* Custom Header */}
          <BlurHeader isDark={activeScheme === 'dark'}>
            <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={() => router.navigate('/more')} style={styles.backBtn}>
                <ChevronLeft size={24} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: themeColors.text }]}>Upcoming Events</Text>
              <View style={styles.headerSpacer} />
            </View>
          </BlurHeader>

          {loading ? (
            <View style={{ paddingTop: 72 + insets.top }}>
              <EventListSkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
            </View>
          ) : events.length > 0 ? (
             <FlatList
              data={events}
              style={{ zIndex: isPulling ? 11 : 0 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor={themeColors.primary} 
                  progressViewOffset={Platform.OS === 'android' ? 72 + insets.top : undefined}
                />
              }
              keyExtractor={(item) => item.eventId.toString()}
              contentContainerStyle={[styles.listContainer, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.eventItemCard, 
                    { 
                      backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
                      borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    }
                  ]}
                  onPress={() => handleSelectEvent(item)}
                >
                  {item.bannerImageUrl ? (
                    <Image source={{ uri: item.bannerImageUrl }} style={styles.eventBannerImage} />
                  ) : (
                    <View style={[styles.bannerPlaceholder, { backgroundColor: themeColors.primary }]}>
                      <Calendar size={36} color="#ffffff" />
                    </View>
                  )}
                  <View style={styles.eventItemDetails}>
                    <Text style={[styles.eventItemTitle, { color: themeColors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.eventItemMeta}>
                      <Calendar size={13} color={themeColors.textSecondary} />
                      <Text style={[styles.eventItemMetaText, { color: themeColors.textSecondary }]}>
                        {formatDate(item.startDate)}
                      </Text>
                    </View>
                    <View style={styles.eventItemMeta}>
                      <MapPin size={13} color={themeColors.textSecondary} />
                      <Text style={[styles.eventItemMetaText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.chevronBox}>
                    <ChevronRight size={20} color={themeColors.textSecondary} />
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.center}>
              <Text style={{ color: themeColors.textSecondary }}>No upcoming events scheduled.</Text>
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
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 36,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 100, // room for bottom audio player
  },
  eventItemCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    height: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventBannerImage: {
    width: 110,
    height: 110,
  },
  bannerPlaceholder: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventItemDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  eventItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  eventItemMetaText: {
    fontSize: 12,
    marginLeft: 6,
  },
  chevronBox: {
    justifyContent: 'center',
    paddingRight: 12,
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
  detailBanner: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  detailBannerPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfoSection: {
    marginTop: 20,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailRowText: {
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },
  detailDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  timelineSection: {
    marginTop: 32,
  },
  timelineHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineNode: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicators: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
    marginTop: 16,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionMetaText: {
    fontSize: 12,
    marginLeft: 6,
  },
  sessionTopic: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  speakerText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  skeletonLine: {
    borderRadius: 4,
  },
});
