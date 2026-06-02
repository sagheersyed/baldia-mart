import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function MpinLoginScreen(props: any) {
  const { route, navigation } = props;
  const { phoneNumber } = route.params;
  const { loginSuccess } = useAuth();
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const inputRefs = useRef<any>([]);

  React.useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await authApi.getConfig();
      setConfig(res.data);
    } catch (e) {
      console.log('Failed to load config', e);
    }
  };

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '293399332795-tqfg57qr3qsu4l2a3gl97stssbic9k76.apps.googleusercontent.com',
    iosClientId: '293399332795-tqfg57qr3qsu4l2a3gl97stssbic9k76.apps.googleusercontent.com',
    webClientId: '293399332795-tqfg57qr3qsu4l2a3gl97stssbic9k76.apps.googleusercontent.com',
    responseType: 'id_token',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'baldia-mart-rider',
      path: 'google-auth',
    }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleAuthSuccess(id_token);
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
          Alert.alert('Success', 'Identity verified! Please set a new MPIN.', [
            { text: 'OK', onPress: () => navigation.navigate('MpinSetup', { phoneNumber }) }
          ]);
        } else {
          await loginSuccess(res.data.access_token);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMpinChange = (value: string, index: number) => {
    const newMpin = [...mpin];
    newMpin[index] = value;
    setMpin(newMpin);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !mpin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async () => {
    const code = mpin.join('');
    if (code.length < 4) {
      Alert.alert('Error', 'Please enter your 4-digit MPIN');
      return;
    }
    
    setLoading(true);
    try {
      const res = await authApi.loginMpin(phoneNumber, code);
      const token = res.data.access_token;
      
      if (res.data.isNewUser || !res.data.rider?.isProfileComplete) {
        const { setAuthToken } = await import('../api/api');
        setAuthToken(token);
        navigation.replace('CompleteProfile');
      } else {
        await loginSuccess(token);
      }
    } catch (e: any) {
      const status = e.response?.status;
      const msg = e.response?.data?.message || 'Invalid MPIN';
      
      if (status === 403 && msg.toLowerCase().includes('lock')) {
        setIsLocked(true);
        Alert.alert('Account Locked', 'You have exceeded the maximum number of MPIN attempts. Please verify with Google to reset your account.');
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMpin = async () => {
    setLoading(true);
    try {
      const configRes = await authApi.getConfig();
      if (!configRes.data.auth_rider_otp_enabled) {
        Alert.alert('Unavailable', 'OTP login is disabled. Please contact support to reset your rider account.');
        setLoading(false);
        return;
      }
      await authApi.sendOtp(phoneNumber);
      Alert.alert('Success', 'An OTP has been sent to your phone.');
      navigation.navigate('Otp', { phoneNumber });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inner}>
        <Text style={styles.title}>Enter MPIN</Text>
        <Text style={styles.subtitle}>Please enter your 4-digit MPIN to access your dashboard.</Text>

        <View style={styles.mpinContainer}>
          {mpin.map((digit, i) => (
            <TextInput
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              style={styles.mpinInput}
              value={digit}
              onChangeText={val => handleMpinChange(val, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              secureTextEntry
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.forgotContainer} 
          onPress={handleForgotMpin}
          disabled={loading}
        >
          <Text style={styles.forgotText}>Forgot MPIN? Login via OTP</Text>
        </TouchableOpacity>

        {(isLocked || (config?.auth_rider_google_enabled)) && (
          <View style={styles.googleRecoveryContainer}>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>
            <TouchableOpacity 
              style={[styles.button, styles.googleButton, loading && styles.buttonDisabled]} 
              onPress={() => promptAsync()}
              disabled={loading}
            >
              <Text style={styles.googleText}>
                {isLocked ? 'Verify with Google to Reset' : 'Login with Google'}
              </Text>
            </TouchableOpacity>
            {isLocked && (
              <Text style={styles.lockNotice}>
                Your rider account is locked. Verify with Google to reset.
              </Text>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E1E' },
  headerRow: { marginTop: 50, flexDirection: 'row', paddingHorizontal: 20 },
  backButton: { padding: 10 },
  backText: { fontSize: 16, color: '#FF4500', fontWeight: 'bold' },
  inner: { paddingHorizontal: 30, flex: 1, justifyContent: 'center', marginTop: -50 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 30 },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  mpinInput: {
    width: 60,
    height: 70,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FF4500',
    fontSize: 32,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: { height: 55, backgroundColor: '#FF4500', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#FF4500bb' },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  forgotContainer: { marginTop: 20, alignItems: 'center' },
  forgotText: { color: '#FF4500', fontSize: 16, fontWeight: 'bold' },
  googleRecoveryContainer: { marginTop: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  orText: { marginHorizontal: 15, color: '#999', fontSize: 14 },
  googleButton: { backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#333' },
  googleText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  lockNotice: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});
