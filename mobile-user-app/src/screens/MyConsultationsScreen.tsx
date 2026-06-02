import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { telemedicineApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

export default function MyConsultationsScreen({ navigation }: any) {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await telemedicineApi.getMyConsultations();
      setConsultations(res.data);
    } catch (e) {
      console.warn('[MyConsultations] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isScheduled = item.status === 'scheduled' || item.status === 'confirmed';
    
    return (
      <Pressable 
        style={styles.card}
        onPress={() => {}}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: isScheduled ? theme.colors.pharma + '20' : theme.colors.surfaceMuted }]}>
            <AppText variant="badge" color={isScheduled ? theme.colors.pharma : theme.colors.textMuted}>
              {item.status.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }}>
            {new Date(item.scheduledAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </AppText>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: normalizeUrl(item.doctor.imageUrl) }} style={styles.doctorThumb} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="bodyStrong">{item.doctor.name}</AppText>
              <Ionicons name={item.visitType === 'physical' ? 'business-outline' : 'videocam-outline'} size={14} color={theme.colors.textMuted} />
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary}>{item.doctor.specialization}</AppText>
            {item.userNotes && (
              <AppText variant="caption" numberOfLines={1} style={{ marginTop: 4, fontStyle: 'italic' }}>
                {item.userNotes}
              </AppText>
            )}
          </View>
        </View>

        {isScheduled && item.meetingUrl && (
          <View style={styles.actionSection}>
            <Pressable 
              style={styles.joinBtn}
              onPress={() => Linking.openURL(item.meetingUrl)}
            >
              <Ionicons name="videocam" size={18} color="#fff" />
              <AppText variant="captionStrong" color="#fff" style={{ marginLeft: 6 }}>Join Video Call</AppText>
            </Pressable>
          </View>
        )}
        
        {isScheduled && !item.meetingUrl && item.visitType === 'video' && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.pharma} />
            <AppText variant="caption" color={theme.colors.pharma} style={{ marginLeft: 6 }}>
              Meeting link will appear here soon
            </AppText>
          </View>
        )}

        {isScheduled && item.visitType === 'physical' && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={theme.colors.pharma} />
            <AppText variant="caption" color={theme.colors.pharma} style={{ marginLeft: 6 }}>
              Visit at: {item.doctor.clinicAddress || 'Clinic'}
            </AppText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">Consultations</AppText>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={consultations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                No consultation history found.
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
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardBody: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  doctorThumb: { width: 50, height: 50, borderRadius: 25 },
  actionSection: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.pharma,
    padding: 10,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.pharma + '08',
  },
  emptyState: { marginTop: 100, alignItems: 'center' },
});
