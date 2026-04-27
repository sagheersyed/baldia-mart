import React, { memo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import AppText from './AppText';
import { theme } from '../../theme/theme';

interface Props {
  price: number;
  oldPrice?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a final price + an optional crossed-out original price.
 * Pass `price` already discounted; `oldPrice` is the strike-through price.
 */
const PriceText = memo(function PriceText({
  price, oldPrice, currency = 'Rs.', size = 'md', align = 'horizontal', style,
}: Props) {
  const showOld = typeof oldPrice === 'number' && oldPrice > price;

  const priceVariant = size === 'lg' ? 'h3' : size === 'sm' ? 'bodyStrong' : 'price';

  return (
    <View
      style={[
        {
          flexDirection: align === 'horizontal' ? 'row' : 'column',
          alignItems: align === 'horizontal' ? 'baseline' : 'flex-start',
          gap: align === 'horizontal' ? 6 : 0,
        },
        style,
      ]}
    >
      <AppText variant={priceVariant} color={theme.colors.textHeader}>
        {currency} {Math.round(price).toLocaleString()}
      </AppText>
      {showOld ? (
        <AppText variant="pricePrev">
          {currency} {Math.round(oldPrice!).toLocaleString()}
        </AppText>
      ) : null}
    </View>
  );
});

export default PriceText;
