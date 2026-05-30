import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { labApi } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import SkeletonBlock from '../components/ui/SkeletonBlock';

const CATEGORIES = [
  { id: 'all', label: 'All Tests', icon: 'flask-outline' },
  { id: 'Blood Test', label: 'Blood', icon: 'water-outline' },
  { id: 'Urine Test', label: 'Urine', icon: 'beaker-outline' },
  { id: 'Radiology', label: 'Radiology', icon: 'scan-outline' },
  { id: 'Swab Test', label: 'Swab', icon: 'medical-outline' },
];

export default function LabTestListScreen({ navigation }: any) {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchTests();
  }, [selectedCategory]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await labApi.getTests(selectedCategory === 'all' ? undefined : selectedCategory);
      setTests(res.data);
    } catch (e) {
      console.warn('[LabTests] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTests();
  };

  const renderTestItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.testCard}
      onPress={() => navigation.navigate('LabBooking', { tests: [item] })}
    >
      <View style={styles.testInfo}>
        <AppText variant="bodyStrong">{item.name}</AppText>
        <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 2 }}>
          Result in {item.turnaroundTime || '24 hrs'}
        </AppText>
        <View style={styles.priceRow}>
          <AppText variant="h3" color={theme.colors.pharma}>Rs. {item.price}</AppText>
          <View style={styles.sampleBadge}>
            <AppText variant="badge" color={theme.colors.textSecondary}>{item.sampleType}</AppText>
          </View>
        </View>
      </View>
      <View style={styles.bookBtn}>
        <Ionicons name="add-circle" size={32} color={theme.colors.pharma} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">Lab Tests</AppText>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.categoryBtn,
                selectedCategory === item.id && styles.categoryBtnActive,
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={selectedCategory === item.id ? '#fff' : theme.colors.textSecondary}
              />
              <AppText
                variant="captionStrong"
                color={selectedCategory === item.id ? '#fff' : theme.colors.textSecondary}
                style={{ marginLeft: 6 }}
              >
                {item.label}
              </AppText>
            </Pressable>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.testCard, { marginBottom: 12 }]}>
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="70%" height={20} />
                <SkeletonBlock width="40%" height={14} style={{ marginTop: 6 }} />
                <SkeletonBlock width="30%" height={24} style={{ marginTop: 12 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={tests}
          keyExtractor={(item) => item.id}
          renderItem={renderTestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.pharma} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={64} color={theme.colors.surfaceMuted} />
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 16 }}>
                No tests found in this category
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
  categoriesContainer: {
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 10,
  },
  categoryBtnActive: {
    backgroundColor: theme.colors.pharma,
  },
  listContent: { padding: 16 },
  testCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  testInfo: { flex: 1 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  sampleBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookBtn: { marginLeft: 16 },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
