import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import { usersApi, addressesApi } from '../api/api';

export default function CompleteProfileScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleLocateMe = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to auto-fetch your address.');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      // Reverse geocode
      let reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse.length > 0) {
        const addr = reverse[0];
        const formattedAddr = `${addr.name || ''} ${addr.street || ''}, ${addr.district || addr.city || ''}, ${addr.region || ''}${addr.postalCode ? ', ' + addr.postalCode : ''}`.trim().replace(/^ ,/, '');
        setAddress(formattedAddr);
        setCity(addr.city || addr.district || '');
        setPostalCode(addr.postalCode || '');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not fetch location. Please enter it manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleComplete = async () => {
    if (!name.trim() || !email.trim() || !address.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // 1. Update Profile (Name & Email)
      await usersApi.updateMe({ name, email });

      // 2. Save Address
      await addressesApi.create({
        label: 'Home',
        streetAddress: address,
        city: city,
        postalCode: postalCode,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        isDefault: true
      });

      Alert.alert('Success', 'Profile completed successfully!', [
        { text: 'OK', onPress: () => navigation.replace('Main') }
      ]);
    } catch (error: any) {
      console.error('Registration completion error:', error);
      const msg = error.response?.data?.message || 'Failed to complete profile';
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Baldia Mart!</Text>
          <Text style={styles.subtitle}>
            Please provide your details to personalize your delivery experience.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="john@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <View style={styles.addressHeader}>
              <Text style={styles.label}>Delivery Address</Text>
              <TouchableOpacity onPress={handleLocateMe} disabled={locating || loading}>
                {locating ? (
                  <ActivityIndicator size="small" color="#FF4500" />
                ) : (
                  <Text style={styles.locateText}>📍 Auto-Locate</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Street, Area, Apartment number..."
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledBtn]}
              onPress={handleComplete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Start Shopping</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },
  content: { paddingHorizontal: 30, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E1E1E' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10, lineHeight: 24 },
  form: { marginTop: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locateText: {
    fontSize: 14,
    color: '#FF4500',
    fontWeight: 'bold',
  },
  button: {
    height: 55,
    backgroundColor: '#FF4500',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  disabledBtn: { opacity: 0.6 },
});
