import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';
import { GlassButton } from '@/components/glass/GlassButton';

// A simple chip-based time picker. Deliberately avoids native picker
// dependencies (no @react-native-community/datetimepicker in this project
// yet) and, more importantly, makes it impossible for the user to enter an
// invalid time — every value produced is a valid "HH:mm" 24-hour string,
// unlike the free-text field this replaces.
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = [0, 15, 30, 45];

type Props = {
  visible: boolean;
  initialTime?: string; // "HH:mm" 24-hour
  onCancel: () => void;
  onConfirm: (time: string) => void;
};

function to24Hour(hour12: number, minute: number, isPM: boolean): string {
  let hour24 = hour12 % 12;
  if (isPM) hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parse(time?: string) {
  const [h, m] = (time ?? '08:00').split(':').map((n) => parseInt(n, 10));
  const safeH = isNaN(h) ? 8 : h;
  const safeM = isNaN(m) ? 0 : m;
  const isPM = safeH >= 12;
  const hour12 = safeH % 12 === 0 ? 12 : safeH % 12;
  const nearestMinute = MINUTES.reduce((a, b) => (Math.abs(b - safeM) < Math.abs(a - safeM) ? b : a));
  return { hour12, minute: nearestMinute, isPM };
}

export function TimePickerModal({ visible, initialTime, onCancel, onConfirm }: Props) {
  const initial = useMemo(() => parse(initialTime), [initialTime, visible]);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [isPM, setIsPM] = useState(initial.isPM);

  const preview = to24Hour(hour12, minute, isPM);
  const previewLabel = `${hour12}:${String(minute).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Set reminder time</Text>
          <Text style={styles.preview}>{previewLabel}</Text>

          <Text style={styles.label}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.chip, hour12 === h && styles.chipActive]}
                  onPress={() => setHour12(h)}
                >
                  <Text style={[styles.chipText, hour12 === h && styles.chipTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Minute</Text>
          <View style={styles.row}>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, minute === m && styles.chipActive]}
                onPress={() => setMinute(m)}
              >
                <Text style={[styles.chipText, minute === m && styles.chipTextActive]}>
                  {String(m).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            {(['AM', 'PM'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.chip, styles.ampmChip, (period === 'PM') === isPM && styles.chipActive]}
                onPress={() => setIsPM(period === 'PM')}
              >
                <Text style={[styles.chipText, (period === 'PM') === isPM && styles.chipTextActive]}>{period}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <GlassButton label="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
            <GlassButton label="Confirm" onPress={() => onConfirm(preview)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: GlassTheme.radius.xl, padding: 22, gap: 10, ...GlassTheme.shadow.lg },
  title: { fontSize: 16, fontWeight: '800', color: GlassTheme.colors.text },
  preview: { fontSize: 28, fontWeight: '800', color: GlassTheme.colors.primary, marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.textMuted, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: 1, borderColor: GlassTheme.colors.divider,
  },
  ampmChip: { minWidth: 56, alignItems: 'center' },
  chipActive: { backgroundColor: GlassTheme.colors.primary, borderColor: GlassTheme.colors.primary },
  chipText: { fontSize: 13, color: GlassTheme.colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
