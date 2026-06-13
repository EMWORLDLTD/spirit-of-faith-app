import React, { useState, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Dimensions,
  Animated,
  RefreshControl,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, Devotional } from '../services/api';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { useAudio } from '../contexts/AudioContext';
import { Share2, Calendar, BookOpen, ChevronRight, ChevronLeft, MoreVertical, Copy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BlurHeader from '../components/BlurHeader';

const { width } = Dimensions.get('window');

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const DevotionalDetailSkeleton = ({ themeColors, pulseAnim, insets }: { themeColors: any; pulseAnim: any; insets: any }) => (
  <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 112 + insets.top, paddingBottom: 150 + insets.bottom }]} showsVerticalScrollIndicator={false}>
    <Animated.View style={{ opacity: pulseAnim }}>
      {/* Header */}
      <View style={[styles.devotionalHeader, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
        <View style={[styles.skeletonLine, { width: '75%', height: 26, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 8, marginBottom: 12 }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.skeletonLine, { width: 14, height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 7 }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
      </View>
      
      {/* Bible Box */}
      <View style={[
        styles.bibleBox,
        {
          backgroundColor: themeColors.backgroundElement,
          borderColor: themeColors.border || '#e2e8f0',
        }
      ]}>
        <View style={[styles.skeletonLine, { width: '40%', height: 16, backgroundColor: themeColors.primary, opacity: 0.2, borderRadius: 6, marginBottom: 12 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.15, borderRadius: 6 }]} />
      </View>

      {/* Body lines */}
      <View style={{ marginVertical: 20, gap: 10 }}>
        <View style={[styles.skeletonLine, { width: '100%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: '95%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: '98%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: '85%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: '92%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
      </View>

      {/* Confession Box */}
      <View style={[
        styles.confessionBox,
        {
          backgroundColor: themeColors.backgroundElement,
          borderColor: themeColors.border || '#e2e8f0',
        }
      ]}>
        <View style={[styles.skeletonLine, { width: '50%', height: 14, backgroundColor: themeColors.primary, opacity: 0.2, borderRadius: 6, marginBottom: 10 }]} />
        <View style={[styles.skeletonLine, { width: '100%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 14, backgroundColor: themeColors.text, opacity: 0.15, borderRadius: 6 }]} />
      </View>
    </Animated.View>
  </ScrollView>
);

const DevotionalHistorySkeleton = ({ themeColors, pulseAnim }: { themeColors: any; pulseAnim: any }) => (
  <View style={{ paddingHorizontal: 20, gap: 16 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.historyRow,
          {
            borderBottomColor: themeColors.border || '#e2e8f0',
            opacity: pulseAnim,
            paddingVertical: 16,
          }
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={[styles.skeletonLine, { width: '70%', height: 15, backgroundColor: themeColors.text, opacity: 0.2, borderRadius: 6, marginBottom: 6 }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 12, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 6 }]} />
        </View>
        <View style={[styles.skeletonLine, { width: 14, height: 14, backgroundColor: themeColors.textSecondary, opacity: 0.2, borderRadius: 7 }]} />
      </Animated.View>
    ))}
  </View>
);

interface DevotionalCacheEntry {
  data: Devotional[];
  hasMore: boolean;
}

const devotionalHistoryCache: Record<string, DevotionalCacheEntry> = {};
let todayDevotionalCache: Devotional | null = null;

export default function DevotionalsScreen() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const insets = useSafeAreaInsets();
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  
  // Today's devotional state
  const [todayDevotional, setTodayDevotional] = useState<Devotional | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);

  // History state
  const [historyDevotionals, setHistoryDevotionals] = useState<Devotional[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyDevotional = async (dev: Devotional) => {
    if (!dev) return;
    const cleanContent = dev.content ? cleanContentText(dev.content) : '';
    const textToCopy = `${dev.title}\n${dev.date || ''}\n\nBible Reading: ${dev.bibleReading || ''}\n\n${cleanContent}\n\n${dev.confession || dev.prayer || ''}`;
    await Clipboard.setStringAsync(textToCopy);
    Alert.alert('Copied', 'Devotional text copied to clipboard.');
  };

  const handleCopyScripture = async (dev: Devotional) => {
    if (!dev || !dev.bibleReading) return;
    const textToCopy = `${dev.bibleReading}${dev.bibleVerse ? `\n"${dev.bibleVerse}"` : ''}`;
    await Clipboard.setStringAsync(textToCopy);
    Alert.alert('Copied', 'Scripture reading copied to clipboard.');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'today') {
      await fetchTodayDevotional(true);
    } else {
      await fetchHistoryDevotionals(true);
    }
    setRefreshing(false);
  };

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Active expanded history devotional
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);

  const monthsScrollRef = React.useRef<ScrollView>(null);

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (todayLoading || historyLoading) {
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
  }, [todayLoading, historyLoading]);

  useEffect(() => {
    fetchTodayDevotional();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryDevotionals();
    }
  }, [activeTab, selectedMonth, selectedYear, historyPage]);

  useEffect(() => {
    if (activeTab === 'history' && monthsScrollRef.current) {
      const timer = setTimeout(() => {
        const approxWidth = 95;
        const offset = Math.max(0, (selectedMonth - 1) * approxWidth - width / 2 + 50);
        monthsScrollRef.current?.scrollTo({ x: offset, animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedMonth]);

  const fetchTodayDevotional = async (forceRefresh = false) => {
    if (!forceRefresh && todayDevotionalCache) {
      setTodayDevotional(todayDevotionalCache);
      setTodayLoading(false);
      return;
    }
    setTodayLoading(true);
    try {
      const data = await apiService.getTodaysDevotional();
      setTodayDevotional(data);
      todayDevotionalCache = data;
    } catch (error) {
      console.error('Error fetching today\'s devotional:', error);
    } finally {
      setTodayLoading(false);
    }
  };

  const fetchHistoryDevotionals = async (forceRefresh = false) => {
    const cacheKey = `${selectedYear}-${selectedMonth}-page-${historyPage}`;
    if (!forceRefresh && devotionalHistoryCache[cacheKey]) {
      const cached = devotionalHistoryCache[cacheKey];
      setHistoryDevotionals(cached.data);
      setHasMoreHistory(cached.hasMore);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const result = await apiService.getDevotionals(
        historyPage,
        10,
        String(selectedMonth).padStart(2, '0'),
        String(selectedYear)
      );
      const data = result.data || [];
      const hasMore = data.length === 10;
      setHistoryDevotionals(data);
      setHasMoreHistory(hasMore);
      devotionalHistoryCache[cacheKey] = { data, hasMore };
    } catch (error) {
      console.error('Error fetching devotional history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleShare = async (dev: Devotional) => {
    try {
      const appName = Constants.expoConfig?.name || 'Our';
      const plainContent = cleanContentText(dev.content);
      
      let mainBody = plainContent;
      let confessionText = dev.confession || dev.prayer || '';
      
      const confessionRegex = /\bconfession\b/i;
      const match = plainContent.match(confessionRegex);
      if (match && match.index !== undefined) {
        mainBody = plainContent.substring(0, match.index).trim();
        confessionText = plainContent.substring(match.index + match[0].length).replace(/^[:\s\-*#]+/g, '').trim();
      }
      
      const bibleReadingText = dev.bibleReading || 'N/A';
      const bibleVerseText = dev.bibleVerse ? `\n"${dev.bibleVerse}"` : '';
      const shareMessage = `*${dev.title}*\n${dev.date}\n\n*Bible Reading:*\n${bibleReadingText}${bibleVerseText}\n\n${mainBody}\n\n*Prayer/Confession:*\n${confessionText}\n\nShared via ${appName} App.`;
      
      await Share.share({
        message: shareMessage,
        title: dev.title,
      });
    } catch (error) {
      console.error('Error sharing devotional:', error);
    }
  };

  const changeYear = (amount: number) => {
    setSelectedYear(prev => prev + amount);
    setHistoryPage(1);
  };

  // Helper to remove HTML tags from raw content
  const cleanContentText = (htmlContent: string) => {
    if (!htmlContent) return '';
    return htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  const activeDev = selectedDevotional || (activeTab === 'today' ? todayDevotional : null);

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      
      {/* Absolute Glassmorphic Header */}
      <BlurHeader isDark={activeScheme === 'dark'}>
        {/* Title Bar */}
        <View style={[
          styles.titleRow,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }
        ]}>
          {selectedDevotional ? (
            <TouchableOpacity 
              onPress={() => setSelectedDevotional(null)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              <ChevronLeft size={24} color={themeColors.text} />
              <Text style={{ color: themeColors.text, fontWeight: '600', marginLeft: 4, fontSize: 16 }}>Back</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Devotional</Text>
          )}

          {activeDev && (
            <TouchableOpacity 
              onPress={() => setShowMenu(!showMenu)} 
              style={{ padding: 8 }}
            >
              <MoreVertical size={22} color={themeColors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Tab Control */}
        {!selectedDevotional && (
          <View style={styles.selectorWrapper}>
            <View style={[styles.segmentedContainer, { backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(27, 84, 164, 0.05)' }]}>
              {/* Active Highlight Pill */}
              <View style={[
                styles.activePill, 
                { 
                  backgroundColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#ffffff',
                  left: activeTab === 'today' ? 4 : (width - 40) / 2 + 4,
                  width: (width - 48) / 2,
                }
              ]} />

              <TouchableOpacity
                style={styles.segmentedButton}
                onPress={() => {
                  setActiveTab('today');
                  setSelectedDevotional(null);
                }}
              >
                <Text style={[
                  styles.segmentedButtonText, 
                  activeTab === 'today' ? { color: themeColors.primary, fontWeight: 'bold' } : { color: themeColors.textSecondary }
                ]}>
                  Today&apos;s Word
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.segmentedButton}
                onPress={() => {
                  setActiveTab('history');
                  setSelectedDevotional(null);
                  setSelectedMonth(new Date().getMonth() + 1);
                  setSelectedYear(new Date().getFullYear());
                  setHistoryPage(1);
                }}
              >
                <Text style={[
                  styles.segmentedButtonText, 
                  activeTab === 'history' ? { color: themeColors.primary, fontWeight: 'bold' } : { color: themeColors.textSecondary }
                ]}>
                  Archive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BlurHeader>

      {/* Floating Popover Menu */}
      {showMenu && activeDev && (
        <View style={StyleSheet.absoluteFillObject}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowMenu(false)} />
          <View style={[
            styles.popoverMenuContainer,
            {
              backgroundColor: activeScheme === 'dark' ? '#1e293b' : '#ffffff',
              borderColor: activeScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(27,84,164,0.08)',
              top: insets.top + 48,
            }
          ]}>
            <Text style={[styles.popoverMenuTitle, { color: activeScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              Options
            </Text>

            {/* Share option */}
            <TouchableOpacity
              style={styles.popoverMenuItem}
              onPress={() => {
                handleShare(activeDev);
                setShowMenu(false);
              }}
            >
              <Share2 size={16} color={themeColors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.popoverMenuText, { color: themeColors.text }]}>Share Devotional</Text>
            </TouchableOpacity>

            {/* Copy Text option */}
            <TouchableOpacity
              style={styles.popoverMenuItem}
              onPress={() => {
                handleCopyDevotional(activeDev);
                setShowMenu(false);
              }}
            >
              <Copy size={16} color={themeColors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.popoverMenuText, { color: themeColors.text }]}>Copy Text</Text>
            </TouchableOpacity>

            {/* Copy Scripture option */}
            {activeDev.bibleReading && (
              <TouchableOpacity
                style={styles.popoverMenuItem}
                onPress={() => {
                  handleCopyScripture(activeDev);
                  setShowMenu(false);
                }}
              >
                <BookOpen size={16} color={themeColors.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.popoverMenuText, { color: themeColors.text }]}>Copy Scripture</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.contentContainer}>
        {activeTab === 'today' ? (
          todayLoading ? (
            <DevotionalDetailSkeleton themeColors={themeColors} pulseAnim={pulseAnim} insets={insets} />
          ) : todayDevotional && todayDevotional.title && todayDevotional.content ? (
            <ScrollView 
              contentContainerStyle={[styles.scrollContent, { paddingTop: 112 + insets.top, paddingBottom: 150 + insets.bottom }]} 
              showsVerticalScrollIndicator={false}
              style={{ zIndex: isPulling ? 11 : 0 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor={themeColors.primary} 
                  progressViewOffset={Platform.OS === 'android' ? 112 + insets.top : undefined}
                />
              }
            >
              <View style={styles.devotionalHeader}>
                <Text style={[styles.devotionalTitle, { color: themeColors.text }]}>
                  {todayDevotional.title}
                </Text>
                <View style={styles.metaRow}>
                  <Calendar size={14} color={themeColors.textSecondary} />
                  <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                    {todayDevotional.date}
                  </Text>
                  <TouchableOpacity onPress={() => handleShare(todayDevotional)} style={styles.shareButton}>
                    <Share2 size={16} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {todayDevotional.bibleReading && (
                <View style={[
                  styles.bibleBox, 
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
                  <View style={styles.bibleHeader}>
                    <BookOpen size={16} color={themeColors.primary} />
                    <Text style={[styles.bibleTitle, { color: themeColors.primary }]}>BIBLE READING</Text>
                  </View>
                  <Text style={[styles.bibleReadingText, { color: themeColors.text }]}>
                    {todayDevotional.bibleReading}
                  </Text>
                  {todayDevotional.bibleVerse ? (
                    <Text style={{ marginTop: 8, fontSize: 14, fontStyle: 'italic', color: themeColors.textSecondary, lineHeight: 20 }}>
                      &ldquo;{todayDevotional.bibleVerse}&rdquo;
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={[styles.devotionalBody, { color: themeColors.text }]}>
                {cleanContentText(todayDevotional.content)}
              </Text>

              {(todayDevotional.confession || todayDevotional.prayer) && (
                <View style={[
                  styles.confessionBox, 
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
                  <Text style={[styles.confessionTitle, { color: themeColors.primary }]}>
                    {todayDevotional.confession ? 'CONFESSION / AFFIRMATION' : 'PRAYER'}
                  </Text>
                  <Text style={[styles.confessionText, { color: themeColors.text }]}>
                    {todayDevotional.confession || todayDevotional.prayer}
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <Text style={{ color: themeColors.textSecondary }}>No devotional loaded for today.</Text>
              <TouchableOpacity onPress={() => fetchTodayDevotional(true)} style={[styles.retryButton, { backgroundColor: themeColors.primary }]}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* ARCHIVES TAB */
          selectedDevotional ? (
            /* INDIVIDUAL EXPANDED VIEW */
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 60 + insets.top, paddingBottom: 150 + insets.bottom }]} showsVerticalScrollIndicator={false}>

              <View style={styles.devotionalHeader}>
                <Text style={[styles.devotionalTitle, { color: themeColors.text }]}>
                  {selectedDevotional.title}
                </Text>
                <View style={styles.metaRow}>
                  <Calendar size={14} color={themeColors.textSecondary} />
                  <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                    {selectedDevotional.date}
                  </Text>
                  <TouchableOpacity onPress={() => handleShare(selectedDevotional)} style={styles.shareButton}>
                    <Share2 size={16} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {selectedDevotional.bibleReading && (
                <View style={[
                  styles.bibleBox, 
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
                  <View style={styles.bibleHeader}>
                    <BookOpen size={16} color={themeColors.primary} />
                    <Text style={[styles.bibleTitle, { color: themeColors.primary }]}>BIBLE READING</Text>
                  </View>
                  <Text style={[styles.bibleReadingText, { color: themeColors.text }]}>
                    {selectedDevotional.bibleReading}
                  </Text>
                  {selectedDevotional.bibleVerse ? (
                    <Text style={{ marginTop: 8, fontSize: 14, fontStyle: 'italic', color: themeColors.textSecondary, lineHeight: 20 }}>
                      &ldquo;{selectedDevotional.bibleVerse}&rdquo;
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={[styles.devotionalBody, { color: themeColors.text }]}>
                {cleanContentText(selectedDevotional.content)}
              </Text>

              {(selectedDevotional.confession || selectedDevotional.prayer) && (
                <View style={[
                  styles.confessionBox, 
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
                  <Text style={[styles.confessionTitle, { color: themeColors.primary }]}>
                    {selectedDevotional.confession ? 'CONFESSION / AFFIRMATION' : 'PRAYER'}
                  </Text>
                  <Text style={[styles.confessionText, { color: themeColors.text }]}>
                    {selectedDevotional.confession || selectedDevotional.prayer}
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            /* ARCHIVES FILTERS & LIST */
            <View style={{ flex: 1, paddingTop: 112 + insets.top }}>
              {/* Year Selector */}
              <View style={styles.yearSelector}>
                <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearArrow}>
                  <ChevronLeft size={20} color={themeColors.primary} />
                </TouchableOpacity>
                <Text style={[styles.yearText, { color: themeColors.text }]}>{selectedYear}</Text>
                <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearArrow}>
                  <ChevronRight size={20} color={themeColors.primary} />
                </TouchableOpacity>
              </View>

              {/* Months Horizontal Grid */}
              <ScrollView
                ref={monthsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthsContainer}
              >
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.monthBadge,
                      selectedMonth === m.value
                        ? { backgroundColor: themeColors.primary }
                        : { backgroundColor: themeColors.backgroundElement },
                    ]}
                    onPress={() => {
                      setSelectedMonth(m.value);
                      setHistoryPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthText,
                        selectedMonth === m.value ? { color: '#ffffff', fontWeight: 'bold' } : { color: themeColors.text },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Archives list */}
              {historyLoading ? (
                <DevotionalHistorySkeleton themeColors={themeColors} pulseAnim={pulseAnim} />
              ) : historyDevotionals.length > 0 ? (
                <ScrollView contentContainerStyle={[styles.listContainer, { paddingBottom: 150 + insets.bottom }]}>
                  {historyDevotionals.map((dev) => (
                    <TouchableOpacity
                      key={dev.devotionalId}
                      style={[styles.historyRow, { borderBottomColor: themeColors.border }]}
                      onPress={async () => {
                        try {
                          const fullDev = await apiService.getDevotionalById(dev.devotionalId);
                          setSelectedDevotional(fullDev);
                        } catch (error) {
                          console.error('Failed to fetch full devotional:', error);
                          setSelectedDevotional(dev);
                        }
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historyRowTitle, { color: themeColors.text }]} numberOfLines={1}>
                          {dev.title}
                        </Text>
                        <Text style={[styles.historyRowDate, { color: themeColors.textSecondary }]}>
                          {dev.date}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  ))}

                  {/* Simple Pagination Footer */}
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      disabled={historyPage === 1}
                      onPress={() => setHistoryPage(p => Math.max(1, p - 1))}
                      style={[styles.pageBtn, historyPage === 1 && { opacity: 0.5 }]}
                    >
                      <Text style={{ color: themeColors.primary }}>Previous</Text>
                    </TouchableOpacity>
                    <Text style={{ color: themeColors.text }}>Page {historyPage}</Text>
                    <TouchableOpacity
                      disabled={!hasMoreHistory}
                      onPress={() => setHistoryPage(p => p + 1)}
                      style={[styles.pageBtn, !hasMoreHistory && { opacity: 0.5 }]}
                    >
                      <Text style={{ color: themeColors.primary }}>Next</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.center}>
                  <Text style={{ color: themeColors.textSecondary }}>No devotionals found for this month.</Text>
                </View>
              )}
            </View>
          )
        )}
      </View>
      </SafeAreaView>
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
  titleRow: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectorWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segmentedContainer: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    padding: 4,
    position: 'relative',
    alignItems: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100, // room for bottom audio player
  },
  backLink: {
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  devotionalHeader: {
    marginBottom: 20,
  },
  devotionalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
  },
  shareButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  bibleBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  bibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bibleTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bibleReadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  devotionalBody: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
  },
  confessionBox: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#1b54a4',
  },
  confessionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confessionText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  yearArrow: {
    padding: 8,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  monthsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    height: 48,
  },
  monthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    height: 36,
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  historyRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyRowDate: {
    fontSize: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  pageBtn: {
    padding: 10,
  },
  skeletonLine: {
    borderRadius: 4,
  },
  popoverMenuContainer: {
    position: 'absolute',
    right: 16,
    width: 200,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  popoverMenuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  popoverMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  popoverMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
