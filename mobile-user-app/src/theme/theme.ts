// theme.ts — BaldiaMart Premium Design System v3
// Poppins font + Rich palette + Dark Mode support
// Usage: import { theme, darkTheme } from '../theme/theme'

import { Platform, TextStyle } from 'react-native';

// ── Raw Palette ───────────────────────────────────────────────
const palette = {
  // Brand — Deeper, richer orange
  orange50:  '#FFF4EE',
  orange100: '#FFD8C0',
  orange200: '#FFB38A',
  orange300: '#FF8C54',
  orange400: '#FF6B2B',
  orange500: '#FF5A1F', // Primary
  orange600: '#E63900', // Deep
  orange700: '#C03000', // Darkest

  // Gradient stops (premium warm)
  gradStart: '#C0390A',
  gradMid:   '#FF5A1F',
  gradEnd:   '#FF8144',

  // Food — Deep crimson
  pink50:  '#FEEBEB',
  pink100: '#FFC8C8',
  pink200: '#FF9595',
  pink300: '#F26060',
  pink400: '#E03030',
  pink500: '#C62828',
  pink600: '#A31F1F',

  // Premium Purple (pro tier)
  purple500: '#7C3AED',
  purple600: '#6D28D9',

  // Neutrals — Light mode
  ink900: '#0A0F1E',
  ink800: '#111827',
  ink700: '#1E293B',
  ink600: '#334155',
  ink500: '#475569',
  ink400: '#64748B',
  ink300: '#94A3B8',
  ink200: '#CBD5E1',
  ink100: '#E2E8F0',
  ink50:  '#F1F5F9',
  ink25:  '#F4F6FB', // Slightly cool-white for bg
  white:  '#FFFFFF',

  // Dark mode surfaces
  dark900: '#080C14',
  dark800: '#0D1117',
  dark700: '#13181F',
  dark600: '#1C2230',
  dark500: '#232B3A',
  dark400: '#2D3748',
  dark300: '#374151',
  dark200: '#4B5563',

  // Status
  green500: '#10B981',
  green100: '#D1FAE5',
  green50:  '#ECFDF5',

  red500:  '#EF4444',
  red100:  '#FEE2E2',
  red50:   '#FEF2F2',

  amber500: '#F59E0B',
  amber100: '#FEF3C7',
  amber50:  '#FFFBEB',

  blue500: '#3B82F6',
  blue100: '#DBEAFE',
  blue50:  '#EFF6FF',

  teal600: '#0D9488',
  teal700: '#0F766E',
  teal50:  '#CCFBF1',
  teal200: '#99F6E4',
};

// ── Light Colors ──────────────────────────────────────────────
export const lightColors = {
  // Primary brand
  primary:       palette.orange500,
  primaryDark:   palette.orange600,
  primaryDeep:   palette.orange700,
  primaryLight:  palette.orange50,
  primaryBorder: palette.orange100,
  primaryOn:     palette.white,

  // Gradient stops (used in LinearGradient)
  gradStart: palette.gradStart,
  gradMid:   palette.gradMid,
  gradEnd:   palette.gradEnd,

  // Mode tints
  mart:       palette.orange500,
  martLight:  palette.orange50,
  martDark:   palette.orange600,
  martDeep:   palette.orange700,
  martBorder: palette.orange100,

  food:       palette.pink500,
  foodLight:  palette.pink50,
  foodDark:   palette.pink600,
  foodBorder: palette.pink100,

  rashan:      '#16A34A',
  rashanLight: '#DCFCE7',

  pharma:       palette.teal600,
  pharmaLight:  palette.teal50,
  pharmaBorder: palette.teal200,
  pharmaDark:   palette.teal700,

  // Surfaces
  background:     palette.ink25,
  surface:        palette.white,
  surfaceMuted:   palette.ink50,
  surfaceElev:    palette.white,
  surfaceCard:    palette.white,
  overlay:        'rgba(10, 15, 30, 0.5)',

  // Text
  textHeader:    palette.ink900,
  textPrimary:   palette.ink800,
  textSecondary: palette.ink400,
  textMuted:     palette.ink300,
  textOnPrimary: palette.white,
  link:          palette.orange500,

  // Borders
  border:       palette.ink100,
  borderStrong: palette.ink200,
  divider:      palette.ink50,

  // Status
  success:       palette.green500,
  successLight:  palette.green50,
  successBorder: palette.green100,
  danger:        palette.red500,
  dangerLight:   palette.red50,
  dangerBorder:  palette.red100,
  warning:       palette.amber500,
  warningLight:  palette.amber50,
  warningBorder: palette.amber100,
  info:          palette.blue500,
  infoLight:     palette.blue50,
  infoBorder:    palette.blue100,

  // Special
  pro:           palette.purple500,
  proLight:      '#EDE9FE',
  discount:      palette.red500,
  freeDelivery:  palette.green500,

  // Skeleton
  skeleton:   palette.ink50,
  skeletonHi: '#EAEEF3',

  // Dark mode flag
  isDark: false as const,

  palette,
};

