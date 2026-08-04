import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';
import { PillButton } from './PillButton';

type Props = {
  visible: boolean;
  /** Currently selected date as yyyy-MM-dd, or '' when nothing is chosen. */
  value: string;
  onCancel: () => void;
  onConfirm: (isoDate: string) => void;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Date-of-birth picker for the redesigned sign-up form.
 *
 * Written in plain React Native rather than pulling in
 * @react-native-community/datetimepicker on purpose: that package has a
 * native module, so adding it would require a fresh EAS build before the
 * screen could run at all, and this project ships preview builds. Three
 * scrolling columns need no native code and behave identically on both
 * platforms — which also avoids the iOS/Android divergence the native picker
 * has (inline wheel vs. modal dialog).
 */
export function DateOfBirthPicker({ visible, value, onCancel, onConfirm }: Props) {
  const today = useMemo(() => new Date(), []);
  const parsed = parseIso(value);

  // Default to 1 Jan 25 years ago rather than today: today is never a
  // plausible date of birth, and starting there means every user has to
  // scroll the year column through a few decades.
  const [year, setYear] = useState(() => parsed?.year ?? today.getFullYear() - 25);
  const [month, setMonth] = useState(() => parsed?.month ?? 1);
  const [day, setDay] = useState(() => parsed?.day ?? 1);

  const years = useMemo(() => {
    const latest = today.getFullYear();
    // 120 years back covers any living person; nothing in the future, since
    // the server rejects a non-past date anyway (@Past on RegisterRequest).
    return Array.from({ length: 120 }, (_, i) => latest - i);
  }, [today]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );

  // Picking 31 January then switching to February must not leave an
  // impossible 31 Feb selected.
  const safeDay = Math.min(day, daysInMonth);

  const confirm = () => {
    onConfirm(`${year}-${pad(month)}-${pad(safeDay)}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close date picker" />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Date of birth</Text>
          <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={GlassTheme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.columns}>
          <Column
            data={days}
            selected={safeDay}
            onSelect={setDay}
            render={(d) => String(d)}
            label="Day"
          />
          <Column
            data={MONTHS.map((_, i) => i + 1)}
            selected={month}
            onSelect={setMonth}
            render={(m) => MONTHS[m - 1].slice(0, 3)}
            label="Month"
          />
          <Column
            data={years}
            selected={year}
            onSelect={setYear}
            render={(y) => String(y)}
            label="Year"
          />
        </View>

        <PillButton label="Confirm" onPress={confirm} style={styles.confirm} />
      </View>
    </Modal>
  );
}

function Column({
  data,
  selected,
  onSelect,
  render,
  label,
}: {
  data: number[];
  selected: number;
  onSelect: (value: number) => void;
  render: (value: number) => string;
  label: string;
}) {
  const ROW_HEIGHT = 44;
  const initialIndex = Math.max(0, data.indexOf(selected));

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        // Fixed row height means getItemLayout is exact, which is what makes
        // initialScrollIndex land on the current value without a flash.
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        initialScrollIndex={initialIndex}
        renderItem={({ item }) => {
          const active = item === selected;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.option, active && styles.optionActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {render(item)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { year: +match[1], month: +match[2], day: +match[3] };
}

/** Renders yyyy-MM-dd as dd/MM/yyyy for display in the field. */
export function formatDateOfBirth(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return '';
  return `${pad(parsed.day)}/${pad(parsed.month)}/${parsed.year}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,38,0.35)',
  },
  sheet: {
    backgroundColor: GlassTheme.colors.surface,
    borderTopLeftRadius: GlassTheme.radius.xl,
    borderTopRightRadius: GlassTheme.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GlassTheme.colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: GlassTheme.colors.text,
  },
  columns: {
    flexDirection: 'row',
    gap: 10,
    height: 240,
  },
  column: {
    flex: 1,
    gap: 6,
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GlassTheme.colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  option: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: GlassTheme.radius.pill,
  },
  optionActive: {
    backgroundColor: GlassTheme.colors.primary,
  },
  optionText: {
    fontSize: 15,
    color: GlassTheme.colors.textMuted,
    fontWeight: '600',
  },
  optionTextActive: {
    color: GlassTheme.colors.textInverse,
    fontWeight: '800',
  },
  confirm: {
    marginTop: 4,
  },
});
