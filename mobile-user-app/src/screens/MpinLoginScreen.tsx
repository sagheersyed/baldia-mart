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

import { AppText, AppButton, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

WebBrowser.maybeCompleteAuthSession();

const MPIN_LENGTH = 4;

export default function MpinLoginScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
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
            <View style={styles.lockBox}>
              <Ionicons name={isLocked ? 'lock-closed' : 'lock-closed-outline'} size={28} color="#fff" />
            </View>
            <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.md }}>Enter your MPIN</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.9)" align="center" style={{ marginTop: 4 }}>
              Welcome back! {phoneNumber ? `(${phoneNumber})` : ''}
            </AppText>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.mpinContainer}>
              {mpin.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  style={[styles.mpinInput, digit ? styles.mpinInputFilled : null]}
                  value={digit}
                  onChangeText={val => handleMpinChange(val, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  selectTextOnFocus
                  editable={!loading && !isLocked}
                />
              ))}
            </View>

            <AppButton
              label={loading ? 'Verifying…' : 'Login'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleLogin}
              disabled={loading || isLocked}
              loading={loading}
              style={{ marginTop: theme.spacing.md }}
              trailingIcon={!loading ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : undefined}
            />

            {!isLocked ? (
              <Pressable onPress={handleForgotMpin} disabled={loading} style={styles.forgotRow}>
                <AppText variant="bodyStrong" color={theme.colors.primary}>Forgot MPIN? Login via OTP</AppText>
              </Pressable>
            ) : null}

            {showGoogle ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <AppText variant="caption">or</AppText>
                  <View style={styles.line} />
                </View>

                <AppButton
                  label={isLocked ? 'Verify with Google to reset' : 'Login with Google'}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => promptAsync()}
                  disabled={loading}
                  leadingIcon={<Ionicons name="logo-google" size={18} color={theme.colors.textPrimary} />}
                  textColor={theme.colors.textPrimary}
                />

                {isLocked ? (
                  <View style={styles.lockNotice}>
                    <Ionicons name="information-circle-outline" size={14} color={theme.colors.warning} />
                    <AppText variant="caption" color={theme.colors.warning} style={{ flex: 1 }}>
                      Your account is locked. Verifying with Google will allow you to set a new MPIN.
                    </AppText>
                  </View>
                ) : null}
              </>
            ) : null}
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
  lockBox: {
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

  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  mpinInput: {
    width: 56,
    height: 64,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  mpinInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },

  forgotRow: { marginTop: theme.spacing.md, alignItems: 'center' },

  divider: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginVertical: theme.spacing.lg,
  },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },

  lockNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
});
