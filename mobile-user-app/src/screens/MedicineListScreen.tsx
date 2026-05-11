import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pharmaApi, normalizeUrl } from '../api/api';
import { useCartStore } from '../store/cartStore';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

const ACCENT = theme.colors.pharma;

export default function MedicineListScreen({ route, navigation }: any) {
  const { categoryId, filter, title } = route.params || {};
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { getCartCount, setActiveMode } = useCartStore();
  const cartCount = getCartCount('pharma');

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      let res;
      if (categoryId) {
        res = await pharmaApi.getByCategory(categoryId, pageNum, 20);
      } else if (filter === 'emergency') {
        res = await pharmaApi.getEmergency(50);
      } else if (filter) {
        // For OTC, vitamins, skincare, baby — use search with tags
        res = await pharmaApi.searchMedicines(filter, pageNum, 20);
      } else {
        res = await pharmaApi.getFeatured(50);
      }

      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (append) {
        setMedicines((prev) => [...prev, ...data]);
      } else {
        setMedicines(data);
      }
      setHasMore(data.length >= 20);
    } catch (e) {
      console.warn('[MedicineList] error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); setPage(1); loadData(1); };
  const onEndReached = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      loadData(next, true);
    }
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    const img = normalizeUrl(item.imageUrl);
    const mrp = Number(item.mrp || 0);
    const discount = Number(item.discount || 0);
    const hasDiscount = discount > 0;
    const sellingPrice = hasDiscount ? mrp - discount : mrp;

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.id })}
      >
        <View style={styles.cardImg}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          ) : (
            <Ionicons name="medkit-outline" size={32} color={ACCENT} />
          )}
          {item.requiresPrescription && (
            <View style={styles.rxTag}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 8 }}>Rx</AppText>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <AppText variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
            {item.dosageForm || 'Medicine'}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>{item.name}</AppText>
          {item.genericName && (
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {item.genericName}
            </AppText>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <AppText variant="price" color={ACCENT}>Rs. {sellingPrice.toFixed(0)}</AppText>
            {hasDiscount && (
              <AppText variant="pricePrev" style={{ marginLeft: 6 }}>Rs. {mrp.toFixed(0)}</AppText>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="title" numberOfLines={1} style={{ flex: 1, marginLeft: 12 }}>
          {title || 'Medicines'}
        </AppText>
        <Pressable onPress={() => navigation.navigate('Search', { mode: 'pharma' })} hitSlop={12}>
          <Ionicons name="search-outline" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {loading && medicines.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 10 }}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={10}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="medkit-outline" size={48} color={theme.colors.textMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
                No medicines found
              </AppText>
            </View>
          }
          ListFooterComponent={
            hasMore && medicines.length > 0 ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ padding: 16 }} />
            ) : null
          }
        />
      )}

      {cartCount > 0 && (
        <Pressable
          style={styles.floatingCart}
          onPress={() => {
            setActiveMode('pharma');
            navigation.navigate('Cart');
          }}
        >
          <View style={styles.cartIconBadge}>
            <Ionicons name="cart" size={24} color="#fff" />
            <View style={styles.badge}>
              <AppText variant="badge" color={ACCENT}>
                {cartCount}
              </AppText>
            </View>
          </View>
          <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 12 }}>
            View pharma cart
          </AppText>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImg: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: ACCENT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardInfo: {
    padding: 10,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cartIconBadge: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
