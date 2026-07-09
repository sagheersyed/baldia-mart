import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { walletsApi, financeApi } from '../api/api';

const formatPKR = (val: any): string => {
  const num = Number(val);
  if (isNaN(num) || val === null || val === undefined) {
    return '0.00';
  }
  return num.toLocaleString('en-PK', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
};

export default function WithdrawalScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const ACCENT = '#FF4500';

  const loadSummary = useCallback(async () => {
    try {
      const res = await financeApi.getRiderSummary();
      setSummary(res.data);
    } catch (e) {
      console.warn('[Withdrawal] Failed to load rider summary', e);
    } finally {
      setLoading(false);
    }
  }, []);

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
              });
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
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Withdrawal</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Balance Card */}
          <LinearGradient
            colors={[ACCENT, '#E63E00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmt}>
              Rs. {formatPKR(netBalance)}
            </Text>
            <View style={styles.balanceStats}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Total Earnings</Text>
                <Text style={styles.statVal}>Rs. {formatPKR(summary?.totalEarnings)}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.statLabel}>Commission Paid</Text>
                <Text style={styles.statVal}>Rs. {formatPKR(summary?.totalCommissions)}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color="#FF4500" />
            <Text style={styles.noticeText}>
              Withdrawal requests are reviewed within 1–3 business days. Ensure your bank details are correct before submitting.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Withdrawal Amount</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>Rs.</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            {netBalance > 0 && (
              <TouchableOpacity onPress={() => setAmount(Math.floor(netBalance).toString())} style={{ marginTop: 6 }}>
                <Text style={[styles.useFullText, { color: ACCENT }]}>Use full balance</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Bank Account Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HBL, Meezan, Easypaisa, JazzCash"
                placeholderTextColor="#CBD5E1"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account / IBAN Number</Text>
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
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="As registered with the bank"
                placeholderTextColor="#CBD5E1"
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: ACCENT }, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>
                  Submit Withdrawal Request
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#1E1E1E', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  balanceCard: {
    borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  balanceAmt: { fontSize: 32, fontWeight: '900', color: '#fff', marginVertical: 8 },
  balanceStats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  statVal: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },
  notice: {
    flexDirection: 'row', backgroundColor: '#FFF5F0', padding: 12,
    borderRadius: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#FFEBE0',
  },
  noticeText: { flex: 1, marginLeft: 8, fontSize: 12, color: '#FF4500' },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 12,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#64748B', marginBottom: 4 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  currencyPrefix: { fontSize: 24, fontWeight: '900', color: '#64748B', marginRight: 8 },
  amountInput: {
    flex: 1, fontSize: 32, fontWeight: '900', color: '#0F172A',
    borderBottomWidth: 2, borderBottomColor: '#FF4500', paddingBottom: 4,
  },
  useFullText: { fontSize: 12, fontWeight: '700' },
  inputGroup: { gap: 4, marginBottom: 12 },
  inputLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    paddingVertical: 16, borderRadius: 14, marginTop: 8,
    shadowColor: '#FF4500', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  submitBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 8 },
  submitDisabled: { opacity: 0.6 },
});
