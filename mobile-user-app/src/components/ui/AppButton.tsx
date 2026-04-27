import React, { memo } from 'react';
import {
  Pressable, View, StyleSheet, ActivityIndicator,
  PressableProps, ViewStyle, StyleProp,
} from 'react-native';
import AppText from './AppText';
import { theme } from '../../theme/theme';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'pill';
export type AppButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps extends Omit<PressableProps, 'style'> {
  label?: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  tint?: string; // override accent (e.g. food pink)
  textColor?: string;
  children?: React.ReactNode;
}

const AppButton = memo(function AppButton({
  label,
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  loading,
  fullWidth,
  style,
  tint,
  textColor,
  disabled,
  children,
  ...rest
}: AppButtonProps) {
  const height = size === 'sm' ? theme.sizes.buttonSm
    : size === 'lg' ? theme.sizes.buttonLg
    : theme.sizes.buttonMd;

  const accent = tint || theme.colors.primary;

  const styles = getStyles(variant, size, accent, !!fullWidth, !!disabled);

  const labelColor = textColor
    || (variant === 'primary' || variant === 'danger' ? theme.colors.textOnPrimary : accent);

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { height },
        style,
        pressed && !disabled ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <View style={styles.row}>
          {leadingIcon ? <View style={styles.lead}>{leadingIcon}</View> : null}
          {label ? (
            <AppText
              variant={size === 'lg' ? 'title' : 'bodyStrong'}
              color={labelColor}
            >
              {label}
            </AppText>
          ) : null}
          {children}
          {trailingIcon ? <View style={styles.trail}>{trailingIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
});

function getStyles(
  variant: AppButtonVariant,
  size: AppButtonSize,
  accent: string,
  fullWidth: boolean,
  disabled: boolean,
) {
  const radius = variant === 'pill' ? theme.radius.pill : theme.radius.lg;
  const padX = size === 'sm' ? theme.spacing.md : theme.spacing.lg;

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: accent, ...theme.shadows.sm }
      : variant === 'danger'
      ? { backgroundColor: theme.colors.danger, ...theme.shadows.sm }
      : variant === 'secondary'
      ? { backgroundColor: theme.colors.surfaceMuted }
      : variant === 'outline'
      ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: accent }
      : variant === 'pill'
      ? { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }
      : { backgroundColor: 'transparent' }; // ghost

  return StyleSheet.create({
    btn: {
      borderRadius: radius,
      paddingHorizontal: padX,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.5 : 1,
      ...variantStyle,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    lead: { marginRight: theme.spacing.xs },
    trail: { marginLeft: theme.spacing.xs },
  });
}

export default AppButton;
