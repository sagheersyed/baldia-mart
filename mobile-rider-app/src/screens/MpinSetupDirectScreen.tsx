import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function MpinSetupDirectScreen({ navigation, route }: any) {
  const { loginSuccess } = useAuth();
  const { phoneNumber } = route.params || {};
  
  const [step, setStep] = useState(1);
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

  const proceedFlow = async (token: string, isNewUser: boolean, isProfileComplete: boolean) => {
    if (isNewUser || !isProfileComplete) {
      const { setAuthToken } = await import('../api/api');
      setAuthToken(token);
      navigation.replace('CompleteProfile');
    } else {
      await loginSuccess(token);
    }
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
      const token = res.data.access_token;
      const isNewUser = res.data.isNewUser;
      const isProfileComplete = res.data.rider?.isProfileComplete;

      Alert.alert('Success', 'Account created and MPIN set up successfully!', [
        { text: 'OK', onPress: () => proceedFlow(token, isNewUser, !!isProfileComplete) }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to register account');
    } finally {
      setLoading(false);
    }
  };

  const currentArr = step === 1 ? mpin : confirmMpin;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (step === 2) setStep(1);
          else navigation.goBack();
        }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inner}>
        <Text style={styles.title}>{step === 1 ? 'Create MPIN' : 'Confirm MPIN'}</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? `Create a secure 4-digit MPIN for your new rider account (${phoneNumber}).` : 'Please re-enter to confirm your 4-digit MPIN.'}
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
          style={[styles.button, loading && styles.buttonDisabled]} 
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
  container: { flex: 1, backgroundColor: '#1E1E1E' },
  headerRow: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
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
});
