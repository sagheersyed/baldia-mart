import React, { memo } from 'react';
import { Text as RNText, TextProps, TextStyle, StyleProp } from 'react-native';
import { theme } from '../../theme/theme';

type Variant = keyof typeof theme.typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: TextStyle['fontWeight'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  uppercase?: boolean;
}

/**
 * AppText — single source of truth for typography.
 * Pass a `variant` matching one of the design system text styles.
 */
const AppText = memo(function AppText({
  variant = 'body',
  color,
  align,
  weight,
  uppercase,
  style,
  children,
  ...rest
}: AppTextProps) {
  const base = theme.typography[variant];
  return (
    <RNText
      {...rest}
      style={[
        base,
        color ? { color } : null,
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
});

export default AppText;
