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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Heart, Play, Music, Film, Check } from 'lucide-react-native';
import BlurHeader from '../components/BlurHeader';

const { width } = Dimensions.get('window');

export default function FavoritesScreen() {
  const systemScheme = useColorScheme();
  const { favorites, playTrack, toggleFavorite, showActionSheet, themeMode, isDownloaded, downloadProgress } = useAudio();
  const insets = useSafeAreaInsets();
  
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const handlePlayFavorite = (track: any) => {
    playTrack(track, favorites);
  };

  const handleToggleFav = (e: any, track: any) => {
    e.stopPropagation(); // prevent triggering row press/playback
    toggleFavorite(track);
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Brand Gradient Background */}
      {activeScheme === 'dark' ? (
        <LinearGradient
          colors={['#030718', '#02040a', '#010204']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <LinearGradient
          colors={['#f0f6ff', '#e0eefe', '#ffffff']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Header */}
        <BlurHeader isDark={activeScheme === 'dark'}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => router.navigate('/more')} style={styles.backBtn}>
              <ChevronLeft size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>My Favorites</Text>
            <View style={styles.headerSpacer} />
          </View>
        </BlurHeader>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {favorites.length > 0 ? (
            <View style={styles.favoritesList}>
              {favorites.map((track) => (
                <TouchableOpacity
                  key={track.messageId}
                  style={[
                    styles.favoriteRow, 
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
                  onPress={() => handlePlayFavorite(track)}
                  onLongPress={() => showActionSheet(track)}
                  delayLongPress={350}
                  activeOpacity={0.85}
                >
                  {/* Artwork / Icon */}
                  {track.coverUrl ? (
                    <Image source={{ uri: track.coverUrl }} style={styles.artwork} />
                  ) : (
                    <View style={[styles.artworkPlaceholder, { backgroundColor: themeColors.primary }]}>
                      <Music size={16} color="#ffffff" />
                    </View>
                  )}

                  {/* Text details */}
                  <View style={styles.favoriteTextInfo}>
                    <Text style={[styles.favoriteTitle, { color: themeColors.text }]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[styles.favoriteSpeaker, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {track.speaker}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={[styles.rowActions, { flexDirection: 'row', alignItems: 'center' }]}>
                    {downloadProgress[track.messageId] !== undefined ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 12 }}>
                        <ActivityIndicator size="small" color={themeColors.primary} />
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: themeColors.primary }}>
                          {Math.round(downloadProgress[track.messageId] * 100)}%
                        </Text>
                      </View>
                    ) : isDownloaded(track) ? (
                      <Check size={16} color="#22c55e" strokeWidth={3} style={{ marginRight: 12 }} />
                    ) : null}
                    <TouchableOpacity onPress={(e) => handleToggleFav(e, track)} style={styles.heartBtn}>
                      <Heart size={20} color="#e11d48" fill="#e11d48" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[
              styles.emptyState, 
              { 
                backgroundColor: activeScheme === 'dark' ? 'rgba(30, 41, 59, 0.25)' : '#ffffff',
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
              }
            ]}>
              <Heart size={48} color={themeColors.primary} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No favorites yet</Text>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                Tap the heart icon in the music player or from action menus to add your favorite sermons here.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 110, // room for floating audio player
  },
  favoritesList: {
    gap: 12,
  },
  favoriteRow: {
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
  favoriteTextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  favoriteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  favoriteSpeaker: {
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartBtn: {
    padding: 8,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
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
