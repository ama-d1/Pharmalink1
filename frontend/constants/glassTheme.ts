/**
 * PharmaLink Design Tokens — Light Theme
 * Clean, modern, no glassmorphism. Plain surfaces + soft shadows + gradients.
 */
export const GlassTheme = {
  colors: {
    // Page / screen backgrounds
    bgDeep: '#F0F4FF',
    bgMid: '#F7F9FF',
    bgLight: '#FFFFFF',

    // Brand blue
    primary: '#2563EB',
    primaryGlow: '#3B82F6',
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',

    // Teal accent
    accent: '#0EA5E9',
    accentSoft: '#0284C7',
    accentLight: '#E0F2FE',

    // Supporting
    violet: '#7C3AED',
    violetLight: '#EDE9FE',
    amber: '#D97706',
    amberLight: '#FEF3C7',
    rose: '#E11D48',
    roseLight: '#FFE4E6',

    // Text
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    textInverse: '#FFFFFF',

    // Surfaces (replaces all glass/blur)
    glass: '#FFFFFF',
    glassBorder: '#E2E8F0',
    glassHighlight: '#FFFFFF',
    glassDark: 'rgba(15,23,42,0.04)',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFF',
    divider: '#E2E8F0',

    // Semantic
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
  },
  gradients: {
    screen: ['#F0F4FF', '#F7F9FF', '#FFFFFF'] as const,
    hero: ['#2563EB', '#0EA5E9'] as const,
    heroSoft: ['#EFF6FF', '#E0F2FE'] as const,
    card: ['#FFFFFF', '#F8FAFF'] as const,
    pill: ['#3B82F6', '#0EA5E9', '#7C3AED'] as const,
    headerBg: ['#2563EB', '#1E40AF'] as const,
    accentBar: ['#0EA5E9', '#2563EB'] as const,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  shadow: {
    sm: {
      shadowColor: '#1E3A8A',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: '#1E3A8A',
      shadowOpacity: 0.09,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    lg: {
      shadowColor: '#1E3A8A',
      shadowOpacity: 0.13,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  },
  animation: {
    spring: { damping: 18, stiffness: 180, mass: 0.8 },
    fadeIn: 400,
    stagger: 80,
  },
} as const;

export type GlassThemeType = typeof GlassTheme;
