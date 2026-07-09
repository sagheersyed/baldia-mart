import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput,
  Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCmsStore } from '../../store/cmsStore';
import { financeApi, walletsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';
import { formatPKR } from '../../utils/helpers';

export default function WithdrawalScreen({ navigation }: any) {
  const { activeTenant } = useCmsStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const vertical = activeTenant?.type ?? 'mart';
  const color = vertical === 'restaurant'
    ? theme.colors.food
    : vertical === 'pharmacy'
    ? theme.colors.pharma
    : theme.colors.primary;

  const tenantId = activeTenant?.tenantId ?? '';

  const loadSummary = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await financeApi.getVendorSummary(tenantId);
      setSummary(res.data);
    } catch (e) {
      console.warn('[Withdrawal] Failed to load summary', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const netBalance = Number(summary?.netBalance ?? 0);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amt > netBalance) {
      Alert.alert('Insufficient Balance', `Your available balance is Rs. ${formatPKR(netBalance)}.`);
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      Alert.alert('Missing Details', 'Please fill in all bank account details.');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Submit a withdrawal request of Rs. ${formatPKR(amt)} to ${accountName} at ${bankName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            try {
              await walletsApi.requestWithdrawal({
                amount: amt,
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                accountName: accountName.trim(),
              }, tenantId);
              Alert.alert(
                'Request Submitted ✓',
                'Your withdrawal request has been submitted. The admin team will process it within 1–3 business days.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (e: any) {
              const msg = e?.response?.data?.message ?? 'Failed to submit withdrawal request.';
              Alert.alert('Error', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHeader} />
        </Pressable>
        <AppText variant="h2">Request Withdrawal</AppText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Balance Card */}
          <LinearGradient
            colors={[color, color + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <AppText variant="caption" color="rgba(255,255,255,0.75)">Available Balance</AppText>
            <AppText variant="h1" color="#fff" style={styles.balanceAmt}>
              {formatPKR(netBalance)}
            </AppText>
            <View style={styles.balanceStats}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="rgba(255,255,255,0.7)">Total Earnings</AppText>
                <AppText variant="bodyStrong" color="#fff">{formatPKR(summary?.totalEarnings)}</AppText>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="caption" color="rgba(255,255,255,0.7)">Commission Paid</AppText>
                <AppText variant="bodyStrong" color="#fff">{formatPKR(summary?.totalCommissions)}</AppText>
              </View>
            </View>
          </LinearGradient>

          {/* Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color="#4F46E5" />
            <AppText variant="caption" color="#4F46E5" style={{ flex: 1, marginLeft: 8 }}>
              Withdrawal requests are reviewed within 1–3 business days. Ensure your bank details are correct before submitting.
            </AppText>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <AppText variant="overline" style={styles.sectionLabel}>Withdrawal Amount</AppText>
            <View style={styles.amountInputRow}>
              <AppText variant="h3" color={theme.colors.textSecondary} style={{ marginRight: 8 }}>Rs.</AppText>
              <TextInput
                style={[styles.amountInput, { borderBottomColor: color }]}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            {netBalance > 0 && (
              <Pressable onPress={() => setAmount(Math.floor(netBalance).toString())} style={{ marginTop: 6 }}>
                <AppText variant="caption" color={color}>Use full balance</AppText>
              </Pressable>
            )}
          </View>

          <View style={styles.formCard}>
            <AppText variant="overline" style={styles.sectionLabel}>Bank Account Details</AppText>

            <View style={styles.inputGroup}>
              <AppText variant="caption" color={theme.colors.textSecondary}>Bank Name</AppText>
              <TextInput
                style={styles.input}
                placeholder="e.g. HBL, Meezan, Easypaisa, JazzCash"
                placeholderTextColor="#CBD5E1"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="caption" color={theme.colors.textSecondary}>Account / IBAN Number</AppText>
              <TextInput
                style={styles.input}
                placeholder="03xx-xxxxxxx or IBAN"
                placeholderTextColor="#CBD5E1"
                keyboardType="default"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="caption" color={theme.colors.textSecondary}>Account Holder Name</AppText>
              <TextInput
                style={styles.input}
                placeholder="As registered with the bank"
                placeholderTextColor="#CBD5E1"
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>
          </View>

          <Pressable
            style={[styles.submitBtn, { backgroundColor: color }, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>
                  Submit Withdrawal Request
                </AppText>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  balanceCard: {
    borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  balanceAmt: { fontSize: 32, fontWeight: '900', marginVertical: 8 },
  balanceStats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  notice: {
    flexDirection: 'row', backgroundColor: '#EEF2FF', padding: 12,
    borderRadius: 12, alignItems: 'flex-start',
  },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 12,
  },
  sectionLabel: { marginBottom: 4 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  amountInput: {
    flex: 1, fontSize: 32, fontWeight: '900', color: '#0F172A',
    borderBottomWidth: 2, paddingBottom: 4,
  },
  inputGroup: { gap: 4 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  submitDisabled: { opacity: 0.6 },
});
