import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassTheme } from '@/constants/glassTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'accent' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: object;
};

export function GlassButton({
  label,
  loading,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const gradientColors: readonly [string, string] =
    variant === 'accent'
      ? ['#0EA5E9', '#0284C7']
      : variant === 'danger'
        ? ['#DC2626', '#B91C1C']
        : ['#2563EB', '#1D4ED8'];

  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        styles.base,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        isGhost && styles.ghost,
        isOutline && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
      onPressIn={() => scale.value = withSpring(0.96, GlassTheme.animation.spring)}
      onPressOut={() => scale.value = withSpring(1, GlassTheme.animation.spring)}
    >
      {!isGhost && !isOutline && (
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      )}
      {loading ? (
        <ActivityIndicator color={isGhost || isOutline ? GlassTheme.colors.primary : '#fff'} />
      ) : (
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSm,
            (isGhost || isOutline) && styles.labelDark,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: GlassTheme.radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sm: { paddingVertical: 9, paddingHorizontal: 16 },
  lg: { paddingVertical: 17 },
  ghost: {
    backgroundColor: 'rgba(37,99,235,0.07)',
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.primary,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  labelSm: { fontSize: 12 },
  labelDark: {
    color: GlassTheme.colors.primary,
  },
  disabled: { opacity: 0.45 },
});
