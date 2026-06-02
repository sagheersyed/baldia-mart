import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, RefreshControl, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
const formatPrescriptionDate = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  let h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${m} ${d}, ${y} ${h}:${min} ${ampm}`;
};

const formatFullPrescriptionDate = (date: Date) => {
  return date.toLocaleString();
};

const formatShortPrescriptionDate = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

import { prescriptionsApi, normalizeUrl } from '../api/api';
import { AppText, AppIconButton, EmptyState, ErrorState, SkeletonBlock, AppBadge } from '../components/ui';
import { theme } from '../theme/theme';

export default function MyPrescriptionsScreen({ navigation }: any) {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setError(null);
      const res = await prescriptionsApi.getMyPrescriptions();
      setPrescriptions(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <AppBadge label="Pending" variant="warning" />;
      case 'in_review': return <AppBadge label="In Review" variant="info" />;
      case 'approved': return <AppBadge label="Approved" variant="success" />;
      case 'quoted': return <AppBadge label="Quoted" variant="info" />;
      case 'rejected': return <AppBadge label="Rejected" variant="danger" />;
      case 'expired': return <AppBadge label="Expired" variant="neutral" />;
      default: return <AppBadge label={status} variant="neutral" />;
    }
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: theme.colors.surfaceMuted }
      ]}
      onPress={() => setSelectedPrescription(item)}
    >
      <View style={styles.cardContent}>
        <View style={styles.imageBox}>
          <Image 
            source={{ uri: normalizeUrl(item.imageUrl) }} 
            style={styles.thumbnail} 
            contentFit="cover" 
          />
          {item.additionalImageUrls && item.additionalImageUrls.length > 0 && (
            <View style={styles.badgeOverlay}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>
                +{item.additionalImageUrls.length}
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.infoBox}>
          <View style={styles.headerRow}>
            <AppText variant="bodyStrong">Prescription</AppText>
            {getStatusBadge(item.status)}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
            <AppText variant="caption">
              {formatPrescriptionDate(new Date(item.createdAt))}
            </AppText>
          </View>
          {item.doctorName && (
            <View style={styles.metaRow}>
              <Ionicons name="medkit-outline" size={14} color={theme.colors.textMuted} />
              <AppText variant="caption">Dr. {item.doctorName}</AppText>
            </View>
          )}
          {(item.status === 'approved' || item.status === 'quoted') && (
            <Pressable
              style={styles.viewQuoteLink}
              onPress={() => navigation.navigate('PrescriptionQuotation', {
                prescriptionId: item.id,
                prescriptionImageUrl: item.imageUrl,
              })}
            >
              <Ionicons name="receipt" size={14} color={theme.colors.pharma} />
              <AppText variant="caption" color={theme.colors.pharma}> View Quotation →</AppText>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  ), []);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </AppIconButton>
          <AppText variant="title">My Prescriptions</AppText>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} height={100} radius={theme.radius.md} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="title" style={{ flex: 1, marginLeft: 16 }}>My Prescriptions</AppText>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={fetchPrescriptions} />
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No Prescriptions"
          subtitle="You haven't uploaded any prescriptions yet."
          actionLabel="Upload Prescription"
          onAction={() => navigation.navigate('PrescriptionUpload')}
        />
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.pharma}
              colors={[theme.colors.pharma]}
            />
          }
        />
      )}

      {/* Detail Modal */}
      {selectedPrescription && (
        <Modal
          visible={!!selectedPrescription}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedPrescription(null)}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top']}>
            <View style={styles.modalHeader}>
              <AppText variant="title">Prescription Details</AppText>
              <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => setSelectedPrescription(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </AppIconButton>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Images */}
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageGallery}>
                <Image 
                  source={{ uri: normalizeUrl(selectedPrescription.imageUrl) }} 
                  style={[styles.fullImage, { backgroundColor: '#000' }]} 
                  contentFit="contain" 
                />
                {selectedPrescription.additionalImageUrls?.map((url: string, index: number) => (
                  <Image 
                    key={index}
                    source={{ uri: normalizeUrl(url) }} 
                    style={[styles.fullImage, { backgroundColor: '#000' }]} 
                    contentFit="contain" 
                  />
                ))}
              </ScrollView>
              
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <AppText variant="bodyStrong">Status</AppText>
                  {getStatusBadge(selectedPrescription.status)}
                </View>
                <View style={styles.detailRow}>
                  <AppText variant="bodyStrong">Uploaded On</AppText>
                  <AppText variant="body">{formatFullPrescriptionDate(new Date(selectedPrescription.createdAt))}</AppText>
                </View>

                {selectedPrescription.doctorName && (
                  <View style={styles.detailRow}>
                    <AppText variant="bodyStrong">Doctor</AppText>
                    <AppText variant="body">Dr. {selectedPrescription.doctorName}</AppText>
                  </View>
                )}

                {selectedPrescription.patientName && (
                  <View style={styles.detailRow}>
                    <AppText variant="bodyStrong">Patient Name</AppText>
                    <AppText variant="body">{selectedPrescription.patientName}</AppText>
                  </View>
                )}

                {selectedPrescription.validUntil && (
                  <View style={styles.detailRow}>
                    <AppText variant="bodyStrong">Valid Until</AppText>
                    <AppText variant="body">{formatShortPrescriptionDate(new Date(selectedPrescription.validUntil))}</AppText>
                  </View>
                )}

                {selectedPrescription.rejectionReason && (
                  <View style={styles.alertBox}>
                    <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" color={theme.colors.danger}>Rejection Reason</AppText>
                      <AppText variant="caption" color={theme.colors.danger} style={{ marginTop: 2 }}>
                        {selectedPrescription.rejectionReason}
                      </AppText>
                    </View>
                  </View>
                )}

                {selectedPrescription.reviewerNotes && (
                  <View style={[styles.alertBox, { backgroundColor: theme.colors.infoLight, borderColor: theme.colors.info }]}>
                    <Ionicons name="information-circle" size={20} color={theme.colors.info} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" color={theme.colors.info}>Pharmacist Notes</AppText>
                      <AppText variant="caption" color={theme.colors.info} style={{ marginTop: 2 }}>
                        {selectedPrescription.reviewerNotes}
                      </AppText>
                    </View>
                  </View>
                )}

                {/* View Quotation CTA */}
                {(selectedPrescription.status === 'approved' || selectedPrescription.status === 'quoted') && (
                  <Pressable
                    style={styles.quotationCta}
                    onPress={() => {
                      setSelectedPrescription(null);
                      navigation.navigate('PrescriptionQuotation', {
                        prescriptionId: selectedPrescription.id,
                        prescriptionImageUrl: selectedPrescription.imageUrl,
                      });
                    }}
                  >
                    <Ionicons name="receipt" size={22} color="#fff" />
                    <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>View Quotation & Place Order</AppText>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  imageBox: {
    width: 70,
    height: 70,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: theme.radius.sm,
  },
  infoBox: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  imageGallery: {
    height: 300,
    backgroundColor: '#000',
  },
  fullImage: {
    width: 400, // Approximate viewport width
    height: 300,
  },
  modalBody: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: 60,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  alertBox: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
  },
  viewQuoteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 4,
  },
  quotationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.pharma,
    marginTop: theme.spacing.md,
  },
});
