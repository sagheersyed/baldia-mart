import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function MpinSetupDirectScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const { phoneNumber } = route.params || {};
  
  const [step, setStep] = useState(1); // 1 = Enter MPIN, 2 = Confirm MPIN
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [confirmMpin, setConfirmMpin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<any>([]);

  const handleMpinChange = (value: string, index: number, isConfirm = false) => {
    const arr = isConfirm ? [...confirmMpin] : [...mpin];
    arr[index] = value;
    if (isConfirm) setConfirmMpin(arr);
    else setMpin(arr);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number, isConfirm = false) => {
    const arr = isConfirm ? confirmMpin : mpin;
    if (e.nativeEvent.key === 'Backspace' && !arr[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleNext = () => {
    if (mpin.join('').length < 4) {
      Alert.alert('Error', 'Please enter a 4-digit MPIN');
      return;
    }
    setStep(2);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  const handleSetup = async () => {
    const code1 = mpin.join('');
    const code2 = confirmMpin.join('');
    
    if (code2.length < 4) {
      Alert.alert('Error', 'Please confirm your 4-digit MPIN');
      return;
    }

    if (code1 !== code2) {
      Alert.alert('Error', 'MPINs do not match. Please try again.');
      setStep(1);
      setMpin(['', '', '', '']);
      setConfirmMpin(['', '', '', '']);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.registerMpin(phoneNumber, code1);
      Alert.alert('Success', 'Account created and MPIN set up successfully!', [
        { text: 'OK', onPress: () => signIn(res.data.access_token, res.data.user) }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to register account';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const currentArr = step === 1 ? mpin : confirmMpin;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (step === 2) setStep(1);
            else navigation.goBack();
          }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{step === 1 ? 'Create MPIN' : 'Confirm MPIN'}</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? `Create a secure 4-digit MPIN for your new account (${phoneNumber}).` : 'Please re-enter your 4-digit MPIN to confirm.'}
        </Text>

        <View style={styles.mpinContainer}>
          {currentArr.map((digit, i) => (
            <TextInput
              key={`${step}-${i}`}
              ref={el => { inputRefs.current[i] = el; }}
              style={styles.mpinInput}
              value={digit}
              onChangeText={val => handleMpinChange(val, i, step === 2)}
              onKeyPress={e => handleKeyPress(e, i, step === 2)}
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
          onPress={step === 1 ? handleNext : handleSetup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{step === 1 ? 'Next' : 'Confirm & Register'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backButton: { padding: 10 },
  backText: { fontSize: 16, color: '#FF4500', fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 20 },
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
});
