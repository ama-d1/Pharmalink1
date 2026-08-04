import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelMedicationReminder,
  requestNotificationPermission,
  scheduleMedicationReminder,
} from '@/services/notificationService';
import {
  ActivityIndicator, Alert, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  addMedication, deleteMedication, DrugSuggestion, getDrugSuggestions,
  getUserMedications, updateDoseStatus,
} from '@/services/medicationService';
import { TimePickerModal } from '@/components/ui/TimePickerModal';
import { FormSheet } from '@/components/ui/FormSheet';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';

const FREQ_OPTIONS = ['Daily', 'Twice daily', 'Three times daily', 'Weekly', 'As needed'];

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// How many reminder times a given frequency implies, and sensible defaults for each.
const DEFAULT_TIMES_BY_FREQ: Record<string, string[]> = {
  'Twice daily': ['08:00', '20:00'],
  'Three times daily': ['08:00', '14:00', '20:00'],
};

function timesForFrequency(frequency: string, current: string[]): string[] {
  const defaults = DEFAULT_TIMES_BY_FREQ[frequency] ?? ['08:00'];
  return defaults.map((fallback, i) => current[i] ?? fallback);
}

function formatTimeLabel(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time;
  const isPM = h >= 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: GlassTheme.colors.amberLight, text: GlassTheme.colors.amber, label: 'Pending' },
  TAKEN:   { bg: GlassTheme.colors.successLight, text: GlassTheme.colors.success, label: 'Taken' },
  SNOOZED: { bg: GlassTheme.colors.violetLight, text: GlassTheme.colors.violet, label: 'Snoozed' },
};

