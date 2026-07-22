import React, { memo } from 'react';
import BannerCarousel from '../BannerCarousel';

interface PromoCarouselProps {
  banners: any[];
  onPress: (banner: any) => void;
}

const FALLBACK_BANNER = {
  id: 'mart-fallback',
  title: 'Welcome to BaldiaMart',
  subtitle: 'Get 20% off your first order',
  tagLabel: 'NEW USER',
  backgroundColor: '#FF5A1F',
  textColor: '#fff',
};

const PromoCarousel = memo(function PromoCarousel({ banners, onPress }: PromoCarouselProps) {
  return (
    <BannerCarousel
      banners={banners}
      autoScrollInterval={5000}
      fallbackBanner={FALLBACK_BANNER}
      onPress={onPress}
    />
  );
});

export default PromoCarousel;
