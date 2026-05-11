import React, { memo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import AppText from './AppText';
import { theme } from '../../theme/theme';

export type BadgeVariant =
  | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'
  | 'pro' | 'discount' | 'free' | 'food' | 'secondary';

interface Props {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  leadingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
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
  secondary: { bg: theme.colors.surfaceMuted, fg: theme.colors.textSecondary, border: theme.colors.border },
};

const AppBadge = memo(function AppBadge({
  label,
  variant = 'neutral',
  size = 'sm',
  leadingIcon,
  style,
  tint,
}: Props) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  const padX = size === 'sm' ? theme.spacing.sm : theme.spacing.md;
  const padY = size === 'sm' ? 3 : 5;

  const backgroundColor = (variant === 'secondary' && tint) ? tint + '14' : v.bg;
  const textColor = (variant === 'secondary' && tint) ? tint : v.fg;
  const borderColor = (variant === 'secondary' && tint) ? tint + '30' : v.border;

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
          backgroundColor,
          borderWidth: borderColor ? 1 : 0,
          borderColor,
        },
        style,
      ]}
    >
      {leadingIcon}
      <AppText
        variant={size === 'sm' ? 'badge' : 'captionStrong'}
        color={textColor}
        style={size === 'sm' ? null : { fontSize: 11 }}
      >
        {label}
      </AppText>
    </View>
  );
});

export default AppBadge;
