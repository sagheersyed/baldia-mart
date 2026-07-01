import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Image, TextInput,
  ActivityIndicator, Alert, Modal, Pressable, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { cmsApi } from '../../api/api';
import { useCmsStore } from '../../store/cmsStore';
import { AppText, AppButton, AppIconButton } from '../../components/ui';
import { theme } from '../../theme/theme';

export default function AddItemScreen({ navigation }: any) {
  const { activeTenantId, activeTenant } = useCmsStore();
  const isPharmacy = activeTenant?.type === 'pharmacy' || activeTenant?.type === 'pharma';
  const isGrocery = activeTenant?.type === 'grocery' || activeTenant?.type === 'mart';

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modal State for adding custom pricing/stock
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [stockQty, setStockQty] = useState('10');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!activeTenantId) {
      navigation.goBack();
      return;
    }
    // If restaurant, go straight to form creation screen
    if (!isPharmacy && !isGrocery) {
      navigation.replace('AddNewItemForm');
      return;
    }
    fetchCatalog(1, true);
  }, []);

  const fetchCatalog = async (pageNum: number, clear: boolean = false) => {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      let res;
      if (isPharmacy) {
        res = await cmsApi.getPharmacyMasterCatalog(activeTenantId, search, pageNum);
      } else {
        res = await cmsApi.getVendorMasterCatalog(activeTenantId, search, pageNum);
      }

      const fetched = res.data?.data ?? [];
      const total = res.data?.total ?? 0;

      if (clear) {
        setItems(fetched);
      } else {
        setItems(prev => [...prev, ...fetched]);
      }

      setPage(pageNum);
      setHasMore(items.length + fetched.length < total);
    } catch (e) {
      console.error('[AddItemScreen] Fetch failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    fetchCatalog(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchCatalog(page + 1);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCatalog(1, true);
  };

  const openAddModal = (item: any) => {
    setSelectedItem(item);
    // Pharmacy uses mrp, Vendor uses price
    const defaultPrice = isPharmacy ? item.mrp : item.price;
    setCustomPrice(String(defaultPrice || ''));
    setStockQty('10');
    setModalVisible(true);
  };

  const handleAddItem = async () => {
    if (!activeTenantId || !selectedItem) return;
    const priceVal = parseFloat(customPrice);
    const qtyVal = parseInt(stockQty);

    if (isNaN(priceVal) || priceVal <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal < 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid stock quantity.');
      return;
    }

    setActionLoading(true);
    try {
      if (isPharmacy) {
        // addMedicineFromCatalog(tenantId, medicineId, stock, priceOverride)
        await cmsApi.addMedicineFromCatalog(activeTenantId, selectedItem.id, qtyVal, priceVal);
      } else {
        // addProductFromCatalog(tenantId, productId, price, stockQty)
        await cmsApi.addProductFromCatalog(activeTenantId, selectedItem.id, priceVal, qtyVal);
      }
      setModalVisible(false);
      Alert.alert('Success', `${selectedItem.name} has been requested for inventory.`, [
        { text: 'OK', onPress: () => fetchCatalog(1, true) }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add item to catalog.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderCatalogItem = ({ item }: { item: any }) => {
    const itemPrice = isPharmacy ? item.mrp : item.price;
    const brandName = item.brand?.name || 'Generic';
    const strengthOrWeight = isPharmacy ? item.strength : item.weight || item.unit;

    return (
      <View style={styles.card}>
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : require('../../../assets/placeholder.jpg')}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.details}>
          <AppText variant="bodyStrong" numberOfLines={1}>{item.name}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {brandName} {strengthOrWeight ? `• ${strengthOrWeight}` : ''}
          </AppText>
          {isPharmacy && item.genericName && (
            <AppText variant="caption" numberOfLines={1} style={{ fontStyle: 'italic' }}>
              {item.genericName}
            </AppText>
          )}
          <AppText variant="bodyStrong" color={theme.colors.primary} style={{ marginTop: 4 }}>
            Rs. {itemPrice}
          </AppText>
        </View>
        <AppButton
          label="Add"
          variant="secondary"
          size="sm"
          onPress={() => openAddModal(item)}
          style={styles.addButton}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppIconButton size={40} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3" style={{ fontWeight: '700' }}>Add from Catalog</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            Link master items to your store catalog
          </AppText>
        </View>
        <AppIconButton size={40} onPress={() => navigation.navigate('AddNewItemForm', { vertical: isPharmacy ? 'pharmacy' : 'grocery' })}>
          <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
        </AppIconButton>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search master catalog..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(''); fetchCatalog(1, true); }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Product List */}
      <FlatList
        data={items}
        renderItem={renderCatalogItem}
        keyExtractor={item => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={() => (
          loading ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ margin: 16 }} /> : null
        )}
        ListEmptyComponent={() => (
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color="#CBD5E1" />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 8 }}>
                No catalog items found.
              </AppText>
              <AppButton
                label={isPharmacy ? 'Request Brand New Medicine' : 'Request Brand New Product'}
                variant="primary"
                onPress={() => navigation.navigate('AddNewItemForm', { vertical: isPharmacy ? 'pharma' : 'mart' })}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : null
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {/* Add Item custom price & stock modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <AppText variant="h3" style={{ fontWeight: '700' }}>Set Price & Stock</AppText>
              <AppIconButton size={36} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </AppIconButton>
            </View>

            {selectedItem && (
              <View style={styles.modalInfo}>
                <Image
                  source={selectedItem.imageUrl ? { uri: selectedItem.imageUrl } : require('../../../assets/placeholder.jpg')}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{selectedItem.name}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    Master Retail Price: Rs. {isPharmacy ? selectedItem.mrp : selectedItem.price}
                  </AppText>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <AppText variant="bodyStrong">Your Store Price (PKR)</AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="decimal-pad"
                value={customPrice}
                onChangeText={setCustomPrice}
                placeholder="0.00"
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="bodyStrong">Initial Stock Quantity</AppText>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                value={stockQty}
                onChangeText={setStockQty}
                placeholder="10"
              />
            </View>

            <AppButton
              label={actionLoading ? 'Submitting...' : 'Link to Inventory'}
              variant="primary"
              onPress={handleAddItem}
              loading={actionLoading}
              disabled={actionLoading}
              fullWidth
              style={{ marginTop: 24 }}
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9'
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, paddingHorizontal: 12,
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1E293B' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9',
    ...theme.shadows.sm,
  },
  image: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  details: { flex: 1, justifyContent: 'center' },
  addButton: { paddingHorizontal: 16, borderRadius: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  modalImage: { width: 50, height: 50, borderRadius: 8 },
  inputGroup: { marginTop: 16 },
  textInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, height: 48, paddingHorizontal: 12, marginTop: 8,
    fontSize: 16, color: '#1E293B',
  },
});
