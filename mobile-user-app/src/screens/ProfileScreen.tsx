import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView, RefreshControl, Image, Alert
} from 'react-native';
import { authApi, addressesApi, ordersApi, setAuthToken } from '../api/api';

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: '✏️', label: 'Edit Profile', screen: 'EditProfile', desc: 'Update your personal info' },
      { icon: '📍', label: 'Saved Addresses', screen: 'SavedAddresses', desc: 'Manage delivery locations' },
      { icon: '💳', label: 'Payment Methods', screen: null, desc: 'Cards & wallets' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { icon: '📦', label: 'My Orders', screen: 'MyOrders', desc: 'Track and view past orders' },
      { icon: '❤️', label: 'Favourites', screen: null, desc: 'Your saved items' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: '🔔', label: 'Notifications', screen: 'Notifications', desc: 'Manage your alerts' },
      { icon: '❓', label: 'Help & Support', screen: 'Help', desc: 'FAQs and contact us' },
      { icon: 'ℹ️', label: 'About App', screen: null, desc: 'Version 1.0.0' },
    ],
  },
];

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lastFetchTime = React.useRef(0);

  const fetchProfile = useCallback(async (force = false) => {
    const now = Date.now();
    // Skip if fetched less than 30 seconds ago (unless forced by pull-to-refresh)
    if (!force && now - lastFetchTime.current < 30000) return;
    lastFetchTime.current = now;

    try {
      const [userRes, addrRes, ordersRes] = await Promise.allSettled([
        authApi.getMe(),
        addressesApi.getAll(),
        ordersApi.getHistory(),
      ]);
      if (userRes.status === 'fulfilled') setUser(userRes.value.data);
      if (addrRes.status === 'fulfilled') setAddresses(addrRes.value.data || []);
      if (ordersRes.status === 'fulfilled') setOrderCount((ordersRes.value.data || []).length);
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile(true); // Force fetch on initial mount
    // Re-fetch on focus only if data is stale (> 30 seconds)
    const unsubscribe = navigation.addListener('focus', () => fetchProfile(false));
    return unsubscribe;
  }, [navigation, fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile(true); // Force refresh on pull-to-refresh
  }, [fetchProfile]);


  const handleMenuPress = (screen: string | null, label: string) => {
    if (screen) {
      navigation.navigate(screen);
    } else {
      Alert.alert('Coming Soon', `${label} feature is coming soon!`);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive', 
        onPress: () => {
          setAuthToken(null);
          navigation.replace('Login');
        } 
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
      >
        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(displayName) }]}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {user?.email && <Text style={styles.emailText}>{user.email}</Text>}
          {user?.phoneNumber && <Text style={styles.phoneText}>{user.phoneNumber}</Text>}
          {defaultAddress && (
            <View style={styles.locationBadge}>
              <Text style={styles.locationBadgeText}>📍 {defaultAddress.label || defaultAddress.streetAddress}</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('MyOrders')}>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('SavedAddresses')}>
            <Text style={styles.statValue}>{addresses.length}</Text>
            <Text style={styles.statLabel}>Addresses</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox}>
            <Text style={styles.statValue}>₨0</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.menuRow, ii < section.items.length - 1 && styles.menuRowBorder]}
                  onPress={() => handleMenuPress(item.screen, item.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconBox}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuTextBox}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 40, marginTop: 10 }}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Baldia Mart v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' },
  loaderText: { marginTop: 12, color: '#999', fontSize: 14 },

  // Header
  headerBanner: {
    backgroundColor: '#FF4500',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  emailText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  phoneText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  locationBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  locationBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    paddingVertical: 16,
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIcon: { fontSize: 18 },
  menuTextBox: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  menuDesc: { fontSize: 12, color: '#999', marginTop: 1 },
  menuChevron: { fontSize: 22, color: '#CCC', fontWeight: '300' },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  logoutIcon: { fontSize: 18, marginRight: 8 },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: '700' },
  versionText: { textAlign: 'center', color: '#CCC', fontSize: 11, marginTop: 16 },
});
