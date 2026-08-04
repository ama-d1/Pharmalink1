/**
 * PharmaLink Design Tokens
 *
 * REBUILT to the ui_ref design language: a near-black "ink" header, a white
 * sheet with large rounded top corners overlapping it, flat hairline-bordered
 * cards, and one deep accent colour used for the primary action. The reference
 * uses a dark forest green as that accent — this app uses the blue equivalent
 * (deep navy) per the brief, so `ink`/`primary` are navy rather than green.
 *
 * The name `GlassTheme` is kept (rather than renamed) because ~30 screens
 * import it; the values are what changed, not the contract.
 */
export const GlassTheme = {
  colors: {
    // Page / screen backgrounds — plain white now. The old pale-blue tints
    // fought with the white content sheet the new layout puts on every screen.
    bgDeep: '#FFFFFF',
    bgMid: '#FFFFFF',
    bgLight: '#FFFFFF',

    // "Ink" — the dark header surface + primary button fill. This is the
    // single strongest colour in the system; everything else is neutral.
    ink: '#0A1C2E',
    inkGlow: '#16375A',

    // Brand — deep navy. Used for primary actions, active tab text, and icon
    // tints. Deliberately dark (not a bright blue) to match the reference's
    // restrained, near-monochrome feel.
    primary: '#12395C',
    primaryGlow: '#1B4F7D',
    primaryLight: '#ECF1F6',
    primaryDark: '#0A2740',

    // Accent — the brighter blue, reserved for links/emphasis so it reads as
    // a step below `primary` rather than competing with it.
    accent: '#2563EB',
    accentSoft: '#1D4ED8',
    accentLight: '#E8EFFB',

    // Supporting — desaturated so status colours never out-shout the ink.
    violet: '#6D5AE0',
    violetLight: '#EEECFC',
    amber: '#B4780A',
    amberLight: '#FDF3DC',
    rose: '#C2374B',
    roseLight: '#FBE9EC',

    // Text
    text: '#0F1B26',
    textMuted: '#6B7A88',
    textDim: '#9AA7B2',
    textInverse: '#FFFFFF',

    // Surfaces
    glass: '#FFFFFF',
    glassBorder: '#E8EBEE',
    glassHighlight: '#FFFFFF',
    glassDark: 'rgba(15,27,38,0.04)',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F8FA',
    divider: '#E8EBEE',

    // Semantic
    success: '#1E7A4D',
    successLight: '#E4F3EB',
    warning: '#B4780A',
    danger: '#C2374B',
    dangerLight: '#FBE9EC',
  },
  gradients: {
    screen: ['#FFFFFF', '#FFFFFF', '#FFFFFF'] as const,
    hero: ['#0A1C2E', '#16375A'] as const,
    heroSoft: ['#F7F8FA', '#EEF2F6'] as const,
    card: ['#FFFFFF', '#FFFFFF'] as const,
    pill: ['#12395C', '#1B4F7D', '#2563EB'] as const,
    // Every dark hero/header in the app reads from this one — changing it
    // here re-skins all of them at once.
    headerBg: ['#0A1C2E', '#16375A'] as const,
    accentBar: ['#12395C', '#2563EB'] as const,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 16,
    // The sheet's top corners — the signature shape of the reference layout.
    xl: 28,
    pill: 999,
    // Auth redesign (2026-08-04). The new sign-in/sign-up reference uses
    // deeply curved fields and fully-round "plump" buttons. Kept as their
    // own tokens rather than bending sm/md/lg, which ~30 other screens
    // already depend on at their current values.
    field: 26,
    button: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // Barely-there ambient shadows. Card separation comes from the hairline
  // border, not from float — heavy drop-shadows were the main thing making
  // the old UI read as dated.
  shadow: {
    sm: {
      shadowColor: '#0F1B26',
      shadowOpacity: 0.04,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    md: {
      shadowColor: '#0F1B26',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    lg: {
      shadowColor: '#0F1B26',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
  },
  animation: {
    spring: { damping: 18, stiffness: 180, mass: 0.8 },
    fadeIn: 400,
    stagger: 80,
  },
} as const;

export type GlassThemeType = typeof GlassTheme;
