import { useColorScheme } from 'react-native';

export const theme = {
  colors: {
    // Sky backgrounds
    bgDay:       '#E8F5E0',
    bgDawn:      '#FFD9B0',
    bgDusk:      '#7B4F8C',
    bgNight:     '#0D1B2A',
    // UI surfaces
    surface:     '#F5F0E8',
    surfaceDark: '#1E1A14',
    border:      'rgba(80,60,20,0.15)',
    borderDark:  'rgba(255,255,255,0.12)',
    // Accents
    gold:        '#D4A017',
    goldLight:   '#F5D060',
    green:       '#4A7C59',
    greenLight:  '#8DC99A',
    red:         '#C0392B',
    redLight:    '#E74C3C',
    // Text
    text:        '#2A1F0E',
    textMuted:   '#8A7A60',
    textLight:   '#F5F0E8',
    // Tab bar
    tabActive:   '#4A7C59',
    tabInactive: '#8A7A60',
    tabBar:      '#F5F0E8',
  },
  fonts: {
    title: 'Lora_700Bold',
    body:  'NunitoSans_400Regular',
    mono:  'SpaceMono_400Regular',
  },
  radius:  { sm: 8, md: 14, lg: 22, xl: 32 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
} as const;

export type Theme = typeof theme;

// Extended color set used by useTheme() — includes semantic tokens for UI components.
export type AppColors = {
  readonly [K in keyof typeof theme.colors]: string;
} & {
  readonly card: string;        // elevated modal/card surface
  readonly sectionBody: string; // settings section background
};

const lightColors: AppColors = {
  ...theme.colors,
  card:        '#FFFDF4',
  sectionBody: '#FFFFFF',
};

const darkColors: AppColors = {
  ...theme.colors,
  surface:     '#1C1C1E',
  border:      'rgba(255,255,255,0.12)',
  text:        '#F2F2F7',
  textMuted:   '#9A8A70',
  tabBar:      '#1C1C1E',
  tabActive:   '#6ABF7B',
  tabInactive: '#8E8E93',
  card:        '#2C2C2E',
  sectionBody: '#2C2C2E',
};

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return {
    colors:  isDark ? darkColors : lightColors,
    fonts:   theme.fonts,
    radius:  theme.radius,
    spacing: theme.spacing,
    isDark,
  };
}
