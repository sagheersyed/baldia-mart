import React from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Image, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { normalizeUrl } from '../api/api';
import { AppText, AppButton, AppBadge } from '../components/ui';
import { theme } from '../theme/theme';

export default function ConsultationDetailsScreen({ route, navigation }: any) {
  const { consultation } = route.params;

  const isScheduled = consultation.status === 'scheduled';
  const isVideo = consultation.visitType === 'video';
  const date = new Date(consultation.scheduledAt);

  const handleJoinMeeting = () => {
    if (consultation.meetingUrl) {
      Linking.openURL(consultation.meetingUrl).catch(() => {
        Alert.alert('Error', 'Could not open meeting link.');
      });
    } else {
      Alert.alert('Pending', 'Meeting link will be shared shortly before the appointment.');
    }
  };

  const getStatusColor = () => {
    switch (consultation.status) {
      case 'scheduled': return theme.colors.pharma;
      case 'completed': return theme.colors.success;
      case 'cancelled': return theme.colors.danger;
      default: return theme.colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">Consultation Details</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor() + '15' }]}>
            <Ionicons name="calendar-outline" size={32} color={getStatusColor()} />
          </View>
          <View>
            <AppText variant="caption" color={theme.colors.textSecondary}>Current Status</AppText>
            <AppText variant="h2" color={getStatusColor()} style={{ textTransform: 'capitalize' }}>
              {consultation.status}
            </AppText>
          </View>
        </View>

        {/* Doctor Card */}
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Image source={{ uri: normalizeUrl(consultation.doctor.imageUrl) }} style={styles.doctorImg} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText variant="h3">{consultation.doctor.name}</AppText>
              <AppText variant="body" color={theme.colors.pharma}>{consultation.doctor.specialization}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>{consultation.doctor.degree}</AppText>
            </View>
          </View>
        </View>

        {/* Appointment Info */}
        <View style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 16 }}>Appointment Information</AppText>
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="time-outline" size={20} color={theme.colors.textMuted} />
            </View>
            <View>
              <AppText variant="captionStrong" color={theme.colors.textSecondary}>Date & Time</AppText>
              <AppText variant="bodyStrong">
                {date.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </AppText>
              <AppText variant="body">{consultation.timeSlot || date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name={isVideo ? "videocam-outline" : "business-outline"} size={20} color={theme.colors.textMuted} />
            </View>
            <View>
              <AppText variant="captionStrong" color={theme.colors.textSecondary}>Consultation Type</AppText>
              <AppText variant="bodyStrong">{isVideo ? 'Online Video Call' : 'Physical Clinic Visit'}</AppText>
            </View>
          </View>

          {!isVideo && (
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="captionStrong" color={theme.colors.textSecondary}>Clinic Location</AppText>
                <AppText variant="body">{consultation.doctor.clinicAddress || 'Address details shared in booking'}</AppText>
                <AppButton 
                  label="View on Map" 
                  variant="ghost" 
                  size="sm" 
                  textColor={theme.colors.pharma}
                  style={{ alignSelf: 'flex-start', marginLeft: -12 }}
                  onPress={() => Alert.alert('Maps', 'Opening maps...')}
                />
              </View>
            </View>
          )}
        </View>

        {/* Patient Notes */}
        {consultation.userNotes && (
          <View style={styles.section}>
            <AppText variant="title" style={{ marginBottom: 8 }}>Your Notes</AppText>
            <AppText variant="body" color={theme.colors.textSecondary}>
              {consultation.userNotes}
            </AppText>
          </View>
        )}

        {/* Doctor Summary */}
        {consultation.doctorSummary && (
          <View style={styles.section}>
            <AppText variant="title" style={{ marginBottom: 8 }}>Doctor's Summary</AppText>
            <AppText variant="body" color={theme.colors.textSecondary}>
              {consultation.doctorSummary}
            </AppText>
          </View>
        )}

        {/* Action Button for Video Call */}
        {isScheduled && isVideo && (
          <View style={styles.actionCard}>
            <Ionicons name="videocam" size={40} color={theme.colors.pharma} />
            <AppText variant="bodyStrong" align="center">Join Video Consultation</AppText>
            <AppText variant="caption" align="center" color={theme.colors.textMuted}>
              You can join the room up to 5 minutes before the scheduled time.
            </AppText>
            <AppButton 
              label={consultation.meetingUrl ? "Join Now" : "Link Not Ready"} 
              variant="primary" 
              tint={theme.colors.pharma}
              fullWidth
              style={{ marginTop: 12 }}
              onPress={handleJoinMeeting}
            />
          </View>
        )}
      </ScrollView>
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
  content: { padding: 16 },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  doctorImg: { width: 70, height: 70, borderRadius: 35 },
  section: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  iconBox: { width: 32, alignItems: 'center' },
  actionCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.pharma,
    borderStyle: 'dashed',
    marginBottom: 32,
  }
});
