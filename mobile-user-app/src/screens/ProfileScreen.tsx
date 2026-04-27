import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, Pressable, ActivityIndicator, ScrollView,
  RefreshControl, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authApi, addressesApi, ordersApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { AppText, AppButton, AppIconButton, AppBadge } from '../components/ui';
import { theme } from '../theme/theme';

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  screen: string | null;
  tint?: string;
  badge?: string | number;
};

export default function ProfileScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const { settings } = useSettings();
  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lastFetchTime = useRef(0);

  const fetchProfile = useCallback(async (force = false) => {
    const now = Date.now();
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
      if (ordersRes.status === 'fulfilled') {
        const d = ordersRes.value.data || {};
        const arr = Array.isArray(d) ? d : (d.data || []);
        setOrderCount(d.total ?? arr.length);
        const active = arr.filter((o: any) =>
          ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
        setActiveOrderCount(active);
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile(true);
    const unsubscribe = navigation.addListener('focus', () => fetchProfile(false));
    return unsubscribe;
  }, [navigation, fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile(true);
  }, [fetchProfile]);

  const handleMenuPress = (screen: string | null, label: string) => {
    if (screen) navigation.navigate(screen);
    else Alert.alert('Coming soon', `${label} feature is coming soon!`);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <AppText variant="caption" style={{ marginTop: 12 }}>Loading profile…</AppText>
      </View>
    );
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'Friend';
  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];

  const accountItems: MenuItem[] = [
    { icon: 'person-outline', label: 'Edit profile', desc: 'Update your personal info', screen: 'EditProfile' },
    { icon: 'location-outline', label: 'Saved addresses', desc: `${addresses.length} ${addresses.length === 1 ? 'address' : 'addresses'} saved`, screen: 'SavedAddresses' },
    { icon: 'card-outline', label: 'Payment methods', desc: 'Cards & wallets', screen: null },
  ];

  const ordersItems: MenuItem[] = [
    { icon: 'cube-outline', label: 'My orders', desc: 'Track and view past orders', screen: 'MyOrders', badge: activeOrderCount > 0 ? activeOrderCount : undefined },
    { icon: 'heart-outline', label: 'Favourites', desc: 'Your saved items & shops', screen: 'Favourites', tint: theme.colors.danger },
    ...(settings?.feature_rashan_enabled
      ? [{ icon: 'archive-outline' as keyof typeof Ionicons.glyphMap, label: 'Bulk Rashan', desc: 'Upload your monthly grocery list', screen: 'RashanOrder', tint: theme.colors.rashan }]
      : []),
  ];

  const supportItems: MenuItem[] = [
    { icon: 'notifications-outline', label: 'Notifications', desc: 'Manage your alerts', screen: 'Notifications' },
    { icon: 'help-circle-outline', label: 'Help & support', desc: 'FAQs and contact us', screen: 'Help' },
    { icon: 'information-circle-outline', label: 'About app', desc: 'Version 1.0.0', screen: 'About' },
  ];

  const renderMenuGroup = (title: string, items: MenuItem[]) => (
    <View style={styles.section}>
      <AppText variant="overline" style={styles.sectionLabel}>{title}</AppText>
      <View style={styles.menuCard}>
        {items.map((item, ii) => {
          const tint = item.tint || theme.colors.primary;
          return (
            <Pressable
              key={`${title}-${ii}`}
              style={({ pressed }) => [
                styles.menuRow,
                ii < items.length - 1 ? styles.menuRowBorder : null,
                pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
              ]}
              onPress={() => handleMenuPress(item.screen, item.label)}
            >
              <View style={[styles.menuIconBox, { backgroundColor: tint + '15' }]}>
                <Ionicons name={item.icon} size={18} color={tint} />
              </View>
              <View style={styles.menuTextBox}>
                <AppText variant="bodyStrong">{item.label}</AppText>
                <AppText variant="caption">{item.desc}</AppText>
              </View>
              {item.badge ? (
                <AppBadge label={String(item.badge)} variant="primary" />
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {/* Branded gradient header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="rgba(255,255,255,0.8)">Welcome back</AppText>
              <AppText variant="h1" color="#fff">{displayName}</AppText>
            </View>
            <AppIconButton
              size={40}
              bg="rgba(255,255,255,0.18)"
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </AppIconButton>
          </View>

          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={{ width: 76, height: 76, borderRadius: 38 }} />
              ) : (
                <AppText variant="h1" color="#fff">{getInitials(displayName)}</AppText>
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {user?.phoneNumber ? (
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.85)" />
                  <AppText variant="caption" color="rgba(255,255,255,0.95)">{user.phoneNumber}</AppText>
                </View>
              ) : null}
              {user?.email ? (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={13} color="rgba(255,255,255,0.85)" />
                  <AppText variant="caption" color="rgba(255,255,255,0.95)" numberOfLines={1}>{user.email}</AppText>
                </View>
              ) : null}
              {defaultAddress ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
                  <AppText variant="caption" color="rgba(255,255,255,0.95)" numberOfLines={1}>
                    {defaultAddress.label || defaultAddress.streetAddress}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <Pressable style={styles.statBox} onPress={() => navigation.navigate('MyOrders')}>
            <AppText variant="h2">{orderCount}</AppText>
            <AppText variant="caption">Orders</AppText>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statBox} onPress={() => navigation.navigate('SavedAddresses')}>
            <AppText variant="h2">{addresses.length}</AppText>
            <AppText variant="caption">Addresses</AppText>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statBox} onPress={() => navigation.navigate('Favourites')}>
            <AppText variant="h2">
              <Ionicons name="heart" size={18} color={theme.colors.danger} />
            </AppText>
            <AppText variant="caption">Favourites</AppText>
          </Pressable>
        </View>

        {/* Wallet/Promo placeholder banner — premium feel */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
          <LinearGradient
            colors={[theme.colors.pro, '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.walletCard}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="diamond-outline" size={14} color="#fff" />
                <AppText variant="badge" color="#fff">PRO REWARDS</AppText>
              </View>
              <AppText variant="h2" color="#fff" style={{ marginTop: 6 }}>Earn on every order</AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
                Coming soon — exclusive BaldiaMart deals & cashback.
              </AppText>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="gift-outline" size={32} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Menu groups */}
        {renderMenuGroup('Account', accountItems)}
        {renderMenuGroup('Orders & saved', ordersItems)}
        {renderMenuGroup('Support', supportItems)}

        {/* Logout */}
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          <AppButton
            label="Log out"
            variant="outline"
            tint={theme.colors.danger}
            textColor={theme.colors.danger}
            fullWidth
            size="lg"
            onPress={handleLogout}
            leadingIcon={<Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />}
          />
          <AppText variant="caption" align="center" style={{ marginTop: theme.spacing.md }}>
            BaldiaMart v1.0.0
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

  // Header
  headerBanner: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 16,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
  },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.md,
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.divider, marginVertical: 4 },

  // Wallet
  walletCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    ...theme.shadows.sm,
  },
  walletIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Menu
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionLabel: { marginBottom: theme.spacing.sm, marginLeft: 4 },
  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  menuIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTextBox: { flex: 1, gap: 2 },
});
