import React, { memo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import AppText from './AppText';
import { theme } from '../../theme/theme';

export type BadgeVariant =
  | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'
  | 'pro' | 'discount' | 'free' | 'food';

interface Props {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  leadingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<BadgeVariant, { bg: string; fg: string; border?: string }> = {
  primary:  { bg: theme.colors.primaryLight,  fg: theme.colors.primary,    border: theme.colors.primaryBorder },
  success:  { bg: theme.colors.successLight,  fg: theme.colors.success,    border: theme.colors.successBorder },
  danger:   { bg: theme.colors.dangerLight,   fg: theme.colors.danger,     border: theme.colors.dangerBorder },
  warning:  { bg: theme.colors.warningLight,  fg: theme.colors.warning,    border: theme.colors.warningBorder },
  info:     { bg: theme.colors.infoLight,     fg: theme.colors.info,       border: theme.colors.infoBorder },
  neutral:  { bg: theme.colors.surfaceMuted,  fg: theme.colors.textSecondary, border: theme.colors.border },
  pro:      { bg: theme.colors.proLight,      fg: theme.colors.pro,        border: '#E0D7FE' },
  discount: { bg: theme.colors.discount,      fg: theme.colors.textOnPrimary },
  free:     { bg: theme.colors.successLight,  fg: theme.colors.success },
  food:     { bg: theme.colors.foodLight,     fg: theme.colors.food,       border: theme.colors.foodBorder },
};

const AppBadge = memo(function AppBadge({
  label,
  variant = 'neutral',
  size = 'sm',
  leadingIcon,
  style,
}: Props) {
  const v = VARIANTS[variant];
  const padX = size === 'sm' ? theme.spacing.sm : theme.spacing.md;
  const padY = size === 'sm' ? 3 : 5;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          paddingHorizontal: padX,
          paddingVertical: padY,
          borderRadius: theme.radius.pill,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {leadingIcon}
      <AppText
        variant={size === 'sm' ? 'badge' : 'captionStrong'}
        color={v.fg}
        style={size === 'sm' ? null : { fontSize: 11 }}
      >
        {label}
      </AppText>
    </View>
  );
});

export default AppBadge;
