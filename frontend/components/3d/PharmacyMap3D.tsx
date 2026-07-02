import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { GlassTheme } from '@/constants/glassTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Pin = { id: string; name: string; x: number; y: number; color?: string };

type Props = {
  pharmacies: Pin[];
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export function PharmacyMap3D({ pharmacies, selectedId }: Props) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true
    );
  }, [pulse]);

  const animatedProps = useAnimatedProps(() => ({
    r: 8 * pulse.value,
    opacity: 0.35 / pulse.value,
  }));

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#0F2847', '#1A3A5C', '#0A1628']} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox="0 0 360 220">
        <Defs>
          <SvgGradient id="grid" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="rgba(20,184,166,0.15)" />
            <Stop offset="1" stopColor="rgba(37,99,235,0.1)" />
          </SvgGradient>
        </Defs>
        {[40, 80, 120, 160, 200].map((y) => (
          <Path key={`h${y}`} d={`M20 ${y} H340`} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {[60, 120, 180, 240, 300].map((x) => (
          <Path key={`v${x}`} d={`M${x} 20 V200`} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <Path d="M40 180 L80 140 L120 160 L160 100 L200 120 L240 80 L280 110 L320 60" stroke="#14B8A6" strokeWidth="2" fill="none" opacity={0.5} />
        {pharmacies.map((p) => {
          const selected = p.id === selectedId;
          const cx = p.x * 360;
          const cy = p.y * 200;
          return (
            <G key={p.id}>
              <AnimatedCircle animatedProps={animatedProps} cx={cx} cy={cy} fill={p.color ?? GlassTheme.colors.accent} />
              <Circle cx={cx} cy={cy} r={selected ? 9 : 7} fill={selected ? GlassTheme.colors.primary : GlassTheme.colors.accent} stroke="#fff" strokeWidth={2} />
              <SvgText x={cx} y={cy + 22} fill="rgba(255,255,255,0.8)" fontSize="9" textAnchor="middle">
                {p.name.split(' ')[0]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: GlassTheme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GlassTheme.colors.glassBorder,
  },
});
