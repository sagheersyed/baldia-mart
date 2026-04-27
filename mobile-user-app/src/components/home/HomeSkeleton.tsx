import React, { memo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import SkeletonBlock from '../ui/SkeletonBlock';
import { theme } from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HomeSkeleton = memo(function HomeSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Promo banner */}
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
        <SkeletonBlock width="100%" height={140} radius={theme.radius.xl} />
      </View>

      {/* Quick services rail */}
      <View style={styles.row}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={{ marginRight: theme.spacing.md, alignItems: 'center' }}>
            <SkeletonBlock width={116} height={124} radius={theme.radius.lg} />
          </View>
        ))}
      </View>

      {/* Section header + horizontal rails */}
      {[...Array(3)].map((_, sIdx) => (
        <View key={sIdx} style={{ marginTop: theme.spacing.md }}>
          <View style={[styles.sectionHeader]}>
            <SkeletonBlock width={140} height={20} radius={6} />
            <SkeletonBlock width={60} height={14} radius={6} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.md }}
          >
            {[...Array(4)].map((__, i) => (
              <View key={i} style={styles.card}>
                <SkeletonBlock width="100%" height={116} radius={theme.radius.md} />
                <View style={{ height: theme.spacing.sm }} />
                <SkeletonBlock width="80%" height={14} radius={6} />
                <View style={{ height: 6 }} />
                <SkeletonBlock width="60%" height={11} radius={6} />
                <View style={{ height: theme.spacing.sm }} />
                <SkeletonBlock width="50%" height={16} radius={6} />
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  card: {
    width: theme.sizes.productCardWLg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginRight: theme.spacing.md,
    ...theme.shadows.sm,
  },
});

export default HomeSkeleton;
