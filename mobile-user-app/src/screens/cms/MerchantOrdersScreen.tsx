import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, Modal, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';

const TABS = [
  { key: 'active', label: 'Active', statuses: 'pending,confirmed,preparing,ready_for_pickup' },
  { key: 'delivered', label: 'Delivered', statuses: 'delivered' },
  { key: 'cancelled', label: 'Cancelled', statuses: 'cancelled' },
];

export default function MerchantOrdersScreen({ navigation, route }: any) {
  const { activeTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';
  const vertical = activeTenant?.type ?? 'mart';

  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setTab] = useState(route.params?.initialTab ?? 'active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const statuses = TABS.find(t => t.key === activeTab)?.statuses;
      const res = await cmsApi.getMerchantOrders(tenantId, statuses);
      setOrders(res.data?.data ?? []);
    } catch (e) {
      console.warn('[MerchantOrders] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId, activeTab]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const openDetail = (order: any) => {
    setSelectedOrder(order);
    setDetailVisible(true);
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = '';
    let actionLabel = '';

    if (currentStatus === 'pending') { nextStatus = 'confirmed'; actionLabel = 'Accept Order'; }
    else if (currentStatus === 'confirmed') { nextStatus = 'preparing'; actionLabel = 'Start Preparing'; }
    else if (currentStatus === 'preparing') { nextStatus = 'ready_for_pickup'; actionLabel = 'Mark Ready for Pickup'; }
    else return;

    Alert.alert(
      actionLabel,
      `Are you sure you want to ${actionLabel.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              await cmsApi.updateMerchantOrderStatus(tenantId, orderId, nextStatus);
              setDetailVisible(false);
              loadOrders();
            } catch (e) {
              Alert.alert('Error', 'Failed to update order status.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isNew = item.status === 'pending';

    return (
      <Pressable 
        style={[styles.orderCard, isNew && styles.newOrderCard]}
        onPress={() => openDetail(item)}
      >
        <View style={styles.orderHeader}>
          <View>
            <AppText variant="bodyStrong">#{item.id.slice(0, 8).toUpperCase()}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{timeStr} • {item.items?.length} items</AppText>
          </View>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <AppText variant="badge" color={getStatusColor(item.status)}>{item.status.toUpperCase()}</AppText>
          </View>
        </View>

        <View style={styles.customerRow}>
          <Ionicons name="person-circle-outline" size={20} color={theme.colors.textSecondary} />
          <AppText variant="body" style={{ marginLeft: 6 }}>{item.user?.name || 'Customer'}</AppText>
          <AppText variant="price" style={{ marginLeft: 'auto' }}>Rs. {Number(item.total).toLocaleString()}</AppText>
        </View>

        {activeTab === 'active' && (
          <View style={styles.actions}>
            {item.status === 'pending' && (
              <Pressable 
                style={[styles.btn, styles.primaryBtn]} 
                onPress={() => handleUpdateStatus(item.id, item.status)}
              >
                <AppText variant="bodyStrong" color="#fff">Accept Order</AppText>
              </Pressable>
            )}
            {item.status === 'confirmed' && (
              <Pressable 
                style={[styles.btn, styles.actionBtn]} 
                onPress={() => handleUpdateStatus(item.id, item.status)}
              >
                <AppText variant="bodyStrong" color="#fff">Prepare</AppText>
              </Pressable>
            )}
            {item.status === 'preparing' && (
              <Pressable 
                style={[styles.btn, { backgroundColor: '#16A34A' }]} 
                onPress={() => handleUpdateStatus(item.id, item.status)}
              >
                <AppText variant="bodyStrong" color="#fff">Mark Ready</AppText>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHeader} />
        </Pressable>
        <AppText variant="h2">Order Management</AppText>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <Pressable 
            key={tab.key} 
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => { setTab(tab.key); setLoading(true); }}
          >
            <AppText 
              variant="bodyStrong" 
              color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary}
            >
              {tab.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={theme.colors.textMuted} />
              <AppText variant="body" color={theme.colors.textMuted}>No orders found</AppText>
            </View>
          }
        />
      )}

      {/* Order Detail Modal */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setDetailVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}</AppText>
              <Pressable onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textHeader} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Customer Info */}
              <View style={styles.section}>
                <AppText variant="overline">Customer Details</AppText>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
                  <AppText variant="bodyStrong" style={{ marginLeft: 8 }}>{selectedOrder?.user?.name || 'Guest'}</AppText>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.textSecondary} />
                  <AppText variant="caption" style={{ marginLeft: 8, flex: 1 }}>
                    {selectedOrder?.address?.addressLine || 'Store Pickup'}, {selectedOrder?.address?.city || ''}
                  </AppText>
                </View>
              </View>

              {/* Items List */}
              <View style={styles.section}>
                <AppText variant="overline">Items ({selectedOrder?.items?.length})</AppText>
                {selectedOrder?.items?.map((it: any, idx: number) => {
                  const itName = it.product?.name ?? it.menuItem?.name ?? it.medicine?.name ?? 'Unknown Item';
                  return (
                    <View key={it.id || idx} style={styles.itemRow}>
                      <View style={styles.itemQtyBadge}>
                        <AppText variant="captionStrong" color={theme.colors.primary}>{it.quantity}x</AppText>
                      </View>
                      <AppText variant="body" style={{ flex: 1, marginLeft: 12 }}>{itName}</AppText>
                      <AppText variant="bodyStrong">Rs. {(Number(it.price) * it.quantity).toLocaleString()}</AppText>
                    </View>
                  );
                })}
              </View>

              {/* Totals */}
              <View style={[styles.section, { borderBottomWidth: 0 }]}>
                <View style={styles.totalRow}>
                  <AppText variant="body" color={theme.colors.textSecondary}>Subtotal</AppText>
                  <AppText variant="bodyStrong">Rs. {Number(selectedOrder?.total).toLocaleString()}</AppText>
                </View>
                <View style={[styles.totalRow, { marginTop: 8 }]}>
                  <AppText variant="h3">Total Revenue</AppText>
                  <AppText variant="h3" color={theme.colors.primary}>Rs. {Number(selectedOrder?.total).toLocaleString()}</AppText>
                </View>
              </View>

              {/* Action in Footer */}
              {selectedOrder?.status !== 'delivered' && selectedOrder?.status !== 'cancelled' && (
                <View style={{ marginTop: 24 }}>
                  <Pressable 
                    style={[styles.btn, styles.primaryBtn, { height: 52 }]}
                    onPress={() => handleUpdateStatus(selectedOrder.id, selectedOrder.status)}
                  >
                    <AppText variant="bodyStrong" color="#fff">
                      {selectedOrder?.status === 'pending' ? 'Accept Order' : 
                       selectedOrder?.status === 'confirmed' ? 'Start Preparing' : 
                       selectedOrder?.status === 'preparing' ? 'Mark Ready for Pickup' : 'Update Status'}
                    </AppText>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return '#3B82F6';
    case 'confirmed': return '#8B5CF6';
    case 'preparing': return '#F59E0B';
    case 'ready_for_pickup': return '#10B981';
    case 'delivered': return '#16A34A';
    case 'cancelled': return '#EF4444';
    default: return '#64748B';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', gap: 12 },
  backBtn: { padding: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.colors.primary },
  list: { padding: 16, gap: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', ...theme.shadows.sm },
  newOrderCard: { borderColor: theme.colors.primary, borderWidth: 1.5 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actions: { flexDirection: 'row' },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: theme.colors.primary },
  actionBtn: { backgroundColor: '#3B82F6' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  itemQtyBadge: { backgroundColor: theme.colors.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
