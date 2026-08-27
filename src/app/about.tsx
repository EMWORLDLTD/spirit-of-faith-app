import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudio } from '../contexts/AudioContext';
import BlurHeader from '../components/BlurHeader';
import { 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Award,
  BookOpen,
  Quote
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const insets = useSafeAreaInsets();

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  const handleCall = (phoneNum: string) => {
    Linking.openURL(`tel:${phoneNum.replace(/\s+/g, '')}`).catch(() => {
      alert('Unable to place call on this device.');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:info@spiritoffaithmedia.org').catch(() => {
      alert('Unable to open mail client.');
    });
  };

  const handleWeb = () => {
    Linking.openURL('https://www.spiritoffaithmedia.org/').catch(() => {
      alert('Unable to open web browser.');
    });
  };

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        
        {/* Absolute Glassmorphic Header */}
        <BlurHeader isDark={activeScheme === 'dark'}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => router.navigate('/more')} style={styles.backBtn}>
              <ChevronLeft size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>About Us</Text>
            <View style={styles.headerSpacer} />
          </View>
        </BlurHeader>

        {/* Scroll Content */}
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* Brand/Branding Section */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={activeScheme === 'dark' ? ['#1b54a4', '#0d3275'] : ['#2563eb', '#1d4ed8']}
              style={styles.logoIconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Award size={40} color="#ffffff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: themeColors.text }]}>Christ Pavilion</Text>
            <Text style={[styles.appSubtitle, { color: themeColors.primary }]}>Spirit of Faith Church</Text>
          </View>

          {/* 1. Welcome to Our Church Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <View style={styles.cardHeader}>
              <Quote size={20} color={themeColors.primary} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Welcome to Our Church</Text>
            </View>
            <Text style={[styles.sectionHeading, { color: themeColors.text, fontSize: 14, marginBottom: 2 }]}>
              Message from Our Senior Pastor
            </Text>
            <Text style={[styles.pastorName, { color: themeColors.primary }]}>
              Pastor Olasanmi Bolajoko <Text style={{ fontSize: 13, fontWeight: 'normal', color: themeColors.textSecondary }}>(Senior Pastor)</Text>
            </Text>
            <Text style={[styles.cardText, { color: themeColors.textSecondary, marginTop: 8 }]}>
              On behalf of Christ Pavilion, I warmly welcome you to our official app. We believe that church is far more than just a Sunday service—it is a living, breathing community of believers walking together in faith, supporting one another, and reaching our world with the transforming love of Christ.
            </Text>
            <Text style={[styles.cardText, { color: themeColors.textSecondary, marginTop: 10 }]}>
              This app serves as a centralized hub for your spiritual growth, giving you instant access to daily devotionals, audio teachings, upcoming events, and branch locations. Whether you connect through the app or visit any of our physical locations, you are loved, valued, and warmly welcomed.
            </Text>
          </View>

          {/* 2. Mission & Vision Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <View style={styles.cardHeader}>
              <BookOpen size={20} color={themeColors.primary} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Mission & Vision</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={[styles.bulletPoint, { color: themeColors.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: themeColors.textSecondary }]}>
                <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Our Mission: </Text>
                To add value to lives through the preaching and teaching of God's Word, and through the operations of the gifts of the Holy Spirit, creating an atmosphere where believers are equipped, empowered, and released to fulfill their divine purpose.
              </Text>
            </View>
            <View style={[styles.bulletItem, { marginTop: 12 }]}>
              <Text style={[styles.bulletPoint, { color: themeColors.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: themeColors.textSecondary }]}>
                <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Our Vision: </Text>
                To be a vibrant, Spirit-filled community that transforms lives, impacts communities, and spreads the Gospel of Jesus Christ across Nigeria and to the nations, demonstrating the power and love of God in practical ways.
              </Text>
            </View>
          </View>

          {/* 3. Service Times Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <View style={styles.cardHeader}>
              <Clock size={20} color={themeColors.primary} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Weekly Services</Text>
            </View>
            
            <View style={styles.serviceRow}>
              <Text style={[styles.serviceDay, { color: themeColors.text }]}>Sunday Service</Text>
              <Text style={[styles.serviceTime, { color: themeColors.textSecondary }]}>9:00 AM</Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={[styles.serviceDay, { color: themeColors.text }]}>Midweek Service (Wednesday)</Text>
              <Text style={[styles.serviceTime, { color: themeColors.textSecondary }]}>6:00 PM</Text>
            </View>
          </View>

          {/* Contact Us Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <Text style={[styles.sectionHeading, { color: themeColors.text, marginBottom: 12 }]}>Get In Touch</Text>

            {/* Address */}
            <View style={styles.contactItem}>
              <MapPin size={18} color={themeColors.primary} style={styles.contactIcon} />
              <Text style={[styles.contactText, { color: themeColors.textSecondary }]}>
                99/101, Ekoro/Meiran Road, Transformer B/Stop, Agbelekale, Abule Egba, Lagos, Nigeria.
              </Text>
            </View>

            {/* Phone */}
            <View style={styles.contactLinkItem}>
              <Phone size={18} color={themeColors.primary} style={styles.contactIcon} />
              <Text
                style={[styles.contactLinkText, { color: themeColors.primary }]}
                onPress={() => Linking.openURL('tel:08032325780').catch(() => alert('Unable to place call on this device.'))}
              >
                0803 232 5780
              </Text>
              <Text style={{ color: themeColors.textSecondary }}>, </Text>
              <Text
                style={[styles.contactLinkText, { color: themeColors.primary }]}
                onPress={() => Linking.openURL('tel:08054975131').catch(() => alert('Unable to place call on this device.'))}
              >
                0805 497 5131
              </Text>
            </View>

            {/* Email */}
            <TouchableOpacity onPress={handleEmail} style={styles.contactLinkItem}>
              <Mail size={18} color={themeColors.primary} style={styles.contactIcon} />
              <Text style={[styles.contactLinkText, { color: themeColors.primary }]}>
                info@spiritoffaithmedia.org
              </Text>
            </TouchableOpacity>

            {/* Web */}
            <TouchableOpacity onPress={handleWeb} style={styles.contactLinkItem}>
              <Globe size={18} color={themeColors.primary} style={styles.contactIcon} />
              <Text style={[styles.contactLinkText, { color: themeColors.primary }]}>
                www.spiritoffaithmedia.org
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pastorName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    fontSize: 18,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.08)',
  },
  serviceDay: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  serviceTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 2,
  },
  contactIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  contactLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
