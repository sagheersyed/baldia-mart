import React, { memo, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import ProductCard, { ProductCardProduct } from './ProductCard';
import SectionHeader from '../ui/SectionHeader';
import type { HomeSectionPayload } from '../../api/api';
import { theme } from '../../theme/theme';

interface HomeSectionProps {
  section: HomeSectionPayload;
  cartQuantities: Record<string, number>;
  isFavourite?: (id: string) => boolean;
  onProductPress?: (p: any) => void;
  onAdd: (p: any) => void;
  onIncrement: (p: any) => void;
  onDecrement: (p: any) => void;
  onToggleFavourite?: (p: any) => void;
  onSeeAll?: (section: HomeSectionPayload) => void;
  tint?: string;
}

const HomeSection = memo(function HomeSection({
  section,
  cartQuantities,
  isFavourite,
  onProductPress,
  onAdd,
  onIncrement,
  onDecrement,
  onToggleFavourite,
  onSeeAll,
  tint,
}: HomeSectionProps) {
  const isHorizontal = section.layout !== 'grid-2';

  const renderHorizontalCard = useCallback(({ item }: { item: ProductCardProduct }) => (
    <ProductCard
      key={item.id}
      product={item}
      cartQty={cartQuantities[item.id] || 0}
      variant="horizontal"
      isFavourite={isFavourite?.(item.id)}
      onPress={() => onProductPress?.(item)}
      onAdd={() => onAdd(item)}
      onIncrement={() => onIncrement(item)}
      onDecrement={() => onDecrement(item)}
      onToggleFavourite={onToggleFavourite ? () => onToggleFavourite(item) : undefined}
      tint={tint}
    />
  ), [cartQuantities, isFavourite, onProductPress, onAdd, onIncrement, onDecrement, onToggleFavourite, tint]);

  if (!section.products?.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title={section.title}
        subtitle={section.subtitle}
        onAction={section.viewAll ? () => onSeeAll?.(section) : undefined}
      />

      {isHorizontal ? (
        <FlatList
          data={section.products}
          horizontal
          keyExtractor={(item: any) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderHorizontalCard}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
        />
      ) : (
        <View style={styles.grid}>
          {section.products.slice(0, 10).map(item => (
            <View key={item.id} style={styles.gridItem}>
              <ProductCard
                product={item}
                cartQty={cartQuantities[item.id] || 0}
                variant="grid"
                isFavourite={isFavourite?.(item.id)}
                onPress={() => onProductPress?.(item)}
                onAdd={() => onAdd(item)}
                onIncrement={() => onIncrement(item)}
                onDecrement={() => onDecrement(item)}
                onToggleFavourite={onToggleFavourite ? () => onToggleFavourite(item) : undefined}
                tint={tint}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingBottom: theme.spacing.lg },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.sm,
  },
  gridItem: { width: '50%' },
});

export default HomeSection;
