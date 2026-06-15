import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

import { financeApi } from '../api/api';
import { AppText, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

export default function RiderStatementScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statement, setStatement] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const accent = '#10B981'; // Success/Green for Riders (earnings)
  const accentDark = '#065F46';

  const loadData = useCallback(async () => {
    try {
      const [sumRes, stmtRes] = await Promise.all([
        financeApi.getRiderSummary(),
        financeApi.getRiderStatement(),
      ]);
      setSummary(sumRes.data);
      setStatement(stmtRes.data);
    } catch (e) {
      console.warn('[RiderStatement] Load error', e);
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

  const renderTransaction = ({ item }: { item: any }) => {
    const isCredit = item.direction === 'CREDIT';
    const amount = Number(item.amount);
    const date = new Date(item.createdAt);
    const orderRef = item.orderId ? item.orderId.split('-')[0].toUpperCase() : null;

    // Classification icon
    let iconName: keyof typeof Ionicons.glyphMap = 'cash-outline';
    let iconColor = '#16A34A';
    let iconBg = '#DCFCE7';

    if (item.entryType === 'COD_COLLECTION') {
       iconName = 'wallet-outline';
       iconColor = '#EF4444';
       iconBg = '#FEE2E2';
    } else if (item.entryType === 'RIDER_DELIVERY_FEE') {
       iconName = 'bicycle-outline';
       iconColor = '#16A34A';
       iconBg = '#DCFCE7';
    }

    return (
      <View style={styles.txnRow}>
        <View style={[styles.txnIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{item.description}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {format(date, 'MMM d, h:mm a')} {orderRef ? `• #${orderRef}` : ''}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText 
            variant="bodyStrong" 
            color={isCredit ? '#16A34A' : '#EF4444'}
          >
            {isCredit ? '+' : '-'} Rs. {amount.toLocaleString()}
          </AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Bal: Rs. {Number(item.runningBalance).toLocaleString()}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h3" style={{ flex: 1, marginLeft: 12 }}>Earnings & Wallet</AppText>
        <AppIconButton size={36} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
      </View>

      <FlatList
        data={statement}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        ListHeaderComponent={
          <View style={styles.topSection}>
            <LinearGradient
              colors={[accent, accentDark]}
              style={styles.balanceCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <AppText variant="caption" color="rgba(255,255,255,0.7)">Available for Withdrawal</AppText>
              <AppText variant="h1" color="#fff" style={styles.balanceText}>
                Rs. {summary?.netBalance?.toLocaleString() ?? '0'}
              </AppText>
              
              <View style={styles.balanceStats}>
                <View style={styles.bStat}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">Total Earned</AppText>
                  <AppText variant="bodyStrong" color="#fff">Rs. {summary?.totalEarnings?.toLocaleString() ?? '0'}</AppText>
                </View>
                <View style={styles.bDivider} />
                <View style={styles.bStat}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">COD Outstanding</AppText>
                  <AppText variant="bodyStrong" color="#fff">Rs. {summary?.codOutstanding?.toLocaleString() ?? '0'}</AppText>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.debtNotice}>
              <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
              <AppText variant="caption" color="#991B1B" style={{ flex: 1, marginLeft: 8 }}>
                COD Outstanding represents cash collected from customers that is owed to the platform.
              </AppText>
            </View>

            <AppText variant="title" style={styles.listTitle}>Transaction History</AppText>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="bicycle-outline" size={48} color="#CBD5E1" />
              <AppText variant="body" color={theme.colors.textMuted} style={{ marginTop: 12 }}>
                No delivery earnings recorded yet.
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
  container: { flex: 1, backgroundColor: '#FAFBFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topSection: { padding: 20 },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    ...theme.shadows.lg,
  },
  balanceText: { fontSize: 32, marginVertical: 8, fontWeight: '700' },
  balanceStats: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  bStat: { flex: 1 },
  bDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  debtNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  listTitle: { marginTop: 24, marginBottom: 8 },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', marginTop: 100 },
  fullLoader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
});
