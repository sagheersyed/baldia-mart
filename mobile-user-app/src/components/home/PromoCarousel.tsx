import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import BannerCarousel from '../BannerCarousel';

interface PromoCarouselProps {
  banners: any[];
  onPress: (banner: any) => void;
}

const FALLBACK_BANNER = {
  id: 'mart-fallback',
  title: 'Welcome to BaldiaMart',
  subtitle: 'Get 20% off on your first order. Use code: FIRST20',
  tagLabel: '🎉 New Users',
  backgroundColor: '#FF4500',
  textColor: '#fff',
};

const PromoCarousel = memo(function PromoCarousel({ banners, onPress }: PromoCarouselProps) {
  return (
    <View style={styles.wrap}>
      <BannerCarousel
        banners={banners}
        autoScrollInterval={5000}
        fallbackBanner={FALLBACK_BANNER}
        onPress={onPress}
      />
    </View>
  );
});

export default PromoCarousel;

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
});
