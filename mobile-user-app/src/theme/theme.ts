// theme.ts
// BaldiaMart unified design system — v2
// Foodpanda/Pandamart inspired, but with a stronger BaldiaMart identity.
// Use these tokens via `import { theme } from '../theme/theme'`.

import { Platform, TextStyle } from 'react-native';

// ── Color palette ──────────────────────────────────────────────
const palette = {
  // Brand
  orange50: '#FFF5F1', // Soft peach background
  orange100: '#FFD8C4', // Soft border
  orange200: '#FFB28C',
  orange300: '#FF8B57',
  orange400: '#FF7033', // Mid tone
  orange500: '#FF5A1F', // Vibrant Baldia Orange
  orange600: '#E64A19', // Deep orange for gradients
  orange700: '#C43E00', // Burnt orange

  // Food — deep crimson-red, distinct from Foodpanda pink
  pink50: '#FEEBEB',
  pink100: '#FFC8C8',
  pink200: '#FF9595',
  pink300: '#F26060',
  pink400: '#E03030',
  pink500: '#C62828',
  pink600: '#A31F1F',

  // Premium / pro purple
  purple500: '#7C3AED',
  purple600: '#6D28D9',

  // Neutrals
  ink900: '#0F172A',
  ink800: '#111827',
  ink700: '#1F2937',
  ink600: '#374151',
  ink500: '#4B5563',
  ink400: '#6B7280',
  ink300: '#94A3B8',
  ink200: '#CBD5E1',
  ink100: '#E5E7EB',
  ink50: '#F1F5F9',
  ink25: '#F7F8FA',
  white: '#FFFFFF',

  // Status
  green500: '#10B981',
  green100: '#D1FAE5',
  green50: '#ECFDF5',

  red500: '#EF4444',
  red100: '#FEE2E2',
  red50: '#FEF2F2',

  amber500: '#F59E0B',
  amber100: '#FEF3C7',
  amber50: '#FFFBEB',

  blue500: '#3B82F6',
  blue100: '#DBEAFE',
  blue50: '#EFF6FF',
};

export const colors = {
  // Semantic — primary surfaces
  primary: palette.orange500,
  primaryDark: palette.orange600,
  primaryLight: palette.orange50,
  primaryBorder: palette.orange100,
  primaryOn: palette.white,

  // Mode tints
  mart: palette.orange500,
  martLight: palette.orange50,
  martDark: palette.orange600,
  martBorder: palette.orange100,

  food: palette.pink500,
  foodLight: palette.pink50,
  foodDark: palette.pink600,
  foodBorder: palette.pink100,

  rashan: '#16A34A',   // Fresh Green (Success-like but distinct)
  rashanLight: '#DCFCE7',   // Light Green background

  // Pharma — healthcare teal
  pharma: '#0D9488',   // teal-600
  pharmaLight: '#CCFBF1',   // teal-50
  pharmaBorder: '#99F6E4',   // teal-200
  pharmaDark: '#0F766E',   // teal-700

  // Backgrounds
  background: palette.ink25,
  surface: palette.white,
  surfaceMuted: palette.ink50,
  surfaceElev: palette.white,
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Text
  textHeader: palette.ink900,
  textPrimary: palette.ink800,
  textSecondary: palette.ink400,
  textMuted: palette.ink300,
  textOnPrimary: palette.white,
  link: palette.orange500,

  // Borders / dividers
  border: palette.ink100,
  borderStrong: palette.ink200,
  divider: palette.ink50,

  // Status
  success: palette.green500,
  successLight: palette.green50,
  successBorder: palette.green100,

  danger: palette.red500,
  dangerLight: palette.red50,
  dangerBorder: palette.red100,

  warning: palette.amber500,
  warningLight: palette.amber50,
  warningBorder: palette.amber100,

  info: palette.blue500,
  infoLight: palette.blue50,
  infoBorder: palette.blue100,

  // Special badges
  pro: palette.purple500,
  proLight: '#EDE9FE',
  discount: palette.red500,
  freeDelivery: palette.green500,

  // Skeleton
  skeleton: palette.ink50,
  skeletonHi: '#EAEEF3',

  // Raw palette access for edge cases
  palette,
};

// ── Typography ─────────────────────────────────────────────────
// We don't ship a custom font yet — leverage system + careful weights.
const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

const fontFamilyDisplay = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
}) as string;

type Variant =
  | 'display'      // hero numbers / amounts
  | 'h1' | 'h2' | 'h3'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline'
  | 'price'
  | 'pricePrev'
  | 'badge'
  | 'tab';

export const typography: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamilyDisplay, fontSize: 32, lineHeight: 38, fontWeight: '800', color: colors.textHeader, letterSpacing: -0.5 },
  h1: { fontFamily: fontFamilyDisplay, fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.textHeader, letterSpacing: -0.3 },
  h2: { fontFamily: fontFamilyDisplay, fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.textHeader, letterSpacing: -0.2 },
  h3: { fontFamily: fontFamilyDisplay, fontSize: 17, lineHeight: 22, fontWeight: '800', color: colors.textHeader },
  title: { fontFamily: fontFamilyDisplay, fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.textPrimary },
  body: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.textPrimary },
  bodyStrong: { fontFamily: fontFamilyDisplay, fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.textPrimary },
  caption: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.textSecondary },
  captionStrong: { fontFamily: fontFamilyDisplay, fontSize: 12, lineHeight: 16, fontWeight: '700', color: colors.textSecondary },
  overline: { fontFamily: fontFamilyDisplay, fontSize: 10, lineHeight: 14, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  price: { fontFamily: fontFamilyDisplay, fontSize: 15, lineHeight: 18, fontWeight: '800', color: colors.textHeader },
  pricePrev: { fontFamily, fontSize: 12, lineHeight: 14, fontWeight: '500', color: colors.textMuted, textDecorationLine: 'line-through' },
  badge: { fontFamily: fontFamilyDisplay, fontSize: 10, lineHeight: 12, fontWeight: '800', color: colors.textOnPrimary, letterSpacing: 0.4 },
  tab: { fontFamily: fontFamilyDisplay, fontSize: 11, lineHeight: 14, fontWeight: '700' },
};

// ── Spacing scale ──────────────────────────────────────────────
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

// ── Radius scale ───────────────────────────────────────────────
export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

// ── Component sizes ────────────────────────────────────────────
export const sizes = {
  buttonSm: 36,
  buttonMd: 44,
  buttonLg: 52,
  inputSm: 40,
  inputMd: 48,
  inputLg: 56,
  iconBtn: 40,
  iconSmBtn: 32,
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 64,
  productCardW: 152,
  productCardWLg: 168,
  storeCardW: 168,
  categoryCardW: 86,
  tabBarHeight: 70,
  headerHeight: 56,
} as const;

// ── Shadows ────────────────────────────────────────────────────
export const shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  food: {
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ── Z-index ────────────────────────────────────────────────────
export const zIndex = {
  base: 0,
  card: 1,
  raised: 2,
  sticky: 5,
  overlay: 10,
  modal: 20,
  toast: 30,
} as const;

// ── Animation ──────────────────────────────────────────────────
export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

// ── Public theme object ────────────────────────────────────────
export const theme = {
  colors,
  typography,
  spacing,
  radius,
  sizes,
  shadows,
  zIndex,
  motion,
  // Backwards-compat aliases used by older screens
  borderRadius: {
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
    max: radius.pill,
  },
};

export type Theme = typeof theme;
export default theme;
