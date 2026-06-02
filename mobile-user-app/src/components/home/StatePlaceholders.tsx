import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import AppText from '../ui/AppText';
import { EmptyState as UIEmptyState, ErrorState as UIErrorState } from '../ui';
import { theme } from '../../theme/theme';

/**
 * Backwards-compatible shims so older imports still work.
 * Prefer `import { EmptyState, ErrorState } from '../ui'` going forward.
 */

interface LegacyEmptyProps {
  title?: string;
  subtitle?: string;
  /** Either an Ionicons name or an emoji glyph (legacy callers pass emojis) */
  icon?: any;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = function EmptyState({ icon, ...rest }: LegacyEmptyProps) {
  const isEmoji = typeof icon === 'string'
    && (icon.length <= 4 && /\p{Extended_Pictographic}/u.test(icon));
  return <UIEmptyState {...rest} emoji={isEmoji ? icon : undefined} icon={!isEmoji ? icon : undefined} />;
};

export const ErrorState = UIErrorState;

export const InlineLoading = function InlineLoading({ label = 'Loading...' }: { label?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
};
