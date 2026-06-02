import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { labApi } from '../api/api';
import { AppText, AppButton } from '../components/ui';
import { theme } from '../theme/theme';

const STATUS_MAP: any = {
  'pending': { color: '#F59E0B', label: 'Pending' },
  'collector_assigned': { color: '#3B82F6', label: 'Collector Assigned' },
  'sample_collected': { color: '#8B5CF6', label: 'Sample Collected' },
  'in_lab': { color: '#0EA5E9', label: 'In Lab' },
  'results_ready': { color: '#10B981', label: 'Results Ready' },
  'cancelled': { color: '#EF4444', label: 'Cancelled' },
};

export default function MyLabBookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await labApi.getMyBookings();
      setBookings(res.data);
    } catch (e) {
      console.warn('[MyLabBookings] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownloadReport = (url: string) => {
    if (url) Linking.openURL(url);
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusInfo = STATUS_MAP[item.status] || { color: '#999', label: item.status };
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <AppText variant="captionStrong" color={statusInfo.color}>{statusInfo.label}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </AppText>
        </View>

        <View style={styles.cardBody}>
          <AppText variant="bodyStrong">ID: #{item.id.slice(0, 8).toUpperCase()}</AppText>
          <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
            Scheduled for: {new Date(item.scheduledDate).toLocaleDateString()}
          </AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>{item.timeSlot}</AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <AppText variant="bodyStrong" color={theme.colors.pharma}>Rs. {item.totalAmount}</AppText>
          {item.status === 'results_ready' && item.reportUrl ? (
            <Pressable 
              style={styles.reportBtn} 
              onPress={() => handleDownloadReport(item.reportUrl)}
            >
              <Ionicons name="document-text" size={18} color="#fff" />
              <AppText variant="captionStrong" color="#fff" style={{ marginLeft: 6 }}>View Report</AppText>
            </Pressable>
          ) : (
            <Pressable 
              style={styles.trackBtn} 
              onPress={() => navigation.navigate('LabBookingDetails', { id: item.id })}
            >
              <AppText variant="captionStrong" color={theme.colors.pharma}>View Details</AppText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">My Lab Bookings</AppText>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                You haven't booked any lab tests yet.
              </AppText>
              <AppButton 
                label="Book a Test Now" 
                variant="primary" 
                tint={theme.colors.pharma} 
                style={{ marginTop: 20 }}
                onPress={() => navigation.navigate('LabTestList')}
              />
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
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  cardBody: { padding: 16 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  trackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.pharma,
  },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
});
