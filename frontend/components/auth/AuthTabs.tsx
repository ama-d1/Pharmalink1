import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';

export type AuthTabOption<T extends string> = {
  key: T;
  label: string;
};

type Props<T extends string> = {
  options: readonly AuthTabOption<T>[];
  value: T;
  onChange: (key: T) => void;
};

/**
 * The segmented pill from the redesigned auth screens — "Phone Number / Email"
 * on sign-in, "Sign Up / Log In" on sign-up.
 *
 * The reference fills the selected segment with its lime accent; here it's
 * filled with GlassTheme's `primary` navy instead, per the brief to keep the
 * existing palette and change only the shapes.
 */
export function AuthTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            // A 44pt-tall segment is already at the minimum tap target, so
            // the extra hit slop only widens it horizontally.
            hitSlop={{ left: 4, right: 4 }}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.pill,
    padding: 5,
    borderWidth: 1,
    borderColor: GlassTheme.colors.glassBorder,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: GlassTheme.radius.pill,
  },
  segmentActive: {
    backgroundColor: GlassTheme.colors.primary,
    ...GlassTheme.shadow.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassTheme.colors.textMuted,
  },
  labelActive: {
    color: GlassTheme.colors.textInverse,
  },
});