// Rebuilt to the ui_ref layout: dark ink header carrying the title + a search
// field, then a white rounded sheet holding the segmented tabs and flat,
// hairline-bordered medication cards. All data/handlers are unchanged — this
// is a presentation rewrite, not a behaviour change.
export default function MedicationsScreen() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  // Client-side filter over already-loaded medications — the header search
  // field from the reference layout. No new network call.
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'Daily', reminderTimes: ['08:00'], instructions: '',
  });

  const resetForm = () => {
    setForm({ name: '', dosage: '', frequency: 'Daily', reminderTimes: ['08:00'], instructions: '' });
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (med: any) => {
    setEditingId(med.id);
    setForm({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      reminderTimes: [med.reminderTime],
      instructions: med.instructions ?? '',
    });
    setModalVisible(true);
  };

  const handleFrequencyChange = (f: string) => {
    setForm((prev) => ({ ...prev, frequency: f, reminderTimes: timesForFrequency(f, prev.reminderTimes) }));
  };

  // Drug name autocomplete
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (text: string) => {
    setForm((f) => ({ ...f, name: text }));
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (text.length >= 2) {
      suggestTimer.current = setTimeout(async () => {
        const results = await getDrugSuggestions(text);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: DrugSuggestion) => {
    setForm((f) => ({ ...f, name: s.name }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const fetchMedications = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const data = await getUserMedications(user.userId);
      setMedications(data);
    } catch {
      Alert.alert('Error', 'Could not load medications');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchMedications();
    // Fire-and-forget — must not be allowed to reject unhandled, and must
    // never be able to affect the medications loading state above.
    requestNotificationPermission().catch(() => {});
  }, [fetchMedications]);

  // Cancels the local notification tied to a medication row and deletes the
  // row itself. The backend has no "update" endpoint — editing a medication
  // works by removing the old row(s) and creating fresh one(s), so this is
  // shared between delete and edit.
  const removeMedicationEntry = async (medicationId: string) => {
    const notificationId = await AsyncStorage.getItem(`reminder:${medicationId}`);
    if (notificationId) {
      await cancelMedicationReminder(notificationId);
      await AsyncStorage.removeItem(`reminder:${medicationId}`);
    }
    await deleteMedication(medicationId);
  };

  const handleSave = async () => {
    if (!user?.userId || !form.name || !form.dosage) {
      Alert.alert('Required', 'Medication name and dosage are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await removeMedicationEntry(editingId);
      }

      const hasPermission = await requestNotificationPermission();
      for (const time of form.reminderTimes) {
        const newMed = await addMedication(
          user.userId, form.name, form.dosage, form.frequency,
          time, new Date().toISOString().split('T')[0], form.instructions,
        );
        if (hasPermission && newMed?.id) {
          const notificationId = await scheduleMedicationReminder(newMed.id, form.name, form.dosage, time);
          if (notificationId) {
            await AsyncStorage.setItem(`reminder:${newMed.id}`, notificationId);
          }
        }
      }
      if (!hasPermission) {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications in your device settings to get medication reminders.'
        );
      }

      setModalVisible(false);
      resetForm();
      fetchMedications();
    } catch (err: any) {
      // Show the real reason (e.g. a validation message from the backend)
      // instead of a generic string that hides what actually went wrong.
      const message = err?.message || (editingId ? 'Could not update medication' : 'Could not add medication');
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (med: any) => {
    Alert.alert('Delete medication', `Remove ${med.name} and cancel its reminders?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMedicationEntry(med.id);
            fetchMedications();
          } catch {
            Alert.alert('Error', 'Could not delete medication');
          }
        },
      },
    ]);
  };

  const handleDoseStatus = async (medicationId: string, status: string) => {
    try {
      await updateDoseStatus(medicationId, status);
      fetchMedications();
    } catch {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const takenCount = medications.filter((m) => m.doseStatus === 'TAKEN').length;
  const progress = medications.length > 0 ? (takenCount / medications.length) * 100 : 0;

  const visible = medications.filter(
    (m) => !query.trim() || m.name?.toLowerCase().includes(query.trim().toLowerCase())
  );
  // Mirrors the reference's Active / Past split, driven by real dose status.
  const activeMeds = visible.filter((m) => m.doseStatus !== 'TAKEN');
  const doneMeds = visible.filter((m) => m.doseStatus === 'TAKEN');

  const renderMedCard = (med: any, index: number) => {
    const s = statusColors[med.doseStatus ?? 'PENDING'];
    const isPending = med.doseStatus === 'PENDING' || !med.doseStatus;
    return (
      <Animated.View key={med.id} entering={FadeInDown.delay(index * 50).duration(280)}>
        <View style={styles.medCard}>
          <View style={styles.medTop}>
            <View style={styles.medThumb}>
              <Ionicons name="medical" size={19} color={GlassTheme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medMeta}>
                {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.medTime}>{med.reminderTime}</Text>
              <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
              </View>
            </View>
          </View>

          {!!med.instructions && (
            <>
              <View style={styles.medDivider} />
              <Text style={styles.medPurpose}>
                <Text style={styles.medPurposeLabel}>Purpose: </Text>
                {med.instructions}
              </Text>
            </>
          )}

          <View style={styles.medDivider} />
          <View style={styles.medActions}>
            {isPending ? (
              <>
                <TouchableOpacity style={styles.takeBtn} onPress={() => handleDoseStatus(med.id, 'TAKEN')} activeOpacity={0.85}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                  <Text style={styles.takeBtnText}>Take Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.snoozeBtn} onPress={() => handleDoseStatus(med.id, 'SNOOZED')} activeOpacity={0.7}>
                  <Ionicons name="alarm-outline" size={14} color={GlassTheme.colors.textMuted} />
                  <Text style={styles.snoozeBtnText}>Snooze</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <TouchableOpacity onPress={() => openEditModal(med)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={17} color={GlassTheme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(med)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={17} color={GlassTheme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const emptyState = (icon: keyof typeof Ionicons.glyphMap, title: string, hint: string) => (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={34} color={GlassTheme.colors.textDim} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        eyebrow="MEDICATIONS"
        heading="My Medicines"
        rightIcon="add"
        onRightPress={openAddModal}
        search={{
          value: query,
          onChangeText: setQuery,
          placeholder: 'Search prescriptions, medication',
          onClear: () => setQuery(''),
        }}
      />

      <SheetBody>
        <View style={styles.tabsWrap}>
          <SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Today ── */}
            {activeTab === 'today' && (
              <>
                {medications.length > 0 && (
                  <View style={styles.progressRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.progressLabel}>Today&apos;s progress</Text>
                      <Text style={styles.progressValue}>{takenCount} of {medications.length} taken</Text>
                    </View>
                    <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
                  </View>
                )}
                {medications.length > 0 && (
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                )}

                <Text style={styles.sectionTitle}>Active</Text>
                {activeMeds.length === 0
                  ? emptyState('medical-outline', 'Nothing due', query ? 'No matches for your search.' : 'All caught up for today.')
                  : activeMeds.map(renderMedCard)}

                {doneMeds.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Completed</Text>
                    {doneMeds.map(renderMedCard)}
                  </>
                )}
              </>
            )}

            {/* ── Reminders ── */}
            {activeTab === 'reminders' && (
              <>
                <Text style={styles.sectionTitle}>Reminder schedule</Text>
                {visible.length === 0
                  ? emptyState('alarm-outline', 'No reminders set', 'Add a medication to set up reminders.')
                  : visible.map((med, index) => (
                    <Animated.View key={med.id} entering={FadeInDown.delay(index * 50).duration(280)}>
                      <View style={styles.reminderCard}>
                        <View style={styles.reminderTimeCol}>
                          <Text style={styles.reminderTime}>{med.reminderTime}</Text>
                        </View>
                        <View style={styles.reminderBar} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medName}>{med.name}</Text>
                          <Text style={styles.medMeta}>{[med.dosage, med.frequency].filter(Boolean).join(' · ')}</Text>
                          {!!med.instructions && <Text style={styles.reminderNote}>{med.instructions}</Text>}
                        </View>
                        <Ionicons name="notifications-outline" size={18} color={GlassTheme.colors.textDim} />
                      </View>
                    </Animated.View>
                  ))}
                <View style={styles.noteCard}>
                  <Ionicons name="information-circle-outline" size={17} color={GlassTheme.colors.textMuted} />
                  <Text style={styles.noteText}>
                    Push notifications alert you at each reminder time. Make sure notifications are enabled in your device settings.
                  </Text>
                </View>
              </>
            )}

            {/* ── History ── */}
            {activeTab === 'history' && (
              <>
                <Text style={styles.sectionTitle}>Current status</Text>
                {visible.length === 0
                  ? emptyState('time-outline', 'No history yet', 'Your dose history will appear here.')
                  : (
                    <>
                      <View style={styles.noteCard}>
                        <Ionicons name="information-circle-outline" size={17} color={GlassTheme.colors.textMuted} />
                        <Text style={styles.noteText}>
                          This shows each medication&apos;s current status, not a day-by-day log yet. Dose-by-dose history is coming once it&apos;s wired up on the backend.
                        </Text>
                      </View>
                      {visible.map((med, index) => {
                        const s = statusColors[med.doseStatus ?? 'PENDING'];
                        return (
                          <Animated.View key={med.id} entering={FadeInDown.delay(index * 50).duration(280)}>
                            <View style={styles.historyRow}>
                              <View style={[styles.historyIcon, { backgroundColor: s.bg }]}>
                                <Ionicons
                                  name={med.doseStatus === 'TAKEN' ? 'checkmark-circle' : med.doseStatus === 'SNOOZED' ? 'alarm' : 'ellipse-outline'}
                                  size={18}
                                  color={s.text}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.medName}>{med.name}</Text>
                                <Text style={styles.medMeta}>{[med.dosage, med.frequency].filter(Boolean).join(' · ')}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                                <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                              </View>
                            </View>
                          </Animated.View>
                        );
                      })}
                    </>
                  )}
              </>
            )}
          </ScrollView>
        )}
      </SheetBody>

      {/* ── Add / Edit Medication Sheet ──
          Uses FormSheet (plain RN Modal + ScrollView) rather than the
          gorhom-based AppBottomSheet: this form has to scroll reliably while
          the keyboard is up, and gorhom's pan-gesture arbitration and content
          measurement kept preventing that. See FormSheet's own javadoc. */}
      <FormSheet
        visible={modalVisible}
        onClose={() => { setModalVisible(false); resetForm(); }}
        title={editingId ? 'Edit Medication' : 'Add Medication'}
        height="70%"
        action={{
          label: editingId ? 'Save' : 'Add',
          onPress: handleSave,
          loading: saving,
          disabled: !form.name.trim() || !form.dosage.trim(),
        }}
      >
        {/* No `gap` here on purpose: GlassInput already carries its own
            14px bottom margin, so a container gap stacked on top of it and
            produced ~28px between fields — a lot of wasted height in a
            fixed 70% sheet. Non-input groups use `fieldGroup` to match that
            same 14px, giving one consistent rhythm down the form. */}
        <View>
          <View>
            <GlassInput
              label="Medication Name"
              icon="medical-outline"
              value={form.name}
              onChangeText={handleNameChange}
              placeholder="e.g. Metformin — start typing to search"
              autoCorrect={false}
            />
            {showSuggestions && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((s) => (
                  <TouchableOpacity key={s.id} style={styles.suggestionRow} onPress={() => selectSuggestion(s)}>
                    <Ionicons name="medical-outline" size={14} color={GlassTheme.colors.primary} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      {s.genericName && s.genericName !== s.name && (
                        <Text style={styles.suggestionGeneric}>{s.genericName}</Text>
                      )}
                    </View>
                    <View style={[styles.sourceBadge, s.source === 'openFDA' && styles.sourceBadgeFda]}>
                      <Text style={[styles.sourceText, s.source === 'openFDA' && styles.sourceTextFda]}>
                        {s.source === 'openFDA' ? 'FDA' : 'Local'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <GlassInput label="Dosage" icon="fitness-outline" value={form.dosage} onChangeText={(t) => setForm({ ...form, dosage: t })} placeholder="e.g. 500mg" />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Frequency</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View style={styles.chipRow}>
                {FREQ_OPTIONS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, form.frequency === f && styles.chipActive]}
                    onPress={() => handleFrequencyChange(f)}
                  >
                    <Text style={[styles.chipText, form.frequency === f && styles.chipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Reminder Time{form.reminderTimes.length > 1 ? 's' : ''}
            </Text>
            <View style={{ gap: 8 }}>
              {form.reminderTimes.map((time, idx) => (
                <TouchableOpacity key={idx} style={styles.timeChip} onPress={() => setTimePickerIndex(idx)}>
                  <Ionicons name="alarm-outline" size={16} color={GlassTheme.colors.primary} />
                  <Text style={styles.timeChipText}>{formatTimeLabel(time)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={GlassTheme.colors.textDim} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Instructions <Text style={styles.optionalTag}>optional</Text>
            </Text>
            <TextInput
              placeholder="e.g. Take with food"
              placeholderTextColor={GlassTheme.colors.textDim}
              value={form.instructions}
              onChangeText={(t) => setForm({ ...form, instructions: t })}
              style={styles.textArea}
              multiline
            />
          </View>

        </View>
      </FormSheet>

      <TimePickerModal
        visible={timePickerIndex !== null}
        initialTime={timePickerIndex !== null ? form.reminderTimes[timePickerIndex] : undefined}
        onCancel={() => setTimePickerIndex(null)}
        onConfirm={(time) => {
          setForm((prev) => {
            const next = [...prev.reminderTimes];
            next[timePickerIndex!] = time;
            return { ...prev, reminderTimes: next };
          });
          setTimePickerIndex(null);
        }}
      />
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 10,
  },

  // ── Progress strip ──
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  progressLabel: { fontSize: 12, color: GlassTheme.colors.textMuted, fontWeight: '600' },
  progressValue: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 2 },
  progressPct: { fontSize: 20, fontWeight: '800', color: GlassTheme.colors.primary },
  progressBarBg: {
    height: 5, borderRadius: 3, marginTop: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: GlassTheme.colors.primary },

  // ── Medication card ──
  medCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md,
    backgroundColor: GlassTheme.colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  medTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medThumb: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  medName: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  medMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  medTime: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.text },
  medDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GlassTheme.colors.divider,
    marginVertical: 11,
  },
  medPurpose: { fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 17 },
  medPurposeLabel: { fontWeight: '700', color: GlassTheme.colors.text },
  medActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },

  statusBadge: { borderRadius: GlassTheme.radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  takeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GlassTheme.colors.primary,
    borderRadius: GlassTheme.radius.sm, paddingVertical: 9, paddingHorizontal: 14,
  },
  takeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  snoozeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: GlassTheme.radius.sm, paddingVertical: 9, paddingHorizontal: 14,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    flex: 1,
  },
  snoozeBtnText: { color: GlassTheme.colors.textMuted, fontWeight: '600', fontSize: 12 },

  // ── Reminders ──
  reminderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10,
  },
  reminderTimeCol: { minWidth: 46 },
  reminderTime: { fontSize: 13, fontWeight: '800', color: GlassTheme.colors.primary },
  reminderBar: { width: 2, alignSelf: 'stretch', borderRadius: 1, backgroundColor: GlassTheme.colors.divider },
  reminderNote: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 4 },

  // ── History ──
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 10,
  },
  historyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // ── Shared ──
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.md, padding: 13, marginTop: 6, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
  },
  noteText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 18 },

  emptyCard: {
    alignItems: 'center', gap: 6, paddingVertical: 34,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  emptyTitle: { color: GlassTheme.colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  emptyHint: { color: GlassTheme.colors.textDim, fontSize: 12 },

  // ── Form ──
  // Matches GlassInput's own built-in bottom margin so inputs and non-input
  // groups sit on the same vertical rhythm.
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: GlassTheme.colors.textMuted,
    marginBottom: 8,
  },
  optionalTag: { fontWeight: '500', color: GlassTheme.colors.textDim },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
  },
  chipActive: { backgroundColor: GlassTheme.colors.primary, borderColor: GlassTheme.colors.primary },
  chipText: { fontSize: 13, color: GlassTheme.colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: GlassTheme.radius.sm,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
  },
  timeChipText: { flex: 1, fontSize: 14, fontWeight: '600', color: GlassTheme.colors.text },

  textArea: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    padding: 14, fontSize: 14,
    color: GlassTheme.colors.text,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    minHeight: 72, textAlignVertical: 'top',
  },

  suggestionsBox: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: GlassTheme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GlassTheme.colors.divider,
    overflow: 'hidden',
    ...GlassTheme.shadow.md,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GlassTheme.colors.divider,
  },
  suggestionName: { fontSize: 13, fontWeight: '600', color: GlassTheme.colors.text },
  suggestionGeneric: { fontSize: 11, color: GlassTheme.colors.textMuted, marginTop: 1 },
  sourceBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.primaryLight,
  },
  sourceBadgeFda: { backgroundColor: GlassTheme.colors.amberLight },
  sourceText: { fontSize: 9, fontWeight: '700', color: GlassTheme.colors.primary },
  sourceTextFda: { color: GlassTheme.colors.amber },
});
