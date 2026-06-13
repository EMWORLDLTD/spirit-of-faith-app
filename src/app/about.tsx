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
  Info, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Award,
  BookOpen
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
    Linking.openURL('mailto:info@spiritoffaith.org').catch(() => {
      alert('Unable to open mail client.');
    });
  };

  const handleWeb = () => {
    Linking.openURL('https://spiritoffaith.org').catch(() => {
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
            <Text style={[styles.appName, { color: themeColors.text }]}>Spirit of Faith Church</Text>
            <Text style={[styles.appSubtitle, { color: themeColors.primary }]}>Christ Pavilion Media</Text>
          </View>

          {/* Who We Are Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <View style={styles.cardHeader}>
              <Info size={20} color={themeColors.primary} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Who We Are</Text>
            </View>
            <Text style={[styles.cardText, { color: themeColors.textSecondary }]}>
              Spirit of Faith Church (Christ Pavilion) is a vibrant ministry dedicated to raising a people of faith, established in the love of God, walking in apostolic power, and manifesting the realities of the Kingdom of God in their daily lives. We believe in the absolute authority of the Word of God and the transforming power of the Holy Spirit.
            </Text>
          </View>

          {/* Vision & Mission Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <View style={styles.cardHeader}>
              <BookOpen size={20} color={themeColors.primary} />
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Vision & Mission</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={[styles.bulletPoint, { color: themeColors.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: themeColors.textSecondary }]}>
                <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Our Vision: </Text>
                To build a global community of believers established in faith, walking in love, and operating in the power of the Holy Spirit to dominate every sphere of human endeavor.
              </Text>
            </View>
            <View style={[styles.bulletItem, { marginTop: 10 }]}>
              <Text style={[styles.bulletPoint, { color: themeColors.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: themeColors.textSecondary }]}>
                <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Our Mission: </Text>
                To preach the gospel of grace with clarity, to teach the uncompromised Word of Faith, and to empower individuals to discover and fulfill their divine purpose.
              </Text>
            </View>
          </View>

          {/* Pastor Profile Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }
          ]}>
            <Text style={[styles.sectionHeading, { color: themeColors.text }]}>Our Senior Pastor</Text>
            <Text style={[styles.pastorName, { color: themeColors.primary }]}>Pastor Olasanmi Bolajoko</Text>
            <Text style={[styles.cardText, { color: themeColors.textSecondary, marginTop: 8 }]}>
              Pastor Olasanmi Bolajoko is the Senior Pastor of Spirit of Faith Church. Guided by a strong apostolic mandate, he has dedicated his life to teaching the principles of faith, righteousness, and spiritual growth. His messages are practical, inspirational, and deeply rooted in scripture, leading to testimonies of transformation and healing.
            </Text>
          </View>

          {/* Service Times Card */}
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
              <Text style={[styles.serviceTime, { color: themeColors.textSecondary }]}>8:00 AM</Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={[styles.serviceDay, { color: themeColors.text }]}>Midweek Service (Wednesday)</Text>
              <Text style={[styles.serviceTime, { color: themeColors.textSecondary }]}>5:00 PM</Text>
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
                info@spiritoffaith.org
              </Text>
            </TouchableOpacity>

            {/* Web */}
            <TouchableOpacity onPress={handleWeb} style={styles.contactLinkItem}>
              <Globe size={18} color={themeColors.primary} style={styles.contactIcon} />
              <Text style={[styles.contactLinkText, { color: themeColors.primary }]}>
                www.spiritoffaith.org
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
