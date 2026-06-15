import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CRINKLE_TEXTURE = require('../../../assets/paper_crinkle_texture.png');

interface PaperFlipModalProps {
  visible: boolean;
  onClose: () => void;
  startLayout: { x: number; y: number; width: number; height: number };
  children: React.ReactNode;
  theme: any;
}

const PaperUnfoldModal = ({
  visible,
  onClose,
  startLayout,
  children,
  theme,
}: PaperFlipModalProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showRealContent, setShowRealContent] = useState(false);

  const progress = useSharedValue(0); 

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      progress.value = withSpring(1, { damping: 18, stiffness: 80 });
      // Transition to real content after animation finishes
      setTimeout(() => setShowRealContent(true), 600);
    } else {
      setShowRealContent(false);
      progress.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
  }, [visible]);

  const MODAL_W = SCREEN_W * 0.94;
  const MODAL_H = SCREEN_H * 0.86;
  const SEG_COUNT = 6;
  const SEG_H = MODAL_H / SEG_COUNT;

  const containerStyle = useAnimatedStyle(() => {
    const x = interpolate(progress.value, [0, 1], [startLayout.x + startLayout.width/2, SCREEN_W/2]);
    const y = interpolate(progress.value, [0, 1], [startLayout.y + startLayout.height/2, SCREEN_H/2]);
    
    // Scale and chaotic rotation at the start (crumpled ball phase)
    const scale = interpolate(progress.value, [0, 0.4, 1], [0.15, 0.6, 1]);
    const rotateZ = interpolate(progress.value, [0, 0.5], [45, 0]);
    const rotateY = interpolate(progress.value, [0, 0.5], [180, 0]);

    return {
      position: 'absolute',
      left: x - MODAL_W / 2,
      top: y - MODAL_H / 2,
      width: MODAL_W,
      height: MODAL_H,
      transform: [
        { scale },
        { rotateZ: `${rotateZ}deg` },
        { rotateY: `${rotateY}deg` },
      ],
      opacity: interpolate(progress.value, [0, 0.1], [0, 1]),
    };
  });

  const makeSegStyle = (isEven: boolean) => useAnimatedStyle(() => {
    const rot = interpolate(progress.value, [0.4, 1], [isEven ? -140 : 140, 0], Extrapolate.CLAMP);
    const anchorY = isEven ? SEG_H : 0;
    return {
      height: SEG_H, backgroundColor: '#fff', overflow: 'hidden',
      transform: [{ perspective: 2000 }, { translateY: anchorY - SEG_H / 2 }, { rotateX: `${rot}deg` }, { translateY: -(anchorY - SEG_H / 2) }],
    };
  });

  const makeShadowStyle = () => useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject, backgroundColor: 'black',
    opacity: interpolate(progress.value, [0.4, 0.9], [0.4, 0]),
  }));

  const makeCrinkleStyle = () => useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    opacity: interpolate(progress.value, [0, 0.6, 1], [0.9, 0.5, 0]),
  }));

  // Each hook call is at top level — Rules of Hooks satisfied
  const s0 = makeSegStyle(true);  const sh0 = makeShadowStyle(); const cr0 = makeCrinkleStyle();
  const s1 = makeSegStyle(false); const sh1 = makeShadowStyle(); const cr1 = makeCrinkleStyle();
  const s2 = makeSegStyle(true);  const sh2 = makeShadowStyle(); const cr2 = makeCrinkleStyle();
  const s3 = makeSegStyle(false); const sh3 = makeShadowStyle(); const cr3 = makeCrinkleStyle();
  const s4 = makeSegStyle(true);  const sh4 = makeShadowStyle(); const cr4 = makeCrinkleStyle();
  const s5 = makeSegStyle(false); const sh5 = makeShadowStyle(); const cr5 = makeCrinkleStyle();

  if (!modalVisible) return null;

  const seg = (idx: number, segStyle: any, shadowStyle: any, crinkleStyle: any) => (
    <Reanimated.View key={idx} style={segStyle}>
      <View style={{ width: MODAL_W, height: MODAL_H, top: -idx * SEG_H }}>{children}</View>
      <Reanimated.Image source={CRINKLE_TEXTURE} style={[StyleSheet.absoluteFillObject, crinkleStyle]} resizeMode="cover" />
      <Reanimated.View style={[StyleSheet.absoluteFillObject, shadowStyle]} />
      <View style={styles.crease} />
    </Reanimated.View>
  );

  return (
    <Modal visible={modalVisible} transparent statusBarTranslucent animationType="none">
      <View style={styles.fullscreen}>
        <Reanimated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onTouchEnd={onClose} />
        <Reanimated.View style={containerStyle}>
          {seg(0, s0, sh0, cr0)}
          {seg(1, s1, sh1, cr1)}
          {seg(2, s2, sh2, cr2)}
          {seg(3, s3, sh3, cr3)}
          {seg(4, s4, sh4, cr4)}
          {seg(5, s5, sh5, cr5)}
          {showRealContent && (
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceMuted }]}>
              <View style={{ width: 18, height: 2, backgroundColor: '#333', transform: [{ rotate: '45deg' }], position: 'absolute' }} />
              <View style={{ width: 18, height: 2, backgroundColor: '#333', transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
            </Pressable>
          )}
        </Reanimated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  crease: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
      backgroundColor: 'rgba(0,0,0,0.08)',
  },
  closeBtn: {
    position: 'absolute', top: -12, right: -12, width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 7,
  }
});

export default PaperUnfoldModal;
