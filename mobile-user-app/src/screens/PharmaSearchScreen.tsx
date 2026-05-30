import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Pressable,
  TextInput, Keyboard, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';
import { pharmaApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import { DEFAULT_IMAGES } from '../constants/images';

const RECENT_KEY = '@recent_pharma_searches';
const RECENT_MAX = 8;
const PHARMA_GREEN = theme.colors.pharma;
const PHARMA_BG = theme.colors.background;
const PHARMA_BORDER = theme.colors.border;

const TRENDING = ['Panadol', 'Surbex-Z', 'Disprin', 'Augmentin', 'Multivitamins', 'Insulin'];

export default function PharmaSearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const { addToCart, pharmaCart } = useCartStore();
  const debounceRef = useRef<any>(null);

  const getProductCartCount = (medicineId: string) => {
    const item = pharmaCart.find(c => c.id === medicineId);
    return item ? item.quantity : 0;
  };

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then(raw => {
      if (raw) try { setRecent(JSON.parse(raw)); } catch { }
    });
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProducts([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const mRes = await pharmaApi.searchMedicines(trimmed, 1, 30).catch(() => ({ data: { data: [] } }));
        const rawArr = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || []);
        const unique = Array.from(new Map(rawArr.map((m: any) => [m.id, m])).values());
        setProducts(unique);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  const commitRecent = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setRecent(prev => {
      const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => { });
      return next;
    });
  }, []);

  const handleAdd = useCallback((p: any) => {
    addToCart(p, 'pharma');
  }, [addToCart]);

  const renderProduct = ({ item }: { item: any }) => (
    <Pressable style={styles.card} onPress={() => {
      commitRecent(query);
      navigation.navigate('MedicineDetail', { medicineId: item.id });
    }}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: normalizeUrl(item.imageUrl) || DEFAULT_IMAGES.medicine }} style={styles.img} resizeMode="contain" />
      </View>
      <View style={styles.info}>
        <AppText variant="caption" color="#64748B" numberOfLines={1} style={{ fontSize: 10 }}>
          {item.brand?.name || 'Pharma'}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={2} style={{ fontSize: 13, marginTop: 2 }}>
          {item.name}
        </AppText>
        {item.requiresPrescription && (
          <View style={styles.rxBadge}>
            <AppText variant="captionStrong" color="#EF4444" style={{ fontSize: 9 }}>Rx</AppText>
          </View>
        )}
      </View>
      <View style={styles.rightSide}>
        <AppText variant="bodyStrong" color={PHARMA_GREEN} style={{ marginBottom: 8 }}>
          Rs. {Number(item.mrp) - Number(item.discount || 0) || item.mrp}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {getProductCartCount(item.id) > 0 && (
            <View style={styles.cartBadge}>
              <AppText variant="captionStrong" color="#fff" style={{ fontSize: 10 }}>{getProductCartCount(item.id)}</AppText>
            </View>
          )}
          <Pressable style={styles.addBtn} onPress={() => handleAdd(item)}>
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Search Area */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for 'Personal Care'"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            returnKeyType="search"
            autoCapitalize="none"
            onSubmitEditing={() => commitRecent(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </Pressable>
          )}
        </View>
      </View>

      {query.length < 2 ? (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.pillsSection}>
            <AppText variant="bodyStrong" color="#333" style={{ marginBottom: 12 }}>Trending Searches</AppText>
            <View style={styles.pillsWrap}>
              {TRENDING.map((t, idx) => (
                <Pressable key={idx} style={styles.pill} onPress={() => setQuery(t)}>
                  <Ionicons name="trending-up" size={14} color={PHARMA_GREEN} />
                  <AppText variant="caption" style={{ marginLeft: 6 }}>{t}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          {recent.length > 0 && (
            <View style={styles.pillsSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <AppText variant="bodyStrong" color="#333">Recent Searches</AppText>
                <Pressable onPress={() => { setRecent([]); AsyncStorage.removeItem(RECENT_KEY); }}>
                  <AppText variant="caption" color="#EF4444">Clear</AppText>
                </Pressable>
              </View>
              <View style={styles.pillsWrap}>
                {recent.map((r, idx) => (
                  <Pressable key={idx} style={styles.pill} onPress={() => setQuery(r)}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <AppText variant="caption" style={{ marginLeft: 6 }}>{r}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: PHARMA_BG }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={PHARMA_GREEN} />
            </View>
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={renderProduct}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.center}>
              <Ionicons name="search-outline" size={48} color="#CBD5E1" />
              <AppText variant="bodyStrong" color="#64748B" style={{ marginTop: 12 }}>
                No medicines found for "{query}"
              </AppText>
              <AppText variant="caption" color="#94A3B8" style={{ marginTop: 4 }}>
                Check spelling or try a different term
              </AppText>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PHARMA_BORDER,
  },
  backBtn: { padding: 4, marginRight: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PHARMA_BG,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: PHARMA_BORDER,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingHorizontal: 8,
  },
  pillsSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: PHARMA_BORDER },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PHARMA_BORDER,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PHARMA_BORDER,
    alignItems: 'center',
  },
  imgWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: PHARMA_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  img: { width: '80%', height: '80%' },
  info: { flex: 1 },
  rxBadge: { alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 2, backgroundColor: '#FEE2E2', borderRadius: 4, marginTop: 4 },
  rightSide: { alignItems: 'flex-end', justifyContent: 'space-between', height: 60 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PHARMA_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
