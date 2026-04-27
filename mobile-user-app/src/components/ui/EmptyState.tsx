import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import AppButton from './AppButton';
import { theme } from '../../theme/theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  emoji?: string;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

const EmptyState = memo(function EmptyState({
  icon = 'sparkles-outline',
  emoji,
  title = 'Nothing here yet',
  subtitle = 'Try refreshing or check back soon.',
  actionLabel,
  onAction,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconCircle}>
        {emoji ? (
          <AppText variant="h1">{emoji}</AppText>
        ) : (
          <Ionicons name={icon} size={32} color={theme.colors.textSecondary} />
        )}
      </View>
      <AppText variant="h3" align="center">{title}</AppText>
      <AppText variant="caption" align="center" style={styles.subtitle}>{subtitle}</AppText>
      {onAction && actionLabel ? (
        <AppButton label={actionLabel} variant="outline" onPress={onAction} style={{ marginTop: theme.spacing.lg, alignSelf: 'center', paddingHorizontal: theme.spacing.xxl }} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  subtitle: { marginTop: 6, maxWidth: 280 },
});

export default EmptyState;