// ── Dark Colors ───────────────────────────────────────────────
export const darkColors = {
  primary:       palette.orange400,
  primaryDark:   palette.orange500,
  primaryDeep:   palette.orange600,
  primaryLight:  '#2A1505',
  primaryBorder: '#3D2010',
  primaryOn:     palette.white,

  gradStart: '#B5320A',
  gradMid:   '#E64E18',
  gradEnd:   '#FF6E30',

  mart:       palette.orange400,
  martLight:  '#2A1505',
  martDark:   palette.orange500,
  martDeep:   palette.orange600,
  martBorder: '#3D2010',

  food:       palette.pink300,
  foodLight:  '#2A0808',
  foodDark:   palette.pink500,
  foodBorder: '#3D1515',

  rashan:      '#22C55E',
  rashanLight: '#0A2016',

  pharma:       '#2DD4BF',
  pharmaLight:  '#0A2020',
  pharmaBorder: '#1A3A3A',
  pharmaDark:   palette.teal600,

  background:     palette.dark800,
  surface:        palette.dark700,
  surfaceMuted:   palette.dark600,
  surfaceElev:    palette.dark500,
  surfaceCard:    palette.dark700,
  overlay:        'rgba(0, 0, 0, 0.7)',

  textHeader:    '#F8FAFC',
  textPrimary:   '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted:     '#64748B',
  textOnPrimary: palette.white,
  link:          palette.orange400,

  border:       palette.dark400,
  borderStrong: palette.dark300,
  divider:      palette.dark600,

  success:       '#34D399',
  successLight:  '#0A2010',
  successBorder: '#1A3020',
  danger:        '#F87171',
  dangerLight:   '#2A0A0A',
  dangerBorder:  '#3D1515',
  warning:       '#FCD34D',
  warningLight:  '#2A1A00',
  warningBorder: '#3D2A00',
  info:          '#60A5FA',
  infoLight:     '#0A1525',
  infoBorder:    '#1A2540',

  pro:          '#A78BFA',
  proLight:     '#1E1030',
  discount:     '#F87171',
  freeDelivery: '#34D399',

  skeleton:   palette.dark600,
  skeletonHi: palette.dark500,

  isDark: true as const,

  palette,
};

export type AppColors = typeof lightColors;

// Default export (light — used by legacy components that import directly)
export const colors = lightColors;

// ── Typography — Poppins ──────────────────────────────────────
// Poppins weights available: 400(Regular), 500(Medium), 600(SemiBold), 700(Bold), 800(ExtraBold)
const FF = {
  regular:    'Poppins_400Regular',
  medium:     'Poppins_500Medium',
  semiBold:   'Poppins_600SemiBold',
  bold:       'Poppins_700Bold',
  extraBold:  'Poppins_800ExtraBold',
  // Fallbacks (used until fonts load)
  sys:    Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
  sysMed: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }) as string,
};

type Variant =
  | 'display' | 'h1' | 'h2' | 'h3'
  | 'title' | 'body' | 'bodyStrong'
  | 'caption' | 'captionStrong'
  | 'overline' | 'price' | 'pricePrev'
  | 'badge' | 'tab';

