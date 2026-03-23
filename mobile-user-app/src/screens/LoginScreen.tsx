import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>({
    auth_customer_mpin_enabled: true,
    auth_customer_otp_enabled: true,
    auth_customer_google_enabled: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await authApi.getConfig();
      setConfig(res.data);
    } catch (e) {
      console.log('Failed to fetch auth config', e);
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
      path: 'google-auth', // Optional: added for clarity
    }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleAuthSuccess(id_token);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (idToken: string) => {
    setLoading(true);
    try {
      // 1. Authenticate with Firebase using Google Token
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseToken = await userCredential.user.getIdToken();

      // 2. Send Firebase Token to Backend
      const res = await authApi.login(firebaseToken);
      
      if (res.data.access_token) {
        await signIn(res.data.access_token, res.data.user);
        // Navigation will happen automatically in App.tsx based on userToken & userData
      }
    } catch (error: any) {
       console.error('Firebase/Backend Google login failed:', error);
       Alert.alert('Login Failed', 'Unable to complete Google authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number (e.g., +923001234567)');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Check status to see if user has MPIN
      const statusRes = await authApi.checkStatus(phone, 'customer');
      const { exists, hasMpin } = statusRes.data;

      // Step 2: Routing Logic
      if (config.auth_customer_mpin_enabled && hasMpin) {
        // Route to MPIN Login
        navigation.navigate('MpinLogin', { phoneNumber: phone });
      } else if (config.auth_customer_otp_enabled) {
        // Route to OTP fallback / new user registration
        await authApi.sendOtp(phone);
        navigation.navigate('Otp', { phoneNumber: phone });
      } else if (config.auth_customer_mpin_enabled) {
        // Fallback: OTP disabled, but MPIN enabled, and user has no MPIN. 
        // Route directly to setup!
        navigation.navigate('MpinSetupDirect', { phoneNumber: phone });
      } else {
        Alert.alert('Error', 'No authentication methods available. Please contact admin.');
      }
    } catch (error: any) {
      console.error('Login request failed:', error);
      const msg = error.response?.data?.message || 'Unable to process login. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    promptAsync();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>B</Text>
        </View>
        <Text style={styles.title}>Baldia Mart</Text>
        <Text style={styles.subtitle}>Hyperlocal Grocery Delivery</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+92 300 1234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledBtn]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>

        {config.auth_customer_google_enabled && (
          <>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.googleButton, loading && styles.disabledBtn]} 
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoBox: { width: 80, height: 80, backgroundColor: '#FF4500', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logoText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E1E1E' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  formContainer: { paddingHorizontal: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, marginBottom: 20 },
  button: { height: 50, backgroundColor: '#FF4500', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#eee' },
  orText: { marginHorizontal: 15, color: '#999', fontSize: 14 },
  googleButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  googleText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  disabledBtn: { opacity: 0.6 }
});
