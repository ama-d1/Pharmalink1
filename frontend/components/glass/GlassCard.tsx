import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassTheme } from '@/constants/glassTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  gradient?: boolean;
  variant?: 'default' | 'elevated' | 'flat' | 'outlined';
};

export function GlassCard({
  children,
  style,
  glow = false,
  gradient = false,
  variant = 'default',
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'flat' && styles.flat,
    variant === 'outlined' && styles.outlined,
    glow && styles.glow,
    style,
  ];

  const content = (
    <View style={containerStyle}>
      {gradient && (
        <LinearGradient
          colors={['#EFF6FF', '#E0F2FE']}
          style={[StyleSheet.absoluteFill, styles.gradientRadius]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <View style={styles.inner}>{children}</View>
    </View>
  );

  if (rest.onPress) {
    return (
      <AnimatedPressable
        {...rest}
        style={animatedStyle}
        onPressIn={(e) => {
          scale.value = withSpring(0.97, GlassTheme.animation.spring);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, GlassTheme.animation.spring);
          onPressOut?.(e);
        }}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GlassTheme.radius.lg,
    backgroundColor: GlassTheme.colors.surface,
    borderWidth: 0,
    ...GlassTheme.shadow.md,
    overflow: 'hidden',
  },
  elevated: {
    ...GlassTheme.shadow.lg,
    borderWidth: 0,
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: GlassTheme.colors.divider,
  },
  outlined: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.primary,
    backgroundColor: GlassTheme.colors.primaryLight,
  },
  gradientRadius: {
    borderRadius: GlassTheme.radius.lg,
  },
  inner: {
    padding: GlassTheme.spacing.md,
  },
  glow: {
    borderColor: 'rgba(37,99,235,0.25)',
    ...GlassTheme.shadow.lg,
  },
});
