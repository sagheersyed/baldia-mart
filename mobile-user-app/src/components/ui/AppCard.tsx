import React, { memo } from 'react';
import { View, ViewStyle, StyleProp, Pressable } from 'react-native';
import { theme } from '../../theme/theme';

interface Props {
  padded?: boolean | 'sm' | 'md' | 'lg';
  radius?: keyof typeof theme.radius;
  shadow?: keyof typeof theme.shadows | false;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onPress?: () => void;
  bg?: string;
}

const AppCard = memo(function AppCard({
  padded = true,
  radius = 'lg',
  shadow = 'sm',
  style,
  children,
  onPress,
  bg = theme.colors.surface,
}: Props) {
  const padding =
    padded === false || padded === undefined
      ? 0
      : padded === 'sm'
      ? theme.spacing.md
      : padded === 'lg'
      ? theme.spacing.xl
      : theme.spacing.lg;

  const baseStyle: ViewStyle = {
    backgroundColor: bg,
    borderRadius: theme.radius[radius],
    padding,
    ...(shadow ? theme.shadows[shadow] : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
});

export default AppCard;
