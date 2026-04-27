import React, { memo } from 'react';
import { Pressable, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../theme/theme';

interface Props {
  size?: number;
  bg?: string;
  border?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  children: React.ReactNode;
  disabled?: boolean;
  shadow?: boolean;
}

const AppIconButton = memo(function AppIconButton({
  size = theme.sizes.iconBtn,
  bg = theme.colors.surface,
  border,
  onPress,
  style,
  hitSlop = 6,
  children,
  disabled,
  shadow = false,
}: Props) {
  return (
    <Pressable
      hitSlop={hitSlop}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: border ? 1 : 0,
          borderColor: border,
          opacity: disabled ? 0.4 : 1,
        },
        shadow ? theme.shadows.sm : null,
        pressed ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
});

export default AppIconButton;
