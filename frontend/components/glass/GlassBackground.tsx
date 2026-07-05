import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewProps } from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';

type Props = ViewProps & {
  variant?: 'default' | 'deep';
};

export function GlassBackground({ children, style, variant = 'default', ...rest }: Props) {
  const colors =
    variant === 'deep'
      ? (['#EEF2FF', '#E8F0FE', '#F0F7FF'] as const)
      : (GlassTheme.gradients.screen as unknown as readonly [string, string, ...string[]]);

  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      {/* Decorative blobs — soft, coloured, no blur needed */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />
      <View style={styles.blobMid} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4FF' },

  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 80,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(14,165,233,0.07)',
  },
  blobMid: {
    position: 'absolute',
    top: '40%',
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
});
