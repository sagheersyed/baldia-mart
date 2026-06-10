import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, Switch,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';
import { normalizeUrl } from '../../api/api';
import { Image } from 'expo-image';

export default function ProductCatalogScreen({ navigation }: any) {
  const { activeTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';
  const isRestaurant = activeTenant?.type === 'restaurant';
  const isPharmacy = activeTenant?.type === 'pharmacy';

  const [items, setItems]         = useState<any[]>([]);
  const [filtered, setFiltered]   = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling]   = useState<string | null>(null);

  const color = isRestaurant ? '#EA580C' : isPharmacy ? '#7C3AED' : '#16A34A';

  const load = useCallback(async () => {
    try {
      const res = isRestaurant
        ? await cmsApi.getRestaurantMenu(tenantId)
        : isPharmacy
        ? await cmsApi.getPharmacyMedicines(tenantId)
        : await cmsApi.getVendorProducts(tenantId);
      const data = res.data ?? [];
      setItems(data);
      setFiltered(data);
    } catch (e) {
      console.warn('[ProductCatalog] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId, isRestaurant, isPharmacy]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const onSearch = (q: string) => {
    setSearch(q);
    if (!q.trim()) { setFiltered(items); return; }
    const lq = q.toLowerCase();
    setFiltered(items.filter((item: any) => {
      const name = (item.product?.name ?? item.name ?? item.medicine?.name ?? '').toLowerCase();
      return name.includes(lq);
    }));
  };

  const handleToggleAvailability = async (item: any) => {
    const id = item.id;
    const currentVal = (item.isAvailable ?? item.is_available ?? item.isActive ?? item.is_active ?? true);
    setToggling(id);
    try {
      if (isRestaurant) {
        await cmsApi.updateMenuItemAvailability(tenantId, id, !currentVal);
      } else if (isPharmacy) {
        await cmsApi.togglePharmacyAvailability(tenantId, id, !currentVal);
      } else {
        await cmsApi.toggleAvailability(tenantId, id, !currentVal);
      }
      // Optimistic update
      const updateFn = (p: any) => p.id === id
        ? {
          ...p,
          isAvailable: !currentVal,
          is_available: !currentVal,
          isActive: !currentVal,
          is_active: !currentVal
        }
        : p;
      setItems(prev => prev.map(updateFn));
      setFiltered(prev => prev.map(updateFn));
    } catch (e) {
      console.warn('Toggle failed', e);
    } finally {
      setToggling(null);
    }
  };

  const renderItem = ({ item }: any) => {
    // ── Data Resolution ──
    const name        = item.product?.name ?? item.medicine?.name ?? item.name ?? 'Unknown Item';
    
    // Price Logic: SellingPrice (Inventory) -> MRP (Medicine) -> Price (Product) -> 0
    const rawPrice    = item.sellingPrice ?? item.selling_price ?? item.price ?? item.priceOverride ?? item.medicine?.mrp ?? item.medicine?.price ?? item.product?.price ?? 0;
    const price       = Number(rawPrice);

    // Stock Logic: stockQuantity (Inventory/Medicine) -> stockQty (VendorProduct) -> stock (Generic)
    const stock       = item.stockQuantity ?? item.stockQty ?? item.stock_qty ?? item.stock ?? item.product?.stockQuantity ?? item.medicine?.stockQuantity ?? null;
    
    // Image Logic: Try nested product/medicine images first
    const rawImg      = item.product?.imageUrl ?? item.medicine?.imageUrl ?? item.imageUrl ?? item.image_url ?? item.product?.image_url ?? item.medicine?.image_url ?? null;
    const imageUrl    = normalizeUrl(rawImg);

    // Metadata
    const unit        = item.unit ?? item.product?.unit ?? item.medicine?.packSize ?? null;
    const brandName   = item.product?.brand?.name ?? item.medicine?.brand?.name ?? item.brand?.name ?? null;
    const isAvailable = (item.isAvailable ?? item.is_available ?? item.isActive ?? item.is_active ?? true);
    const isTogglingThis = toggling === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary || '#64748B'} />
            </View>
          )}
        </View>
        
        <View style={styles.cardBody}>
          <AppText variant="bodyStrong" numberOfLines={2} style={styles.nameText}>{name}</AppText>
          
          {brandName || unit ? (
            <AppText variant="caption" color={theme.colors.textSecondary || '#64748B'} style={styles.subText}>
              {brandName ? brandName : ''}{brandName && unit ? ' · ' : ''}{unit ? unit : ''}
            </AppText>
          ) : null}

          <View style={styles.metaRow}>
            <AppText variant="bodyStrong" color={color} style={styles.priceText}>
              Rs. {price.toLocaleString()}
            </AppText>
            {stock !== null && (
              <AppText variant="caption" color={theme.colors.textSecondary || '#94A3B8'}>
                {'  ·  '}Stock: {stock}
              </AppText>
            )}
          </View>

          <View style={styles.cardActions}>
            <Pressable
              style={[styles.editBtn, { borderColor: color + '40' }]}
              onPress={() => navigation.navigate('EditProduct', { item, isRestaurant, isPharmacy })}
            >
              <Ionicons name="create-outline" size={14} color={color} />
              <AppText variant="caption" color={color} style={{ marginLeft: 4 }}>Edit</AppText>
            </Pressable>

            <View style={styles.toggleRow}>
              {isTogglingThis ? (
                <ActivityIndicator size="small" color={color} />
              ) : (
                <>
                  <AppText variant="caption" color={isAvailable ? '#16A34A' : theme.colors.textSecondary || '#94A3B8'}>
                    {isAvailable ? 'Live' : 'Hidden'}
                  </AppText>
                  <Switch
                    value={isAvailable}
                    onValueChange={() => handleToggleAvailability(item)}
                    trackColor={{ false: '#E2E8F0', true: color + '40' }}
                    thumbColor={isAvailable ? color : '#94A3B8'}
                    style={{ transform: [{ scale: 0.75 }], marginLeft: -4 }}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary || '#0F172A'} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="title" style={styles.headerTitle}>
            {isRestaurant ? 'Menu Items' : isPharmacy ? 'Medicines' : 'My Products'}
          </AppText>
          <AppText variant="caption" color={theme.colors.textSecondary || '#64748B'}>{activeTenant?.name}</AppText>
        </View>
        <View style={[styles.countBadge, { backgroundColor: color + '15' }]}>
          <AppText variant="captionStrong" color={color}>{filtered.length}</AppText>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary || '#94A3B8'} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={onSearch}
        />
        {search ? (
          <Pressable onPress={() => onSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={color} />
          <AppText variant="caption" style={{ marginTop: 12 }} color="#64748B">Loading catalog…</AppText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: color + '10' }]}>
                <Ionicons name="cube-outline" size={48} color={color} />
              </View>
              <AppText variant="bodyStrong" color={theme.colors.textPrimary} style={{ marginTop: 16 }}>No items found</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary} align="center" style={styles.emptySub}>
                {search ? "No items match your search." : "Start building your catalog by adding items."}
              </AppText>
              {!search && (
                <Pressable
                  style={[styles.emptyCta, { backgroundColor: color }]}
                  onPress={() => {
                    if (isRestaurant) {
                      navigation.navigate('AddNewItemForm', { vertical: 'restaurant' });
                    } else {
                      Alert.alert('Add Item', 'How would you like to add?', [
                        { text: 'Browse Catalog', onPress: () => navigation.navigate('AddItem') },
                        { text: 'Request New', onPress: () => navigation.navigate('AddNewItemForm', { vertical: isPharmacy ? 'pharmacy' : 'grocery' }) },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 6 }}>Add First Item</AppText>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: color }]}
        onPress={() => {
          if (isRestaurant) {
            navigation.navigate('AddNewItemForm', { vertical: 'restaurant' });
          } else {
            Alert.alert('Add Item', 'How would you like to add?', [
              { text: 'Browse Catalog', onPress: () => navigation.navigate('AddItem') },
              { text: 'Request New', onPress: () => navigation.navigate('AddNewItemForm', { vertical: isPharmacy ? 'pharmacy' : 'grocery' }) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#0F172A', padding: 0 },
  
  listContainer: { padding: 16, paddingTop: 0, paddingBottom: 100 },
  card: {
    flexDirection: 'row', padding: 12, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  cardLeft: { marginRight: 12 },
  thumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F8FAFC' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  
  cardBody: { flex: 1 },
  nameText: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  subText: { fontSize: 12, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  priceText: { fontSize: 15 },
  
  cardActions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptySub: { marginTop: 8, paddingHorizontal: 40, lineHeight: 20 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 24, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, elevation: 3,
  },
  
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6,
  },
});
