import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelMedicationReminder,
  requestNotificationPermission,
  scheduleMedicationReminder,
} from '@/services/notificationService';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  addMedication, deleteMedication, DrugSuggestion, getDrugSuggestions,
  getUserMedications, updateDoseStatus,
} from '@/services/medicationService';
import { TimePickerModal } from '@/components/ui/TimePickerModal';

const FREQ_OPTIONS = ['Daily', 'Twice daily', 'Three times daily', 'Weekly', 'As needed'];

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

export default function MedicationsScreen() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'reminders' | 'history'>('today');
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

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={GlassTheme.colors.primary} />
        </View>
      </GlassBackground>
    );
  }

  const takenCount = medications.filter((m) => m.doseStatus === 'TAKEN').length;
  const progress = medications.length > 0 ? (takenCount / medications.length) * 100 : 0;

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenLabel}>MEDICATIONS</Text>
              <Text style={styles.title}>My Medicines</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <LinearGradient colors={GlassTheme.gradients.headerBg} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Progress Banner ── */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={styles.progressBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.progressBubble} />
              <View style={{ flex: 1, zIndex: 1 }}>
                <Text style={styles.progressTitle}>Today's Progress</Text>
                <Text style={styles.progressFraction}>{takenCount} / {medications.length} taken</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Tabs ── */}
          <View style={styles.tabBar}>
            {(['today', 'reminders', 'history'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'today' ? 'today-outline' : tab === 'reminders' ? 'alarm-outline' : 'time-outline'}
                  size={15}
                  color={activeTab === tab ? GlassTheme.colors.primary : GlassTheme.colors.textMuted}
                />
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                  {tab === 'today' ? 'Today' : tab === 'reminders' ? 'Reminders' : 'History'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Today Tab ── */}
          {activeTab === 'today' && (
            <>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              {medications.length === 0 ? (
                <GlassCard variant="flat" style={styles.emptyCard}>
                  <Ionicons name="medical-outline" size={40} color={GlassTheme.colors.textDim} style={{ alignSelf: 'center' }} />
                  <Text style={styles.emptyTitle}>No medications yet</Text>
                  <Text style={styles.emptyHint}>Tap + to add your first medication</Text>
                </GlassCard>
              ) : (
                medications.map((med, index) => {
                  const s = statusColors[med.doseStatus ?? 'PENDING'];
                  return (
                    <Animated.View key={med.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                      <GlassCard style={styles.medCard}>
                        <View style={styles.medRow}>
                          <View style={styles.medIconWrap}>
                            <Ionicons name="medical" size={22} color={GlassTheme.colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.medName}>{med.name}</Text>
                            <Text style={styles.medDosage}>{med.dosage} · {med.frequency}</Text>
                            <Text style={styles.medTime}>
                              <Ionicons name="alarm-outline" size={11} color={GlassTheme.colors.textDim} /> {med.reminderTime}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                              <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                            </View>
                            <View style={styles.cardIconRow}>
                              <TouchableOpacity onPress={() => openEditModal(med)} hitSlop={8}>
                                <Ionicons name="create-outline" size={16} color={GlassTheme.colors.textMuted} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDelete(med)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={16} color={GlassTheme.colors.danger} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                        {(med.doseStatus === 'PENDING' || !med.doseStatus) && (
                          <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.takeBtn} onPress={() => handleDoseStatus(med.id, 'TAKEN')}>
                              <LinearGradient colors={GlassTheme.gradients.headerBg} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                              <Ionicons name="checkmark" size={14} color="#FFF" />
                              <Text style={styles.takeBtnText}>Take Now</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.snoozeBtn} onPress={() => handleDoseStatus(med.id, 'SNOOZED')}>
                              <Ionicons name="alarm-outline" size={14} color={GlassTheme.colors.textMuted} />
                              <Text style={styles.snoozeBtnText}>Snooze</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </GlassCard>
                    </Animated.View>
                  );
                })
              )}
            </>
          )}

          {/* ── Reminders Tab ── */}
          {activeTab === 'reminders' && (
            <>
              <Text style={styles.sectionTitle}>Reminder Schedule</Text>
              {medications.length === 0 ? (
                <GlassCard variant="flat" style={styles.emptyCard}>
                  <Ionicons name="alarm-outline" size={40} color={GlassTheme.colors.textDim} style={{ alignSelf: 'center' }} />
                  <Text style={styles.emptyTitle}>No reminders set</Text>
                  <Text style={styles.emptyHint}>Add a medication to set up reminders</Text>
                </GlassCard>
              ) : (
                medications.map((med, index) => (
                  <Animated.View key={med.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                    <GlassCard style={styles.reminderCard}>
                      <View style={styles.reminderTimeCol}>
                        <Text style={styles.reminderTime}>{med.reminderTime}</Text>
                        <View style={styles.reminderDot} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medName}>{med.name}</Text>
                        <Text style={styles.medDosage}>{med.dosage}</Text>
                        <View style={styles.reminderFreqRow}>
                          <Ionicons name="repeat-outline" size={12} color={GlassTheme.colors.primary} />
                          <Text style={styles.reminderFreqText}>{med.frequency}</Text>
                        </View>
                        {med.instructions ? (
                          <Text style={styles.reminderInstructions}>{med.instructions}</Text>
                        ) : null}
                      </View>
                      <View style={styles.reminderBell}>
                        <Ionicons name="notifications" size={18} color={GlassTheme.colors.primary} />
                      </View>
                    </GlassCard>
                  </Animated.View>
                ))
              )}
              <GlassCard variant="flat" style={styles.reminderTip}>
                <Ionicons name="information-circle-outline" size={18} color={GlassTheme.colors.primary} />
                <Text style={styles.reminderTipText}>
                  Push notifications will alert you at your set reminder times. Make sure notifications are enabled in your device settings.
                </Text>
              </GlassCard>
            </>
          )}

          {/* ── History Tab ── */}
          {activeTab === 'history' && (
            <>
              <Text style={styles.sectionTitle}>Current Status</Text>
              {medications.length === 0 ? (
                <GlassCard variant="flat" style={styles.emptyCard}>
                  <Ionicons name="time-outline" size={40} color={GlassTheme.colors.textDim} style={{ alignSelf: 'center' }} />
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptyHint}>Your dose history will appear here</Text>
                </GlassCard>
              ) : (
                <>
                  <GlassCard variant="flat" style={styles.reminderTip}>
                    <Ionicons name="information-circle-outline" size={18} color={GlassTheme.colors.primary} />
                    <Text style={styles.reminderTipText}>
                      This shows each medication's current status, not a day-by-day log yet. Real
                      dose-by-dose history tracking is coming once it's wired up on the backend.
                    </Text>
                  </GlassCard>

                  {/* Per-medication current status */}
                  {medications.map((med, index) => {
                    const s = statusColors[med.doseStatus ?? 'PENDING'];
                    const takenAt = med.doseStatus === 'TAKEN' ? med.reminderTime : null;
                    return (
                      <Animated.View key={med.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                        <GlassCard style={styles.historyCard}>
                          <View style={styles.historyLeft}>
                            <View style={[styles.historyIconWrap, { backgroundColor: s.bg }]}>
                              <Ionicons
                                name={med.doseStatus === 'TAKEN' ? 'checkmark-circle' : med.doseStatus === 'SNOOZED' ? 'alarm' : 'ellipse-outline'}
                                size={20}
                                color={s.text}
                              />
                            </View>
                            <View style={styles.historyLine} />
                          </View>
                          <View style={{ flex: 1, paddingBottom: 16 }}>
                            <Text style={styles.medName}>{med.name}</Text>
                            <Text style={styles.medDosage}>{med.dosage} · {med.frequency}</Text>
                            <View style={styles.historyMeta}>
                              <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                                <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                              </View>
                              {takenAt && (
                                <Text style={styles.historyTime}>at {takenAt}</Text>
                              )}
                            </View>
                          </View>
                        </GlassCard>
                      </Animated.View>
                    );
                  })}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* ── Add Medication Modal ── */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingId ? 'Edit Medication' : 'Add Medication'}</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ flexShrink: 1 }}
              >
                <View style={{ gap: 14 }}>
                  {/* Drug name with autocomplete */}
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
                          <TouchableOpacity
                            key={s.id}
                            style={styles.suggestionRow}
                            onPress={() => selectSuggestion(s)}
                          >
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

                  <View>
                    <Text style={styles.freqLabel}>Frequency</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={styles.freqRow}>
                        {FREQ_OPTIONS.map((f) => (
                          <TouchableOpacity
                            key={f}
                            style={[styles.freqChip, form.frequency === f && styles.freqChipActive]}
                            onPress={() => handleFrequencyChange(f)}
                          >
                            <Text style={[styles.freqChipText, form.frequency === f && styles.freqChipTextActive]}>{f}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View>
                    <Text style={styles.freqLabel}>
                      Reminder Time{form.reminderTimes.length > 1 ? 's' : ''}
                    </Text>
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {form.reminderTimes.map((time, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.timeChip}
                          onPress={() => setTimePickerIndex(idx)}
                        >
                          <Ionicons name="alarm-outline" size={16} color={GlassTheme.colors.primary} />
                          <Text style={styles.timeChipText}>{formatTimeLabel(time)}</Text>
                          <Ionicons name="chevron-forward" size={14} color={GlassTheme.colors.textDim} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text style={styles.freqLabel}>Instructions (optional)</Text>
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
              </ScrollView>
              <View style={styles.modalActions}>
                <GlassButton
                  label="Cancel"
                  variant="ghost"
                  onPress={() => { setModalVisible(false); resetForm(); }}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  label={editingId ? 'Save Changes' : 'Save Medication'}
                  onPress={handleSave}
                  loading={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

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
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 120, gap: 4 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  screenLabel: { fontSize: 10, fontWeight: '700', color: GlassTheme.colors.primary, letterSpacing: 1.5, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', color: GlassTheme.colors.text },
  addBtn: {
    width: 46, height: 46, borderRadius: 23,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    ...GlassTheme.shadow.md,
  },

  progressBanner: {
    borderRadius: GlassTheme.radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBubble: {
    position: 'absolute', top: -40, right: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  progressFraction: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  progressBarBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill: {
    height: 6, backgroundColor: '#FFFFFF', borderRadius: 3,
  },
  progressCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  progressPct: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 20, marginBottom: 12 },

  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyTitle: { color: GlassTheme.colors.textMuted, fontSize: 15, fontWeight: '600' },
  emptyHint: { color: GlassTheme.colors.textDim, fontSize: 13 },

  medCard: { marginBottom: 10, gap: 12 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  medName: { color: GlassTheme.colors.text, fontWeight: '700', fontSize: 15 },
  medDosage: { color: GlassTheme.colors.textMuted, fontSize: 12, marginTop: 2 },
  medTime: { color: GlassTheme.colors.textDim, fontSize: 11, marginTop: 3 },
  statusBadge: { borderRadius: GlassTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardIconRow: { flexDirection: 'row', gap: 12, paddingRight: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  takeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: GlassTheme.radius.md, paddingVertical: 10, overflow: 'hidden',
  },
  takeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  snoozeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: GlassTheme.radius.md, paddingVertical: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: 1, borderColor: GlassTheme.colors.divider,
  },
  snoozeBtnText: { color: GlassTheme.colors.textMuted, fontWeight: '600', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
    gap: 16, maxHeight: '88%',
    ...GlassTheme.shadow.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: GlassTheme.colors.divider,
    alignSelf: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: GlassTheme.colors.text },

  freqLabel: { fontSize: 12, fontWeight: '600', color: GlassTheme.colors.textMuted },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: 1, borderColor: GlassTheme.colors.divider,
  },
  freqChipActive: {
    backgroundColor: GlassTheme.colors.primary,
    borderColor: GlassTheme.colors.primary,
  },
  freqChipText: { fontSize: 13, color: GlassTheme.colors.textMuted, fontWeight: '600' },
  freqChipTextActive: { color: '#FFFFFF' },

  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: GlassTheme.radius.sm,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
  },
  timeChipText: { flex: 1, fontSize: 14, fontWeight: '600', color: GlassTheme.colors.text },

  textArea: {
    marginTop: 8,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    padding: 14, fontSize: 14,
    color: GlassTheme.colors.text,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
    minHeight: 72, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row', backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.lg, padding: 4, marginTop: 16, marginBottom: 4,
    borderWidth: 1, borderColor: GlassTheme.colors.divider,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: GlassTheme.radius.md,
  },
  tabBtnActive: { backgroundColor: '#FFFFFF', ...GlassTheme.shadow.sm },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: GlassTheme.colors.textMuted },
  tabBtnTextActive: { color: GlassTheme.colors.primary },

  // ── Reminders ──
  reminderCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  reminderTimeCol: { alignItems: 'center', gap: 6, paddingTop: 2, minWidth: 44 },
  reminderTime: { fontSize: 13, fontWeight: '800', color: GlassTheme.colors.primary },
  reminderDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: GlassTheme.colors.primary,
  },
  reminderFreqRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reminderFreqText: { fontSize: 11, color: GlassTheme.colors.primary, fontWeight: '600' },
  reminderInstructions: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 4, fontStyle: 'italic' },
  reminderBell: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  reminderTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginTop: 8, padding: 14,
  },
  reminderTipText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 18 },

  // ── History ──
  historyCard: { flexDirection: 'row', gap: 12, paddingBottom: 0 },
  historyLeft: { alignItems: 'center', paddingTop: 4 },
  historyIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  historyLine: {
    flex: 1, width: 2, backgroundColor: GlassTheme.colors.divider,
    marginTop: 4, minHeight: 20,
  },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  historyTime: { fontSize: 11, color: GlassTheme.colors.textDim },

  // ── Drug autocomplete ──
  suggestionsBox: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: GlassTheme.radius.md,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.divider,
    overflow: 'hidden',
    ...GlassTheme.shadow.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: GlassTheme.colors.divider,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.text,
  },
  suggestionGeneric: {
    fontSize: 11,
    color: GlassTheme.colors.textMuted,
    marginTop: 1,
  },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.primaryLight,
  },
  sourceBadgeFda: {
    backgroundColor: GlassTheme.colors.amberLight,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '700',
    color: GlassTheme.colors.primary,
  },
  sourceTextFda: {
    color: GlassTheme.colors.amber,
  },
});
