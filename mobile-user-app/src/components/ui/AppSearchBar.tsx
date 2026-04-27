import React, { memo } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, ViewStyle, StyleProp, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { theme } from '../../theme/theme';

type Mode = 'tappable' | 'editable';

interface Props {
  mode?: Mode;
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  onPress?: () => void;
  onSubmit?: (v: string) => void;
  onFilter?: () => void;
  trailingFilter?: boolean;
  autoFocus?: boolean;
  inputProps?: TextInputProps;
  style?: StyleProp<ViewStyle>;
}

const AppSearchBar = memo(function AppSearchBar({
  mode = 'tappable',
  placeholder = 'Search products, brands and more',
  value,
  onChangeText,
  onPress,
  onSubmit,
  onFilter,
  trailingFilter = true,
  autoFocus,
  inputProps,
  style,
}: Props) {
  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (mode === 'tappable') {
      return (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.bar, pressed ? { opacity: 0.85 } : null]}
        >
          {children}
        </Pressable>
      );
    }
    return <View style={styles.bar}>{children}</View>;
  };

  return (
    <View style={[styles.wrap, style]}>
      <Container>
        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
        {mode === 'tappable' ? (
          <AppText
            variant="body"
            color={theme.colors.textMuted}
            style={styles.placeholder}
            numberOfLines={1}
          >
            {placeholder}
          </AppText>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            autoFocus={autoFocus}
            returnKeyType="search"
            onSubmitEditing={(e) => onSubmit?.(e.nativeEvent.text)}
            {...inputProps}
          />
        )}
        {!!value && mode === 'editable' && (
          <Pressable hitSlop={8} onPress={() => onChangeText?.('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </Container>
      {trailingFilter && onFilter ? (
        <Pressable onPress={onFilter} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  bar: {
    flex: 1,
    height: theme.sizes.inputMd,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  placeholder: { flex: 1 },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: theme.sizes.inputMd,
    height: theme.sizes.inputMd,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
});

export default AppSearchBar;
