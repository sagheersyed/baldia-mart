import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { normalizeUrl } from '../api/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding each side

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  tagLabel?: string;
  backgroundColor?: string;
  textColor?: string;
  linkType?: string;
  linkId?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
  autoScrollInterval?: number; // ms, default 4000
  fallbackBanner?: Banner; // shown when banners is empty
}

const BannerCarousel = memo(({ banners, onPress, autoScrollInterval = 5000, fallbackBanner }: BannerCarouselProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayBanners = banners.length > 0 ? banners : (fallbackBanner ? [fallbackBanner] : []);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % displayBanners.length;
        scrollRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
        return next;
      });
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [displayBanners.length, autoScrollInterval]);

  if (displayBanners.length === 0) return null;

  return (
    <View style={styles.carouselWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
          setActiveIndex(idx);
        }}
        style={{ width: BANNER_WIDTH }}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {displayBanners.map((banner, i) => (
          <TouchableOpacity
            key={banner.id || i}
            style={[styles.bannerSlide, { backgroundColor: banner.backgroundColor || '#FF4500' }]}
            onPress={() => onPress?.(banner)}
            activeOpacity={0.92}
          >
            {banner.tagLabel && (
              <View style={styles.tagChip}>
                <Text style={styles.tagTxt}>{banner.tagLabel}</Text>
              </View>
            )}
            <View style={styles.slideInner}>
              <View style={styles.textArea}>
                <Text style={[styles.bannerTitle, { color: banner.textColor || '#fff' }]} numberOfLines={2}>
                  {banner.title}
                </Text>
                {banner.subtitle && (
                  <Text style={[styles.bannerSubtitle, { color: banner.textColor ? banner.textColor + 'CC' : '#FFD8C4' }]} numberOfLines={1}>
                    {banner.subtitle}
                  </Text>
                )}
                {banner.description && (
                  <Text style={[styles.bannerDesc, { color: banner.textColor ? banner.textColor + '99' : '#FFB89A' }]} numberOfLines={1}>
                    {banner.description}
                  </Text>
                )}
              </View>
              {banner.imageUrl ? (
                <Image source={{ uri: normalizeUrl(banner.imageUrl) }} style={styles.bannerImg} resizeMode="contain" />
              ) : (
                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png' }}
                  style={{ width: 80, height: 80, opacity: 0.5 }}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      {displayBanners.length > 1 && (
        <View style={styles.dotRow}>
          {displayBanners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default BannerCarousel;

const styles = StyleSheet.create({
  carouselWrap: { alignSelf: 'center', width: BANNER_WIDTH, marginTop: 8, marginBottom: 6 },
  bannerSlide: {
    width: BANNER_WIDTH, borderRadius: 20, overflow: 'hidden', padding: 20, minHeight: 130,
    elevation: 5, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  tagChip: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  tagTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  slideInner: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  textArea: { flex: 1, paddingRight: 10 },
  bannerTitle: { fontSize: 20, fontWeight: '900', lineHeight: 26, marginBottom: 6 },
  bannerSubtitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  bannerDesc: { fontSize: 11, fontWeight: '500' },
  bannerImg: { width: 90, height: 90, borderRadius: 50 },
  bannerEmoji: { fontSize: 60 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: '#FF4500' },
});
