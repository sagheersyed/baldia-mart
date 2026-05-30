import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { remindersApi } from '../api/api';
import AppText from '../components/ui/AppText';
import AppButton from '../components/ui/AppButton';
import { theme } from '../theme/theme';

export default function RefillRemindersScreen({ navigation }: any) {
  const [refills, setRefills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefills();
  }, []);

  const fetchRefills = async () => {
    try {
      setLoading(true);
      const res = await remindersApi.getRefills();
      setRefills(res.data);
    } catch (e) {
      console.warn('[Refills] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Refill Tracker', 'Stop tracking refills for this medicine?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Stop', 
        style: 'destructive',
        onPress: async () => {
          try {
            await remindersApi.deleteRefill(id);
            fetchRefills();
          } catch (e) {
            Alert.alert('Error', 'Failed to remove tracker.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const nextDate = new Date(item.nextRefillDate);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const isDueSoon = diffDays <= 3;

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={[styles.iconBox, { backgroundColor: isDueSoon ? theme.colors.dangerLight : theme.colors.pharmaLight }]}>
            <Ionicons name="repeat" size={20} color={isDueSoon ? theme.colors.danger : theme.colors.pharma} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <AppText variant="bodyStrong">{item.medicineName}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Supply for {item.daysSupply} days
            </AppText>
            <View style={styles.statusRow}>
              <Ionicons name="calendar-outline" size={14} color={isDueSoon ? theme.colors.danger : theme.colors.textMuted} />
              <AppText 
                variant="captionStrong" 
                color={isDueSoon ? theme.colors.danger : theme.colors.textPrimary}
                style={{ marginLeft: 6 }}
              >
                Refill Due: {nextDate.toLocaleDateString()}
              </AppText>
            </View>
          </View>
          <Pressable onPress={() => handleDelete(item.id)} style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {isDueSoon && (
          <AppButton
            label="Order Refill Now"
            variant="primary"
            tint={theme.colors.pharma}
            size="sm"
            onPress={() => navigation.navigate('MedicineList', { searchQuery: item.medicineName })}
            style={styles.refillBtn}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">Refill Reminders</AppText>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={refills}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="refresh-circle-outline" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                No active refill trackers found.
              </AppText>
              <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                We'll automatically suggest refills for chronic medicines you purchase.
              </AppText>
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
    padding: 16,
    gap: 12,
    backgroundColor: theme.colors.surface,
  },
  backBtn: { padding: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  trashBtn: { padding: 8 },
  refillBtn: { marginTop: 16 },
  emptyState: { marginTop: 100, alignItems: 'center' },
});
