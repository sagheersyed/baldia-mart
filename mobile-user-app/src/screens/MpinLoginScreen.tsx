import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function MpinLoginScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const { phoneNumber } = route.params || {};
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
      console.log('Failed to fetch config', e);
    }
  };

  const [request, response, promptAsync] = Google.useAuthRequest({
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
        // Successful Google login resets mpinAttempts in backend.
        // We navigate to MpinSetup if it was a lock-reset flow, or just login.
        if (isLocked) {
          Alert.alert('Success', 'Identity verified! Please set a new MPIN.', [
            { text: 'OK', onPress: () => navigation.navigate('MpinSetup', { phoneNumber }) }
          ]);
        } else {
          await signIn(res.data.access_token, res.data.user);
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
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !mpin[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleLogin = async () => {
    const mpinCode = mpin.join('');
    if (mpinCode.length < 4) {
      Alert.alert('Error', 'Please enter your 4-digit MPIN');
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
        Alert.alert('Account Locked', 'You have exceeded the maximum number of MPIN attempts. Please use Google Login to verify your identity and reset your MPIN.');
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
      if (!configRes.data.auth_customer_otp_enabled) {
        Alert.alert('Unavailable', 'OTP login is disabled. Please contact support to reset your account.');
        setLoading(false);
        return;
      }
      await authApi.sendOtp(phoneNumber);
      navigation.navigate('Otp', { phoneNumber });
    } catch (error) {
      Alert.alert('Error', 'Could not send OTP. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Enter MPIN</Text>
        <Text style={styles.subtitle}>
          Welcome back! Please enter your 4-digit MPIN to login safely.
        </Text>

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
          style={[styles.button, loading && styles.disabledBtn]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.forgotContainer}>
          <TouchableOpacity onPress={handleForgotMpin} disabled={loading}>
            <Text style={styles.forgotText}>Forgot MPIN? Login via OTP</Text>
          </TouchableOpacity>
        </View>

        {(isLocked || (config?.auth_customer_google_enabled)) && (
          <View style={styles.googleRecoveryContainer}>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>
            <TouchableOpacity 
              style={[styles.button, styles.googleButton, loading && styles.disabledBtn]} 
              onPress={() => promptAsync()}
              disabled={loading}
            >
              <Text style={styles.googleText}>
                {isLocked ? 'Verify with Google to Reset' : 'Login with Google'}
              </Text>
            </TouchableOpacity>
            {isLocked && (
              <Text style={styles.lockNotice}>
                Your account is locked. verifying with Google will allow you to set a new MPIN.
              </Text>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backButton: { marginTop: 50, marginLeft: 20, padding: 10 },
  backText: { fontSize: 16, color: '#FF4500', fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E1E1E' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10, lineHeight: 24 },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginVertical: 40,
  },
  mpinInput: {
    width: 60,
    height: 70,
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF4500',
    backgroundColor: '#fff',
  },
  button: {
    height: 55,
    backgroundColor: '#FF4500',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  disabledBtn: { opacity: 0.6 },
  forgotContainer: { marginTop: 25, alignItems: 'center' },
  forgotText: { color: '#FF4500', fontWeight: 'bold', fontSize: 16 },
  googleRecoveryContainer: { marginTop: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#eee' },
  orText: { marginHorizontal: 15, color: '#999', fontSize: 14 },
  googleButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  googleText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  lockNotice: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});
