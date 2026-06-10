import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useCartStore } from '../store/cartStore';
import { settingsApi, addressesApi, ordersApi } from '../api/api';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState, QuantityStepper,
} from '../components/ui';
import { theme } from '../theme/theme';

type Mode = 'mart' | 'food' | 'pharma';

type Row =
  | { kind: 'modeSwitch' }
  | { kind: 'groupHeader'; name: string; maxPrep?: number }
  | { kind: 'item'; item: any }
  | { kind: 'summary' };

export default function CartScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const {
    martCart, foodCart, pharmaCart, updateQuantity, removeFromCart, getCartTotal,
    getCartCount, activeMode: contextMode, setActiveMode, getCurrentTotal, getCurrentCount,
  } = useCartStore();

  const routeMode = route?.params?.mode;
  const [mode, setMode] = useState<Mode>(routeMode || contextMode || 'mart');

  useEffect(() => {
    const active = routeMode || contextMode;
    if (active && active !== mode) setMode(active as Mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMode, routeMode]);

  const cart = mode === 'mart' ? martCart : mode === 'food' ? foodCart : pharmaCart;

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [outOfZoneMsg, setOutOfZoneMsg] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (cart.length === 0) {
      setDeliveryFee(0);
      return;
    }
    setIsLoadingFee(true);
    try {
      const addrRes = await addressesApi.getAll();
      const defaultAddr = addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0];
      if (defaultAddr) {
        const restaurantId = mode === 'food' ? (cart[0] as any)?.restaurantId : undefined;
        const feeRes = await ordersApi.getDeliveryFee(defaultAddr.id, restaurantId, mode);
        if (feeRes.data.isValid) {
          setDeliveryFee(Number(feeRes.data.deliveryFee) || 0);
          setIsValidAddress(true);
          setOutOfZoneMsg(null);
        } else {
          setDeliveryFee(0);
          setIsValidAddress(false);
          setOutOfZoneMsg(feeRes.data.message || 'Selected address is outside our delivery zone.');
        }
      } else {
        const settingsRes = await settingsApi.getPublicSettings();
        setDeliveryFee(Number(settingsRes.data.delivery_base_fee) || 150);
        setIsValidAddress(true);
        setOutOfZoneMsg(null);
      }
    } catch (e) {
      setDeliveryFee(150);
      setIsValidAddress(true);
    } finally {
      setIsLoadingFee(false);
    }
  }, [cart, mode]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // ── Group by restaurant for food, single group for mart ──
  const groups = useMemo(() => {
    if (mode === 'mart') {
      return [{ id: 'mart', name: 'BaldiaMart Groceries', maxPrep: 0, items: cart }];
    }
    if (mode === 'pharma') {
      return [{ id: 'pharma', name: 'Baldia Pharma Medicines', maxPrep: 0, items: cart }];
    }
    const map = new Map<string, { id: string; name: string; maxPrep: number; items: any[] }>();
    cart.forEach((item: any) => {
      const rid = item.restaurantId || 'unknown';
      if (!map.has(rid)) {
        map.set(rid, {
          id: rid,
          name: item.restaurantName || 'Restaurant',
          maxPrep: 0,
          items: [],
        });
      }
      const g = map.get(rid)!;
      g.items.push(item);
      if ((item.prepTimeMinutes || 0) > g.maxPrep) g.maxPrep = item.prepTimeMinutes;
    });
    return Array.from(map.values());
  }, [cart, mode]);

  // ── Build flat list ──
  const data = useMemo<Row[]>(() => {
    if (cart.length === 0) return [];
    const rows: Row[] = [{ kind: 'modeSwitch' }];
    groups.forEach(g => {
      rows.push({ kind: 'groupHeader', name: g.name, maxPrep: g.maxPrep });
      g.items.forEach(it => rows.push({ kind: 'item', item: it }));
    });
    rows.push({ kind: 'summary' });
    return rows;
  }, [cart, groups]);

  const subtotal = getCartTotal(mode);
  const total = subtotal + (isValidAddress ? deliveryFee : 0);

  const otherCount = mode === 'mart' ? getCartCount('food') + getCartCount('pharma') :
    mode === 'food' ? getCartCount('mart') + getCartCount('pharma') :
      getCartCount('mart') + getCartCount('food');

  const handleSwitchMode = (next: Mode) => {
    setMode(next);
    setActiveMode(next);
  };

  const handleRemove = (item: any) => {
    Alert.alert('Remove item', `Remove ${item.name} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(item.id, mode) },
    ]);
  };

  const accent = mode === 'food' ? theme.colors.food : mode === 'pharma' ? theme.colors.pharma : theme.colors.mart;

  // Savings calc
  const totalDiscount = useMemo(() => {
    return cart.reduce((sum: number, it: any) => {
      const disc = Number(it.discount || 0) * (it.quantity || 1);
      return sum + disc;
    }, 0);
  }, [cart]);

  // ── Renderers ──
  const renderRow = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'modeSwitch') {
      return (
        <View style={styles.modeSwitchWrap}>
          <View style={styles.modeSwitch}>
            {(['mart', 'food', 'pharma'] as Mode[]).map(m => {
              const active = mode === m;
              const c = getCartCount(m);
              const tint = m === 'food' ? theme.colors.food : m === 'pharma' ? theme.colors.pharma : theme.colors.mart;
              return (
                <Pressable
                  key={m}
                  onPress={() => handleSwitchMode(m)}
                  style={[styles.modeTab, active ? styles.modeTabActive : null]}
                >
                  <Ionicons
                    name={m === 'mart' ? 'basket' : m === 'food' ? 'restaurant' : 'medical'}
                    size={16}
                    color={active ? tint : theme.colors.textSecondary}
                  />
                  <AppText
                    variant="captionStrong"
                    color={active ? tint : theme.colors.textSecondary}
                    style={{ fontSize: 13 }}
                  >
                    {m === 'mart' ? 'Mart' : m === 'food' ? 'Food' : 'Pharma'}
                  </AppText>
                  {c > 0 ? (
                    <View style={[styles.countDot, { backgroundColor: active ? tint : theme.colors.surfaceMuted }]}>
                      <AppText variant="badge" color={active ? '#fff' : theme.colors.textPrimary}>
                        {c}
                      </AppText>
                    </View>
                  ) : null}
                  {/* Active underline */}
                  {active && <View style={[styles.modeUnderline, { backgroundColor: tint }]} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (item.kind === 'groupHeader') {
      return (
        <View style={styles.groupHeader}>
          <View style={[styles.groupIcon, { backgroundColor: accent + '15' }]}>
            <Ionicons
              name={mode === 'food' ? 'restaurant' : mode === 'pharma' ? 'medical' : 'storefront'}
              size={18}
              color={accent}
            />
          </View>
          <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>{item.name}</AppText>
          {item.maxPrep && item.maxPrep > 0 ? (
            <AppBadge label={`~${item.maxPrep} min`} variant="secondary" tint={accent} />
          ) : null}
        </View>
      );
    }

    if (item.kind === 'item') {
      const it = item.item;
      const price = mode === 'pharma' ? it.sellingPrice : it.price;
      const lineTotal = (Number(price) || 0) * it.quantity;
      return (
        <View style={[styles.itemCard, { borderLeftColor: accent }]}>
          <View style={styles.itemImage}>
            {it.imageUrl ? (
              <Image source={{ uri: it.imageUrl }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={[styles.fill, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.itemBody}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>{it.name}</AppText>
              {mode === 'pharma' && it.requiresPrescription && (
                <AppBadge label="Rx" variant="secondary" tint={accent} />
              )}
            </View>
            <AppText variant="caption">Rs. {(Number(price) || 0).toLocaleString()} each</AppText>
            <View style={styles.itemActions}>
              <QuantityStepper
                quantity={it.quantity}
                onIncrement={() => updateQuantity(it.id, it.quantity + 1, mode)}
                onDecrement={() => updateQuantity(it.id, it.quantity - 1, mode)}
                size="sm"
                tint={accent}
              />
              <Pressable onPress={() => handleRemove(it)} hitSlop={8} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
              </Pressable>
              <AppText variant="bodyStrong" color={accent} style={{ marginLeft: 'auto' }}>
                Rs. {lineTotal.toLocaleString()}
              </AppText>
            </View>
          </View>
        </View>
      );
    }

    if (item.kind === 'summary') {
      return (
        <View style={styles.summary}>
          <AppText variant="overline" style={{ letterSpacing: 1 }}>ORDER SUMMARY</AppText>
          <View style={styles.sumRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Subtotal</AppText>
            <AppText variant="bodyStrong">Rs. {subtotal.toLocaleString()}</AppText>
          </View>
          <View style={styles.sumRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Delivery fee</AppText>
            {isLoadingFee ? (
              <ActivityIndicator size="small" color={accent} />
            ) : !isValidAddress ? (
              <AppText variant="bodyStrong" color={theme.colors.danger}>Unavailable</AppText>
            ) : (
              <AppText variant="bodyStrong">Rs. {deliveryFee.toLocaleString()}</AppText>
            )}
          </View>
          {/* Savings chip */}
          {totalDiscount > 0 && (
            <View style={styles.savingsRow}>
              <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} />
              <AppText variant="captionStrong" color={theme.colors.success}>
                You save Rs. {totalDiscount.toLocaleString()}
              </AppText>
            </View>
          )}
          <View style={styles.sumDivider} />
          <View style={styles.sumRow}>
            <AppText variant="title" style={{ fontSize: 16 }}>Total</AppText>
            <AppText variant="h3" color={accent}>
              {!isValidAddress ? 'N/A' : `Rs. ${total.toLocaleString()}`}
            </AppText>
          </View>
          {!isValidAddress ? (
            <View style={styles.warnRow}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
              <AppText variant="caption" color={theme.colors.danger}>
                {outOfZoneMsg || 'Selected address is outside our delivery zone.'}
              </AppText>
            </View>
          ) : null}

          {/* Tip */}
          <View style={styles.tipsRow}>
            <Ionicons name="bulb-outline" size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1 }}>
              Tip: Add a few more items to qualify for free delivery on selected stores.
            </AppText>
          </View>
        </View>
      );
    }
    return null;
  }, [
    mode, accent, subtotal, total, deliveryFee, isLoadingFee, isValidAddress, outOfZoneMsg,
    getCartCount, updateQuantity, totalDiscount,
  ]);

  const keyExtractor = useCallback((item: Row, index: number) => {
    if (item.kind === 'item') return `i-${item.item.id}`;
    if (item.kind === 'groupHeader') return `g-${item.name}-${index}`;
    return `${item.kind}-${index}`;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={38} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ flex: 1 }}>Your cart</AppText>
        {cart.length > 0 ? (
          <View style={styles.itemCountChip}>
            <AppText variant="captionStrong" color={accent}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</AppText>
          </View>
        ) : null}
      </View>

      {cart.length === 0 ? (
        <View style={{ flex: 1 }}>
          <View style={styles.modeSwitchWrap}>
            <View style={styles.modeSwitch}>
              {(['mart', 'food', 'pharma'] as Mode[]).map(m => {
                const active = mode === m;
                const tint = m === 'food' ? theme.colors.food : m === 'pharma' ? theme.colors.pharma : theme.colors.mart;
                return (
                  <Pressable
                    key={m}
                    onPress={() => handleSwitchMode(m)}
                    style={[styles.modeTab, active ? styles.modeTabActive : null]}
                  >
                    <Ionicons
                      name={m === 'mart' ? 'basket' : m === 'food' ? 'restaurant' : 'medical'}
                      size={16}
                      color={active ? tint : theme.colors.textSecondary}
                    />
                    <AppText variant="captionStrong" color={active ? tint : theme.colors.textSecondary}>
                      {m === 'mart' ? 'Mart' : m === 'food' ? 'Food' : 'Pharma'}
                    </AppText>
                    {active && <View style={[styles.modeUnderline, { backgroundColor: tint }]} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <EmptyState
            icon={mode === 'mart' ? 'basket-outline' : mode === 'food' ? 'restaurant-outline' : 'medical-outline'}
            title={`Your ${mode} cart is empty`}
            subtitle={mode === 'mart'
              ? 'Browse fresh groceries, brands and daily essentials.'
              : mode === 'food'
                ? 'Discover top restaurants near you and treat yourself.'
                : 'Add medicines and healthcare products to your cart.'}
            actionLabel={mode === 'mart' ? 'Browse groceries' : mode === 'food' ? 'Browse restaurants' : 'Browse pharmacy'}
            onAction={() => navigation.navigate(mode === 'mart' ? 'Home' : mode === 'food' ? 'Food' : 'Pharma')}
            tint={accent}
          />

          {otherCount > 0 ? (
            <View style={[styles.otherCartTip, { marginBottom: 110 }]}>
              <Ionicons
                name={getCartCount('pharma') > 0 && mode !== 'pharma' ? 'medical' : getCartCount('food') > 0 && mode !== 'food' ? 'restaurant' : 'basket'}
                size={16}
                color={getCartCount('pharma') > 0 && mode !== 'pharma' ? theme.colors.pharma : getCartCount('food') > 0 && mode !== 'food' ? theme.colors.food : theme.colors.primary}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  You have items in your {getCartCount('pharma') > 0 && mode !== 'pharma' ? 'Pharmacy' : getCartCount('food') > 0 && mode !== 'food' ? 'Food' : 'Mart'} cart.
                </AppText>
              </View>
              <Pressable onPress={() => handleSwitchMode(getCartCount('pharma') > 0 && mode !== 'pharma' ? 'pharma' : getCartCount('food') > 0 && mode !== 'food' ? 'food' : 'mart')}>
                <AppText variant="captionStrong" color={getCartCount('pharma') > 0 && mode !== 'pharma' ? theme.colors.pharma : getCartCount('food') > 0 && mode !== 'food' ? theme.colors.food : theme.colors.primary}>
                  Switch
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
          />

          {/* Sticky gradient footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 110 }]}>
            <LinearGradient
              colors={['transparent', theme.colors.surface]}
              style={styles.footerGradient}
            />
            <View style={styles.footerContent}>
              <Pressable
                onPress={() => navigation.navigate('Checkout', { mode })}
                disabled={(!isValidAddress && mode !== 'pharma') || total <= 0}
                style={({ pressed }) => [
                  styles.checkoutBtn,
                  { opacity: ((!isValidAddress && mode !== 'pharma') || total <= 0) ? 0.5 : 1 },
                  pressed ? { transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <LinearGradient
                  colors={
                    mode === 'food'
                      ? [theme.colors.food, theme.colors.foodDark]
                      : mode === 'pharma'
                        ? [theme.colors.pharma, theme.colors.pharmaDark]
                        : [theme.colors.mart, theme.colors.martDark]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.checkoutInner}>
                  <View>
                    <AppText variant="bodyStrong" color="#fff" style={{ fontSize: 15 }}>
                      {!isValidAddress && mode !== 'pharma' ? 'Address out of zone' : 'Proceed to Checkout'}
                    </AppText>
                    <AppText variant="caption" color="rgba(255,255,255,0.8)">
                      {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </AppText>
                  </View>
                  <View style={styles.checkoutPrice}>
                    <AppText variant="h3" color="#fff">
                      Rs. {Math.round(total).toLocaleString()}
                    </AppText>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                </View>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fill: { width: '100%', height: '100%' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  itemCountChip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // Mode switch — tab style with underline
  modeSwitchWrap: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modeSwitch: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    position: 'relative',
  },
  modeTabActive: {},
  modeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
  },
  countDot: {
    minWidth: 20, height: 20, borderRadius: 10, marginLeft: 2,
    paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },

  // Group
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Items — left accent border
  itemCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderLeftWidth: 3,
    gap: theme.spacing.md,
    ...theme.shadows.md,
  },
  itemImage: {
    width: 88, height: 88,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, justifyContent: 'space-between' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4 },
  removeBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },

  // Summary
  summary: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.sm },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
  },
  warnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  tipsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: theme.spacing.sm,
  },

  otherCartTip: {
    marginHorizontal: theme.spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.divider,
  },

  // Sticky footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -40,

  },
  footerGradient: {
    height: 0,
  },
  footerContent: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  checkoutBtn: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    height: 60,
    justifyContent: 'center',
  },
  checkoutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: '100%',
  },
  checkoutPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
