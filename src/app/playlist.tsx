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
import { ChevronLeft, Play, Music, Trash2, ListMusic, Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function PlaylistScreen() {
  const systemScheme = useColorScheme();
  const { playlist, playTrack, removeFromPlaylist, showActionSheet, themeMode, isDownloaded, downloadProgress } = useAudio();
  const insets = useSafeAreaInsets();
  
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const handlePlayTrack = (track: any) => {
    playTrack(track, playlist);
  };

  const handlePlayAll = () => {
    if (playlist.length > 0) {
      playTrack(playlist[0], playlist);
    }
  };

  const handleRemove = (e: any, trackId: string | number) => {
    e.stopPropagation(); // prevent triggering row press
    removeFromPlaylist(trackId);
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
        <View style={[styles.header, { 
          backgroundColor: activeScheme === 'dark' ? 'rgba(3, 7, 24, 0.65)' : 'rgba(240, 246, 255, 0.65)',
          borderBottomColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(27, 84, 164, 0.12)',
          overflow: 'hidden',
          height: 56 + insets.top,
          paddingTop: insets.top,
        }]}>
          <BlurView
            intensity={activeScheme === 'dark' ? 70 : 85}
            tint={activeScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity onPress={() => router.navigate('/library')} style={styles.backBtn}>
            <ChevronLeft size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>My Playlist</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {playlist.length > 0 ? (
            <View style={{ gap: 16 }}>
              {/* Play All Hero Button */}
              <TouchableOpacity
                onPress={handlePlayAll}
                style={[styles.playAllBtn, { backgroundColor: themeColors.primary }]}
                activeOpacity={0.9}
              >
                <Play size={18} color="#ffffff" fill="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.playAllText}>Play All ({playlist.length} tracks)</Text>
              </TouchableOpacity>

              <View style={styles.playlistContainer}>
                {playlist.map((track) => (
                  <TouchableOpacity
                    key={track.messageId}
                    style={[
                      styles.playlistRow, 
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
                    onPress={() => handlePlayTrack(track)}
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
                    <View style={styles.playlistTextInfo}>
                      <Text style={[styles.playlistTitle, { color: themeColors.text }]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={[styles.playlistSpeaker, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {track.speaker}
                      </Text>
                    </View>

                    {/* Delete action */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                      <TouchableOpacity onPress={(e) => handleRemove(e, track.messageId)} style={styles.trashBtn}>
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={[
              styles.emptyState, 
              { 
                backgroundColor: activeScheme === 'dark' ? 'rgba(30, 41, 59, 0.25)' : '#ffffff',
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
              }
            ]}>
              <ListMusic size={48} color={themeColors.primary} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Your playlist is empty</Text>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                Add teachings to your playlist by long-pressing any teaching or tapping the &quot;+ Add to Playlist&quot; button in the player.
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
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  playAllText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  playlistContainer: {
    gap: 12,
  },
  playlistRow: {
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
  playlistTextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playlistSpeaker: {
    fontSize: 12,
  },
  trashBtn: {
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
