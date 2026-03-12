import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { authApi, usersApi } from '../api/api';

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phoneNumber: '', email: '' });
  const [originalUser, setOriginalUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.getMe();
        const u = res.data;
        setOriginalUser(u);
        setForm({ name: u.name || '', phoneNumber: u.phoneNumber || '', email: u.email || '' });
      } catch (e) {
        Alert.alert('Error', 'Failed to load profile.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      await usersApi.updateMe({ 
        name: form.name.trim(), 
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim()
      });
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = form.name !== (originalUser?.name || '') || 
                    form.phoneNumber !== (originalUser?.phoneNumber || '') ||
                    form.email !== (originalUser?.email || '');

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#FF4500" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, !hasChanges && styles.saveHeaderBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FF4500" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {form.name ? form.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
              </Text>
            </View>
            <Text style={styles.avatarHint}>Your initials are used as your avatar</Text>
          </View>

          {/* Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.fieldCard}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder="Enter your full name"
                  placeholderTextColor="#CCC"
                  autoCorrect={false}
                />
              </View>
              <View style={[styles.field, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.phoneNumber}
                  onChangeText={(v) => setForm({ ...form, phoneNumber: v })}
                  placeholder="+92 300 0000000"
                  placeholderTextColor="#CCC"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.fieldCard}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.email}
                  onChangeText={(v) => setForm({ ...form, email: v })}
                  placeholder="Enter your email"
                  placeholderTextColor="#CCC"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.field, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Account Type</Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{originalUser?.role || 'Customer'}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.readonlyNote}>Account type cannot be changed here.</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F5F5F5' },
  backIcon: { fontSize: 20, color: '#333' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  saveHeaderBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveHeaderBtnDisabled: { opacity: 0.3 },
  saveHeaderBtnText: { color: '#FF4500', fontWeight: '700', fontSize: 15 },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#FF4500',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    elevation: 4, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  avatarHint: { fontSize: 12, color: '#999' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  fieldCard: {
    backgroundColor: '#fff', borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  field: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 },
  fieldInput: { fontSize: 15, color: '#1A1A1A', padding: 0 },
  fieldReadonly: { fontSize: 15, color: '#555' },
  roleChip: { backgroundColor: '#FFF5F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  roleChipText: { color: '#FF4500', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  readonlyNote: { fontSize: 11, color: '#BBB', marginTop: 8, paddingHorizontal: 4 },
  saveBtn: {
    backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 10, elevation: 3, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
