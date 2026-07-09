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

const formatPKR = (val: any): string => {
  const num = Number(val);
  if (isNaN(num) || val === null || val === undefined) {
    return '0.00';
  }
  return num.toLocaleString('en-PK', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
};

export default function WalletScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [statement, setStatement] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRemitModal, setShowRemitModal] = useState(false);

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

      let currentEarningsBal = Number(sumRes.data?.netBalance || 0);
      let currentCashBal = Number(sumRes.data?.codOutstanding || 0);

      const enriched = (stmtRes.data || []).map((item: any) => {
        const amt = Number(item.amount);
        const isEarnings = item.accountTag === 'EARNINGS';
        const isCash = item.accountTag === 'CASH_IN_HAND';

        let runningVal = 0;
        if (isEarnings) {
          runningVal = currentEarningsBal;
          if (item.direction === 'CREDIT') {
            currentEarningsBal -= amt;
          } else {
            currentEarningsBal += amt;
          }
        } else if (isCash) {
          runningVal = currentCashBal;
          if (item.direction === 'DEBIT') {
            currentCashBal -= amt;
          } else {
            currentCashBal += amt;
          }
        } else {
          runningVal = currentEarningsBal;
        }

        return {
          ...item,
          runningBalance: runningVal,
        };
      });

      setStatement(enriched);
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
    const orderId = item.transaction?.referenceType === 'ORDER_SETTLEMENT' ? item.transaction?.referenceId : null;
    const orderRef = orderId ? orderId.split('-')[0].toUpperCase() : null;

    let iconName: keyof typeof Ionicons.glyphMap = 'cash-outline';
    let iconColor = SUCCESS;
    let iconBg = '#DCFCE7';

    if (item.accountTag === 'CASH_IN_HAND') {
       iconName = 'wallet-outline';
       iconColor = isCredit ? SUCCESS : '#EF4444';
       iconBg = isCredit ? '#DCFCE7' : '#FEE2E2';
    } else if (item.accountTag === 'EARNINGS') {
       iconName = 'bicycle-outline';
       iconColor = isCredit ? SUCCESS : '#EF4444';
       iconBg = isCredit ? '#DCFCE7' : '#FEE2E2';
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
            {isCredit ? '+' : '-'} Rs. {formatPKR(amount)}
          </Text>
          <Text style={styles.txnBal}>Bal: Rs. {formatPKR(item.runningBalance)}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={ACCENT} /></View>
  );

  const currentBal = Number(summary?.netBalance || 0);
  const codOwed = Number(summary?.codOutstanding || 0);
  const totalCommissions = Number(summary?.totalCommissions || 0);
  const totalRemittanceDue = codOwed + totalCommissions;

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
                <Text style={styles.heroVal}>Rs. {formatPKR(currentBal)}</Text>
                
                <View style={styles.heroDivider} />
                
                <View style={styles.heroStats}>
                  <View style={styles.hStatCol}>
                    <Text style={styles.hStatLabel}>Lifetime Total</Text>
                    <Text style={styles.hStatVal}>Rs. {formatPKR(summary?.totalEarnings)}</Text>
                  </View>
                  <View style={styles.hStatCol}>
                    <Text style={styles.hStatLabel}>Today's Earnings</Text>
                    <Text style={styles.hStatVal}>Rs. {formatPKR(stats?.todayEarnings)}</Text>
                  </View>
                </View>
              </LinearGradient>

              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => navigation.navigate('Withdrawal')}
              >
                <Ionicons name="cash-outline" size={18} color="#fff" />
                <Text style={styles.withdrawBtnText}>Request Withdrawal</Text>
              </TouchableOpacity>

              {/* Financial Health Row */}
              <View style={styles.healthRow}>
                 <View style={[styles.healthCard, { borderColor: codOwed > (summary?.limit || 5000) * 0.8 ? '#EF4444' : '#E2E8F0' }]}>
                    <Text style={styles.healthLabel}>Cash Limit</Text>
                    <Text style={styles.healthVal}>Rs. {formatPKR(summary?.limit || 5000)}</Text>
                    <View style={styles.healthProgress}>
                       <View style={[styles.healthBar, { 
                           width: `${Math.min(100, (codOwed / (summary?.limit || 5000)) * 100)}%`,
                           backgroundColor: codOwed > (summary?.limit || 5000) * 0.8 ? '#EF4444' : SUCCESS
                       }]} />
                    </View>
                    <Text style={styles.healthSub}>
                       {codOwed > 0 ? `Rs. ${formatPKR((summary?.limit || 5000) - codOwed)} remaining` : 'Limit is fully available'}
                    </Text>
                 </View>

                 <View style={styles.healthCard}>
                     <Text style={styles.healthLabel}>Held Cash (COD)</Text>
                     <Text style={[styles.healthVal, { color: codOwed > 0 ? '#EF4444' : '#1E1E1E' }]}>Rs. {formatPKR(codOwed)}</Text>
                     <TouchableOpacity style={styles.infoBtn} onPress={() => setShowRemitModal(true)}>
                        <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                        <Text style={styles.infoText}>How to remit?</Text>
                     </TouchableOpacity>
                  </View>
               </View>

               {/* Commission & Remittance Breakdown */}
               <View style={styles.remitCard}>
                  <Text style={styles.remitTitle}>💰 Platform Settlement</Text>
                  <View style={styles.remitRow}>
                     <Text style={styles.remitLabel}>COD Cash Held</Text>
                     <Text style={styles.remitVal}>Rs. {formatPKR(codOwed)}</Text>
                  </View>
                  <View style={styles.remitRow}>
                     <Text style={styles.remitLabel}>Commission Deducted</Text>
                     <Text style={styles.remitVal}>Rs. {formatPKR(totalCommissions)}</Text>
                  </View>
                  <View style={[styles.remitRow, styles.remitTotalRow]}>
                     <Text style={styles.remitTotalLabel}>Total Amount to Pay</Text>
                     <Text style={[styles.remitTotalVal, { color: totalRemittanceDue > 0 ? '#EF4444' : SUCCESS }]}>
                        Rs. {formatPKR(totalRemittanceDue)}
                     </Text>
                  </View>
                  {totalRemittanceDue > 0 && (
                     <TouchableOpacity style={styles.remitBtn} onPress={() => setShowRemitModal(true)}>
                        <Ionicons name="wallet-outline" size={16} color="#fff" />
                        <Text style={styles.remitBtnText}>Remit Now</Text>
                     </TouchableOpacity>
                  )}
               </View>

              {/* Suspension Warning */}
              {summary?.isSuspended && (
                <View style={[styles.warningBox, { backgroundColor: '#7F1D1D', borderColor: '#991B1B' }]}>
                  <Ionicons name="shield-outline" size={24} color="#fff" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.warningTitle, { color: '#fff' }]}>ACCOUNT SUSPENDED</Text>
                    <Text style={[styles.warningText, { color: 'rgba(255,255,255,0.8)' }]}>
                      Your cash limit has been exceeded. Please remit Rs. {formatPKR(codOwed)} to reactivate your account.
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

      {/* Remittance Instructions Modal */}
      {showRemitModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 How to Remit Cash</Text>
            <Text style={styles.modalDesc}>
              Clear your outstanding balance using any of these methods:
            </Text>

            <View style={styles.modalOption}>
              <Text style={styles.modalOptionIcon}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>JazzCash / EasyPaisa</Text>
                <Text style={styles.modalOptionDesc}>Transfer to the platform account. Share screenshot with admin.</Text>
              </View>
            </View>

            <View style={styles.modalOption}>
              <Text style={styles.modalOptionIcon}>🏢</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Office Deposit</Text>
                <Text style={styles.modalOptionDesc}>Visit the Baldia Mart office. Admin will reconcile instantly.</Text>
              </View>
            </View>

            <View style={styles.modalOption}>
              <Text style={styles.modalOptionIcon}>🔄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Auto-Deduct</Text>
                <Text style={styles.modalOptionDesc}>Future delivery earnings will auto-offset your COD balance.</Text>
              </View>
            </View>

            <View style={[styles.modalHighlight, { marginTop: 16 }]}>
              <Text style={styles.modalHighlightText}>
                Your account will reactivate automatically once your balance is cleared.
              </Text>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowRemitModal(false)}>
              <Text style={styles.modalCloseTxt}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4500',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#FF4500',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 8 },
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

  // Remittance Card
  remitCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 16,
    borderWidth: 1, borderColor: '#FDE68A',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  remitTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 14 },
  remitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  remitLabel: { fontSize: 13, color: '#78716C' },
  remitVal: { fontSize: 13, fontWeight: '700', color: '#1C1917' },
  remitTotalRow: { borderTopWidth: 1, borderTopColor: '#E7E5E4', paddingTop: 10, marginTop: 4 },
  remitTotalLabel: { fontSize: 14, fontWeight: '800', color: '#1C1917' },
  remitTotalVal: { fontSize: 16, fontWeight: '900' },
  remitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, marginTop: 14,
  },
  remitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Remit Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  modalDesc: { fontSize: 13, color: '#666', marginBottom: 20 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalOptionIcon: { fontSize: 28 },
  modalOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  modalOptionDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  modalHighlight: {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#DCFCE7',
  },
  modalHighlightText: { fontSize: 12, color: '#166534', fontWeight: '600', textAlign: 'center' },
  modalCloseBtn: {
    marginTop: 16, backgroundColor: '#1A1A1A', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCloseTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
