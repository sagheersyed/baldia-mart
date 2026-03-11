import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');

  const handleLogin = () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    // Mock login success
    navigation.replace('Main');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>KR</Text>
        </View>
        <Text style={styles.title}>Baldia Mart Rider</Text>
        <Text style={styles.subtitle}>Partner Application</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Rider Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+92 300 1234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E1E', justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logoBox: { width: 80, height: 80, backgroundColor: '#FF4500', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#aaa', marginTop: 5 },
  formContainer: { paddingHorizontal: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#ccc', marginBottom: 8 },
  input: { height: 50, borderWidth: 1, borderColor: '#333', backgroundColor: '#2A2A2A', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, color: '#fff', marginBottom: 20 },
  button: { height: 50, backgroundColor: '#FF4500', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
