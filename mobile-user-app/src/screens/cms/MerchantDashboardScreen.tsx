import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl,
  Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';
import { useIsFocused } from '@react-navigation/native';

export default function MerchantDashboardScreen({ navigation }: any) {
  const { activeTenant, exitMerchantMode } = useCmsStore();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const tenantId = activeTenant?.tenantId ?? '';
  const vertical = activeTenant?.type ?? 'mart';

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [prodRes, statsRes] = await Promise.all([
        vertical === 'restaurant'
          ? cmsApi.getRestaurantMenu(tenantId)
          : vertical === 'pharmacy'
          ? cmsApi.getPharmacyMedicines(tenantId)
          : cmsApi.getVendorProducts(tenantId),
        cmsApi.getDashboardStats(tenantId),
      ]);

      setProducts(prodRes.data ?? []);
      setDashboardStats(statsRes.data);
    } catch (e) {
      console.warn('[Dashboard] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId, vertical]);

  useEffect(() => {
    if (isFocused && tenantId) {
      loadData();
    }
  }, [isFocused, tenantId, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const color = vertical === 'restaurant' ? theme.colors.food : vertical === 'pharmacy' ? theme.colors.pharma : theme.colors.primary;

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Simple Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.navigate('StoreProfile')}
          style={{ flex: 1 }}
        >
          <AppText variant="h2">{activeTenant?.name}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>{vertical.toUpperCase()} • {activeTenant?.role}</AppText>
        </Pressable>
        <Pressable 
          onPress={() => { exitMerchantMode(); navigation.goBack(); }}
          style={styles.exitBtn}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <AppText variant="caption" color="#EF4444">Exit</AppText>
        </Pressable>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color} />}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Real-time Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3">Business Insights</AppText>
            <View style={[styles.pill, { backgroundColor: '#DCFCE7' }]}>
              <AppText variant="badge" color="#16A34A">Live Today</AppText>
            </View>
          </View>
          
          <View style={styles.insightsRow}>
            <View style={styles.insightCard}>
              <AppText variant="caption" color={theme.colors.textMuted}>Today's Revenue</AppText>
              <AppText variant="h2" color={theme.colors.textPrimary}>Rs. {dashboardStats?.todayRevenue?.toLocaleString() ?? '0'}</AppText>
              <View style={styles.insightTrend}>
                <Ionicons name="trending-up" size={14} color="#16A34A" />
                <AppText variant="badge" color="#16A34A" style={{ marginLeft: 2 }}>{dashboardStats?.todayRevenue > 0 ? '+Recently' : 'No Sales'}</AppText>
              </View>
            </View>

            <Pressable 
              style={styles.insightCard}
              onPress={() => navigation.navigate('MerchantOrders', { initialTab: 'active' })}
            >
              <AppText variant="caption" color={theme.colors.textMuted}>Active Orders</AppText>
              <AppText variant="h2" color={color}>{dashboardStats?.activeOrders ?? '0'}</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>In progress</AppText>
            </Pressable>
          </View>
        </View>

        {/* Catalog & Requests Grid */}
        <View style={styles.grid}>
          <Pressable 
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProductCatalog')}
          >
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
              <Ionicons name="cube-outline" size={24} color={color} />
            </View>
            <AppText variant="h3">{dashboardStats?.totalInventory ?? products.length}</AppText>
            <AppText variant="caption">Inventory</AppText>
          </Pressable>

          <Pressable 
            style={styles.actionCard}
            onPress={() => navigation.navigate('ChangeRequestQueue')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
            </View>
            <AppText variant="h3">{dashboardStats?.pendingRequests ?? '0'}</AppText>
            <AppText variant="caption">Pending Review</AppText>
            {(dashboardStats?.pendingRequests ?? 0) > 0 && <View style={styles.badge} />}
          </Pressable>
        </View>

        <View style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>Management</AppText>
          <Pressable 
            style={styles.wideCard}
            onPress={() => {
              if (vertical === 'restaurant') {
                navigation.navigate('AddNewItemForm', { vertical: 'restaurant' });
              } else {
                navigation.navigate('AddItem');
              }
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="add-circle" size={22} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Add New Product</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>Submit item for admin approval</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>

          <Pressable 
            style={[styles.wideCard, { marginTop: 12 }]}
            onPress={() => navigation.navigate('MerchantOrders', { initialTab: 'delivered' })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="receipt-outline" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Order Management</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>View past and active sales</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {/* Quick View */}
        <View style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>Recent Products</AppText>
          {products.slice(0, 5).map((item) => {
            const isAvailable = item.isAvailable !== false && item.isActive !== false;
            const name = item.medicine?.name ?? item.product?.name ?? item.name;
            return (
              <Pressable
                key={item.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('EditProduct', { item, isRestaurant: vertical === 'restaurant', isPharmacy: vertical === 'pharmacy' })}
              >
                <View style={[styles.dot, { backgroundColor: isAvailable ? '#16A34A' : '#EF4444' }]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{name}</AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>Rs. {item.price ?? item.sellingPrice ?? item.priceOverride}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </Pressable>
            );
          })}
          {products.length > 5 && (
            <Pressable onPress={() => navigation.navigate('ProductCatalog')} style={styles.viewMore}>
              <AppText variant="caption" color={color}>View All Products</AppText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  scroll: { padding: 20, gap: 20 },
  grid: { flexDirection: 'row', gap: 16 },
  actionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  wideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  section: { gap: 12 },
  sectionTitle: { marginBottom: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  viewMore: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightsRow: { flexDirection: 'row', gap: 12 },
  insightCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 2,
  },
  insightTrend: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
});
