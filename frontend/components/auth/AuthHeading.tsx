import { Image, StyleSheet, Text, View } from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';

import logo from '../../assets/images/logo-icon.png';

type Props = {
  title: string;
  subtitle?: string;
};

/**
 * Title block for the redesigned auth screens.
 *
 * The reference has no logo at all — the brief was to keep PharmaLink's, sat
 * to the left of the heading. So the logo and title share a row (rather than
 * the old full-bleed dark hero above the card), which keeps the heading
 * optically centred on the screen while the mark stays beside it.
 */
export function AuthHeading({ title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    width: 46,
    height: 46,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: GlassTheme.colors.text,
    letterSpacing: -0.5,
    // flexShrink so a long title wraps inside the row instead of pushing the
    // logo off the left edge on a narrow screen.
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13.5,
    color: GlassTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 24,
  },
});
