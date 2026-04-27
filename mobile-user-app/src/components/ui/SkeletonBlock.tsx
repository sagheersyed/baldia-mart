import React, { memo, useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../theme/theme';

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const SkeletonBlock = memo(function SkeletonBlock({
  width = '100%', height = 14, radius = theme.radius.sm, style,
}: Props) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
});

export default SkeletonBlock;
