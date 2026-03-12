import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Keyboard
} from 'react-native';
import { authApi, setAuthToken } from '../api/api';

export default function OtpScreen({ navigation, route }: any) {
  const { phoneNumber } = route.params || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<any>([]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phoneNumber, otpCode);
      if (res.data.access_token) {
        setAuthToken(res.data.access_token);
        navigation.replace('Main');
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
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
      Alert.alert('Success', 'A new OTP has been sent.');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to resend OTP';
      Alert.alert('Error', msg);
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
        <Text style={styles.title}>Confirm OTP</Text>
        <Text style={styles.subtitle}>
          Enter the code sent to {phoneNumber}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              style={styles.otpInput}
              value={digit}
              onChangeText={val => handleOtpChange(val, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledBtn]} 
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Proceed</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.timerText}>Resend code in {timer}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 40,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
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
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  disabledBtn: { opacity: 0.6 },
  resendContainer: { marginTop: 30, alignItems: 'center' },
  timerText: { color: '#999', fontSize: 14 },
  resendText: { color: '#FF4500', fontWeight: 'bold', fontSize: 14 },
});
