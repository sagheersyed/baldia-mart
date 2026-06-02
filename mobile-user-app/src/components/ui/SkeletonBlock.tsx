import React, { memo, useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, StyleProp, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Premium shimmer skeleton — sweeping highlight moves left-to-right
 * like Foodpanda / Daraz skeleton screens.
 */
const SkeletonBlock = memo(function SkeletonBlock({
  width = '100%', height = 14, radius = theme.radius.sm, style,
}: Props) {
  const shimmerTranslate = useRef(new Animated.Value(-SCREEN_W)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: SCREEN_W,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerTranslate]);

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Shimmer sweep */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.shimmer,
          { transform: [{ translateX: shimmerTranslate }] },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  shimmer: {
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ skewX: '-20deg' }],
  },
});

export default SkeletonBlock;
