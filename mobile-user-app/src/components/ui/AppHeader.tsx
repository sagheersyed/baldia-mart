import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import AppIconButton from './AppIconButton';
import { theme } from '../../theme/theme';

interface Props {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
  bg?: string;
  border?: boolean;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard app header (used on detail / push screens). For complex branded headers
 * (Home), build them inline using primitives instead of forcing this component.
 */
const AppHeader = memo(function AppHeader({
  title, subtitle, onBack, trailing,
  bg = theme.colors.surface, border = true, centered = false, style,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: bg, borderBottomWidth: border ? 1 : 0 },
        style,
      ]}
    >
      {onBack ? (
        <AppIconButton size={theme.sizes.iconSmBtn} bg={theme.colors.surfaceMuted} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
      ) : <View style={{ width: theme.sizes.iconSmBtn }} />}

      <View style={[styles.titleWrap, centered ? { alignItems: 'center' } : null]}>
        {title ? (
          <AppText variant="h3" numberOfLines={1}>{title}</AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.trail}>{trailing}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: theme.sizes.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
    borderBottomColor: theme.colors.border,
  },
  titleWrap: { flex: 1, justifyContent: 'center' },
  trail: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
});

export default AppHeader;
