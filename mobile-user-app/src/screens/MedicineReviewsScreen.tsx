import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pharmaApi } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

export default function MedicineReviewsScreen({ route, navigation }: any) {
  const { medicineId, medicineName } = route.params;
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [medicineId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await pharmaApi.getReviews(medicineId);
      setReviews(res.data);
    } catch (e) {
      console.warn('[Reviews] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderRatingStars = (rating: number) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons 
          key={s} 
          name={s <= rating ? 'star' : 'star-outline'} 
          size={12} 
          color={s <= rating ? '#F59E0B' : theme.colors.textMuted} 
        />
      ))}
    </View>
  );

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <AppText style={{ color: theme.colors.surface }}>
            {item.user?.name?.charAt(0) || 'U'}
          </AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="bodyStrong">{item.user?.name || 'Anonymous User'}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {new Date(item.createdAt).toLocaleDateString()}
            </AppText>
          </View>
          <View style={styles.ratingRow}>
            {renderRatingStars(item.rating)}
            {item.isVerifiedPurchase && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={10} color={theme.colors.success} />
                <AppText variant="caption" style={styles.verifiedText}>Verified Purchase</AppText>
              </View>
            )}
          </View>
        </View>
      </View>
      {item.comment && (
        <AppText variant="body" style={styles.comment}>{item.comment}</AppText>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View>
          <AppText variant="h2">Patient Reviews</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>{medicineName}</AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbox-ellipses-outline" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                No reviews yet for this medicine.
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
  reviewCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.pharma,
    justifyContent: 'center', alignItems: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, gap: 4,
  },
  verifiedText: { color: theme.colors.success, fontSize: 10, fontWeight: 'bold' },
  comment: { marginTop: 12, lineHeight: 20, color: theme.colors.textPrimary },
  emptyState: { marginTop: 100, alignItems: 'center' },
});
