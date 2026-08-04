import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewProps } from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';

type Props = ViewProps & {
  variant?: 'default' | 'deep';
};

// FLATTENED — this used to paint three decorative translucent circles
// ("blobs") over the background gradient on every screen in the app. That
// reads as a "glassmorphism" flourish, which is the opposite of the flat,
// minimal, Apple-HIG-style surface the UI is being redesigned toward
// (systemBackground/secondarySystemBackground: solid, no ambient shapes).
// A plain two-stop gradient (near-white → white) is the entire background
// now — every screen using <GlassBackground> picks this up automatically.
export function GlassBackground({ children, style, variant = 'default', ...rest }: Props) {
  const colors =
    variant === 'deep'
      ? (['#EEF2FF', '#E8F0FE', '#F0F7FF'] as const)
      : (GlassTheme.gradients.screen as unknown as readonly [string, string, ...string[]]);

  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4FF' },
});
