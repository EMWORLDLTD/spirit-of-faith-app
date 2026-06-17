import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudio } from '../contexts/AudioContext';
import { MapPin, Phone, Clock, Compass, ExternalLink, ChevronLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface LocationItem {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  mapQuery: string; // Query string to use for Google Maps search
  serviceTime: string;
}

const BRANCHES: LocationItem[] = [
  {
    id: '1',
    name: 'Lagos Headquarters',
    address: '99/101, Ekoro/Meiran Road, Transformer B/Stop, Agbelekale',
    city: 'Abule Egba',
    state: 'Lagos',
    phone: '08032325780, 08054975131',
    mapQuery: '99/101, Ekoro/Meiran Road, Agbelekale, Abule Egba, Lagos',
    serviceTime: 'Sunday Service: 8:00 AM\nMidweek Service (Wednesday): 5:00 PM',
  },
  {
    id: '2',
    name: 'Owo Church',
    address: 'Owo, Ondo State',
    city: 'Owo',
    state: 'Ondo',
    phone: '08139535070',
    mapQuery: 'Owo, Ondo',
    serviceTime: 'Sunday Service: 9:00 AM\nMidweek Service (Wednesday): 5:00 PM',
  },
  {
    id: '3',
    name: 'Ife Branch',
    address: '9, Olasode Way, Opposite Baale\'s House Opa',
    city: 'Ile-Ife',
    state: 'Osun',
    phone: '08034928707',
    mapQuery: '9, Olasode Way, Opa, Ile-Ife, Osun',
    serviceTime: 'Sunday Service: 9:00 AM\nMidweek Service (Wednesday): 5:00 PM',
  },
  {
    id: '4',
    name: 'Abeokuta Branch',
    address: 'Beside Nipco petrol station, Isolu, Alabata road',
    city: 'Abeokuta',
    state: 'Ogun',
    phone: '09019111757, 09023224325',
    mapQuery: 'Nipco petrol station, Isolu, Alabata road, Abeokuta, Ogun',
    serviceTime: 'Sunday Service: 9:00 AM\nMidweek Service (Wednesday): 5:00 PM',
  },
];

export default function LocationsScreen() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const insets = useSafeAreaInsets();
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const handleCall = (phonesStr: string) => {
    // Take the first phone number if multiple exist
    const firstPhone = phonesStr.split(',')[0].trim();
    const telUrl = `tel:${firstPhone}`;
    
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(telUrl);
        } else {
          Alert.alert('Error', 'Calling is not supported on this device.');
        }
      })
      .catch((err) => console.error('Error opening dialer:', err));
  };

  const handleOpenMap = (query: string) => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    
    Linking.canOpenURL(mapUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mapUrl);
        } else {
          Alert.alert('Error', 'Unable to open maps application.');
        }
      })
      .catch((err) => console.error('Error opening map:', err));
  };

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      {/* Custom Header */}
      <View style={[styles.customHeader, { 
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
        <TouchableOpacity onPress={() => router.navigate('/more')} style={styles.backBtn}>
          <ChevronLeft size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Our Branches</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 76 + insets.top, paddingBottom: 150 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerDescription}>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Find a Spirit of Faith branch close to you. We look forward to worshipping with you!
          </Text>
        </View>

        {BRANCHES.map((item) => (
          <View
            key={item.id}
            style={[
              styles.branchCard, 
              { 
                backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
                borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeScheme === 'dark' ? 0.15 : 0.04,
                shadowRadius: 8,
                elevation: 2,
              }
            ]}
          >
            <Text style={[styles.branchName, { color: themeColors.primary }]}>{item.name}</Text>
            
            {/* Address */}
            <View style={styles.infoRow}>
              <MapPin size={16} color={themeColors.textSecondary} style={styles.icon} />
              <View style={styles.textContainer}>
                <Text style={[styles.addressText, { color: themeColors.text }]}>
                  {item.address}
                </Text>
                <Text style={[styles.cityStateText, { color: themeColors.textSecondary }]}>
                  {item.city}, {item.state}
                </Text>
              </View>
            </View>

            {/* Service times */}
            <View style={styles.infoRow}>
              <Clock size={16} color={themeColors.textSecondary} style={styles.icon} />
              <Text style={[styles.serviceTimeText, { color: themeColors.text }]}>
                {item.serviceTime}
              </Text>
            </View>

            {/* Contacts */}
            <View style={styles.infoRow}>
              <Phone size={16} color={themeColors.textSecondary} style={styles.icon} />
              <Text style={[styles.phoneText, { color: themeColors.text }]}>
                {item.phone}
              </Text>
            </View>

            {/* Buttons Row */}
            <View style={[styles.buttonsRow, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCall(item.phone)}
              >
                <Phone size={16} color={themeColors.primary} />
                <Text style={[styles.btnText, { color: themeColors.primary }]}>Call Branch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.borderLeft, { borderLeftColor: themeColors.border }]}
                onPress={() => handleOpenMap(item.mapQuery)}
              >
                <Compass size={16} color={themeColors.primary} />
                <Text style={[styles.btnText, { color: themeColors.primary }]}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 76,
    paddingBottom: 100, // room for bottom audio player
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  branchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  branchName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    marginTop: 2,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cityStateText: {
    fontSize: 13,
    marginTop: 2,
  },
  serviceTimeText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  phoneText: {
    fontSize: 14,
    flex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  borderLeft: {
    borderLeftWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
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
  headerDescription: {
    marginBottom: 20,
  },
});
