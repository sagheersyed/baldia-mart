// BannerCarousel — Foodpanda-inspired inset rounded promo banners

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Dimensions, Pressable, Text,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { normalizeUrl } from '../api/api';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

const SIDE_PADDING = 16;
const SLIDE_GAP = 10;
const SLIDE_W = SCREEN_W - SIDE_PADDING * 2;
const SLIDE_H = Math.round(SLIDE_W * 0.42);
const SNAP_INTERVAL = SLIDE_W + SLIDE_GAP;

const GRADIENTS: readonly [string, string, ...string[]][] = [
  ['#D70F64', '#FF4D8D'],
  ['#1A1A2E', '#16213E'],
  ['#0F766E', '#14B8A6'],
  ['#C2410C', '#EA580C'],
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

    return (
      <Pressable
        onPress={() => onPress?.(item)}
        style={({ pressed }) => [
          styles.slide,
          pressed ? { opacity: 0.96 } : null,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {hasImage && (
          <Image
            source={{ uri: normalizeUrl(item.imageUrl!)! }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.cardContent}>
          <View style={styles.leftCol}>
            {item.tagLabel ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.tagLabel.toUpperCase()}</Text>
              </View>
            ) : null}

            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {item.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.ctaCircle}>
            <Ionicons name="arrow-forward" size={16} color="#111" />
          </View>
        </View>
      </Pressable>
    );
  }, [onPress]);

  if (displayBanners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={displayBanners}
        keyExtractor={(b, i) => b.id || String(i)}
        renderItem={renderItem}
        horizontal
        pagingEnabled={false}
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
        ItemSeparatorComponent={() => <View style={{ width: SLIDE_GAP }} />}
      />

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
                    width: active ? 16 : 6,
                    backgroundColor: active
                      ? theme.colors.primary
                      : theme.colors.borderStrong,
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
    marginTop: 12,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: SIDE_PADDING,
  },
  slide: {
    width: SLIDE_W,
    height: SLIDE_H,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingRight: 12,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  tagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  ctaCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    height: 8,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
});
