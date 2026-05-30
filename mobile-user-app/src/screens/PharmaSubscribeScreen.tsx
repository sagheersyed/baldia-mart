import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pharmaApi, addressesApi, recurringOrdersApi } from '../api/api';
import AppText from '../components/ui/AppText';
import AppButton from '../components/ui/AppButton';
import { theme } from '../theme/theme';

const ACCENT = theme.colors.pharma;

const FREQUENCIES = [
  { id: 'daily', label: 'Daily', icon: 'sunny-outline', desc: 'Every day delivery' },
  { id: 'weekly', label: 'Weekly', icon: 'calendar-outline', desc: 'Once a week refill' },
  { id: 'monthly', label: 'Monthly', icon: 'medical-outline', desc: 'Monthly chronic supply' },
];

export default function PharmaSubscribeScreen({ route, navigation }: any) {
  const { medicineId } = route.params;

  const [medicine, setMedicine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFreq, setSelectedFreq] = useState('monthly');
  const [address, setAddress] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [medRes, addrRes] = await Promise.all([
          pharmaApi.getMedicine(medicineId),
          addressesApi.getAll(),
        ]);
        setMedicine(medRes.data);
        const defAddr = addrRes.data?.find((a: any) => a.isDefault) || addrRes.data?.[0];
        setAddress(defAddr);
      } catch (e) {
        console.warn('[PharmaSubscribe] error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [medicineId]);

  const handleSubscribe = async () => {
    if (!address) {
      Alert.alert('Address Required', 'Please add a delivery address first.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        medicineId,
        frequency: selectedFreq,
        quantity: 1,
        addressId: address.id,
        startDate: new Date(),
      };
      await recurringOrdersApi.create(payload);
      Alert.alert(
        'Subscription Active',
        `Your ${selectedFreq} refill for ${medicine.name} has been scheduled.`,
        [{ text: 'Great!', onPress: () => navigation.navigate('Pharma') }]
      );
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create subscription. Please try again.';
      Alert.alert('Subscription Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1, marginLeft: 12 }}>Setup Subscription</AppText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {medicine ? (
          <View style={styles.medCard}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{medicine.dosageForm} · {medicine.strength}</AppText>
            <AppText variant="bodyStrong" style={{ fontSize: 18 }}>{medicine.name}</AppText>
          </View>
        ) : (
          <View style={styles.medCard}>
            <AppText variant="bodyStrong">Medicine Info Unavailable</AppText>
          </View>
        )}

        <AppText variant="overline" style={{ marginTop: 24, marginBottom: 12 }}>Delivery Frequency</AppText>
        <View style={{ gap: 10 }}>
          {FREQUENCIES.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.freqCard, selectedFreq === f.id ? styles.freqCardActive : null]}
              onPress={() => setSelectedFreq(f.id)}
            >
              <View style={[styles.iconWrap, selectedFreq === f.id ? { backgroundColor: '#fff' } : null]}>
                <Ionicons name={f.icon as any} size={20} color={selectedFreq === f.id ? ACCENT : theme.colors.textMuted} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="bodyStrong" color={selectedFreq === f.id ? '#fff' : theme.colors.textPrimary}>{f.label}</AppText>
                <AppText variant="caption" color={selectedFreq === f.id ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary}>{f.desc}</AppText>
              </View>
              {selectedFreq === f.id && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
            </Pressable>
          ))}
        </View>

        <AppText variant="overline" style={{ marginTop: 24, marginBottom: 12 }}>Delivery Address</AppText>
        <Pressable style={styles.addrCard} onPress={() => navigation.navigate('SavedAddresses', { mode: 'pharma' })}>
          <Ionicons name="location-outline" size={20} color={ACCENT} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyStrong">{address ? address.label : 'No address selected'}</AppText>
            <AppText variant="caption" numberOfLines={1}>{address ? address.address : 'Click to add/select an address'}</AppText>
          </View>
          <AppText variant="captionStrong" color={ACCENT}>Change</AppText>
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1, marginLeft: 8 }}>
            Subscriptions can be paused or cancelled at any time from your account settings. Payments are collected on delivery.
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label="Activate Subscription"
          variant="primary"
          tint={ACCENT}
          loading={submitting}
          onPress={handleSubscribe}
          fullWidth
        />
      </View>
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
  },
  medCard: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  freqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  freqCardActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    ...theme.shadows.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoBox: {
    flexDirection: 'row',
    marginTop: 20,
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
