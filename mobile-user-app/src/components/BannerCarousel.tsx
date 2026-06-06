// BannerCarousel.tsx — Redesigned v6 (Full Width Full Background Image & Spacing Gap)
// Features: Full screen-width edge-to-edge banners, full background cover images,
//           left-to-right contrast shadow overlays, glass deal tags, and premium paginators.

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Dimensions, Pressable, Text
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { normalizeUrl } from '../api/api';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

// Banners are full width (edge-to-edge)
const SIDE_PADDING = 0;
const SLIDE_GAP    = 0;
const SLIDE_W      = SCREEN_W;
const SLIDE_H      = Math.round(SLIDE_W * (9 / 21)); // Elegant thin aspect ratio
const SNAP_INTERVAL = SCREEN_W;

const GRADIENTS: readonly [string, string, ...string[]][] = [
  ['#FF5F6D', '#FF8F70', '#FFAF7B'], // Coral Sunset
  ['#4facfe', '#00f2fe', '#00e1fd'], // Sapphire Wave
  ['#11998e', '#38ef7d', '#5af493'], // Emerald Grass
  ['#7F00FF', '#E100FF', '#f552ff'], // Neon Purple
];

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

const BannerCarousel = memo(function BannerCarousel({
  banners,
  onPress,
  autoScrollInterval = 5000,
  fallbackBanner,
}: BannerCarouselProps) {
  const { theme } = useTheme();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayBanners = banners.length > 0
    ? banners
    : (fallbackBanner ? [fallbackBanner] : []);

  // Auto-scroll
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % displayBanners.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [displayBanners.length, autoScrollInterval]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(({ item, index }: { item: Banner; index: number }) => {
    const hasImage = !!item.imageUrl;
    const gradientColors = GRADIENTS[index % GRADIENTS.length];
    const textThemeColor = '#FFFFFF'; // Force clean high-contrast white text on overlay

    return (
      <Pressable
        onPress={() => onPress?.(item)}
        style={({ pressed }) => [
          styles.slide,
          pressed ? { opacity: 0.98 } : null,
        ]}
      >
        {/* Fallback solid gradient color */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Full background cover image */}
        {hasImage && (
          <Image
            source={{ uri: normalizeUrl(item.imageUrl!)! }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        )}

        {/* Premium left-to-right dimming overlay to make text highly readable */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.72)', 'rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Banner Content Layout */}
        <View style={styles.cardContent}>
          <View style={styles.leftCol}>
            {item.tagLabel ? (
              <View style={styles.glassTag}>
                <Text style={styles.tagText}>{item.tagLabel.toUpperCase()}</Text>
              </View>
            ) : null}

            <Text style={[styles.title, { color: textThemeColor }]} numberOfLines={2}>
              {item.title}
            </Text>

            {item.subtitle ? (
              <Text style={[styles.subtitle, { color: textThemeColor + 'CC' }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.rightCol}>
            <View style={styles.ctaCircle}>
              <Ionicons name="arrow-forward" size={18} color="#0F172A" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, []);

  if (displayBanners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={displayBanners}
        keyExtractor={(b, i) => b.id || String(i)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SNAP_INTERVAL,
          offset: SNAP_INTERVAL * index,
          index,
        })}
      />

      {/* Pagination indicators */}
      {displayBanners.length > 1 && (
        <View style={styles.indicatorContainer}>
          {displayBanners.map((_, i) => {
            const active = i === activeIndex;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: active ? 18 : 6,
                    backgroundColor: active ? theme.colors.primary : 'rgba(255,255,255,0.4)',
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
});

export default BannerCarousel;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10, // Little gap between header and banner
    marginBottom: 8,
    position: 'relative',
  },
  listContent: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 0,
  },
  slide: {
    width: SLIDE_W,
    height: SLIDE_H,
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 2,
  },
  leftCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  rightCol: {
    width: 50,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 4,
  },
  tagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
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
    marginTop: 2,
  },
  ctaCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 8,
    zIndex: 10,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
});
