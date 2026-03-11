import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { authApi, setAuthToken } from '../api/api';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // 1. In a real app, you would use Firebase SDK here:
      // const confirmation = await auth().signInWithPhoneNumber(phone);
      // const firebaseToken = await confirmation.confirm(code).getIdToken();
      
      const mockFirebaseToken = `fake-token-for-${phone}`;
      
      // 2. Exchange Firebase token for Backend JWT
      const res = await authApi.login(mockFirebaseToken);
      
      if (res.data.access_token) {
        setAuthToken(res.data.access_token);
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', 'Unable to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Simulate Google Auth
      const mockGoogleToken = "fake-google-token";
      const res = await authApi.login(mockGoogleToken);
      
      if (res.data.access_token) {
        setAuthToken(res.data.access_token);
        navigation.replace('Main');
      }
    } catch (error) {
       Alert.alert('Google Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue with Phone</Text>}
        </TouchableOpacity>

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
      </View>
    </KeyboardAvoidingView>
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
