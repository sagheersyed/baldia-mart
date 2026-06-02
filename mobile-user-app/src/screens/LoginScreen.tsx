import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  Alert, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { AppText, AppButton } from '../components/ui';
import { theme } from '../theme/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const { activeMode } = useCartStore();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>({
    auth_customer_mpin_enabled: true,
    auth_customer_otp_enabled: true,
    auth_customer_google_enabled: true,
  });

  useEffect(() => {
    authApi.getConfig().then(res => setConfig(res.data)).catch(() => {});
  }, []);

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '293399332795-tqfg57qr3qsu4l2a3gl97stssbic9k76.apps.googleusercontent.com',
    iosClientId: '293399332795-tqfg57qr3qsu4l2a3gl97stssbic9k76.apps.googleusercontent.com',
    webClientId: '293399332795-tqfg57qr3qsu4l2a3gl97stssbic9k76.apps.googleusercontent.com',
    responseType: 'id_token',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'baldia-mart-user',
      path: 'google-auth',
    }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthSuccess(response.params.id_token);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (idToken: string) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseToken = await userCredential.user.getIdToken();
      const res = await authApi.login(firebaseToken);
      if (res.data.access_token) {
        await signIn(res.data.access_token, res.data.user);
      }
    } catch {
      Alert.alert('Login failed', 'Unable to complete Google authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** Normalize Pakistani phone number to +92XXXXXXXXXX format */
  const normalizePhone = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, '');
    // 3XXXXXXXXX (10 digits, e.g. user skipped leading 0)
    if (digits.length === 10 && digits.startsWith('3')) return `+92${digits}`;
    // +923XXXXXXXXX → 923XXXXXXXXX (12 digits)
    if (raw.trim().startsWith('+92') && digits.length === 12) return `+${digits}`;
    // 923XXXXXXXXX (12 digits without +)
    if (digits.length === 12 && digits.startsWith('92')) return `+${digits}`;
    // 03XXXXXXXXX (11 digits)
    if (digits.length === 11 && digits.startsWith('0')) return `+92${digits.slice(1)}`;
    return null;
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setPhoneError(null);
  };

  const handleLogin = async () => {
    const normalized = normalizePhone(phone.trim());
    if (!normalized) {
      setPhoneError('Enter a valid Pakistani number: 03XXXXXXXXX or +923XXXXXXXXX');
      return;
    }

    setLoading(true);
    try {
      const statusRes = await authApi.checkStatus(normalized, 'customer');
      const { hasMpin } = statusRes.data;

      if (config.auth_customer_mpin_enabled && hasMpin) {
        navigation.navigate('MpinLogin', { phoneNumber: normalized });
      } else if (config.auth_customer_otp_enabled) {
        await authApi.sendOtp(normalized);
        navigation.navigate('Otp', { phoneNumber: normalized });
      } else if (config.auth_customer_mpin_enabled) {
        navigation.navigate('MpinSetupDirect', { phoneNumber: normalized });
      } else {
        Alert.alert('Unavailable', 'No authentication methods available. Please contact support.');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Unable to process login. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const accent = theme.colors.primary;
  const accentDark = theme.colors.primaryDark;
  const gradientColors: [string, string] = [accent, accentDark];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={gradientColors}
            style={styles.hero}
          >
            <View style={styles.logoBox}>
              <Ionicons name="basket" size={36} color={accent} />
            </View>
            <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.md }}>
              BaldiaMart
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.9)" style={{ marginTop: 4 }}>
              One App, Every Need • Groceries, Food & Pharma
            </AppText>
          </LinearGradient>

          <View style={styles.formCard}>
            <AppText variant="h2">Welcome back</AppText>
            <AppText variant="caption" style={{ marginTop: 4, marginBottom: theme.spacing.lg }}>
              Sign in or create your account in seconds.
            </AppText>

            <AppText variant="captionStrong" style={{ marginBottom: 8 }}>Phone number</AppText>
            <View style={styles.inputRow}>
              <View style={styles.flagBox}>
                <AppText variant="bodyStrong">PK</AppText>
                <AppText variant="caption">+92</AppText>
              </View>
              <TextInput
                style={[styles.input, phoneError ? { color: theme.colors.danger } : null]}
                placeholder="03001234567"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                editable={!loading}
                autoComplete="tel"
                maxLength={14}
              />
            </View>
            {phoneError ? (
              <AppText variant="caption" color={theme.colors.danger} style={{ marginTop: 6, marginLeft: 4 }}>
                {phoneError}
              </AppText>
            ) : null}

            <AppButton
              label={loading ? 'Please wait…' : 'Continue'}
              variant="primary"
              tint={accent}
              size="lg"
              fullWidth
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              style={{ marginTop: theme.spacing.lg }}
              trailingIcon={!loading ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : undefined}
            />

            {config.auth_customer_google_enabled ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <AppText variant="caption">or continue with</AppText>
                  <View style={styles.line} />
                </View>

                <AppButton
                  label="Continue with Google"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => promptAsync()}
                  disabled={loading}
                  leadingIcon={<Ionicons name="logo-google" size={18} color={theme.colors.textPrimary} />}
                  textColor={theme.colors.textPrimary}
                />
              </>
            ) : null}

            <View style={styles.footer}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.success} />
              <AppText variant="caption" align="center" style={{ flex: 1 }}>
                Your number is secure. By continuing you agree to our Terms & Privacy.
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl + 16,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.md,
  },

  formCard: {
    backgroundColor: theme.colors.surface,
    marginTop: -theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  flagBox: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 64,
    borderRightWidth: 1, borderRightColor: theme.colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },

  divider: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginVertical: theme.spacing.lg,
  },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: theme.spacing.lg,
  },
});
