import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  Alert, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { cmsApi } from '../../api/api';
import { useCmsStore } from '../../store/cmsStore';
import { AppText, AppButton, AppIconButton } from '../../components/ui';
import { theme } from '../../theme/theme';

const PIN_LENGTH = 4;

export default function CmsAuthGateScreen({ navigation }: any) {
  const { activeTenantId, activeTenant, setCmsAuthenticated } = useCmsStore();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [mode, setMode] = useState<'verify' | 'setup' | 'confirm'>('verify');
  
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [savedSetupPin, setSavedSetupPin] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!activeTenantId) {
      navigation.goBack();
      return;
    }
    checkPinStatus();
  }, [activeTenantId]);

  const checkPinStatus = async () => {
    try {
      setCheckingStatus(true);
      const res = await cmsApi.getPinStatus(activeTenantId!);
      setHasPin(res.data.hasPin);
      setMode(res.data.hasPin ? 'verify' : 'setup');
    } catch (e: any) {
      console.error('[CmsAuthGate] Failed to get PIN status:', e);
      Alert.alert('Connection Error', 'Could not check security status. Please try again.');
      navigation.goBack();
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePinChange = (value: string, index: number) => {
    const sanitized = value.replace(/\D/g, '');
    const currentPinArray = mode === 'confirm' ? confirmPin : pin;
  
  
    const arr = [...currentPinArray];
    arr[index] = sanitized.slice(-1);
    
    if (mode === 'confirm') {
      setConfirmPin(arr);
    } else {
      setPin(arr);
    }

    if (sanitized && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const currentPin = mode === 'confirm' ? confirmPin : pin;
      if (!currentPin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const clearInputs = () => {
    setPin(Array(PIN_LENGTH).fill(''));
    setConfirmPin(Array(PIN_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  const handleSubmit = async () => {
    if (!activeTenantId) return;

    if (mode === 'setup') {
      const pinCode = pin.join('');
      if (pinCode.length < PIN_LENGTH) {
        Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
        return;
      }
      setSavedSetupPin(pinCode);
      setMode('confirm');
      setConfirmPin(Array(PIN_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }

    if (mode === 'confirm') {
      const confirmCode = confirmPin.join('');
      if (confirmCode.length < PIN_LENGTH) {
        Alert.alert('Invalid PIN', 'Please enter confirmation PIN.');
        return;
      }
      if (confirmCode !== savedSetupPin) {
        Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
        setMode('setup');
        setSavedSetupPin('');
        clearInputs();
        return;
      }

      setLoading(true);
      try {
        await cmsApi.setupPin(activeTenantId, confirmCode);
        setCmsAuthenticated(activeTenantId);
        Alert.alert('Success', 'CMS Security PIN has been set successfully!', [
          { text: 'Enter CMS', onPress: () => navigation.replace('MerchantDashboard') }
        ]);
      } catch (err: any) {
        Alert.alert('Setup Failed', err.response?.data?.message || 'Could not set PIN.');
        setMode('setup');
        setSavedSetupPin('');
        clearInputs();
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'verify') {
      const pinCode = pin.join('');
      if (pinCode.length < PIN_LENGTH) {
        Alert.alert('Invalid PIN', 'Please enter your 4-digit PIN.');
        return;
      }

      setLoading(true);
      try {
        await cmsApi.verifyPin(activeTenantId, pinCode);
        setCmsAuthenticated(activeTenantId);
        navigation.replace('MerchantDashboard');
      } catch (err: any) {
        Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid CMS security PIN.');
        clearInputs();
      } finally {
        setLoading(false);
      }
    }
  };

  const currentPinArray = mode === 'confirm' ? confirmPin : pin;

  // Unified vertical check - MUST BE BEFORE EARLY RETURNS
  const vType = (activeTenant?.type || 'mart').toLowerCase();
  const { color: accentColor, dark: accentDark } = React.useMemo(() => {
    if (vType.includes('pharma') || vType.includes('pharmacy')) {
      return { color: theme.colors.pharma, dark: theme.colors.pharmaDark };
    }
    if (vType.includes('food') || vType.includes('restaurant')) {
      return { color: theme.colors.food, dark: theme.colors.foodDark };
    }
    return { color: theme.colors.mart, dark: theme.colors.martDark };
  }, [vType]);

  if (checkingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <AppText style={{ marginTop: 12 }} color={theme.colors.textSecondary}>Loading CMS Security...</AppText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={[accentColor, accentDark]}
            style={styles.hero}
          >
            <View style={styles.headerRow}>
              <AppIconButton size={36} bg="rgba(255,255,255,0.1)" onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </AppIconButton>
              <AppText variant="h3" color="#fff" style={{ fontWeight: '600' }}>Store CMS Gate</AppText>
              <View style={styles.securityBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                <AppText variant="badge" color="#10B981" style={{ fontSize: 9 }}>SECURE</AppText>
              </View>
            </View>

            <View style={styles.lockBox}>
              <View style={styles.lockInner}>
                <Ionicons name={mode === 'verify' ? 'lock-closed' : 'key-outline'} size={32} color="#fff" />
              </View>
            </View>

            <AppText variant="h2" color="#fff" style={{ marginTop: theme.spacing.lg }}>
              {mode === 'setup' && 'Create CMS PIN'}
              {mode === 'confirm' && 'Confirm CMS PIN'}
              {mode === 'verify' && 'Verify CMS PIN'}
            </AppText>
            <AppText variant="body" color="rgba(255,255,255,0.6)" align="center" style={{ marginTop: 4, paddingHorizontal: 40 }}>
              {mode === 'setup' && 'Set a new CMS-only PIN to protect store management features.'}
              {mode === 'confirm' && 'Re-enter your new CMS security PIN to confirm.'}
              {mode === 'verify' && `Enter the CMS-only PIN for ${activeTenant?.name || 'your store'}`}
            </AppText>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.mpinContainer}>
              {currentPinArray.map((digit, i) => (
                <View key={i} style={styles.mpinWrapper}>
                  <TextInput
                    ref={el => { inputRefs.current[i] = el; }}
                    style={[styles.mpinInput, digit ? { borderColor: accentColor } : null]}
                    value={digit ? '●' : ''}
                    onChangeText={val => handlePinChange(val, i)}
                    onKeyPress={e => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry={false}
                    selectTextOnFocus
                    editable={!loading}
                    placeholder="○"
                    placeholderTextColor="#CBD5E1"
                    caretHidden
                  />
                </View>
              ))}
            </View>

            <AppButton
              label={
                loading ? 'Processing...' :
                mode === 'setup' ? 'Next' :
                mode === 'confirm' ? 'Set PIN & Enter' : 'Verify & Open CMS'
              }
              variant="primary"
              tint={accentColor}
              size="lg"
              fullWidth
              onPress={handleSubmit}
              disabled={loading || currentPinArray.join('').length < PIN_LENGTH}
              loading={loading}
              style={styles.loginBtn}
            />

            {mode === 'verify' && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Reset CMS PIN?',
                    'Please contact your system administrator or support team to reset your CMS PIN.',
                    [{ text: 'OK' }]
                  );
                }}
                style={styles.resetLink}
              >
                <AppText variant="bodyStrong" color={accentColor}>Forgot CMS PIN? <AppText variant="body" color={theme.colors.textSecondary}>Reset support</AppText></AppText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  hero: {
    paddingTop: theme.spacing.md,
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
    marginTop: theme.spacing.lg,
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
    paddingHorizontal: 20,
    paddingVertical: 32,
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
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  loginBtn: {
    borderRadius: 20,
    height: 58,
  },
  resetLink: {
    marginTop: 24,
    alignItems: 'center',
  },
});
