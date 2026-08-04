import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassTheme } from '@/constants/glassTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  style?: object;
};

/**
 * The "plump" fully-rounded action button from the redesigned auth screens —
 * Log In, Sign Up, Confirm.
 *
 * Flat fill rather than GlassButton's gradient: the reference's buttons are a
 * single solid colour, and a gradient inside a pill this tall reads as a
 * different design language. Colour is GlassTheme's `primary`, per the brief
 * to keep the existing palette.
 */
export function PillButton({
  label,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isOutline = variant === 'outline';

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        animatedStyle,
        styles.base,
        isOutline ? styles.outline : styles.primary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPressIn={() => { scale.value = withSpring(0.97, GlassTheme.animation.spring); }}
      onPressOut={() => { scale.value = withSpring(1, GlassTheme.animation.spring); }}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? GlassTheme.colors.primary : GlassTheme.colors.textInverse} />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: GlassTheme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    // Tall enough to read as "plump" next to the 54pt fields above it.
    minHeight: 56,
    paddingVertical: 17,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: GlassTheme.colors.primary,
  },
  outline: {
    backgroundColor: GlassTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.primary,
  },
  label: {
    color: GlassTheme.colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  labelOutline: {
    color: GlassTheme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
