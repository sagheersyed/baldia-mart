import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Alert, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { authApi, usersApi } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import {
  AppText, AppButton, AppIconButton, AppBadge,
} from '../components/ui';
import { theme } from '../theme/theme';

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EditProfileScreen({ navigation }: any) {
  const { activeMode } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phoneNumber: '', email: '', age: '', gender: '' });
  const [originalUser, setOriginalUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.getMe();
        const u = res.data;
        setOriginalUser(u);
        setForm({ 
          name: u.name || '', 
          phoneNumber: u.phoneNumber || '', 
          email: u.email || '',
          age: u.age?.toString() || '',
          gender: u.gender || ''
        });
      } catch {
        Alert.alert('Error', 'Failed to load profile.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const { updateUserData } = useAuthStore();

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const updateDto = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender,
      };
      await usersApi.updateMe(updateDto);
      
      // Update local store immediately to fix latency
      updateUserData({ ...originalUser, ...updateDto });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    form.name !== (originalUser?.name || '') ||
    form.phoneNumber !== (originalUser?.phoneNumber || '') ||
    form.email !== (originalUser?.email || '') ||
    form.age !== (originalUser?.age?.toString() || '') ||
    form.gender !== (originalUser?.gender || '');

  const accent = activeMode === 'food' ? theme.colors.food : activeMode === 'pharma' ? theme.colors.pharma : theme.colors.primary;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ flex: 1 }}>Edit profile</AppText>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
              <AppText variant="h1" color="#fff">{getInitials(form.name)}</AppText>
            </View>
            <AppText variant="caption" align="center" style={{ marginTop: theme.spacing.sm }}>
              Your initials are used as your avatar
            </AppText>
          </View>

          <AppText variant="overline" style={styles.sectionLabel}>Personal information</AppText>
          <View style={styles.fieldCard}>
            <View style={[styles.field, styles.fieldBorder]}>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Full name</AppText>
              <TextInput
                style={styles.fieldInput}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textMuted}
                autoCorrect={false}
              />
            </View>
            <View style={styles.field}>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Phone number</AppText>
              <TextInput
                style={styles.fieldInput}
                value={form.phoneNumber}
                onChangeText={(v) => setForm({ ...form, phoneNumber: v })}
                placeholder="+92 300 0000000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <AppText variant="overline" style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>
            Healthcare Information
          </AppText>
          <View style={styles.fieldCard}>
            <View style={[styles.field, styles.fieldBorder]}>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Age</AppText>
              <TextInput
                style={styles.fieldInput}
                value={form.age}
                onChangeText={(v) => setForm({ ...form, age: v.replace(/[^0-9]/g, '') })}
                placeholder="Enter your age"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <View style={styles.field}>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Gender</AppText>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                {['Male', 'Female', 'Other'].map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setForm({ ...form, gender: g })}
                    style={[
                      styles.genderBtn,
                      form.gender === g && { backgroundColor: accent, borderColor: accent }
                    ]}
                  >
                    <AppText variant="captionStrong" color={form.gender === g ? '#fff' : theme.colors.textSecondary}>
                      {g}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <AppText variant="overline" style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>
            Account information
          </AppText>
          <View style={styles.fieldCard}>
            <View style={[styles.field, styles.fieldBorder]}>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Email address</AppText>
              <TextInput
                style={styles.fieldInput}
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Account type</AppText>
              <View style={{ alignSelf: 'flex-start' }}>
                <AppBadge
                  label={originalUser?.role || 'Customer'}
                  variant="primary"
                  tint={accent}
                />
              </View>
            </View>
          </View>
          <AppText variant="caption" style={{ marginTop: 6, paddingHorizontal: 4 }}>
            Account type cannot be changed here.
          </AppText>

          <AppButton
            label={saving ? 'Saving…' : 'Save changes'}
            variant="primary"
            tint={accent}
            size="lg"
            fullWidth
            onPress={handleSave}
            disabled={!hasChanges || saving}
            loading={saving}
            style={{ marginTop: theme.spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  avatarSection: { alignItems: 'center', marginBottom: theme.spacing.lg },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.md,
  },

  sectionLabel: { marginBottom: theme.spacing.sm, marginLeft: 4 },

  fieldCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  field: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  fieldInput: {
    fontSize: 15, color: theme.colors.textPrimary, padding: 0,
  },
  genderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceMuted,
  }
});
