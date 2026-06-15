import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays } from 'date-fns';

import { financeApi } from '../api/api';
import { AppText, AppIconButton, AppBadge } from '../components/ui';
import { theme } from '../theme/theme';

export default function PlatformFinancialsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const accent = theme.colors.pro; // Purple for Admin
  const accentDark = '#4C1D95';

  const loadData = useCallback(async () => {
    try {
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');

      const [sumRes, snapRes] = await Promise.all([
        financeApi.getPlatformSummary(),
        financeApi.getDailySnapshots(from, to),
      ]);
      setSummary(sumRes.data);
      setSnapshots(snapRes.data);
    } catch (e) {
      console.warn('[PlatformFinancials] Load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderSnapshot = ({ item, index }: { item: any, index: number }) => {
    const date = new Date(item.snapshotDate);
    const prevItem = snapshots[index + 1];
    const growth = prevItem ? ((item.netRevenue - prevItem.netRevenue) / prevItem.netRevenue) * 100 : 0;

    return (
      <View style={styles.snapRow}>
        <View style={styles.snapDateBox}>
          <AppText variant="captionStrong">{format(date, 'MMM d')}</AppText>
          <AppText variant="overline">{format(date, 'EEE')}</AppText>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <View style={styles.snapMain}>
             <AppText variant="bodyStrong">Rs. {Number(item.netRevenue).toLocaleString()}</AppText>
             {prevItem && (
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Ionicons name={growth >= 0 ? 'caret-up' : 'caret-down'} size={12} color={growth >= 0 ? '#16A34A' : '#EF4444'} />
                 <AppText variant="badge" color={growth >= 0 ? '#16A34A' : '#EF4444'}>{Math.abs(growth).toFixed(1)}%</AppText>
               </View>
             )}
          </View>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {item.totalOrders} Orders • Rs. {Number(item.grossRevenue).toLocaleString()} GMV
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.divider} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h3" style={{ flex: 1, marginLeft: 12 }}>Platform Financials</AppText>
        <AppIconButton size={36} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
      </View>

      <FlatList
        data={snapshots}
        keyExtractor={(item) => item.id}
        renderItem={renderSnapshot}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        ListHeaderComponent={
          <View style={styles.topSection}>
             <LinearGradient
              colors={[accent, accentDark]}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">Total Commissions</AppText>
                  <AppText variant="h1" color="#fff" style={styles.heroValue}>
                    Rs. {summary?.totalCommissions?.toLocaleString() ?? '0'}
                  </AppText>
                </View>
                <View style={styles.heroIcon}>
                  <Ionicons name="stats-chart-outline" size={28} color="#fff" />
                </View>
              </View>
              
              <View style={styles.heroStats}>
                <View style={styles.hStat}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">GMV</AppText>
                  <AppText variant="bodyStrong" color="#fff">Rs. {summary?.totalEarnings?.toLocaleString() ?? '0'}</AppText>
                </View>
                <View style={styles.hDivider} />
                <View style={styles.hStat}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">COD Outstanding</AppText>
                  <AppText variant="bodyStrong" color="#fff">Rs. {summary?.codOutstanding?.toLocaleString() ?? '0'}</AppText>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.grid}>
              <View style={styles.gridCard}>
                 <AppText variant="caption" color={theme.colors.textSecondary}>Net Platform Balance</AppText>
                 <AppText variant="h3" color={theme.colors.textPrimary}>Rs. {summary?.netBalance?.toLocaleString() ?? '0'}</AppText>
              </View>
              <View style={styles.gridCard}>
                 <AppText variant="caption" color={theme.colors.textSecondary}>Active Period</AppText>
                 <AppText variant="h3" color={theme.colors.textPrimary}>Last 30 Days</AppText>
              </View>
            </View>

            <AppText variant="title" style={styles.listTitle}>Daily Performance (Snapshot)</AppText>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
              <AppText variant="body" color={theme.colors.textMuted} style={{ marginTop: 12 }}>
                No snapshots found for this period.
              </AppText>
              <AppText variant="caption" align="center" style={{ marginTop: 4, paddingHorizontal: 40 }}>
                Snapshots are generated daily at 00:01 AM.
              </AppText>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {loading && !refreshing && (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topSection: { padding: 20 },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    ...theme.shadows.lg,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroValue: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  heroIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroStats: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  hStat: { flex: 1 },
  hDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  grid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  gridCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  listTitle: { marginTop: 28, marginBottom: 12 },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  snapDateBox: {
    width: 60,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 12,
  },
  snapMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  empty: { alignItems: 'center', marginTop: 80 },
  fullLoader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
});
