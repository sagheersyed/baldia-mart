import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { labApi } from '../api/api';
import { AppText, AppButton, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';

const STATUS_MAP: any = {
  'pending': { color: '#F59E0B', label: 'Pending Approval', icon: 'time' },
  'collector_assigned': { color: '#3B82F6', label: 'Collector Assigned', icon: 'person' },
  'sample_collected': { color: '#8B5CF6', label: 'Sample Collected', icon: 'flask' },
  'in_lab': { color: '#0EA5E9', label: 'Processing in Lab', icon: 'business' },
  'results_ready': { color: '#10B981', label: 'Results Ready', icon: 'checkmark-circle' },
  'cancelled': { color: '#EF4444', label: 'Cancelled', icon: 'close-circle' },
};

export default function LabBookingDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await labApi.getBooking(id);
      setBooking(res.data);
    } catch (e) {
      console.warn('[LabBookingDetails] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.pharma} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <AppText>Booking not found</AppText>
        <AppButton label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const statusInfo = STATUS_MAP[booking.status] || { color: '#999', label: booking.status, icon: 'help-circle' };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton onPress={() => navigation.goBack()} size={36} bg={theme.colors.surfaceMuted}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ marginLeft: 8 }}>Booking Details</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={[styles.card, styles.statusCard, { borderColor: statusInfo.color + '40' }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusInfo.color + '15' }]}>
            <Ionicons name={statusInfo.icon} size={32} color={statusInfo.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Current Status</AppText>
            <AppText variant="h3" color={statusInfo.color}>{statusInfo.label}</AppText>
          </View>
        </View>

        {/* Patient & Test Info */}
        <View style={styles.section}>
          <AppText variant="overline" style={styles.sectionLabel}>Patient Information</AppText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />
              <AppText variant="bodyStrong" style={styles.infoText}>{booking.patientName}</AppText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
              <AppText variant="body" style={styles.infoText}>{booking.patientAge} Years • {booking.patientGender}</AppText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={theme.colors.textMuted} />
              <AppText variant="body" style={styles.infoText}>{booking.patientPhone}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="overline" style={styles.sectionLabel}>Test Details</AppText>
          <View style={styles.infoCard}>
            {booking.labTests?.map((test: any, idx: number) => (
              <View key={test.id} style={[styles.testItem, idx > 0 && styles.testBorder]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{test.name}</AppText>
                  <AppText variant="caption" color={theme.colors.textMuted}>{test.description}</AppText>
                </View>
                <AppText variant="bodyStrong" color={theme.colors.pharma}>Rs. {test.price}</AppText>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <AppText variant="bodyStrong">Total Amount</AppText>
              <AppText variant="h3" color={theme.colors.pharma}>Rs. {booking.totalAmount}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="overline" style={styles.sectionLabel}>Appointment</AppText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-clear-outline" size={18} color={theme.colors.textMuted} />
              <AppText variant="bodyStrong" style={styles.infoText}>
                {new Date(booking.scheduledDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </AppText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
              <AppText variant="body" style={styles.infoText}>{booking.timeSlot}</AppText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={theme.colors.textMuted} />
              <AppText variant="body" style={styles.infoText}>{booking.address?.addressLine1}, {booking.address?.city}</AppText>
            </View>
          </View>
        </View>

        {booking.status === 'results_ready' && booking.reportUrl && (
          <AppButton 
            label="Download Report" 
            variant="primary" 
            leadingIcon={<Ionicons name="document-text-outline" size={18} color="#fff" />}
            tint={theme.colors.success}
            onPress={() => Linking.openURL(booking.reportUrl)}
            style={{ marginTop: 24 }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    ...theme.shadows.sm,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 24,
  },
  statusIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: theme.colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    ...theme.shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: { marginLeft: 12, flex: 1 },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  testBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: theme.colors.divider,
    borderStyle: 'dashed',
  },
});
