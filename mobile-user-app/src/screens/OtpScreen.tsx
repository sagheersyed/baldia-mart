import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  Alert, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

import { AppText, AppButton, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

const OTP_LENGTH = 6;

export default function OtpScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const { phoneNumber } = route.params || {};
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    const sanitized = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = sanitized.slice(-1);
    setOtp(newOtp);
    if (sanitized && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < OTP_LENGTH) {
      Alert.alert('Invalid code', 'Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phoneNumber, otpCode);
      if (res.data.access_token) {
        try {
          const configRes = await authApi.getConfig();
          const userHasMpin = res.data.user?.hasMpin;
          if (configRes.data.auth_customer_mpin_enabled && !userHasMpin) {
            navigation.navigate('MpinSetup', {
              access_token: res.data.access_token,
              user: res.data.user,
            });
            return;
          }
        } catch {
          // ignore config error and just sign in
        }
        await signIn(res.data.access_token, res.data.user);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Verification failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      await authApi.sendOtp(phoneNumber);
      setTimer(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      Alert.alert('Code sent', 'A new OTP has been sent to your phone.');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to resend OTP';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.hero}
          >
            <View style={styles.headerRow}>
              <AppIconButton size={36} bg="rgba(255,255,255,0.2)" onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </AppIconButton>
              <View style={{ flex: 1 }} />
            </View>
            <View style={styles.messageBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
            </View>
            <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.md }}>Verify your number</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.9)" align="center" style={{ marginTop: 4 }}>
              Enter the 6-digit code we sent to {'\n'}<AppText variant="captionStrong" color="#fff">{phoneNumber}</AppText>
            </AppText>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.otpContainer}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={val => handleOtpChange(val, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!loading}
                  textContentType="oneTimeCode"
                />
              ))}
            </View>

            <AppButton
              label={loading ? 'Verifying…' : 'Verify & continue'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleVerify}
              disabled={loading}
              loading={loading}
              style={{ marginTop: theme.spacing.lg }}
              trailingIcon={!loading ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : undefined}
            />

            <View style={styles.resend}>
              {timer > 0 ? (
                <AppText variant="caption">Resend code in <AppText variant="captionStrong" color={theme.colors.primary}>{timer}s</AppText></AppText>
              ) : (
                <Pressable onPress={handleResend} disabled={loading}>
                  <AppText variant="bodyStrong" color={theme.colors.primary}>Resend OTP</AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.footer}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.colors.success} />
              <AppText variant="caption" align="center" style={{ flex: 1 }}>
                For your security, never share this code with anyone.
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
  messageBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: theme.spacing.md,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },

  formCard: {
    backgroundColor: theme.colors.surface,
    marginTop: -theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  otpInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },

  resend: { marginTop: theme.spacing.lg, alignItems: 'center' },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: theme.spacing.lg,
  },
});
