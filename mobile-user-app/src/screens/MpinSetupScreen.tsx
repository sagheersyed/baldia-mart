import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  Alert, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authApi, setAuthToken } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import { AppText, AppButton, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

const MPIN_LENGTH = 4;

export default function MpinSetupScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const { activeMode } = useCartStore();
  const { access_token, user } = route.params || {};

  const [step, setStep] = useState(1);
  const [mpin, setMpin] = useState<string[]>(Array(MPIN_LENGTH).fill(''));
  const [confirmMpin, setConfirmMpin] = useState<string[]>(Array(MPIN_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleMpinChange = (value: string, index: number, isConfirm = false) => {
    const sanitized = value.replace(/\D/g, '');
    const arr = isConfirm ? [...confirmMpin] : [...mpin];
    arr[index] = sanitized.slice(-1);
    if (isConfirm) setConfirmMpin(arr);
    else setMpin(arr);
    if (sanitized && index < MPIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number, isConfirm = false) => {
    const arr = isConfirm ? confirmMpin : mpin;
    if (e.nativeEvent.key === 'Backspace' && !arr[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleNext = () => {
    if (mpin.join('').length < MPIN_LENGTH) {
      Alert.alert('Invalid MPIN', 'Please enter a 4-digit MPIN.');
      return;
    }
    setStep(2);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleSetup = async () => {
    const code1 = mpin.join('');
    const code2 = confirmMpin.join('');
    if (code2.length < MPIN_LENGTH) {
      Alert.alert('Invalid MPIN', 'Please confirm your 4-digit MPIN.');
      return;
    }
    if (code1 !== code2) {
      Alert.alert('Mismatch', 'MPINs do not match. Please try again.');
      setStep(1);
      setMpin(Array(MPIN_LENGTH).fill(''));
      setConfirmMpin(Array(MPIN_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }
    setLoading(true);
    try {
      setAuthToken(access_token);
      await authApi.setupMpin(code1);
      Alert.alert('Success', 'MPIN set up successfully!', [
        { text: 'OK', onPress: () => signIn(access_token, user) },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to set up MPIN';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await signIn(access_token, user);
  };

  const currentArr = step === 1 ? mpin : confirmMpin;
  const accent = theme.colors.primary;
  const accentDark = theme.colors.primaryDark;
  const accentLight = theme.colors.primaryLight;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[accent, accentDark]}
            style={styles.hero}
          >
            <View style={styles.headerRow}>
              <AppIconButton size={36} bg="rgba(255,255,255,0.2)" onPress={() => {
                if (step === 2) setStep(1);
                else navigation.goBack();
              }}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </AppIconButton>
              <View style={{ flex: 1 }} />
              <Pressable onPress={handleSkip} hitSlop={10}>
                <AppText variant="bodyStrong" color="rgba(255,255,255,0.9)">Skip</AppText>
              </Pressable>
            </View>

            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark-outline" size={28} color="#fff" />
            </View>
            <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.md }}>
              {step === 1 ? 'Create MPIN' : 'Confirm MPIN'}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.9)" align="center" style={{ marginTop: 4 }}>
              {step === 1
                ? 'Set a 4-digit MPIN for faster, secure logins.'
                : 'Re-enter your 4-digit MPIN to confirm.'}
            </AppText>

            <View style={styles.steps}>
              <View style={[styles.stepDot, step >= 1 ? styles.stepDotActive : null]} />
              <View style={[styles.stepDot, step >= 2 ? styles.stepDotActive : null]} />
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.mpinContainer}>
              {currentArr.map((digit, i) => (
                <TextInput
                  key={`${step}-${i}`}
                  ref={el => { inputRefs.current[i] = el; }}
                  style={[
                    styles.mpinInput, 
                    digit ? { borderColor: accent, backgroundColor: accentLight } : null,
                    { color: accent }
                  ]}
                  value={digit}
                  onChangeText={val => handleMpinChange(val, i, step === 2)}
                  onKeyPress={e => handleKeyPress(e, i, step === 2)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  selectTextOnFocus
                  editable={!loading}
                />
              ))}
            </View>

            <AppButton
              label={
                loading ? (step === 1 ? 'Please wait…' : 'Saving…')
                  : (step === 1 ? 'Next' : 'Confirm & login')
              }
              variant="primary"
              tint={accent}
              size="lg"
              fullWidth
              onPress={step === 1 ? handleNext : handleSetup}
              disabled={loading}
              loading={loading}
              style={{ marginTop: theme.spacing.lg }}
              trailingIcon={!loading ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : undefined}
            />

            <View style={styles.footer}>
              <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
              <AppText variant="caption" align="center" style={{ flex: 1 }}>
                Pick a code you won't forget. You'll use it for quick sign-ins.
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },

  hero: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 16,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: theme.spacing.md,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  steps: {
    flexDirection: 'row', gap: 8, marginTop: theme.spacing.md,
  },
  stepDot: {
    width: 24, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: { backgroundColor: '#fff' },

  formCard: {
    backgroundColor: theme.colors.surface,
    marginTop: -theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 24,
    ...theme.shadows.md,
  },

  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: theme.spacing.md,
  },
  mpinInput: {
    width: 52,
    height: 64,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  mpinInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: theme.spacing.lg,
  },
});
