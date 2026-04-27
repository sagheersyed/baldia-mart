import React, { useState } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  Alert, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { usersApi, addressesApi, authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { AppText, AppButton } from '../components/ui';
import { theme } from '../theme/theme';

export default function CompleteProfileScreen() {
  const { updateUserData } = useAuth();
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow location access to auto-fetch your address.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (reverse.length > 0) {
        const addr = reverse[0];
        const formatted = `${addr.name || ''} ${addr.street || ''}, ${addr.district || addr.city || ''}, ${addr.region || ''}${addr.postalCode ? ', ' + addr.postalCode : ''}`.trim().replace(/^ ,/, '');
        setAddress(formatted);
        setCity(addr.city || addr.district || '');
        setPostalCode(addr.postalCode || '');
      }
    } catch {
      Alert.alert('Error', 'Could not fetch location. Please enter it manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleComplete = async () => {
    if (!name.trim() || !email.trim() || !address.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await usersApi.updateMe({ name, email });
      await addressesApi.create({
        label: 'Home',
        streetAddress: address,
        city,
        postalCode,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        isDefault: true,
      });
      const res = await authApi.getMe();
      updateUserData(res.data);
      Alert.alert('All set!', 'Profile completed successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to complete profile';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: theme.spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.hero}
          >
            <View style={styles.iconBox}>
              <Ionicons name="happy-outline" size={32} color="#fff" />
            </View>
            <AppText variant="h1" color="#fff" style={{ marginTop: theme.spacing.md }}>
              Welcome to BaldiaMart!
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.9)" align="center" style={{ marginTop: 4 }}>
              Tell us a bit about yourself to personalize your delivery experience.
            </AppText>
          </LinearGradient>

          <View style={styles.formCard}>
            <AppText variant="captionStrong">Full name</AppText>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <AppText variant="captionStrong" style={{ marginTop: theme.spacing.md }}>Email address</AppText>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.addrHeader}>
              <AppText variant="captionStrong">Delivery address</AppText>
              <Pressable onPress={handleLocateMe} disabled={locating || loading} style={styles.locateBtn}>
                {locating ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={14} color={theme.colors.primary} />
                    <AppText variant="captionStrong" color={theme.colors.primary}>Auto-locate</AppText>
                  </>
                )}
              </Pressable>
            </View>
            <View style={[styles.inputBox, styles.textAreaBox]}>
              <Ionicons name="location-outline" size={18} color={theme.colors.textSecondary} style={{ marginTop: 4 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Street, area, apartment number…"
                placeholderTextColor={theme.colors.textMuted}
                value={address}
                onChangeText={setAddress}
                multiline
                editable={!loading}
              />
            </View>

            <AppButton
              label={loading ? 'Setting up…' : 'Start shopping'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleComplete}
              disabled={loading}
              loading={loading}
              style={{ marginTop: theme.spacing.lg }}
              trailingIcon={!loading ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : undefined}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },

  hero: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl + 16,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },

  formCard: {
    backgroundColor: theme.colors.surface,
    marginTop: -theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingVertical: 14,
  },
  textAreaBox: { alignItems: 'flex-start', paddingTop: 6, paddingBottom: 6 },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },

  addrHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  locateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
  },
});
