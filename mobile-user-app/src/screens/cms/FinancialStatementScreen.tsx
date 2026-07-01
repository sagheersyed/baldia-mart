import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

import { financeApi } from '../../api/api';
import { useCmsStore } from '../../store/cmsStore';
import { AppText, AppIconButton, AppBadge } from '../../components/ui';
import { theme } from '../../theme/theme';

const formatPKR = (val: any): string => {
  const num = Number(val);
  if (isNaN(num) || val === null || val === undefined) {
    return '0.00';
  }
  return num.toLocaleString('en-PK', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
};

export default function FinancialStatementScreen({ navigation }: any) {
  const { activeTenant } = useCmsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statement, setStatement] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const vertical = activeTenant?.type ?? 'mart';
  const color = vertical === 'restaurant' ? theme.colors.food : vertical === 'pharmacy' ? theme.colors.pharma : theme.colors.primary;
  const colorDark = vertical === 'restaurant' ? theme.colors.foodDark : vertical === 'pharmacy' ? theme.colors.pharmaDark : theme.colors.primaryDark;

  const loadData = useCallback(async () => {
    try {
      if (!activeTenant?.tenantId) return;
      const [sumRes, stmtRes] = await Promise.all([
        financeApi.getVendorSummary(activeTenant.tenantId),
        financeApi.getVendorStatement(activeTenant.tenantId),
      ]);
      setSummary(sumRes.data);
      setStatement(stmtRes.data);
    } catch (e) {
      console.warn('[FinanceStatement] Load error', e);
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

    return (
      <View style={styles.txnRow}>
        <View style={[styles.txnIcon, { backgroundColor: isCredit ? '#DCFCE7' : '#FEE2E2' }]}>
          <Ionicons 
            name={isCredit ? 'arrow-down-outline' : 'arrow-up-outline'} 
            size={18} 
            color={isCredit ? '#16A34A' : '#EF4444'} 
          />
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
            {isCredit ? '+' : '-'} Rs. {formatPKR(amount)}
          </AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Bal: Rs. {formatPKR(item.runningBalance)}
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
        <AppText variant="h3" style={{ flex: 1, marginLeft: 12 }}>Financial Statement</AppText>
        <AppIconButton size={36} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
      </View>

      <FlatList
        data={statement}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color} />}
        ListHeaderComponent={
          <View style={styles.topSection}>
            <LinearGradient
              colors={[color, colorDark || color]}
              style={styles.balanceCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <AppText variant="caption" color="rgba(255,255,255,0.7)">Current Net Balance</AppText>
              <AppText variant="h1" color="#fff" style={styles.balanceText}>
                Rs. {formatPKR(summary?.netBalance)}
              </AppText>
              
              <View style={styles.balanceStats}>
                <View style={styles.bStat}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">Total Earnings</AppText>
                  <AppText variant="bodyStrong" color="#fff">Rs. {formatPKR(summary?.totalEarnings)}</AppText>
                </View>
                <View style={styles.bDivider} />
                <View style={styles.bStat}>
                  <AppText variant="caption" color="rgba(255,255,255,0.7)">Commission</AppText>
                  <AppText variant="bodyStrong" color="#fff">Rs. {formatPKR(summary?.totalCommissions)}</AppText>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#4F46E5" />
              <AppText variant="caption" color="#4F46E5" style={{ flex: 1, marginLeft: 8 }}>
                Settlements are processed weekly. Ensure your linked bank account is active.
              </AppText>
            </View>

            <AppText variant="title" style={styles.listTitle}>Transaction History</AppText>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
              <AppText variant="body" color={theme.colors.textMuted} style={{ marginTop: 12 }}>
                No transactions recorded yet.
              </AppText>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {loading && !refreshing && (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={color} />
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
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
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
