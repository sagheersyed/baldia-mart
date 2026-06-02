import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { 
  Gesture, 
  GestureDetector, 
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  maxRotation?: number; // Max degrees to tilt
}

/**
 * Animated3DCard
 * A wrapper component that adds a 3D perspective tilt effect to its children.
 * Uses GPU-accelerated animations for zero performance impact.
 */
const Animated3DCard: React.FC<Props> = ({ 
  children, 
  maxRotation = 15 
}) => {
  // Shared values for tracking touch position
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Gesture handler to track finger movement
  const gesture = Gesture.Pan()
    .onBegin(() => {
      // Scale up slightly when touched
      scale.value = withSpring(1.02);
    })
    .onUpdate((event) => {
      // event.x and event.y are relative to the component
      // We assume the card is centered locally or we use the layout dimensions
      // For simplicity, we interpolate the translation values
      // maxRotation determines the "steepness" of the tilt
      rotateY.value = interpolate(
        event.translationX,
        [-100, 100],
        [-maxRotation, maxRotation],
        Extrapolate.CLAMP
      );
      rotateX.value = interpolate(
        event.translationY,
        [-100, 100],
        [maxRotation, -maxRotation], // Inverted for natural tilt
        Extrapolate.CLAMP
      );
    })
    .onFinalize(() => {
      // Revert to original state with a bouncy spring
      rotateX.value = withSpring(0, { damping: 10, stiffness: 80 });
      rotateY.value = withSpring(0, { damping: 10, stiffness: 80 });
      scale.value = withSpring(1, { damping: 10, stiffness: 80 });
    });

  // Animated styles applied to the container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 800 }, // Creates the 3D depth
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { scale: scale.value },
      ] as any,
      // Dynamic shadow scaling for depth
      shadowOpacity: Platform.OS === 'ios' ? interpolate(scale.value, [1, 1.05], [0.1, 0.3]) : undefined,
      shadowRadius: Platform.OS === 'ios' ? interpolate(scale.value, [1, 1.05], [5, 15]) : undefined,
      elevation: Platform.OS === 'android' ? interpolate(scale.value, [1, 1.05], [2, 12]) : undefined,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    // We don't force a size here so it wraps children tightly
  },
});

export default Animated3DCard;
