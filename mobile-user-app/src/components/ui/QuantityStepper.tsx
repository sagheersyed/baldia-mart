import React, { memo } from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { theme } from '../../theme/theme';

interface Props {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

const QuantityStepper = memo(function QuantityStepper({
  quantity, onIncrement, onDecrement, disabled, size = 'md', tint = theme.colors.primary, style,
}: Props) {
  const h = size === 'sm' ? 30 : 36;
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <View
      style={[
        styles.wrap,
        {
          height: h,
          backgroundColor: tint,
          borderRadius: h / 2,
          opacity: disabled ? 0.5 : 1,
          marginBottom: theme.spacing.lg,
          // marginRight:theme.spacing.lg,
        },
        style,
      ]}
    >
      <Pressable
        onPress={onDecrement}
        disabled={disabled}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, { width: h, height: h }, pressed ? { opacity: 0.6 } : null]}
      >
        <Ionicons name="remove" size={iconSize} color={theme.colors.textOnPrimary} />
      </Pressable>
      <AppText variant="bodyStrong" color={theme.colors.textOnPrimary} style={styles.count}>
        {quantity}
      </AppText>
      <Pressable
        onPress={onIncrement}
        disabled={disabled}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, { width: h, height: h }, pressed ? { opacity: 0.6 } : null]}
      >
        <Ionicons name="add" size={iconSize} color={theme.colors.textOnPrimary} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  btn: { alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 10, textAlign: 'center' },
});

export default QuantityStepper;
