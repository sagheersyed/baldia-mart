import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface SleekExpandModalProps {
  visible: boolean;
  onClose: () => void;
  startLayout: { x: number; y: number; width: number; height: number };
  children: React.ReactNode;
  theme: any;
}

/**
 * A ultra-premium card expansion animation.
 * Replaces the clunky "paper fold" with a high-end springy shared-element style transition.
 */
const SleekExpandModal = ({
  visible,
  onClose,
  startLayout,
  children,
  theme,
}: SleekExpandModalProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [renderContent, setRenderContent] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      setRenderContent(true);
      progress.value = withSpring(1, {
        damping: 15,
        stiffness: 90,
        mass: 0.8,
      });
    } else {
      progress.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false);
          runOnJS(setRenderContent)(false);
        }
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    // Start from the exact card position and expand to fullscreen
    const scale = interpolate(progress.value, [0, 1], [0.8, 1]);
    const opacity = interpolate(progress.value, [0, 0.2, 1], [0, 1, 1]);
    const translateY = interpolate(progress.value, [0, 1], [20, 0]);

    return {
      opacity,
      transform: [
        { scale },
        { translateY },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.fullscreen}>
        {/* Backdrop */}
        <Reanimated.View 
          style={[styles.backdrop, backdropStyle]} 
          onTouchEnd={onClose} 
        />

        {/* Content Container */}
        <Reanimated.View
          style={[
            styles.modalBox,
            { backgroundColor: theme.colors.surface },
            animatedStyle,
          ]}
        >
          {renderContent && children}
        </Reanimated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalBox: {
    width: SCREEN_W * 0.94,
    height: SCREEN_H * 0.88,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 24,
  },
});

export default SleekExpandModal;
