import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCart } from '../context/CartContext';
import { settingsApi, addressesApi, ordersApi } from '../api/api';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState, QuantityStepper,
} from '../components/ui';
import { theme } from '../theme/theme';

type Mode = 'mart' | 'food';

type Row =
  | { kind: 'modeSwitch' }
  | { kind: 'groupHeader'; name: string; maxPrep?: number }
  | { kind: 'item'; item: any }
  | { kind: 'summary' };

export default function CartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    martCart, foodCart, updateQuantity, removeFromCart, getCartTotal,
    getCartCount, activeMode: contextMode, setActiveMode,
  } = useCart();

  const [mode, setMode] = useState<Mode>(contextMode === 'food' ? 'food' : 'mart');

  useEffect(() => {
    if (contextMode && contextMode !== mode) setMode(contextMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMode]);

  const cart = mode === 'mart' ? martCart : foodCart;

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
        const restaurantId = mode === 'food' ? cart[0]?.restaurantId : undefined;
        const feeRes = await ordersApi.getDeliveryFee(defaultAddr.id, restaurantId);
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
  const total = subtotal + (subtotal > 0 ? deliveryFee : 0);

  const otherCount = mode === 'mart' ? getCartCount('food') : getCartCount('mart');

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

  const accent = mode === 'food' ? theme.colors.food : theme.colors.primary;

  // ── Renderers ──
  const renderRow = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'modeSwitch') {
      return (
        <View style={styles.modeSwitch}>
          {(['mart', 'food'] as Mode[]).map(m => {
            const active = mode === m;
            const c = m === 'mart' ? getCartCount('mart') : getCartCount('food');
            return (
              <Pressable
                key={m}
                onPress={() => handleSwitchMode(m)}
                style={[styles.modePill, active ? {
                  backgroundColor: m === 'food' ? theme.colors.food : theme.colors.primary,
                } : null]}
              >
                <Ionicons
                  name={m === 'mart' ? 'basket' : 'restaurant'}
                  size={14}
                  color={active ? '#fff' : theme.colors.textSecondary}
                />
                <AppText
                  variant="captionStrong"
                  color={active ? '#fff' : theme.colors.textSecondary}
                >
                  {m === 'mart' ? 'Mart' : 'Food'}
                </AppText>
                {c > 0 ? (
                  <View style={[styles.countDot, active ? { backgroundColor: 'rgba(255,255,255,0.25)' } : null]}>
                    <AppText variant="badge" color={active ? '#fff' : theme.colors.textPrimary}>
                      {c}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (item.kind === 'groupHeader') {
      return (
        <View style={styles.groupHeader}>
          <Ionicons
            name={mode === 'food' ? 'restaurant' : 'storefront'}
            size={16}
            color={accent}
          />
          <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>{item.name}</AppText>
          {item.maxPrep && item.maxPrep > 0 ? (
            <AppBadge label={`~${item.maxPrep} min`} variant="primary" />
          ) : null}
        </View>
      );
    }

    if (item.kind === 'item') {
      const it = item.item;
      const lineTotal = (Number(it.price) || 0) * it.quantity;
      return (
        <View style={styles.itemCard}>
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
            <AppText variant="bodyStrong" numberOfLines={2}>{it.name}</AppText>
            <AppText variant="caption">Rs. {Math.round(Number(it.price) || 0)} each</AppText>
            <View style={styles.itemActions}>
              <QuantityStepper
                quantity={it.quantity}
                onIncrement={() => updateQuantity(it.id, it.quantity + 1, mode)}
                onDecrement={() => updateQuantity(it.id, it.quantity - 1, mode)}
                size="sm"
                tint={accent}
              />
              <Pressable onPress={() => handleRemove(it)} hitSlop={8} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
              </Pressable>
              <AppText variant="bodyStrong" color={accent} style={{ marginLeft: 'auto' }}>
                Rs. {Math.round(lineTotal)}
              </AppText>
            </View>
          </View>
        </View>
      );
    }

    if (item.kind === 'summary') {
      return (
        <View style={styles.summary}>
          <AppText variant="overline">Order summary</AppText>
          <View style={styles.sumRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Subtotal</AppText>
            <AppText variant="bodyStrong">Rs. {Math.round(subtotal)}</AppText>
          </View>
          <View style={styles.sumRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Delivery fee</AppText>
            {isLoadingFee ? (
              <ActivityIndicator size="small" color={accent} />
            ) : !isValidAddress ? (
              <AppText variant="bodyStrong" color={theme.colors.danger}>Unavailable</AppText>
            ) : (
              <AppText variant="bodyStrong">Rs. {Math.round(deliveryFee)}</AppText>
            )}
          </View>
          <View style={styles.sumDivider} />
          <View style={styles.sumRow}>
            <AppText variant="title">Total</AppText>
            <AppText variant="h3" color={accent}>
              {!isValidAddress ? 'N/A' : `Rs. ${Math.round(total)}`}
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

          {/* Suggested addons (quick picks) */}
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
    getCartCount, updateQuantity,
  ]);

  const keyExtractor = useCallback((item: Row, index: number) => {
    if (item.kind === 'item') return `i-${item.item.id}`;
    if (item.kind === 'groupHeader') return `g-${item.name}-${index}`;
    return `${item.kind}-${index}`;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ flex: 1 }}>Your cart</AppText>
        {cart.length > 0 ? (
          <AppText variant="caption">{cart.length} {cart.length === 1 ? 'item' : 'items'}</AppText>
        ) : null}
      </View>

      {cart.length === 0 ? (
        <View style={{ flex: 1 }}>
          <View style={styles.modeSwitch}>
            {(['mart', 'food'] as Mode[]).map(m => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => handleSwitchMode(m)}
                  style={[styles.modePill, active ? {
                    backgroundColor: m === 'food' ? theme.colors.food : theme.colors.primary,
                  } : null]}
                >
                  <Ionicons
                    name={m === 'mart' ? 'basket' : 'restaurant'}
                    size={14}
                    color={active ? '#fff' : theme.colors.textSecondary}
                  />
                  <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textSecondary}>
                    {m === 'mart' ? 'Mart' : 'Food'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <EmptyState
            icon={mode === 'mart' ? 'basket-outline' : 'restaurant-outline'}
            title={`Your ${mode} cart is empty`}
            subtitle={mode === 'mart'
              ? 'Browse fresh groceries, brands and daily essentials.'
              : 'Discover top restaurants near you and treat yourself.'}
            actionLabel={mode === 'mart' ? 'Browse groceries' : 'Browse restaurants'}
            onAction={() => navigation.navigate(mode === 'mart' ? 'Home' : 'Food')}
          />

          {otherCount > 0 ? (
            <View style={styles.otherCartTip}>
              <Ionicons
                name={mode === 'mart' ? 'restaurant' : 'basket'}
                size={16}
                color={mode === 'mart' ? theme.colors.food : theme.colors.primary}
              />
              <AppText variant="caption" style={{ flex: 1 }}>
                You have {otherCount} item{otherCount === 1 ? '' : 's'} in your {mode === 'mart' ? 'food' : 'mart'} cart.
              </AppText>
              <Pressable onPress={() => handleSwitchMode(mode === 'mart' ? 'food' : 'mart')}>
                <AppText variant="captionStrong" color={mode === 'mart' ? theme.colors.food : theme.colors.primary}>
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
            contentContainerStyle={{ paddingVertical: theme.spacing.md, paddingBottom: 160 + insets.bottom }}
          />

          <View style={styles.footer}>
            <AppButton
              label={!isValidAddress
                ? 'Address out of zone'
                : `Checkout • Rs. ${Math.round(total)}`}
              variant="primary"
              tint={mode === 'food' ? theme.colors.food : theme.colors.primary}
              size="lg"
              fullWidth
              disabled={!isValidAddress || total <= 0}
              onPress={() => navigation.navigate('Checkout', { mode })}
              trailingIcon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background , marginBottom:110 },
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

  // Mode switch
  modeSwitch: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  modePill: {
    paddingHorizontal: theme.spacing.md, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  countDot: {
    minWidth: 18, height: 18, borderRadius: 9, marginLeft: 4,
    paddingHorizontal: 5,
    backgroundColor: theme.colors.surface,
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

  // Items
  itemCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  itemImage: {
    width: 76, height: 76,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, justifyContent: 'space-between' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
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
    ...theme.shadows.sm,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.sm },
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

  footer: {
    // position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    // backgroundColor: theme.colors.surface,
    // borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
});
