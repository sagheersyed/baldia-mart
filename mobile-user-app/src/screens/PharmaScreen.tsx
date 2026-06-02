import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, ScrollView,
  Dimensions, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { pharmaApi, bannersApi, moduleEventsApi, normalizeUrl, socket, connectSocket } from '../api/api';
import { DEFAULT_IMAGES } from '../constants/images';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import { useCartStore } from '../store/cartStore';
import { LinearGradient } from 'expo-linear-gradient';
import PromoCarousel from '../components/home/PromoCarousel';
import CampaignStrip from '../components/home/CampaignStrip';
import { useSettings } from '../context/SettingsContext';

const { width: SCREEN_W } = Dimensions.get('window');


const CONDITIONS = [
  { id: 'fever', label: 'Fever & Pain', icon: 'thermometer-outline', bg: '#FEE2E2', color: '#DC2626' },
  { id: 'cold', label: 'Cold & Cough', icon: 'water-outline', bg: '#E0F2FE', color: '#0369A1' },
  { id: 'stomach', label: 'Stomach Care', icon: 'medkit-outline', bg: '#D1FAE5', color: '#059669' },
  { id: 'skin', label: 'Skin Care', icon: 'sparkles-outline', bg: '#FCE7F3', color: '#DB2777' },
];

export default function PharmaScreen({ navigation }: any) {
  const { settings } = useSettings();
  const conditions = settings?.pharma_conditions && settings.pharma_conditions.length > 0
    ? settings.pharma_conditions
    : CONDITIONS;
  const [featured, setFeatured] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [underPrice, setUnderPrice] = useState<any[]>([]);
  const [seasonal, setSeasonal] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const dataLoadedRef = useRef(false);

  const { getCartCount, setActiveMode, addToCart, pharmaCart } = useCartStore();

  const getProductCartCount = (medicineId: string) => {
    const item = pharmaCart.find(c => c.id === medicineId);
    return item ? item.quantity : 0;
  };

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setPage(1);
    try {
      const results = await Promise.allSettled([
        pharmaApi.getFeatured(5),
        pharmaApi.getCategories(),
        pharmaApi.getBrands(),
        pharmaApi.searchMedicines('', 1, 6, { maxPrice: 499 }), // Under Rs 499
        pharmaApi.searchMedicines('', 1, 6, { itemType: 'seasonal' }), // Seasonal
        pharmaApi.searchMedicines('', 1, 6), // All products initial
        bannersApi.getBySection('pharma').catch(() => ({ data: [] })),
        moduleEventsApi.getAll('pharma').catch(() => ({ data: [] })),
      ]);

      const getRes = (res: any, defaultVal: any = []) => res.status === 'fulfilled' ? (res.value.data?.data || res.value.data || defaultVal) : defaultVal;

      setFeatured(getRes(results[0]));
      setCategories(getRes(results[1]));
      setBrands(getRes(results[2]));
      setUnderPrice(getRes(results[3]));
      setSeasonal(getRes(results[4]));

      const initialProducts = getRes(results[5]);
      setAllProducts(initialProducts);
      setHasMore(initialProducts.length === 6);
      setBanners(getRes(results[6]));
      setCampaigns(getRes(results[7]));
    } catch (e) {
      console.warn('[Pharma] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await pharmaApi.searchMedicines('', nextPage, 6);
      const newItems = res.data?.data || [];
      if (newItems.length > 0) {
        setAllProducts(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(newItems.length === 6);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.warn('Load more error', e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadData();
      dataLoadedRef.current = true;
    }
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      setActiveMode('pharma');
      connectSocket();
      const onPharmaUpdated = () => loadData(false);
      socket.on('pharmaUpdated', onPharmaUpdated);
      socket.on('bannersUpdated', onPharmaUpdated);
      socket.on('productsUpdated', onPharmaUpdated);
      return () => {
        socket.off('pharmaUpdated', onPharmaUpdated);
        socket.off('bannersUpdated', onPharmaUpdated);
        socket.off('productsUpdated', onPharmaUpdated);
      };
    }, [loadData, setActiveMode])
  );

  const onRefresh = () => { setRefreshing(true); loadData(false); };

  const handleBannerPress = useCallback((b: any) => {
    if (!b) return;
    if (b.linkType === 'product' && b.linkId) navigation.navigate('MedicineDetail', { medicineId: b.linkId });
    else if (b.linkType === 'brand' && b.linkId) navigation.navigate('BrandDetail', { brandId: b.linkId, section: 'pharma' });
    else if (b.linkType === 'category' && b.linkId) navigation.navigate('MedicineList', { filter: b.linkId, title: 'Category' });
    else if (b.linkType === 'event' && b.linkId) navigation.navigate('EventDetails', { eventId: b.linkId });
  }, [navigation]);

  const handleAddToCart = (item: any) => {
    addToCart(item, 'pharma');
  };

  const renderCartButton = (item: any, isSmall: boolean = false) => {
    const count = getProductCartCount(item.id);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {count > 0 && (
          <View style={[styles.cartBadge, isSmall && styles.cartBadgeSmall]}>
            <AppText variant="captionStrong" color="#fff" style={{ fontSize: isSmall ? 10 : 12 }}>{count}</AppText>
          </View>
        )}
        <Pressable
          style={[styles.addBtn, isSmall && styles.addBtnSmall]}
          onPress={() => handleAddToCart(item)}
        >
          <Ionicons name="add" size={isSmall ? 16 : 20} color="#fff" />
        </Pressable>
      </View>
    );
  };

  const renderSmallProductCard = (item: any) => {
    const mrp = Number(item.mrp || 0);
    const discount = Number(item.discount || 0);
    const hasDiscount = discount > 0;
    const sellingPrice = hasDiscount ? mrp - discount : mrp;
    return (
      <Pressable key={item.id} style={styles.smallCard} onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.id })}>
        <View style={styles.smallCardImgWrap}>
          <Image source={{ uri: normalizeUrl(item.imageUrl) || DEFAULT_IMAGES.medicine }} style={styles.smallCardImg} resizeMode="contain" />
          {hasDiscount && (
            <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: theme.colors.danger, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 8 }}>
                {Math.round((discount / mrp) * 100)}% OFF
              </AppText>
            </View>
          )}
        </View>
        <AppText variant="captionStrong" numberOfLines={2} style={styles.smallCardTitle}>
          {item.name}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="bodyStrong" color={theme.colors.pharma} style={styles.smallCardPrice}>
              Rs. {sellingPrice.toFixed(0)}
            </AppText>
            {hasDiscount && (
              <AppText variant="pricePrev" style={{ fontSize: 10, textDecorationLine: 'line-through' }}>
                Rs. {mrp.toFixed(0)}
              </AppText>
            )}
          </View>
          {renderCartButton(item, true)}
        </View>
      </Pressable>
    );
  };

  const renderGridProductCard = (item: any) => {
    const mrp = Number(item.mrp || 0);
    const discount = Number(item.discount || 0);
    const hasDiscount = discount > 0;
    const sellingPrice = hasDiscount ? mrp - discount : mrp;
    return (
      <Pressable key={item.id} style={styles.gridCard} onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.id })}>
        <View style={styles.gridCardImgWrap}>
          <Image source={{ uri: normalizeUrl(item.imageUrl) || DEFAULT_IMAGES.medicine }} style={styles.gridCardImg} resizeMode="contain" />
          {hasDiscount && (
            <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: theme.colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>
                {Math.round((discount / mrp) * 100)}% OFF
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.gridCardInfo}>
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ fontSize: 11 }}>
            {item.dosageForm || 'Tablet'} • {item.strength || 'Complete'}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2} style={{ marginTop: 2, height: 40, fontSize: 14 }}>
            {item.name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <View>
              <AppText variant="title" color={theme.colors.pharma} style={{ fontSize: 16 }}>
                Rs. {sellingPrice.toFixed(0)}
              </AppText>
              {hasDiscount && (
                <AppText variant="pricePrev" style={{ fontSize: 11, textDecorationLine: 'line-through' }}>
                  Rs. {mrp.toFixed(0)}
                </AppText>
              )}
            </View>
            {renderCartButton(item)}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={{ backgroundColor: theme.colors.background }}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Pressable style={styles.searchBar} onPress={() => navigation.navigate('PharmaSearch')}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          <AppText variant="body" color={theme.colors.textSecondary} style={{ flex: 1, marginLeft: 10 }}>
            Search medicines, vitamins...
          </AppText>
          <View style={styles.filterIconWrap}>
            <Ionicons name="options-outline" size={16} color={theme.colors.pharma} />
          </View>
        </Pressable>
      </View>

      {/* Promos / Banners */}
      {banners.length > 0 && (
        <PromoCarousel banners={banners} onPress={handleBannerPress} />
      )}

      {/* Dynamic Categories */}
      {categories.length > 0 && (() => {
        const hasMoreThan11 = categories.length > 11;
        const displayedCategories = hasMoreThan11 && !showAllCategories
          ? categories.slice(0, 11)
          : categories;

        return (
          <View style={styles.sectionContainer}>
            <AppText variant="title" style={styles.sectionTitle}>Categories</AppText>
            <View style={styles.categoriesGrid}>
              {displayedCategories.map((cat, index) => {
                const colors = ['#E0F2FE', '#F3E8FF', '#FEE2E2', '#FEF3C7', '#D1FAE5'];
                const iconColors = ['#0369A1', '#7E22CE', '#DC2626', '#D97706', '#059669'];
                const bg = colors[index % colors.length];
                const c = iconColors[index % iconColors.length];
                return (
                  <Pressable
                    key={cat.id}
                    style={styles.gridCategoryItem}
                    onPress={() => navigation.navigate('MedicineList', { categoryId: cat.id, title: cat.name })}
                  >
                    <View style={[styles.categoryIconWrap, { backgroundColor: bg }]}>
                      <Ionicons name={cat.icon || 'medical-outline'} size={24} color={c} />
                    </View>
                    <AppText variant="caption" style={styles.categoryLabel} numberOfLines={1}>{cat.name}</AppText>
                  </Pressable>
                );
              })}

              {hasMoreThan11 && (
                <Pressable
                  style={styles.gridCategoryItem}
                  onPress={() => setShowAllCategories(!showAllCategories)}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons
                      name={showAllCategories ? 'chevron-up-outline' : 'grid-outline'}
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                  <AppText variant="caption" style={styles.categoryLabel}>
                    {showAllCategories ? 'Show Less' : 'Show More'}
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>
        );
      })()}

      {/* Brands Row */}
      {brands.length > 0 && (
        <View style={styles.sectionContainer}>
          <AppText variant="title" style={styles.sectionTitle}>Top Brands</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandsScroll}>
            {brands.map(b => (
              <Pressable key={b.id} style={styles.brandCard} onPress={() => navigation.navigate('BrandDetail', { brandId: b.id, section: 'pharma' })}>
                <View style={styles.brandImgContainer}>
                  <Image source={{ uri: normalizeUrl(b.logoUrl) || DEFAULT_IMAGES.brand }} style={styles.brandImg} resizeMode="contain" />
                </View>
                <AppText variant="captionStrong" style={styles.brandName} numberOfLines={1}>{b.name}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Shop by Condition */}
      <View style={styles.sectionContainer}>
        <AppText variant="title" style={styles.sectionTitle}>Shop by Condition</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conditionsScroll}>
          {conditions.map((cond, index) => (
            <Pressable key={cond.id || index} style={styles.conditionItem} onPress={() => navigation.navigate('MedicineList', { conditionId: cond.id, title: cond.label })}>
              <View style={[styles.conditionIconWrap, { backgroundColor: cond.bg }]}>
                <Ionicons name={cond.icon as any} size={24} color={cond.color} />
              </View>
              <AppText variant="caption" style={styles.conditionLabel} numberOfLines={2}>{cond.label}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Upload Prescription Banner */}
      <Pressable style={styles.uploadBanner} onPress={() => navigation.navigate('PrescriptionUpload')}>
        <LinearGradient
          colors={[theme.colors.pharma, theme.colors.pharmaDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.uploadBannerGradient}
        >
          <View style={styles.uploadBannerIconWrap}>
            <Ionicons name="document-text" size={24} color={theme.colors.pharma} />
          </View>
          <View style={styles.uploadBannerTextWrap}>
            <AppText variant="bodyStrong" color="#fff" style={{ fontSize: 16 }}>Upload Prescription</AppText>
            <AppText variant="caption" color="#fff" style={{ opacity: 0.9, marginTop: 2 }}>
              Get medicines delivered from verified pharmacies
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </Pressable>
      {/* Campaign Events (DVAGO Premium style) */}
      {campaigns.map((ev) => {
        const hasItems = ev.items && ev.items.length > 0;
        const bannerImg = normalizeUrl(ev.imageUrl);
        return (
          <View key={ev.id} style={styles.premiumCampaignBlock}>
            {/* Campaign Banner Card */}
            <Pressable
              style={styles.premiumCampaignBannerCard}
              onPress={() => navigation.navigate('EventDetails', { eventId: ev.id })}
            >
              {bannerImg ? (
                <Image source={{ uri: bannerImg }} style={styles.premiumCampaignBannerImg} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={[theme.colors.pharma, theme.colors.pharmaDark]}
                  style={styles.premiumCampaignBannerImg}
                />
              )}
            </Pressable>

            {/* Horizontal Scroll of Products */}
            {hasItems && (
              <View style={styles.premiumCampaignProductsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.premiumCampaignProductsScroll}>
                  {ev.items.map((item: any) => {
                    const price = Number(item.mrp || 0);
                    const discount = Number(item.discount || 0);
                    const hasDiscount = discount > 0;
                    const sellingPrice = hasDiscount ? price - discount : price;
                    const count = getProductCartCount(item.id);

                    return (
                      <Pressable
                        key={item.id}
                        style={styles.premiumCampaignProductCard}
                        onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.id })}
                      >
                        {/* Wishlist/Heart at top right */}
                        <Pressable style={styles.heartButton}>
                          <Ionicons name="heart-outline" size={16} color="#94A3B8" />
                        </Pressable>

                        <View style={styles.premiumProductImgWrap}>
                          <Image
                            source={{ uri: normalizeUrl(item.imageUrl) || DEFAULT_IMAGES.medicine }}
                            style={styles.premiumProductImg}
                            resizeMode="contain"
                          />
                        </View>
                        <AppText variant="captionStrong" numberOfLines={2} style={styles.premiumProductTitle}>
                          {item.name}
                        </AppText>
                        <View style={styles.premiumProductPriceRow}>
                          <View style={{ flex: 1 }}>
                            <AppText variant="bodyStrong" color={theme.colors.pharma} style={styles.premiumProductPrice}>
                              Rs. {sellingPrice.toFixed(0)}
                            </AppText>
                            {hasDiscount && (
                              <AppText variant="caption" style={styles.premiumProductOriginalPrice}>
                                Rs. {price.toFixed(0)}
                              </AppText>
                            )}
                          </View>
                          {/* Cart Add Button */}
                          <Pressable style={styles.premiumAddBtn} onPress={() => handleAddToCart(item)}>
                            {count > 0 ? (
                              <View style={styles.premiumCartBadge}>
                                <AppText variant="captionStrong" color="#fff" style={{ fontSize: 10 }}>{count}</AppText>
                              </View>
                            ) : (
                              <Ionicons name="add" size={16} color="#fff" />
                            )}
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}

                  {/* View All Button inside Scroll */}
                  <Pressable
                    style={styles.premiumViewAllCard}
                    onPress={() => navigation.navigate('EventDetails', { eventId: ev.id })}
                  >
                    <View style={styles.premiumViewAllCircle}>
                      <Ionicons name="arrow-forward" size={24} color="#fff" />
                    </View>
                    <AppText variant="bodyStrong" color={theme.colors.pharma} style={{ marginTop: 8 }}>
                      View All
                    </AppText>
                  </Pressable>
                </ScrollView>
              </View>
            )}
          </View>
        );
      })}

      {/* Seasonal / Special Package Row */}
      {seasonal.length > 0 && (
        <View style={styles.sectionContainer}>
          <AppText variant="title" style={styles.sectionTitle}>Mother's Day & Special Packs</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {seasonal.map(m => renderSmallProductCard(m))}
          </ScrollView>
        </View>
      )}

      {/* Under Price Shelf */}
      {underPrice.length > 0 && (
        <View style={styles.sectionContainer}>
          <AppText variant="title" style={styles.sectionTitle}>Under Rs. 499</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {underPrice.map(m => renderSmallProductCard(m))}
          </ScrollView>
        </View>
      )}

      {/* Featured Medicines */}
      {featured.length > 0 && (
        <View style={styles.sectionContainer}>
          <AppText variant="title" style={styles.sectionTitle}>Featured Medicines</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {featured.map(m => renderSmallProductCard(m))}
          </ScrollView>
        </View>
      )}

      {/* All Products Header */}
      <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 12 }}>
        <AppText variant="title" style={{ fontSize: 18, fontWeight: '700', color: theme.colors.textHeader }}>All Products</AppText>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {loadingMore && <ActivityIndicator size="small" color={theme.colors.pharma} style={{ marginBottom: 16 }} />}
      {hasMore && !loadingMore && (
        <Pressable style={styles.loadMoreBtn} onPress={loadMoreProducts}>
          <AppText variant="bodyStrong" color={theme.colors.pharma}>See More</AppText>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={allProducts}
          keyExtractor={(item, idx) => item.id + idx}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          renderItem={({ item }) => renderGridProductCard(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.pharma} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: theme.colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.pharmaLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bannersScroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  bannerImg: { width: SCREEN_W - 32, height: 140, borderRadius: 16, backgroundColor: '#E2E8F0' },

  categoriesScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  categoriesGrid: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  gridCategoryItem: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  categoryItem: { alignItems: 'center', width: 68 },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: { textAlign: 'center', fontSize: 11, color: theme.colors.textSecondary },

  brandsScroll: { paddingHorizontal: 16, gap: 12 },
  brandCard: { width: 90, height: 100, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', padding: 8, justifyContent: 'center', alignItems: 'center' },
  brandImgContainer: { width: '100%', height: 60, justifyContent: 'center', alignItems: 'center' },
  brandImg: { width: '100%', height: '100%' },
  brandName: { fontSize: 11, color: theme.colors.textPrimary, marginTop: 4, textAlign: 'center' },

  sectionContainer: { marginBottom: 24 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 12, fontSize: 18, fontWeight: '700', color: theme.colors.textHeader },

  conditionsScroll: { paddingHorizontal: 16, gap: 16 },
  conditionItem: { alignItems: 'center', width: 72 },
  conditionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionLabel: { textAlign: 'center', fontSize: 11, color: theme.colors.textSecondary },

  uploadBanner: { marginHorizontal: 16, marginBottom: 24, borderRadius: 16, overflow: 'hidden' },
  uploadBannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  uploadBannerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  uploadBannerTextWrap: { flex: 1 },

  featuredScroll: { paddingHorizontal: 16, gap: 12 },
  smallCard: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  smallCardImgWrap: { height: 90, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  smallCardImg: { width: '80%', height: '80%' },
  smallCardTitle: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4, height: 34 },
  smallCardPrice: { fontSize: 14 },

  listContent: { paddingBottom: 100, backgroundColor: theme.colors.background },
  gridRow: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  gridCardImgWrap: { height: 140, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  gridCardImg: { width: '70%', height: '70%' },
  gridCardInfo: { padding: 12 },

  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.pharma, justifyContent: 'center', alignItems: 'center' },
  addBtnSmall: { width: 28, height: 28, borderRadius: 8 },
  cartBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 12, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  cartBadgeSmall: { width: 16, height: 16, top: -4, right: -4 },

  footerContainer: { padding: 24, alignItems: 'center' },
  loadMoreBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.pharma, backgroundColor: '#fff' },

  premiumCampaignBlock: {
    marginBottom: 28,
    backgroundColor: '#FDF2F8', // Premium subtle pink blush matching Mother's Day / Eid theme
    borderRadius: 0,
    marginHorizontal: 0,
    paddingBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  premiumCampaignBannerCard: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
  },
  premiumCampaignBannerImg: {
    width: '100%',
    height: '100%',
  },
  premiumCampaignProductsRow: {
    marginTop: 12,
  },
  premiumCampaignProductsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  premiumCampaignProductCard: {
    width: 145,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#FFF5F5',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  premiumProductImgWrap: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  premiumProductImg: {
    width: '85%',
    height: '85%',
  },
  premiumProductTitle: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
    height: 32,
    marginBottom: 6,
  },
  premiumProductPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumProductPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D01C60', // Rose-colored discount price
  },
  premiumProductOriginalPrice: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  premiumAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#D01C60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCartBadge: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#D01C60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumViewAllCard: {
    width: 100,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  premiumViewAllCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D01C60',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
