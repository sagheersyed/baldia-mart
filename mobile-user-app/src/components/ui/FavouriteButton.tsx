import React, { memo } from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface Props {
  active: boolean;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'overlay' | 'inline';
}

const FavouriteButton = memo(function FavouriteButton({
  active, onPress, size = 32, style, variant = 'overlay',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: variant === 'overlay' ? theme.colors.surface : 'transparent',
        },
        variant === 'overlay' ? theme.shadows.sm : null,
        pressed ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      <Ionicons
        name={active ? 'heart' : 'heart-outline'}
        size={size * 0.5}
        color={active ? theme.colors.danger : theme.colors.textSecondary}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});

export default FavouriteButton;
