import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recurringOrdersApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import { Image } from 'expo-image';

const ACCENT = theme.colors.pharma;

export default function PharmaSubscriptionListScreen({ navigation }: any) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await recurringOrdersApi.getMy();
      setSubscriptions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('[PharmaSubList] error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAction = (sub: any, action: 'pause' | 'resume' | 'cancel') => {
    const title = action.charAt(0).toUpperCase() + action.slice(1);
    Alert.alert(
      `${title} Subscription`,
      `Are you sure you want to ${action} your refill for ${sub.medicine?.name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              if (action === 'pause') await recurringOrdersApi.pause(sub.id);
              else if (action === 'resume') await recurringOrdersApi.resume(sub.id);
              else await recurringOrdersApi.cancel(sub.id);
              loadData();
            } catch (e) {
              Alert.alert('Error', `Failed to ${action} subscription.`);
            }
          }
        }
      ]
    );
  };

  const renderSubscription = ({ item }: { item: any }) => {
    const isActive = item.status === 'active';
    const isPaused = item.status === 'paused';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.medImg}>
            {item.medicine?.imageUrl ? (
              <Image source={{ uri: normalizeUrl(item.medicine.imageUrl) }} style={styles.fill} contentFit="contain" />
            ) : (
              <Ionicons name="medkit" size={24} color={ACCENT} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyStrong">{item.medicine?.name || 'Medicine'}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} Refill
            </AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? theme.colors.successLight : isPaused ? theme.colors.warningLight : theme.colors.surfaceMuted }]}>
            <AppText variant="badge" color={isActive ? theme.colors.success : isPaused ? theme.colors.warning : theme.colors.textMuted}>
              {item.status.toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
            <AppText variant="caption" style={{ marginLeft: 6 }}>
              Next Refill: {new Date(item.nextDeliveryDate).toLocaleDateString()}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="repeat-outline" size={14} color={theme.colors.textMuted} />
            <AppText variant="caption" style={{ marginLeft: 6 }}>
              Total Refills: {item.totalDeliveries}
            </AppText>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isActive ? (
            <Pressable style={styles.actionBtn} onPress={() => handleAction(item, 'pause')}>
              <Ionicons name="pause" size={16} color={theme.colors.warning} />
              <AppText variant="captionStrong" color={theme.colors.warning} style={{ marginLeft: 4 }}>Pause</AppText>
            </Pressable>
          ) : isPaused ? (
            <Pressable style={styles.actionBtn} onPress={() => handleAction(item, 'resume')}>
              <Ionicons name="play" size={16} color={theme.colors.success} />
              <AppText variant="captionStrong" color={theme.colors.success} style={{ marginLeft: 4 }}>Resume</AppText>
            </Pressable>
          ) : null}
          
          {item.status !== 'cancelled' && (
            <Pressable style={styles.actionBtn} onPress={() => handleAction(item, 'cancel')}>
              <Ionicons name="close-circle-outline" size={16} color={theme.colors.danger} />
              <AppText variant="captionStrong" color={theme.colors.danger} style={{ marginLeft: 4 }}>Cancel</AppText>
            </Pressable>
          )}
          
          <Pressable 
            style={[styles.actionBtn, { marginLeft: 'auto' }]} 
            onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.medicineId })}
          >
            <AppText variant="captionStrong" color={ACCENT}>View Details</AppText>
            <Ionicons name="chevron-forward" size={14} color={ACCENT} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1, marginLeft: 16 }}>My Refill Subscriptions</AppText>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderSubscription}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="repeat" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="bodyStrong" style={{ marginTop: 16 }}>No active subscriptions</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
                You can subscribe to chronic medications for automatic doorstep refills.
              </AppText>
              <Pressable 
                style={styles.browseBtn}
                onPress={() => navigation.navigate('Pharma')}
              >
                <AppText variant="bodyStrong" color="#fff">Browse Pharmacy</AppText>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  medImg: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  cardBody: {
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
    flexDirection: 'row', gap: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  cardActions: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginTop: 8,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  empty: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  browseBtn: {
    marginTop: 24,
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
  },
});
