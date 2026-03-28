import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ordersApi, ridersApi } from '../api/api';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Mini progress bar ──────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#FF4500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={{ height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

export default function WalletScreen({ navigation }: any) {
  const [stats, setStats]       = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [history, setHistory]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      const [statsRes, earningsRes, historyRes] = await Promise.all([
        ridersApi.getStats(),
        ridersApi.getEarnings().catch(() => ({ data: null })),
        ordersApi.getHistory().catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setEarnings(earningsRes.data);
      setHistory(historyRes.data || []);
    } catch (e) {
      console.error('WalletScreen fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#FF4500" /></View>
  );

  const todayEarnings    = stats?.todayEarnings  || 0;
  const totalEarnings    = stats?.totalEarnings  || 0;
  const todayDeliveries  = stats?.todayDeliveries  || 0;
  const totalDeliveries  = stats?.totalDeliveries  || 0;
  
  const codCollected     = earnings?.codCollected  || 0;
  const codRemitted      = earnings?.codRemitted   || 0;
  const codOwed          = Math.max(0, codCollected - codRemitted);
  const remitThreshold   = earnings?.remitThreshold || 5000;

  const monthlyHistory   = earnings?.monthly || [];
  const bonusBalance     = earnings?.performanceBonus || 0;
  const totalCommission  = earnings?.lifetimeCommission || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings & Wallet</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
      >
        {/* Today's summary */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Your Take-Home Today</Text>
          <Text style={styles.heroVal}>Rs {todayEarnings.toFixed(0)}</Text>
          <Text style={styles.heroSub}>{todayDeliveries} deliveries completed today</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIco}>🚀</Text>
            <Text style={styles.statVal}>{totalDeliveries}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIco}>💰</Text>
            <Text style={styles.statVal}>Rs {totalEarnings.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Lifetime Earning</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIco}>⭐</Text>
            <Text style={styles.statVal}>{stats?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Monthly Performance */}
        {monthlyHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Monthly Performance</Text>
            <View style={styles.monthsGrid}>
              {monthlyHistory.map((m: any, idx: number) => (
                <View key={idx} style={styles.monthCol}>
                  <Text style={styles.monthName}>{m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}</Text>
                  <Text style={styles.monthEarn}>Rs {m.earnings.toFixed(0)}</Text>
                  <Text style={styles.monthTrips}>{m.deliveries} trips</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Commission & Bonus Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Bonuses & Commissions</Text>
          <View style={styles.bonusRow}>
            <View style={styles.bonusItem}>
              <Text style={styles.bonusLabel}>Performance Bonus</Text>
              <Text style={[styles.bonusVal, { color: '#27ae60' }]}>Rs {bonusBalance.toFixed(0)}</Text>
            </View>
            <View style={styles.bonusDivider} />
            <View style={styles.bonusItem}>
              <Text style={styles.bonusLabel}>Lifetime Commission</Text>
              <Text style={styles.bonusVal}>Rs {totalCommission.toFixed(0)}</Text>
            </View>
          </View>
          <Text style={styles.bonusHint}>Admin grants bonuses based on high ratings and speed.</Text>
        </View>

        {/* COD Remittance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💵 COD Cash Tracker</Text>
          <View style={styles.codRow}>
            <View>
              <Text style={styles.codLabel}>Collected from customers</Text>
              <Text style={styles.codVal}>Rs {codCollected.toFixed(0)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.codLabel}>Submitted to office</Text>
              <Text style={[styles.codVal, { color: '#27ae60' }]}>Rs {codRemitted.toFixed(0)}</Text>
            </View>
          </View>

          {codOwed > 0 && (
            <View style={styles.oweWrap}>
              <Text style={styles.oweTitle}>You owe the company</Text>
              <Text style={styles.oweVal}>Rs {codOwed.toFixed(0)}</Text>
              <ProgressBar value={codOwed} max={remitThreshold} color={codOwed >= remitThreshold ? '#e74c3c' : '#FF8C00'} />
              <Text style={[styles.oweHint, { color: codOwed >= remitThreshold ? '#e74c3c' : '#888' }]}>
                {codOwed >= remitThreshold
                  ? '⚠️ Wallet locked! Please remit cash now.'
                  : `Please remit before Rs ${remitThreshold.toFixed(0)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Recent deliveries */}
        <Text style={styles.sectionTitle}>📋 Recent Trips</Text>
        {history.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTxt}>No trip history yet.</Text>
          </View>
        ) : (
          history.slice(0, 10).map((order: any) => (
            <View key={order.id} style={styles.historyCard}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.historyId}>#{order.id.slice(0, 7).toUpperCase()}</Text>
                  {order.orderType === 'food'
                    ? <View style={[styles.typeBadge, { backgroundColor: '#FFF5E0' }]}><Text style={[styles.typeTxt, { color: '#FF8C00' }]}>🍽️ Food</Text></View>
                    : <View style={[styles.typeBadge, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.typeTxt, { color: '#2E7D32' }]}>🛒 Mart</Text></View>
                  }
                </View>
                <Text style={styles.historyAddr} numberOfLines={1}>📍 {order.address?.streetAddress || 'Local Area'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.historyEarning}>Rs {(Number(order.deliveryFee) + Number(order.riderCommission || 0)).toFixed(0)}</Text>
                <Text style={styles.historySubEarning}>Fee + Commission</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#1E1E1E',
  },
  backBtn: { marginRight: 14 },
  backArrow: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  heroCard: {
    backgroundColor: '#FF4500', borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  heroVal: { color: '#fff', fontSize: 44, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
  },
  statIco: { fontSize: 24, marginBottom: 6 },
  statVal: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 3, textAlign: 'center' },

  section: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },

  monthsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  monthCol: { alignItems: 'center', flex: 1 },
  monthName: { fontSize: 10, color: '#999', fontWeight: '700', marginBottom: 4 },
  monthEarn: { fontSize: 13, fontWeight: '800', color: '#333' },
  monthTrips: { fontSize: 10, color: '#BBB', marginTop: 2 },

  bonusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  bonusItem: { flex: 1, alignItems: 'center' },
  bonusLabel: { fontSize: 11, color: '#888', marginBottom: 6 },
  bonusVal: { fontSize: 18, fontWeight: '900', color: '#1A1A1A' },
  bonusDivider: { width: 1, height: 30, backgroundColor: '#EEE' },
  bonusHint: { fontSize: 11, color: '#AAA', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  codRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  codLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  codVal: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },

  oweWrap: {
    backgroundColor: '#FFF5E0', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#FFD8A8', marginTop: 8,
  },
  oweTitle: { fontSize: 11, color: '#888', fontWeight: '600' },
  oweVal: { fontSize: 24, fontWeight: '900', color: '#B45309', marginTop: 2 },
  oweHint: { fontSize: 12, marginTop: 8, fontWeight: '600' },

  historyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
  },
  historyId: { fontSize: 12, fontWeight: '700', color: '#555' },
  historyAddr: { fontSize: 12, color: '#999', marginTop: 4 },
  historyEarning: { fontSize: 17, fontWeight: '900', color: '#27ae60' },
  historySubEarning: { fontSize: 9, color: '#AAA', marginTop: 2, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  typeTxt: { fontSize: 9, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', padding: 30 },
  emptyTxt: { color: '#aaa', fontSize: 14 },
});
