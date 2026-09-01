import { useState, useEffect, useRef } from 'react';
import { Tabs, usePathname, useNavigation, useRouter } from 'expo-router';
import { useColorScheme, View, StyleSheet, Animated, Text, BackHandler, ToastAndroid, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/theme';
import { AudioProvider, useAudio } from '../contexts/AudioContext';
import { AlertProvider } from '../contexts/AlertContext';
import AudioPlayer from '../components/AudioPlayer';
import IosPwaInstallPrompt from '../components/IosPwaInstallPrompt';
import BroadcastModal from '../components/BroadcastModal';
import { useBroadcast } from '../hooks/useBroadcast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Home, Music, BookOpen, Calendar, MapPin, MoreHorizontal, Library } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { analyticsService } from '../services/analyticsService';
import { apiService } from '../services/api';

export default function RootLayout() {
  return (
    <AudioProvider>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </AudioProvider>
  );
}

function AppContent() {
  const systemScheme = useColorScheme();
  const { themeMode, playTrack } = useAudio();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const navigation = useNavigation();
  const router = useRouter();
  const lastBackPress = useRef<number>(0);

  // Remote In-App Broadcast Pop-up
  const { broadcast, isVisible, dismissBroadcast, actOnBroadcast } = useBroadcast();

  // Initialize push notifications and analytics on launch
  useEffect(() => {
    analyticsService.trackAppOpen();
    registerForPushNotificationsAsync();

    // 2. Handle notification tap when app is in background or closed
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const data: any = response.notification.request.content.data;
        if (!data) return;

        // Route to Audio Teaching
        if (data.type === 'audio') {
          if (data.audioUrl) {
            await playTrack({
              messageId: (data.audioId as string | number) || `notif-track-${Date.now()}`,
              title: String(data.title || response.notification.request.content.title || 'Audio Teaching'),
              speaker: String(data.speaker || 'Spirit of Faith'),
              audioUrl: String(data.audioUrl),
              publishedDate: new Date().toISOString(),
              coverUrl: data.imageUrl ? String(data.imageUrl) : undefined,
            });
          } else {
            router.push('/teachings' as any);
          }
        } 
        // Route to Daily Devotional
        else if (data.type === 'devotional') {
          router.push('/devotionals' as any);
        }
        // Route to Church Events
        else if (data.type === 'event') {
          router.push('/events' as any);
        }
      } catch (err) {
        console.warn('Error processing notification tap deep-link:', err);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (pathname) {
      analyticsService.logScreenView(pathname);
    }

    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      const rootTabs = ['/', '/teachings', '/library', '/devotionals', '/more'];
      if (rootTabs.includes(pathname)) {
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          BackHandler.exitApp();
        } else {
          lastBackPress.current = now;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [pathname]);

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  // Network Connectivity Banner State
  const netInfo = useNetInfo();
  const [bannerState, setBannerState] = useState<'none' | 'offline' | 'online'>('none');
  const heightAnim = useRef(new Animated.Value(0)).current;
  const prevConnected = useRef<boolean | null>(null);

  useEffect(() => {
    if (netInfo.isConnected === null) return;

    const isCurrentlyConnected = netInfo.isConnected;
    const targetHeight = (insets.top || 0) + 40;

    if (prevConnected.current !== null) {
      if (prevConnected.current && !isCurrentlyConnected) {
        // Transitioned: Online -> Offline
        setBannerState('offline');
        Animated.spring(heightAnim, {
          toValue: targetHeight,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      } else if (!prevConnected.current && isCurrentlyConnected) {
        // Transitioned: Offline -> Online
        setBannerState('online');
        const timer = setTimeout(() => {
          Animated.timing(heightAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setBannerState('none');
          });
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      // First initialization check
      if (!isCurrentlyConnected) {
        setBannerState('offline');
        Animated.spring(heightAnim, {
          toValue: targetHeight,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      }
    }

    prevConnected.current = isCurrentlyConnected;
  }, [netInfo.isConnected, insets.top]);

  const bannerBgColor = bannerState === 'offline' ? '#EF4444' : '#22C55E';
  const bannerText = bannerState === 'offline' ? 'No Internet Connection' : 'Back Online';

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />

      {bannerState !== 'none' && (
        <Animated.View
          style={{
            height: heightAnim,
            overflow: 'hidden',
            backgroundColor: bannerBgColor,
          }}
        >
          <View
            style={{
              paddingTop: insets.top,
              height: (insets.top || 0) + 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={styles.bannerText}>{bannerText}</Text>
          </View>
        </Animated.View>
      )}

      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false, // Turn off default solid header bars globally
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopColor: 'transparent',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 8,
            elevation: 0, // Disable elevation to allow transparent BlurView on Android
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.03,
            shadowRadius: 10,
          },
          tabBarBackground: () => (
            <View style={[
              StyleSheet.absoluteFill, 
              { 
                overflow: 'hidden',
                borderTopWidth: 1,
                borderTopColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(27, 84, 164, 0.12)',
                backgroundColor: activeScheme === 'dark' ? 'rgba(3, 7, 24, 0.65)' : 'rgba(240, 246, 255, 0.65)',
              }
            ]}>
              <BlurView
                intensity={activeScheme === 'dark' ? 65 : 85}
                tint={activeScheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={
                  activeScheme === 'dark'
                    ? ['rgba(1, 2, 4, 0.3)', 'rgba(15, 30, 80, 0.2)']
                    : ['rgba(240, 246, 255, 0.3)', 'rgba(219, 234, 254, 0.2)']
                }
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              {/* Removed white glossy highlight reflection */}
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="teachings"
          options={{
            title: 'Teachings',
            tabBarLabel: 'Teachings',
            tabBarIcon: ({ color, size }) => <Music color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarLabel: 'Library',
            tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="devotionals"
          options={{
            title: 'Devotionals',
            tabBarLabel: 'Devotional',
            tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarLabel: 'More',
            tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
          }}
        />
        {/* Hide sub-screens and details screens from the tab bar */}
        <Tabs.Screen
          name="favorites"
          options={{
            href: null, // Hidden from bottom tab bar
          }}
        />
        <Tabs.Screen
          name="playlist"
          options={{
            href: null, // Hidden from bottom tab bar
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            href: null, // Hidden from bottom tab bar
          }}
        />
        <Tabs.Screen
          name="locations"
          options={{
            href: null, // Hidden from bottom tab bar
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            href: null, // Hidden from bottom tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hidden from bottom tab bar
          }}
        />

      </Tabs>

      {/* Global floating Audio Player & Action Sheet */}
      <AudioPlayer />

      {/* iOS Safari PWA Install Banner */}
      <IosPwaInstallPrompt />

      {/* Remote In-App Broadcast Pop-up — rendered last to sit above everything */}
      <BroadcastModal
        broadcast={broadcast}
        isVisible={isVisible}
        onDismiss={dismissBroadcast}
        onAction={actOnBroadcast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
});
