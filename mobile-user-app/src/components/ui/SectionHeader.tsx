import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { theme } from '../../theme/theme';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  inset?: boolean;
}

const SectionHeader = memo(function SectionHeader({
  title, subtitle, actionLabel = 'See all', onAction, inset = true,
}: Props) {
  return (
    <View style={[styles.row, inset ? { paddingHorizontal: theme.spacing.lg } : null]}>
      <View style={{ flex: 1 }}>
        <AppText variant="h2" numberOfLines={1}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" style={{ marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.7 } : null]}
        >
          <AppText variant="bodyStrong" color={theme.colors.primary}>{actionLabel}</AppText>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

export default SectionHeader;
