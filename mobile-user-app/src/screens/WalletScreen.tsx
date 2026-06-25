import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { financeApi } from '../api/api';
import { AppText, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

export default function WalletScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [statement, setStatement] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, stmtRes] = await Promise.all([
        financeApi.getUserSummary(),
        financeApi.getUserStatement(),
      ]);
      setSummary(sumRes.data);
      setStatement(stmtRes.data);
    } catch (e) {
      console.error('WalletScreen fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const renderTransaction = ({ item }: { item: any }) => {
    const isCredit = item.direction === 'CREDIT';
    const amount = Number(item.amount);
    const date = new Date(item.createdAt);
    const orderRef = item.orderId ? item.orderId.split('-')[0].toUpperCase() : null;

    let iconName: keyof typeof Ionicons.glyphMap = 'cash-outline';
    let iconColor = theme.colors.success;
    let iconBg = theme.colors.successLight;

    if (item.description?.toLowerCase().includes('refund')) {
       iconName = 'arrow-undo-outline';
       iconColor = theme.colors.info;
       iconBg = theme.colors.infoLight;
    } else if (item.description?.toLowerCase().includes('adjustment')) {
       iconName = 'options-outline';
       iconColor = theme.colors.warning;
       iconBg = theme.colors.warningLight;
    }

    return (
      <View style={styles.txnRow}>
        <View style={[styles.txnIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{item.description}</AppText>
          <AppText variant="caption">
            {format(date, 'MMM d, h:mm a')} {orderRef ? `• #${orderRef}` : ''}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="bodyStrong" style={{ color: isCredit ? theme.colors.success : theme.colors.danger }}>
            {isCredit ? '+' : '-'} Rs {amount.toLocaleString()}
          </AppText>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
  );

  const currentBal = Number(summary?.balance || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2">My Wallet</AppText>
      </View>

      <FlatList
        data={statement}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <>
            {/* Hero Section */}
            <View style={{ padding: 20 }}>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={styles.heroCard}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <AppText variant="caption" color="rgba(255,255,255,0.85)">Current Credit Balance</AppText>
                <AppText variant="h1" color="#fff" style={{ fontSize: 32, marginVertical: 8 }}>Rs {currentBal.toLocaleString()}</AppText>
                
                <View style={styles.heroDivider} />
                
                <AppText variant="caption" color="rgba(255,255,255,0.7)">
                  This balance is automatically applied to your next order during checkout.
                </AppText>
              </LinearGradient>

              {currentBal > 0 && (
                <View style={styles.promoBox}>
                  <Ionicons name="gift-outline" size={20} color="#6D28D9" />
                  <AppText variant="captionStrong" color="#6D28D9" style={{ marginLeft: 8 }}>
                    You have active credits! These will be used first.
                  </AppText>
                </View>
              )}

              <AppText variant="bodyStrong" style={{ marginTop: 24, marginBottom: 8 }}>Recent Activity</AppText>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.divider} />
            <AppText variant="body" color={theme.colors.textMuted} style={{ marginTop: 12 }}>No transactions yet.</AppText>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    gap: 12,
  },
  heroCard: {
    borderRadius: 24, padding: 24,
    shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
  },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
  promoBox: {
    flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center',
  },
  txnRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', padding: 60, marginTop: 40 },
});
