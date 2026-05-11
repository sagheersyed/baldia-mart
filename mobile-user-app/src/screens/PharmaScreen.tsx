import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, ScrollView,
  TextInput, Animated, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pharmaApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import { useCartStore } from '../store/cartStore';

const { width: SCREEN_W } = Dimensions.get('window');
const ACCENT = theme.colors.pharma;
const ACCENT_LIGHT = theme.colors.pharmaLight;

/* ── Quick access services shown at top ─────────────────────── */
const QUICK_SERVICES = [
  { id: 'otc', icon: 'medkit-outline', label: 'OTC', color: '#0D9488' },
  { id: 'prescription', icon: 'document-text-outline', label: 'Prescription', color: '#7C3AED' },
  { id: 'emergency', icon: 'flash-outline', label: 'Emergency', color: '#EF4444' },
  { id: 'vitamins', icon: 'fitness-outline', label: 'Vitamins', color: '#F59E0B' },
  { id: 'skincare', icon: 'sparkles-outline', label: 'Skincare', color: '#EC4899' },
  { id: 'baby', icon: 'happy-outline', label: 'Baby Care', color: '#3B82F6' },
] as const;

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  imageUrl?: string;
  mrp: number;
  discount?: number;
  discountPercent?: number;
  requiresPrescription: boolean;
  isOtc: boolean;
  isEmergency: boolean;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
}

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  iconUrl?: string;
}

const CONDITIONS = [
  { id: 'fever', label: 'Fever & Pain', icon: 'thermometer-outline', color: '#EF4444' },
  { id: 'cold', label: 'Cold & Cough', icon: 'snow-outline', color: '#3B82F6' },
  { id: 'stomach', label: 'Stomach Care', icon: 'water-outline', color: '#10B981' },
  { id: 'skin', label: 'Skin Care', icon: 'sparkles-outline', color: '#EC4899' },
  { id: 'heart', label: 'Heart Health', icon: 'heart-outline', color: '#F43F5E' },
  { id: 'diabetes', label: 'Diabetes', icon: 'analytics-outline', color: '#8B5CF6' },
] as const;

