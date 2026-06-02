import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import AppButton from './AppButton';
import { theme } from '../../theme/theme';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ErrorState = memo(function ErrorState({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.colors.danger} />
      </View>
      <AppText variant="h3" align="center">{title}</AppText>
      <AppText variant="caption" align="center" style={{ marginTop: 6 }}>{message}</AppText>
      {onRetry ? (
        <AppButton label="Try again" onPress={onRetry} style={{ marginTop: theme.spacing.lg }} />
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
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
});

export default ErrorState;
