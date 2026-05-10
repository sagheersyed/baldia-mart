import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { normalizeUrl } from '../api/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Full-width: edge-to-edge minus horizontal page padding (16 each side)
const BANNER_W = SCREEN_WIDTH - 32;
const BANNER_H = 160;

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
  autoScrollInterval?: number;
  fallbackBanner?: Banner;
}

const BannerCarousel = memo(({ banners, onPress, autoScrollInterval = 4500, fallbackBanner }: BannerCarouselProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const displayBanners = banners.length > 0 ? banners : (fallbackBanner ? [fallbackBanner] : []);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % displayBanners.length;
        scrollRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
        return next;
      });
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [displayBanners.length, autoScrollInterval]);

  if (displayBanners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={BANNER_W}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
          setActiveIndex(idx);
        }}
        contentContainerStyle={{ paddingRight: 0 }}
      >
        {displayBanners.map((banner, i) => {
          const bg = banner.backgroundColor || '#FF4500';
          const hasImage = !!banner.imageUrl;

          return (
            <TouchableOpacity
              key={banner.id || i}
              activeOpacity={0.93}
              onPress={() => onPress?.(banner)}
              style={[styles.slide, { backgroundColor: bg, marginRight: i < displayBanners.length - 1 ? 12 : 0 }]}
            >
              {/* Background image fills entire card */}
              {hasImage && (
                <Image
                  source={{ uri: normalizeUrl(banner.imageUrl!) }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}

              {/* Dark gradient overlay for text readability */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.65)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Tag chip top-left */}
              {banner.tagLabel ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{banner.tagLabel}</Text>
                </View>
              ) : null}

              {/* Text at bottom */}
              <View style={styles.textArea}>
                <Text style={[styles.title, { color: banner.textColor || '#fff' }]} numberOfLines={2}>
                  {banner.title}
                </Text>
                {banner.subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {banner.subtitle}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modern pill dots */}
      {displayBanners.length > 1 && (
        <View style={styles.dotRow}>
          {displayBanners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : null,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default BannerCarousel;

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  slide: {
    width: BANNER_W,
    height: BANNER_H,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    // Brand shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  tag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  textArea: {
    padding: 16,
    gap: 3,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4500',
  },
});
