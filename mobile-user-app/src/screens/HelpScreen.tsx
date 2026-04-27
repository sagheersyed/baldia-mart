import React from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { settingsApi } from '../api/api';
import { AppText, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

const FAQ = [
  { q: 'How do I track my order?', a: 'Go to My orders and tap “Track order” to see real-time updates.' },
  { q: 'What is the delivery time?', a: 'We deliver within 30–60 minutes depending on your location within the delivery zone.' },
  { q: 'Can I cancel my order?', a: 'You can cancel an order while it is in “Pending” status. Go to My orders and tap Cancel.' },
  { q: 'Do you deliver to my area?', a: 'We currently deliver within a 50 km radius. Enter your address at checkout to verify.' },
  { q: 'What payment methods do you accept?', a: 'We currently accept Cash on Delivery (COD) and card payments at checkout.' },
  { q: 'How do I change my delivery address?', a: 'Tap “Saved addresses” in your profile to add or modify your delivery locations.' },
];

function FAQItem({ item }: any) {
  const [open, setOpen] = React.useState(false);
  return (
    <Pressable
      style={({ pressed }) => [styles.faqItem, pressed ? { backgroundColor: theme.colors.surfaceMuted } : null]}
      onPress={() => setOpen(!open)}
    >
      <View style={styles.faqHeader}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>{item.q}</AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textSecondary} />
      </View>
      {open ? <AppText variant="caption" style={{ marginTop: 8, lineHeight: 20 }}>{item.a}</AppText> : null}
    </Pressable>
  );
}

export default function HelpScreen({ navigation }: any) {
  const [settings, setSettings] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    settingsApi.getPublicSettings()
      .then(res => setSettings(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const contactPhone = settings?.contact_phone || '+92 341 2248616';
  const contactEmail = settings?.contact_email || 'support@baldiamart.pk';

  type Contact = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color: string;
    bg: string;
    action: () => void;
  };

  const CONTACT: Contact[] = [
    {
      icon: 'call-outline', label: 'Call support', value: contactPhone,
      color: theme.colors.success, bg: theme.colors.successLight,
      action: () => Linking.openURL(`tel:${contactPhone.replace(/\s/g, '')}`),
    },
    {
      icon: 'logo-whatsapp', label: 'WhatsApp', value: contactPhone,
      color: '#25D366', bg: '#E7F8EF',
      action: () => Linking.openURL(`https://wa.me/${contactPhone.replace(/[\s+]/g, '')}`),
    },
    {
      icon: 'mail-outline', label: 'Email us', value: contactEmail,
      color: theme.colors.info, bg: theme.colors.infoLight,
      action: () => Linking.openURL(`mailto:${contactEmail}`),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ flex: 1 }}>Help & support</AppText>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
          <AppText variant="overline" style={{ marginBottom: theme.spacing.sm }}>Contact us</AppText>
          <View style={styles.card}>
            {CONTACT.map((c, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.row,
                  i < CONTACT.length - 1 ? styles.rowBorder : null,
                  pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
                ]}
                onPress={c.action}
              >
                <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={20} color={c.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong">{c.label}</AppText>
                  <AppText variant="caption">{c.value}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>

          <AppText variant="overline" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
            Frequently asked questions
          </AppText>
          <View style={styles.card}>
            {FAQ.map((item, i) => (
              <View key={i} style={i < FAQ.length - 1 ? styles.rowBorder : null}>
                <FAQItem item={item} />
              </View>
            ))}
          </View>

          <View style={styles.appInfoCard}>
            <View style={styles.logoCircle}>
              <Ionicons name="basket" size={28} color={theme.colors.primary} />
            </View>
            <AppText variant="h2" style={{ marginTop: 8 }}>BaldiaMart</AppText>
            <AppText variant="caption">Hyperlocal delivery made easy</AppText>
            <AppText variant="caption" style={{ marginTop: 6 }}>Version 1.0.0 · Karachi, Pakistan</AppText>
          </View>
        </ScrollView>
      )}
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

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  faqItem: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md },
  faqHeader: { flexDirection: 'row', alignItems: 'center' },

  appInfoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  logoCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
});
