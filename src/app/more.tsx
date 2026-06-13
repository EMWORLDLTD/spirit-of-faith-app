import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../contexts/AudioContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import BlurHeader from '../components/BlurHeader';
import {
  Settings,
  Calendar,
  MapPin,
  CreditCard,
  ChevronRight,
  Copy,
  X,
  Info,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

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

export default function MoreScreen() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAudio();
  const insets = useSafeAreaInsets();
  
  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const themeColors = Colors[activeScheme === 'dark' ? 'dark' : 'light'];

  const [givingModalVisible, setGivingModalVisible] = useState(false);

  const handleCopyAccount = async (accountNumber: string) => {
    await Clipboard.setStringAsync(accountNumber);
    Alert.alert('Copied', 'Account number copied to clipboard.');
  };

  const bgColors: [string, string, string] = activeScheme === 'dark'
    ? ['#030718', '#02040a', '#010204']
    : ['#f0f6ff', '#e0eefe', '#ffffff'];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      {/* Custom Glassmorphic Header */}
      <BlurHeader isDark={activeScheme === 'dark'}>
        <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>More Options</Text>
        </View>
      </BlurHeader>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 72 + insets.top, paddingBottom: 150 + insets.bottom }]} showsVerticalScrollIndicator={false}>


        {/* QUICK MENU LINKS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Church Shortcuts</Text>
          <View style={[
            styles.menuList, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0' 
            }
          ]}>
            
            {/* Events */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
              onPress={() => router.push('/events')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(27, 84, 164, 0.1)' }]}>
                  <Calendar size={18} color={themeColors.primary} />
                </View>
                <Text style={[styles.menuText, { color: themeColors.text }]}>Upcoming Events</Text>
              </View>
              <ChevronRight size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {/* Locations */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
              onPress={() => router.push('/locations')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <MapPin size={18} color="#10b981" />
                </View>
                <Text style={[styles.menuText, { color: themeColors.text }]}>Find a Branch</Text>
              </View>
              <ChevronRight size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {/* Giving */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
              onPress={() => setGivingModalVisible(true)}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <CreditCard size={18} color="#f59e0b" />
                </View>
                <Text style={[styles.menuText, { color: themeColors.text }]}>Church Giving</Text>
              </View>
              <ChevronRight size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {/* About Us */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/about' as any)}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Info size={18} color="#8b5cf6" />
                </View>
                <Text style={[styles.menuText, { color: themeColors.text }]}>About Us</Text>
              </View>
              <ChevronRight size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>

          </View>
        </View>

        {/* SETTINGS SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Settings</Text>
          <View style={[
            styles.menuList, 
            { 
              backgroundColor: activeScheme === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#ffffff', 
              borderColor: activeScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0' 
            }
          ]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(27, 84, 164, 0.1)' }]}>
                  <Settings size={18} color={themeColors.primary} />
                </View>
                <Text style={[styles.menuText, { color: themeColors.text }]}>App Preferences</Text>
              </View>
              <ChevronRight size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingTop: 72,
    paddingBottom: 110, // room for floating audio player
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  favoritesContainer: {
    gap: 8,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  playIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  favoriteTextInfo: {
    flex: 1,
  },
  favoriteTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteSpeaker: {
    fontSize: 12,
    marginTop: 1,
  },
  heartIcon: {
    marginLeft: 8,
  },
  emptyState: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  menuList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    gap: 6,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 8,
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
    marginTop: 4,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  playbackLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
