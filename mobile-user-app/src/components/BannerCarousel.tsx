import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { normalizeUrl } from '../api/api';
import { theme } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_W = SCREEN_WIDTH;
const BANNER_H = 200;

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
  bannerType?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
  autoScrollInterval?: number;
  fallbackBanner?: Banner;
}

const DOT_SIZE = 6;
const DOT_ACTIVE_W = 20;

const BannerCarousel = memo(({ banners, onPress, autoScrollInterval = 4500, fallbackBanner }: BannerCarouselProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const displayBanners = banners.length > 0 ? banners : (fallbackBanner ? [fallbackBanner] : []);

  // Animated dot widths
  const dotAnims = useRef(
    displayBanners.map((_, i) => new Animated.Value(i === 0 ? DOT_ACTIVE_W : DOT_SIZE))
  ).current;

  // Animate dots when activeIndex changes
  useEffect(() => {
    dotAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === activeIndex ? DOT_ACTIVE_W : DOT_SIZE,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex, dotAnims]);

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

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
    if (idx >= 0 && idx < displayBanners.length) {
      setActiveIndex(idx);
    }
  }, [displayBanners.length]);

  if (displayBanners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        snapToInterval={BANNER_W}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingRight: 0 }}
      >
        {displayBanners.map((banner, i) => {
          const bg = banner.backgroundColor || theme.colors.primary;
          const hasImage = !!banner.imageUrl;
          const isImageOnly = banner.bannerType === 'image' || !banner.title;

          return (
            <TouchableOpacity
              key={banner.id || i}
              activeOpacity={0.95}
              onPress={() => onPress?.(banner)}
              style={[styles.slide, { backgroundColor: bg }]}
            >
              {/* Background image: blurred backdrop */}
              {hasImage && (
                <>
                  <Image
                    source={{ uri: normalizeUrl(banner.imageUrl!) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    blurRadius={24}
                    cachePolicy="memory-disk"
                  />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
                  <Image
                    source={{ uri: normalizeUrl(banner.imageUrl!) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={250}
                  />
                </>
              )}

              {/* Text overlays (only for non-image-only banners) */}
              {!isImageOnly ? (
                <>
                  {/* Gradient overlay for readability */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
                    locations={[0, 0.4, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Tag chip top-left — gradient pill */}
                  {banner.tagLabel ? (
                    <View style={styles.tag}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={styles.tagText}>{banner.tagLabel}</Text>
                    </View>
                  ) : null}

                  {/* Text at bottom */}
                  <View style={styles.textArea}>
                    <View style={styles.textRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: banner.textColor || '#fff' }]} numberOfLines={2}>
                          {banner.title}
                        </Text>
                        {banner.subtitle ? (
                          <Text style={styles.subtitle} numberOfLines={1}>
                            {banner.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {/* CTA button — glassmorphism */}
                      <View style={styles.ctaBtn}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.16)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.ctaText}>Shop Now</Text>
                        <Ionicons name="chevron-forward" size={12} color="#fff" />
                      </View>
                    </View>
                  </View>
                </>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Animated pill dots floating on top of banner */}
      {displayBanners.length > 1 && (
        <View style={styles.dotRow}>
          {displayBanners.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotAnims[i],
                  backgroundColor: i === activeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                },
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
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 4,
    position: 'relative',
  },
  slide: {
    width: BANNER_W,
    height: BANNER_H,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tag: {
    position: 'absolute',
    top: 14,
    left: 16,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textArea: {
    padding: 16,
    paddingBottom: 24, // extra padding for absolute dots floating
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  ctaText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dotRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
