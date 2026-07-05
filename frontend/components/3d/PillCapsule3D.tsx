import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { GlassTheme } from '@/constants/glassTheme';

type Props = { size?: number };

export function PillCapsule3D({ size = 120 }: Props) {
  const rotateY = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    rotateY.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [rotateY, floatY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateY: `${rotateY.value}deg` },
      { translateY: floatY.value },
    ],
  }));

  const w = size;
  const h = size * 0.42;

  return (
    <View style={[styles.container, { width: w, height: h + 20 }]}>
      <Animated.View style={animStyle}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <Defs>
            <SvgGradient id="capLeft" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#60A5FA" />
              <Stop offset="1" stopColor="#2563EB" />
            </SvgGradient>
            <SvgGradient id="capRight" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2DD4BF" />
              <Stop offset="1" stopColor="#14B8A6" />
            </SvgGradient>
            <SvgGradient id="body" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F8FAFC" />
              <Stop offset="1" stopColor="#CBD5E1" />
            </SvgGradient>
          </Defs>
          <Ellipse cx={w * 0.18} cy={h * 0.55} rx={w * 0.18} ry={h * 0.45} fill="url(#capLeft)" />
          <Rect x={w * 0.18} y={h * 0.1} width={w * 0.64} height={h * 0.8} rx={4} fill="url(#body)" />
          <Ellipse cx={w * 0.82} cy={h * 0.55} rx={w * 0.18} ry={h * 0.45} fill="url(#capRight)" />
          <Rect x={w * 0.42} y={h * 0.22} width={w * 0.16} height={h * 0.56} rx={2} fill="rgba(37,99,235,0.15)" />
        </Svg>
      </Animated.View>
      <View style={[styles.shadow, { width: w * 0.7 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  shadow: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(20,184,166,0.25)',
    marginTop: 6,
  },
});
