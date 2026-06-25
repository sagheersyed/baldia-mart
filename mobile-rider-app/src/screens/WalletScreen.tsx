import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { financeApi, ridersApi } from '../api/api';

const { width: SCREEN_W } = Dimensions.get('window');

export default function WalletScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [statement, setStatement] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ACCENT = '#FF4500'; 
  const SUCCESS = '#10B981';

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, stmtRes, statsRes] = await Promise.all([
        financeApi.getRiderSummary(),
        financeApi.getRiderStatement(),
        ridersApi.getStats().catch(() => ({ data: null })),
      ]);
      setSummary(sumRes.data);
      setStatement(stmtRes.data);
      setStats(statsRes.data);
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
    let iconColor = SUCCESS;
    let iconBg = '#DCFCE7';

    if (item.entryType === 'COD_COLLECTION') {
       iconName = 'wallet-outline';
       iconColor = '#EF4444';
       iconBg = '#FEE2E2';
    } else if (item.entryType === 'RIDER_DELIVERY_FEE') {
       iconName = 'bicycle-outline';
       iconColor = SUCCESS;
       iconBg = '#DCFCE7';
    }

    return (
      <View style={styles.txnRow}>
        <View style={[styles.txnIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txnTitle}>{item.description}</Text>
          <Text style={styles.txnDate}>
            {format(date, 'MMM d, h:mm a')} {orderRef ? `• #${orderRef}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.txnAmount, { color: isCredit ? SUCCESS : '#EF4444' }]}>
            {isCredit ? '+' : '-'} Rs {amount.toLocaleString()}
          </Text>
          <Text style={styles.txnBal}>Bal: Rs {Number(item.runningBalance).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={ACCENT} /></View>
  );

  const currentBal = Number(summary?.netBalance || 0);
  const codOwed = Number(summary?.codOutstanding || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings & Wallet</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={statement}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListHeaderComponent={
          <>
            {/* Hero Section */}
            <View style={{ padding: 20 }}>
              <LinearGradient
                colors={[ACCENT, '#E63E00']}
                style={styles.heroCard}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.heroLabel}>Available for Withdrawal</Text>
                <Text style={styles.heroVal}>Rs {currentBal.toLocaleString()}</Text>
                
                <View style={styles.heroDivider} />
                
                <View style={styles.heroStats}>
                  <View style={styles.hStatCol}>
                    <Text style={styles.hStatLabel}>Lifetime Total</Text>
                    <Text style={styles.hStatVal}>Rs {Number(summary?.totalEarnings || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.hStatCol}>
                    <Text style={styles.hStatLabel}>Today's Earnings</Text>
                    <Text style={styles.hStatVal}>Rs {Number(stats?.todayEarnings || 0).toLocaleString()}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Financial Health Row */}
              <View style={styles.healthRow}>
                 <View style={[styles.healthCard, { borderColor: codOwed > (summary?.limit || 5000) * 0.8 ? '#EF4444' : '#E2E8F0' }]}>
                    <Text style={styles.healthLabel}>Cash Limit</Text>
                    <Text style={styles.healthVal}>Rs {Number(summary?.limit || 5000).toLocaleString()}</Text>
                    <View style={styles.healthProgress}>
                       <View style={[styles.healthBar, { 
                          width: `${Math.min(100, (codOwed / (summary?.limit || 5000)) * 100)}%`,
                          backgroundColor: codOwed > (summary?.limit || 5000) * 0.8 ? '#EF4444' : SUCCESS
                       }]} />
                    </View>
                    <Text style={styles.healthSub}>
                       {codOwed > 0 ? `Rs ${(summary?.limit - codOwed).toLocaleString()} remaining` : 'Limit is fully available'}
                    </Text>
                 </View>

                 <View style={styles.healthCard}>
                    <Text style={styles.healthLabel}>Held Cash (COD)</Text>
                    <Text style={[styles.healthVal, { color: codOwed > 0 ? '#EF4444' : '#1E1E1E' }]}>Rs {codOwed.toLocaleString()}</Text>
                    <TouchableOpacity style={styles.infoBtn} onPress={() => {}}>
                       <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                       <Text style={styles.infoText}>How to remit?</Text>
                    </TouchableOpacity>
                 </View>
              </View>

              {/* Suspension Warning */}
              {summary?.isSuspended && (
                <View style={[styles.warningBox, { backgroundColor: '#7F1D1D', borderColor: '#991B1B' }]}>
                  <Ionicons name="shield-outline" size={24} color="#fff" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.warningTitle, { color: '#fff' }]}>ACCOUNT SUSPENDED</Text>
                    <Text style={[styles.warningText, { color: 'rgba(255,255,255,0.8)' }]}>
                      Your cash limit has been exceeded. Please remit Rs {codOwed.toLocaleString()} to reactivate your account.
                    </Text>
                  </View>
                </View>
              )}

              {/* Stats Row */}
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Ionicons name="bicycle" size={20} color={ACCENT} />
                  <Text style={styles.summaryVal}>{stats?.totalDeliveries || 0}</Text>
                  <Text style={styles.summaryLabel}>Total Trips</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                  <Text style={styles.summaryVal}>{stats?.rating?.toFixed(1) || '5.0'}</Text>
                  <Text style={styles.summaryLabel}>Rating</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTxt}>No transactions recorded yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#1E1E1E',
    justifyContent: 'space-between',
  },
  backBtn: { width: 40 },
  refreshBtn: { width: 40, alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  heroCard: {
    borderRadius: 24, padding: 24,
    shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroVal: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 8 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
  heroStats: { flexDirection: 'row' },
  hStatCol: { flex: 1 },
  hStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  hStatVal: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },

  warningBox: {
    flexDirection: 'row', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: '#FEE2E2', alignItems: 'center',
  },
  warningTitle: { color: '#991B1B', fontSize: 14, fontWeight: '700' },
  warningText: { color: '#991B1B', fontSize: 12, marginTop: 2 },

  summaryGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  summaryVal: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginTop: 8 },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 24, marginBottom: 8 },
  
  txnRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  txnDate: { fontSize: 11, color: '#888', marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '800' },
  txnBal: { fontSize: 10, color: '#AAA', marginTop: 2 },

  healthRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  healthCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  healthLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  healthVal: { fontSize: 18, fontWeight: '900', color: '#1E1E1E', marginVertical: 4 },
  healthProgress: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 4 },
  healthBar: { height: '100%', borderRadius: 2 },
  healthSub: { fontSize: 10, color: '#94A3B8', marginTop: 8, fontWeight: '600' },
  infoBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  infoText: { fontSize: 10, color: '#64748B', fontWeight: '700' },

  emptyWrap: { alignItems: 'center', padding: 60, marginTop: 40 },
  emptyTxt: { color: '#aaa', fontSize: 14, marginTop: 12 },
});
