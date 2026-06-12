import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Switch,
  Pressable, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';

export default function StoreProfileScreen({ navigation }: any) {
  const { activeTenant, setActiveTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(activeTenant?.status || 'active');
  
  const isClosed = status === 'inactive';

  const toggleStatus = async () => {
    const nextStatus = isClosed ? 'active' : 'inactive';
    setLoading(true);
    try {
      const res = await cmsApi.updateStoreProfile(tenantId, { status: nextStatus });
      setStatus(res.data.status);
      
      // Reload memberships to refresh activeTenant data across the app
      await useCmsStore.getState().loadMemberships();

      Alert.alert('Success', `Store is now ${res.data.status === 'active' ? 'OPEN' : 'CLOSED'}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update store status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHeader} />
        </Pressable>
        <AppText variant="h2">Store Settings</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status Card */}
        <View style={styles.section}>
          <AppText variant="overline">Operational Status</AppText>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Store Accept Orders</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  Toggle off to temporarily close your store
                </AppText>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Switch 
                  value={!isClosed} 
                  onValueChange={toggleStatus}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '80' }}
                  thumbColor={!isClosed ? theme.colors.primary : '#F1F5F9'}
                />
              )}
            </View>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.section}>
          <AppText variant="overline">Store Profile</AppText>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.logoContainer}>
                {activeTenant?.logoUrl ? (
                  <Image source={{ uri: activeTenant.logoUrl }} style={styles.logo} />
                ) : (
                  <Ionicons name="storefront-outline" size={32} color={theme.colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{activeTenant?.name}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{activeTenant?.type.toUpperCase()}</AppText>
              </View>
              <Pressable style={styles.editBtn} onPress={() => Alert.alert('Coming Soon', 'Logo and Banner uploads are being enabled in the next update.')}>
                <AppText variant="captionStrong" color={theme.colors.primary}>Edit</AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Business Hours (Placeholders) */}
        <View style={styles.section}>
          <AppText variant="overline">Business Hours</AppText>
          <View style={styles.card}>
            <View style={styles.row}>
              <AppText variant="body">Opening Time</AppText>
              <AppText variant="bodyStrong">09:00 AM</AppText>
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
              <AppText variant="body">Closing Time</AppText>
              <AppText variant="bodyStrong">11:00 PM</AppText>
            </View>
          </View>
        </View>

        <AppText variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', marginTop: 20 }}>
          Version 1.2 • Merchant Portal
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', gap: 12 },
  backBtn: { padding: 4 },
  scroll: { padding: 16, gap: 20 },
  section: { gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primary + '10' },
});