export default function PharmaScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Medicine[]>([]);
  const [emergency, setEmergency] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const { getCartCount, setActiveMode } = useCartStore();
  const cartCount = getCartCount('pharma');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [catRes, featRes, emgRes] = await Promise.all([
        pharmaApi.getCategories().catch(() => ({ data: [] })),
        pharmaApi.getFeatured(12).catch(() => ({ data: [] })),
        pharmaApi.getEmergency(10).catch(() => ({ data: [] })),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setFeatured(Array.isArray(featRes.data) ? featRes.data : (featRes.data?.data || []));
      setEmergency(Array.isArray(emgRes.data) ? emgRes.data : (emgRes.data?.data || []));
    } catch (e) {
      console.warn('[Pharma] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(false); };

  /* ── Render Helpers ────────────────────────────────────────── */

  const renderHeader = () => (
    <View>
      {/* ── Search Bar ──────────────────────────────────────── */}
      <Pressable
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search', { mode: 'pharma' })}
      >
        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
        <AppText variant="body" color={theme.colors.textMuted} style={{ marginLeft: 10, flex: 1 }}>
          Search medicines, vitamins…
        </AppText>
        <View style={styles.rxBadge}>
          <Ionicons name="medical-outline" size={14} color={ACCENT} />
        </View>
      </Pressable>

      {/* ── Quick Services ──────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.servicesRow}
      >
        {QUICK_SERVICES.map((s) => (
          <Pressable
            key={s.id}
            style={styles.serviceItem}
            onPress={() => {
              if (s.id === 'prescription') {
                navigation.navigate('PrescriptionUpload');
              } else if (s.id === 'emergency') {
                navigation.navigate('MedicineList', { filter: 'emergency', title: 'Emergency Medicines' });
              } else {
                navigation.navigate('MedicineList', { filter: s.id, title: s.label });
              }
            }}
          >
            <View style={[styles.serviceIcon, { backgroundColor: s.color + '14' }]}>
              <Ionicons name={s.icon as any} size={24} color={s.color} />
            </View>
            <AppText variant="caption" style={{ marginTop: 6, textAlign: 'center' }}>{s.label}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Shop by Condition ────────────────────────── */}
      <View style={styles.sectionHeader}>
        <AppText variant="h3">Shop by Condition</AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      >
        {CONDITIONS.map((c) => (
          <Pressable
            key={c.id}
            style={styles.conditionCard}
            onPress={() => navigation.navigate('MedicineList', { conditionId: c.id, title: c.label })}
          >
            <View style={[styles.conditionIcon, { backgroundColor: c.color + '15' }]}>
              <Ionicons name={c.icon as any} size={24} color={c.color} />
            </View>
            <AppText variant="caption" style={{ marginTop: 8, textAlign: 'center' }}>{c.label}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Prescription Upload Banner ──────────────────────── */}
      <Pressable
        style={styles.rxBanner}
        onPress={() => navigation.navigate('PrescriptionUpload')}
      >
        <View style={styles.rxBannerIcon}>
          <Ionicons name="document-text" size={32} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <AppText variant="bodyStrong" color="#fff">Upload Prescription</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
            Get medicines delivered from verified pharmacies
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {/* ── Categories ──────────────────────────────────────── */}
      {categories.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <AppText variant="title">Categories</AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('MedicineList', {
                  categoryId: cat.id,
                  title: cat.name,
                })}
              >
                <View style={styles.categoryIcon}>
                  {cat.iconUrl || cat.imageUrl ? (
                    <Image
                      source={{ uri: normalizeUrl(cat.iconUrl || cat.imageUrl) || undefined }}
                      style={{ width: 36, height: 36 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="medical-outline" size={28} color={ACCENT} />
                  )}
                </View>
                <AppText variant="caption" numberOfLines={2} style={{ textAlign: 'center', marginTop: 6 }}>
                  {cat.name}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Emergency Medicines ──────────────────────────────── */}
      {emergency.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flash" size={18} color="#EF4444" />
              <AppText variant="title" style={{ marginLeft: 6 }}>Emergency Medicines</AppText>
            </View>
            <Pressable onPress={() => navigation.navigate('MedicineList', { filter: 'emergency', title: 'Emergency' })}>
              <AppText variant="captionStrong" color={ACCENT}>See All</AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  /* ── Medicine Card ─────────────────────────────────────────── */
  const renderMedicine = useCallback(({ item }: { item: Medicine }) => {
    const img = normalizeUrl(item.imageUrl);
    const mrp = Number(item.mrp || 0);
    const discount = Number(item.discount || 0);
    const hasDiscount = (item.discountPercent && item.discountPercent > 0) || (discount > 0);
    const sellingPrice = hasDiscount ? mrp - discount : mrp;

    return (
      <Pressable
        style={styles.medicineCard}
        onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.id })}
      >
        <View style={styles.medicineImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.medicineImg} resizeMode="contain" />
          ) : (
            <View style={[styles.medicineImg, { justifyContent: 'center', alignItems: 'center', backgroundColor: ACCENT_LIGHT }]}>
              <Ionicons name="medkit-outline" size={32} color={ACCENT} />
            </View>
          )}
          {item.requiresPrescription && (
            <View style={styles.rxTag}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 8 }}>Rx</AppText>
            </View>
          )}
          {item.isEmergency && (
            <View style={[styles.rxTag, { backgroundColor: '#EF4444', right: undefined, left: 6 }]}>
              <Ionicons name="flash" size={10} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.medicineInfo}>
          <AppText variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
            {item.dosageForm}{item.strength ? ` · ${item.strength}` : ''}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2} style={{ marginTop: 2 }}>
            {item.name}
          </AppText>
          {item.genericName && (
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1} style={{ marginTop: 1 }}>
              {item.genericName}
            </AppText>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <AppText variant="price" color={ACCENT}>Rs. {Number(sellingPrice).toFixed(0)}</AppText>
            {hasDiscount && (
              <AppText variant="pricePrev" style={{ marginLeft: 6 }}>Rs. {mrp.toFixed(0)}</AppText>
            )}
          </View>
          {item.packSize && (
            <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 2 }}>
              {item.packSize}
            </AppText>
          )}
        </View>
      </Pressable>
    );
  }, [navigation]);

  /* ── Build flat list data ──────────────────────────────────── */
  /* ── Build flat list data (unique medicines) ────────────────── */
  const allMedicines = useMemo(() => {
    const combined = [...emergency, ...featured];
    const seen = new Set();
    return combined.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [emergency, featured]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Ionicons name="medical" size={24} color={ACCENT} />
          <AppText variant="h3" style={{ marginLeft: 8 }}>Baldia Pharma</AppText>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
          <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
            Loading pharmacy…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Fixed Header ─────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <Ionicons name="medical" size={24} color={ACCENT} />
        <AppText variant="h3" style={{ marginLeft: 8 }}>Baldia Pharma</AppText>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => navigation.navigate('Notifications')} style={{ padding: 4 }}>
          <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={allMedicines}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 10 }}
        ListHeaderComponent={renderHeader}
        renderItem={renderMedicine}
        contentContainerStyle={{ paddingBottom: 100 }}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={10}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="medkit-outline" size={48} color={theme.colors.textMuted} />
            <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
              No medicines available yet
            </AppText>
            <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 4 }}>
              Check back soon — we're adding medicines daily
            </AppText>
          </View>
        }
      />

      {/* Sticky cart CTA */}
      {cartCount > 0 && (
        <View style={styles.stickyCta}>
          <Pressable 
            onPress={() => {
              setActiveMode('pharma');
              navigation.navigate('Cart');
            }} 
            style={({ pressed }) => [
              styles.stickyBtn, pressed ? { opacity: 0.92 } : null,
            ]}
          >
            <View style={styles.stickyBadge}>
              <AppText variant="bodyStrong" color="#fff">{cartCount}</AppText>
            </View>
            <AppText variant="title" color="#fff">View pharma cart</AppText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rxBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicesRow: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 4,
  },
  serviceItem: {
    alignItems: 'center',
    width: 72,
    marginHorizontal: 4,
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: theme.radius.xl,
    backgroundColor: ACCENT,
    ...theme.shadows.md,
  },
  rxBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBlock: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  conditionCard: {
    alignItems: 'center',
    width: 90,
    marginRight: 12,
  },
  conditionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCard: {
    alignItems: 'center',
    width: 76,
    marginRight: 12,
    paddingBottom: 8,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
  },
  medicineCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  medicineImgWrap: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineImg: {
    width: '100%',
    height: '100%',
  },
  rxTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stickyCta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  stickyBtn: {
    backgroundColor: ACCENT,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stickyBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  medicineInfo: {
    padding: 10,
  },
});
