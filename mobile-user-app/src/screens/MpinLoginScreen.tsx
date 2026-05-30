import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  Alert, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';

import { AppText, AppButton, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

WebBrowser.maybeCompleteAuthSession();

const MPIN_LENGTH = 4;

export default function MpinLoginScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const { activeMode } = useCartStore();
  const { phoneNumber } = route.params || {};
  const [mpin, setMpin] = useState<string[]>(Array(MPIN_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  React.useEffect(() => {
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

  React.useEffect(() => {
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
        if (isLocked) {
          Alert.alert('Verified', 'Identity verified! Please set a new MPIN.', [
            { text: 'OK', onPress: () => navigation.navigate('MpinSetup', { phoneNumber }) },
          ]);
        } else {
          await signIn(res.data.access_token, res.data.user);
        }
      }
    } catch {
      Alert.alert('Error', 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMpinChange = (value: string, index: number) => {
    const sanitized = value.replace(/\D/g, '');
    const arr = [...mpin];
    arr[index] = sanitized.slice(-1);
    setMpin(arr);
    if (sanitized && index < MPIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !mpin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async () => {
    const mpinCode = mpin.join('');
    if (mpinCode.length < MPIN_LENGTH) {
      Alert.alert('Invalid MPIN', 'Please enter your 4-digit MPIN.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.loginMpin(phoneNumber, mpinCode);
      if (res.data.access_token) {
        await signIn(res.data.access_token, res.data.user);
      }
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || 'Invalid MPIN';
      if (status === 403 && msg.toLowerCase().includes('lock')) {
        setIsLocked(true);
        Alert.alert('Account locked', 'Too many failed MPIN attempts. Please verify with Google to reset your MPIN.');
      } else {
        Alert.alert('Login failed', msg);
      }
      setMpin(Array(MPIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMpin = async () => {
    setLoading(true);
    try {
      const configRes = await authApi.getConfig();
      if (!configRes.data.auth_customer_otp_enabled) {
        Alert.alert('Unavailable', 'OTP login is disabled. Please contact support to reset your account.');
        setLoading(false);
        return;
      }
      await authApi.sendOtp(phoneNumber);
      navigation.navigate('Otp', { phoneNumber });
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const showGoogle = isLocked || config?.auth_customer_google_enabled;
  
  // Revert to primary brand colors for consistency
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
            colors={[accent, accentDark]} // Using brand colors instead of slate
            style={styles.hero}
          >
            <View style={styles.headerRow}>
              <AppIconButton size={36} bg="rgba(255,255,255,0.1)" onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </AppIconButton>
              <View style={{ flex: 1 }} />
              <View style={styles.securityBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                <AppText variant="badge" color="#10B981" style={{ fontSize: 9 }}>SECURE</AppText>
              </View>
            </View>
            
            <View style={styles.lockBox}>
              <View style={styles.lockInner}>
                 <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={32} color="#fff" />
              </View>
            </View>
            
            <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.lg }}>Account Security</AppText>
            <AppText variant="body" color="rgba(255,255,255,0.6)" align="center" style={{ marginTop: 4, paddingHorizontal: 40 }}>
              Enter your 4-digit PIN to access your {activeMode ? activeMode.toUpperCase() : 'BaldiaMart'} account
            </AppText>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.mpinContainer}>
              {mpin.map((digit, i) => (
                <View key={i} style={styles.mpinWrapper}>
                  {/* Hidden TextInput captures input — never shows actual value */}
                  <TextInput
                    ref={el => { inputRefs.current[i] = el; }}
                    style={[styles.mpinInput, digit ? { borderColor: accent } : null]}
                    value={digit ? '●' : ''}
                    onChangeText={val => handleMpinChange(val, i)}
                    onKeyPress={e => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry={false}
                    selectTextOnFocus
                    editable={!loading && !isLocked}
                    placeholder="○"
                    placeholderTextColor="#CBD5E1"
                    caretHidden
                  />
                </View>
              ))}
            </View>

            <AppButton
              label={loading ? 'Verifying...' : 'Unlock Account'}
              variant="primary"
              tint={accent}
              size="lg"
              fullWidth
              onPress={handleLogin}
              disabled={loading || isLocked}
              loading={loading}
              style={styles.loginBtn}
            />

            {!isLocked ? (
              <Pressable onPress={handleForgotMpin} disabled={loading} style={styles.forgotRow}>
                <AppText variant="bodyStrong" color={accent}>Forgot PIN? <AppText variant="body" color={theme.colors.textSecondary}>Reset via OTP</AppText></AppText>
              </Pressable>
            ) : null}

            {showGoogle ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <AppText variant="caption" color="#94A3B8">SECURE SIGN-IN</AppText>
                  <View style={styles.line} />
                </View>

                <AppButton
                  label={isLocked ? 'Verify Identity with Google' : 'Sign in with Google'}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => promptAsync()}
                  disabled={loading}
                  leadingIcon={<Ionicons name="logo-google" size={18} color="#1E293B" />}
                  textColor="#1E293B"
                  style={styles.googleBtn}
                />

                {isLocked && (
                  <View style={styles.lockNotice}>
                    <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" color={theme.colors.danger}>Account Temporarily Locked</AppText>
                      <AppText variant="caption" color={theme.colors.danger}>Too many failed attempts. Please verify with Google to continue.</AppText>
                    </View>
                  </View>
                )}
              </>
            ) : null}
          </View>
          
          <View style={styles.footer}>
             <Ionicons name="finger-print-outline" size={24} color="#CBD5E1" />
             <AppText variant="caption" color="#94A3B8">Biometric login coming soon</AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  hero: {
    paddingTop: theme.spacing.lg,
    paddingBottom: 60,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  securityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  lockBox: {
    width: 80, height: 80, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: theme.spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  lockInner: {
    width: 60, height: 60, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  formCard: {
    backgroundColor: theme.colors.surface,
    marginTop: -40,
    marginHorizontal: 24,
    borderRadius: 32,
    padding: 32,
    ...theme.shadows.lg,
  },

  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  mpinWrapper: { alignItems: 'center' },
  mpinInput: {
    width: 60,
    height: 72,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },

  loginBtn: { 
    borderRadius: 20, height: 58,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5
  },
  googleBtn: { borderRadius: 20, height: 58, borderColor: '#E2E8F0' },

  forgotRow: { marginTop: 24, alignItems: 'center' },

  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginVertical: 32,
  },
  line: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },

  lockNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  footer: {
    alignItems: 'center', gap: 8,
    marginTop: 'auto', paddingVertical: 32,
  }
});