export const typography: Record<Variant, TextStyle> = {
  display:      { fontFamily: FF.extraBold,  fontSize: 32, lineHeight: 40, fontWeight: '800', color: colors.textHeader, letterSpacing: -0.6 },
  h1:           { fontFamily: FF.extraBold,  fontSize: 24, lineHeight: 32, fontWeight: '800', color: colors.textHeader, letterSpacing: -0.4 },
  h2:           { fontFamily: FF.bold,       fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.textHeader, letterSpacing: -0.3 },
  h3:           { fontFamily: FF.bold,       fontSize: 17, lineHeight: 24, fontWeight: '700', color: colors.textHeader },
  title:        { fontFamily: FF.semiBold,   fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.textPrimary },
  body:         { fontFamily: FF.regular,    fontSize: 14, lineHeight: 21, fontWeight: '400', color: colors.textPrimary },
  bodyStrong:   { fontFamily: FF.semiBold,   fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.textPrimary },
  caption:      { fontFamily: FF.regular,    fontSize: 12, lineHeight: 17, fontWeight: '400', color: colors.textSecondary },
  captionStrong:{ fontFamily: FF.semiBold,   fontSize: 12, lineHeight: 17, fontWeight: '600', color: colors.textSecondary },
  overline:     { fontFamily: FF.bold,       fontSize: 10, lineHeight: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.0 },
  price:        { fontFamily: FF.bold,       fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.textHeader },
  pricePrev:    { fontFamily: FF.regular,    fontSize: 12, lineHeight: 16, fontWeight: '400', color: colors.textMuted, textDecorationLine: 'line-through' },
  badge:        { fontFamily: FF.bold,       fontSize: 10, lineHeight: 13, fontWeight: '700', color: colors.textOnPrimary, letterSpacing: 0.3 },
  tab:          { fontFamily: FF.semiBold,   fontSize: 11, lineHeight: 15, fontWeight: '600' },
};

// ── Spacing ───────────────────────────────────────────────────
export const spacing = {
  none: 0, xxs: 2, xs: 4, sm: 8, md: 12,
  lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48,
} as const;

// ── Radius ────────────────────────────────────────────────────
export const radius = {
  none: 0,
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  card: 16,
  cardLg: 20,
  chip: 10,
  pill: 999,
} as const;

// ── Component Sizes ───────────────────────────────────────────
export const sizes = {
  buttonSm:      36,
  buttonMd:      46,
  buttonLg:      54,
  inputSm:       42,
  inputMd:       50,
  inputLg:       58,
  iconBtn:       42,
  iconSmBtn:     34,
  avatarSm:      34,
  avatarMd:      46,
  avatarLg:      68,
  productCardW:  152,
  productCardWLg:168,
  storeCardW:    172,
  categoryCardW: 88,
  tabBarHeight:  70,
  headerHeight:  56,
} as const;

// ── Shadows ───────────────────────────────────────────────────
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 9,
  },
  brand: {
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  },
  brandSm: {
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  food: {
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },
} as const;

// ── Z-Index ───────────────────────────────────────────────────
export const zIndex = {
  base: 0, card: 1, raised: 2,
  sticky: 5, overlay: 10, modal: 20, toast: 30,
} as const;

// ── Animation ─────────────────────────────────────────────────
export const motion = {
  fast: 140,
  base: 210,
  slow: 320,
} as const;

// ── Font Families (exported for useFonts) ─────────────────────
export const fontFamilies = FF;

// ── Theme Objects ─────────────────────────────────────────────
const baseTheme = {
  typography,
  spacing,
  radius,
  sizes,
  shadows,
  zIndex,
  motion,
  borderRadius: {
    sm: radius.sm, md: radius.md, lg: radius.lg,
    xl: radius.xl, max: radius.pill,
  },
};

export const theme = { ...baseTheme, colors: lightColors };
export const darkTheme = { ...baseTheme, colors: darkColors };

export type Theme = typeof theme;
export default theme;
