import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { settingsApi } from '../api/api';
import { useCartStore } from '../store/cartStore';
import { AppText, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

const APP_VERSION = '1.0.0';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'basket-outline', label: 'Grocery delivery from local mart' },
  { icon: 'restaurant-outline', label: 'Food ordering from restaurants' },
  { icon: 'storefront-outline', label: 'Shop from top brands' },
  { icon: 'bicycle-outline', label: 'Real-time rider tracking' },
  { icon: 'star-outline', label: 'Rate your experience' },
  { icon: 'heart-outline', label: 'Save your favourites' },
  { icon: 'notifications-outline', label: 'Order status notifications' },
];

const LEGAL = [
  { label: 'Privacy policy', url: 'https://baldiamart.pk/privacy' },
  { label: 'Terms of service', url: 'https://baldiamart.pk/terms' },
];

export default function AboutScreen({ navigation }: any) {
  const [contactLinks, setContactLinks] = useState<{
    icon: keyof typeof Ionicons.glyphMap; label: string; value: string; action: () => void;
  }[]>([
    { icon: 'mail-outline', label: 'Email', value: 'support@baldiamart.pk', action: () => Linking.openURL('mailto:support@baldiamart.pk') },
    { icon: 'call-outline', label: 'Phone', value: '+92 300 0000000', action: () => Linking.openURL('tel:+923000000000') },
  ]);
  const [socialLinks, setSocialLinks] = useState<{
    icon: keyof typeof Ionicons.glyphMap; label: string; url: string; color: string;
  }[]>([
    { icon: 'logo-facebook', label: 'Facebook', url: 'https://facebook.com/baldiamart', color: '#1877F2' },
    { icon: 'logo-instagram', label: 'Instagram', url: 'https://instagram.com/baldiamart', color: '#E1306C' },
  ]);

  useFocusEffect(useCallback(() => {
    settingsApi.getPublicSettings().then(res => {
      const data = res.data;
      if (!data) return;
      const email = data.contact_email || 'support@baldiamart.pk';
      const phone = data.contact_phone || '+92 300 0000000';
      const fb = data.social_facebook || 'https://facebook.com/baldiamart';
      const insta = data.social_instagram || 'https://instagram.com/baldiamart';
      setContactLinks([
        { icon: 'mail-outline', label: 'Email', value: email, action: () => Linking.openURL(`mailto:${email}`) },
        { icon: 'call-outline', label: 'Phone', value: phone, action: () => Linking.openURL(`tel:${phone}`) },
      ]);
      setSocialLinks([
        { icon: 'logo-facebook', label: 'Facebook', url: fb, color: '#1877F2' },
        { icon: 'logo-instagram', label: 'Instagram', url: insta, color: '#E1306C' },
      ]);
    }).catch(() => {});
  }, []));

  const { activeMode } = useCartStore();
  const accent = activeMode === 'food' ? theme.colors.food : activeMode === 'pharma' ? theme.colors.pharma : theme.colors.primary;
  const accentDark = activeMode === 'food' ? theme.colors.foodDark : activeMode === 'pharma' ? theme.colors.pharmaDark : theme.colors.primaryDark;
  const accentLight = activeMode === 'food' ? theme.colors.foodLight : activeMode === 'pharma' ? theme.colors.pharmaLight : theme.colors.primaryLight;

  const brandName = activeMode === 'food' ? 'BaldiaFood' : activeMode === 'pharma' ? 'Baldia Pharma' : 'BaldiaMart';
  const brandIcon = activeMode === 'food' ? 'restaurant' : activeMode === 'pharma' ? 'medical' : 'basket';

  const features = activeMode === 'pharma' ? [
    { icon: 'medical-outline', label: 'Wide range of genuine medicines' },
    { icon: 'videocam-outline', label: 'Online doctor consultations' },
    { icon: 'flask-outline', label: 'Lab tests with home collection' },
    { icon: 'repeat-outline', label: 'Monthly medicine refills' },
    { icon: 'notifications-outline', label: 'Dosage reminders' },
  ] : activeMode === 'food' ? [
    { icon: 'restaurant-outline', label: 'Order from top local restaurants' },
    { icon: 'fast-food-outline', label: 'Fast and fresh food delivery' },
    { icon: 'star-outline', label: 'Rate your favorite meals' },
    { icon: 'bicycle-outline', label: 'Real-time rider tracking' },
    { icon: 'receipt-outline', label: 'Digital receipts' },
  ] : [
    { icon: 'basket-outline', label: 'Grocery delivery from local mart' },
    { icon: 'storefront-outline', label: 'Shop from top brands' },
    { icon: 'flash-outline', label: 'Same-day express delivery' },
    { icon: 'heart-outline', label: 'Save your monthly rashan list' },
    { icon: 'wallet-outline', label: 'Secure digital payments' },
  ];

  const brandDescription = activeMode === 'pharma' 
    ? 'Baldia Pharma is your complete digital healthcare partner. We bring genuine medicines, professional doctor consultations, and lab diagnostic services right to your doorstep, ensuring your health is always a priority.'
    : activeMode === 'food'
    ? 'BaldiaFood connects you with the best flavors in your city. From local street food to premium restaurants, we ensure your favorite meals reach you fresh and fast, anytime you crave.'
    : 'BaldiaMart is your neighborhood\'s favorite one-stop shop. We provide a seamless shopping experience for groceries, household essentials, and premium brands with the convenience of lightning-fast delivery.';

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link. Please try again.'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ flex: 1 }}>About {activeMode === 'pharma' ? 'Healthcare' : activeMode === 'food' ? 'Food' : 'App'}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[accent || '#FF5A1F', accentDark || '#E64A19']}
          style={styles.hero}
        >
          <View style={styles.logoCircle}>
            <Ionicons name={brandIcon as any} size={36} color={accent} />
          </View>
          <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.md }}>{brandName}</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.9)">
            {activeMode === 'pharma' ? 'Your health, our priority' : 'Your neighborhood delivery app'}
          </AppText>
          <View style={styles.versionPill}>
            <AppText variant="captionStrong" color={accent}>v{APP_VERSION}</AppText>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <AppText variant="overline">What is {brandName}?</AppText>
          <AppText style={{ marginTop: theme.spacing.sm, lineHeight: 22 }}>
            {brandDescription}
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="overline" style={{ marginBottom: theme.spacing.sm }}>Key Features</AppText>
          {features.map((f: any, i: number) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: accent + '15' }]}>
                <Ionicons name={f.icon} size={16} color={accent} />
              </View>
              <AppText variant="body">{f.label}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="overline" style={{ marginBottom: theme.spacing.sm }}>Contact us</AppText>
          {contactLinks.map((c, i) => (
            <Pressable
              key={i}
              onPress={c.action}
              style={({ pressed }) => [
                styles.row,
                i < contactLinks.length - 1 ? styles.rowBorder : null,
                pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={c.icon} size={18} color={accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{c.label}</AppText>
                <AppText variant="caption">{c.value}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="overline" style={{ marginBottom: theme.spacing.sm }}>Follow us</AppText>
          {socialLinks.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => openLink(s.url)}
              style={({ pressed }) => [
                styles.row,
                i < socialLinks.length - 1 ? styles.rowBorder : null,
                pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{s.label}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="overline" style={{ marginBottom: theme.spacing.sm }}>Legal</AppText>
          {LEGAL.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => openLink(item.url)}
              style={({ pressed }) => [
                styles.row,
                i < LEGAL.length - 1 ? styles.rowBorder : null,
                pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={18} color={theme.colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{item.label}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <AppText variant="caption" align="center" style={{ marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
          Made with care in Pakistan © 2026 BaldiaMart
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  hero: {
    alignItems: 'center', paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.md,
  },
  versionPill: {
    marginTop: theme.spacing.sm,
    backgroundColor: '#fff',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.divider,
  },

  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingVertical: 8,
  },
  featureIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  rowIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
});
