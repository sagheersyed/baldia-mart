import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function OtpScreen(props: any) {
  const { route, navigation } = props;
  const { phoneNumber } = route.params;
  const { loginSuccess } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Timer for Resend OTP
  React.useEffect(() => {
    let interval: any;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authApi.sendOtp(phoneNumber);
      Alert.alert('Success', 'A new OTP has been sent to your phone.');
      setCountdown(30); // Reset countdown
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Error', 'Please enter the complete OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phoneNumber, code);
      const token = res.data.access_token;
      
      if (res.data.isNewUser || !res.data.rider.isProfileComplete) {
        // We still need the token in memory to complete the profile
        const { setAuthToken } = await import('../api/api');
        setAuthToken(token);
        navigation.replace('CompleteProfile');
      } else {
        await loginSuccess(token);
      }
    } catch (e: any) {
      Alert.alert('Verification Failed', e.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {phoneNumber}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.resendContainer} 
          onPress={handleResend}
          disabled={countdown > 0}
        >
          <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
            {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E1E' },
  inner: { padding: 30, flex: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 30 },
  inputContainer: { marginBottom: 30 },
  input: { height: 60, backgroundColor: '#2A2A2A', borderRadius: 12, borderWidth: 1, borderColor: '#333', color: '#fff', fontSize: 24, textAlign: 'center', fontWeight: 'bold', letterSpacing: 8 },
  button: { height: 55, backgroundColor: '#FF4500', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#FF4500bb' },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  resendContainer: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#FF4500', fontSize: 16, fontWeight: 'bold' },
  resendTextDisabled: { color: '#666' }
});
