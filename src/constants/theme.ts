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
  radius: { sm: 8, md: 14, lg: 22, xl: 32 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
} as const;

export type Theme = typeof theme;
