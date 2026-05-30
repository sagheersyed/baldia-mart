import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { remindersApi } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

export default function ReminderListScreen({ navigation }: any) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await remindersApi.getAll();
      setReminders(res.data);
    } catch (e) {
      console.warn('[Reminders] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure you want to remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await remindersApi.delete(id);
            fetchReminders();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete reminder.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <View style={styles.iconCircle}>
          <Ionicons name="medical" size={20} color={theme.colors.pharma} />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <AppText variant="bodyStrong">{item.medicineName}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {item.dosage} • {item.frequency.replace('_', ' ')}
          </AppText>
          <View style={styles.timesRow}>
            {item.times.map((t: string) => (
              <View key={t} style={styles.timeTag}>
                <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                <AppText variant="badge" style={{ marginLeft: 4 }}>{t}</AppText>
              </View>
            ))}
          </View>
        </View>
        <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">My Reminders</AppText>
        <Pressable 
          onPress={() => navigation.navigate('ReminderSetup')} 
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={theme.colors.pharma} />
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReminders(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                You haven't set any reminders yet.
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { padding: 4 },
  addBtn: { marginLeft: 'auto', padding: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardInfo: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.pharmaLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteBtn: { padding: 8 },
  emptyState: { marginTop: 100, alignItems: 'center' },
});
