import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';

// The pill segmented control from the ui_ref screens: a light recessed track
// with the active segment lifted out in white. Generic over the tab key so
// callers keep their own union type ('today' | 'reminders' | 'history') and
// get exhaustiveness checking instead of stringly-typed tabs.

type Props<T extends string> = {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  style?: object;
};

export function SegmentedTabs<T extends string>({ tabs, value, onChange, style }: Props<T>) {
  return (
    <View style={[styles.track, style]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
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
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GlassTheme.colors.divider,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: GlassTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: GlassTheme.colors.surface,
    ...GlassTheme.shadow.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.textMuted,
  },
  labelActive: {
    color: GlassTheme.colors.text,
    fontWeight: '700',
  },
});
