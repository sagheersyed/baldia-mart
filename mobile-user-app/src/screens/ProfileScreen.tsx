import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, Pressable, ActivityIndicator, ScrollView,
  RefreshControl, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authApi, addressesApi, ordersApi, favoritesApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useCartStore } from '../store/cartStore';
import { useOrdersStore } from '../store/ordersStore';
import { useAuthStore } from '../store/authStore';
import { useCmsStore } from '../store/cmsStore';
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
  const { activeMode } = useCartStore();
  const { orders, consultations, labBookings, fetchOrders, fetchConsultations, fetchLabBookings } = useOrdersStore();
  const { userData: user } = useAuthStore();
  const { memberships, loadMemberships, enterMerchantMode, isCmsSessionValid } = useCmsStore();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lastFetchTime = useRef(0);

  const fetchProfile = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 30000) return;
    lastFetchTime.current = now;
    try {
      if (!force && !navigation.isFocused()) return;
      const [addrRes, favsRes] = await Promise.allSettled([
        addressesApi.getAll(),
        favoritesApi.getAll(),
      ]);
      
      // Store fetches
      fetchOrders(force);
      fetchConsultations(force);
      fetchLabBookings(force);

      if (addrRes.status === 'fulfilled') setAddresses(addrRes.value.data || []);
      if (favsRes.status === 'fulfilled') {
        setFavoritesCount(favsRes.value.data?.length || 0);
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
    loadMemberships();
    const unsubscribe = navigation.addListener('focus', () => { fetchProfile(false); loadMemberships(); });
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

  const accent = activeMode === 'food' ? theme.colors.food : activeMode === 'pharma' ? theme.colors.pharma : theme.colors.primary;
  const accentDark = activeMode === 'food' ? theme.colors.foodDark : activeMode === 'pharma' ? theme.colors.pharmaDark : theme.colors.primaryDark;

  // Safe colors for LinearGradient to prevent NPE
  const gradientColors: [string, string] = [accent || '#FF5A1F', accentDark || '#E64A19'];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={accent} />
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

  const orderCount = orders.length;
  const activeOrderCount = orders.filter((o: any) =>
    ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;

  const ordersItems: MenuItem[] = [
    { icon: 'cube-outline', label: 'My orders', desc: 'Track and view past orders', screen: 'MyOrders', badge: activeOrderCount > 0 ? activeOrderCount : undefined },
    { icon: 'videocam-outline', label: 'My consultations', desc: `${consultations.length} Bookings`, screen: 'MyConsultations', tint: theme.colors.pharma, badge: consultations.filter(c => c.status === 'scheduled').length || undefined },
    { icon: 'flask-outline', label: 'Lab bookings', desc: `${labBookings.length} Reports`, screen: 'MyLabBookings', tint: theme.colors.pharma, badge: labBookings.filter(l => l.status !== 'results_ready' && l.status !== 'cancelled').length || undefined },
    { icon: 'repeat-outline', label: 'My Subscriptions', desc: 'Manage recurring medicines', screen: 'PharmaSubscriptionList', tint: theme.colors.pharma },
    { icon: 'document-text-outline', label: 'My Prescriptions', desc: 'Track your uploaded prescriptions', screen: 'MyPrescriptions', tint: theme.colors.pharma },
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

  const filteredOrdersItems = ordersItems.filter(item => {
    if (item.label === 'My consultations') return settings?.feature_pharma_doctor_consultations_enabled;
    if (item.label === 'Lab bookings') return settings?.feature_pharma_lab_tests_enabled;
    if (item.label === 'My Subscriptions') return settings?.feature_pharma_refills_enabled;
    return true;
  });

  const renderMenuGroup = (title: string, items: MenuItem[]) => (
    <View style={styles.section}>
      <AppText variant="overline" style={styles.sectionLabel}>{title}</AppText>
      <View style={styles.menuCard}>
        {items.map((item, ii) => {
          const tint = item.tint || accent;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />}
      >
        {/* Branded gradient header */}
        <LinearGradient
          colors={gradientColors}
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

        {/* Stats Dashboard */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Pressable
              style={styles.statItem}
              onPress={() => navigation.navigate('MyOrders')}
            >
              <View style={[styles.statIcon, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="cube-outline" size={20} color={theme.colors.primary} />
              </View>
              <AppText variant="h3">{orderCount}</AppText>
              <AppText variant="caption">Orders</AppText>
            </Pressable>

            <View style={styles.statDivider} />

            <Pressable
              style={styles.statItem}
              onPress={() => navigation.navigate('SavedAddresses')}
            >
              <View style={[styles.statIcon, { backgroundColor: theme.colors.infoLight }]}>
                <Ionicons name="location-outline" size={20} color={theme.colors.info} />
              </View>
              <AppText variant="h3">{addresses.length}</AppText>
              <AppText variant="caption">Addresses</AppText>
            </Pressable>

            <View style={styles.statDivider} />

            <Pressable
              style={styles.statItem}
              onPress={() => navigation.navigate('Favourites')}
            >
              <View style={[styles.statIcon, { backgroundColor: theme.colors.dangerLight }]}>
                <Ionicons name="heart-outline" size={20} color={theme.colors.danger} />
              </View>
              <AppText variant="h3">{favoritesCount}</AppText>
              <AppText variant="caption">Favorites</AppText>
            </Pressable>
          </View>
        </View>

        {/* Wallet/Promo placeholder banner — premium feel */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: 0 }}>
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

        {/* Merchant CMS Banner */}
        {memberships.length > 0 && (
          <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            <AppText variant="overline" style={{ marginBottom: theme.spacing.sm, marginLeft: 4 }}>MY BUSINESS</AppText>
            {memberships.map((m) => {
              const typeColor = m.type === 'restaurant' ? '#EA580C' : m.type === 'pharmacy' ? '#7C3AED' : '#16A34A';
              const typeIcon: keyof typeof Ionicons.glyphMap = m.type === 'restaurant' ? 'restaurant-outline' : m.type === 'pharmacy' ? 'medical-outline' : 'storefront-outline';
              return (
                <Pressable
                  key={m.tenantId}
                  style={({ pressed }) => [{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.md,
                    marginBottom: 8,
                    borderWidth: 1.5, borderColor: typeColor + '40',
                    ...(theme.shadows.sm as any),
                  }, pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null]}
                  onPress={() => {
                    enterMerchantMode(m.tenantId);
                    if (isCmsSessionValid(m.tenantId)) {
                      navigation.navigate('MerchantDashboard');
                    } else {
                      navigation.navigate('CmsAuthGate');
                    }
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: typeColor + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={typeIcon} size={22} color={typeColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{m.name}</AppText>
                    <AppText variant="caption" color={theme.colors.textMuted}>
                      {m.type.charAt(0).toUpperCase() + m.type.slice(1)} · {m.role.toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: typeColor + '15' }}>
                    <AppText variant="badge" color={typeColor}>Open CMS →</AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Menu groups */}
        {renderMenuGroup('Account', accountItems)}
        {renderMenuGroup('Orders & saved', filteredOrdersItems)}
        {renderMenuGroup('Support', supportItems)}

        {/* Logout */}
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, marginBottom: 60 }}>
          <AppButton
            label="Log Out"
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

  statsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: -24,
    marginBottom: theme.spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.divider,
  },

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
