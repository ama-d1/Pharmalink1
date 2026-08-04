import { useCallback, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import {
  bookAppointment, getAdherenceReport, getAppointments, getProfile,
  logDose, updateHealthInfo, updateProfile, updateSettings, UserProfile,
} from '@/services/profileService';
import { getUserMedications } from '@/services/medicationService';
import { getTwoFactorStatus, setTwoFactorEnabled } from '@/services/authService';

function AdherenceRing({ percent }: { percent: number }) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={GlassTheme.colors.divider} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={GlassTheme.colors.primary} strokeWidth={stroke} fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        rotation="-90" origin={`${size / 2}, ${size / 2}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, clearSession } = useAuth();
  const { getCartItems, getCartTotal, getCartItemsCount, getCartPharmacy, updateQuantity, clearCart } = useCart();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  // Loaded alongside the profile so the Health Summary can report adherence
  // from the same data the Meds tab shows — see the adherence note below.
  const [meds, setMeds] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<'profile' | 'health' | 'book' | 'notifications' | 'privacy' | 'report' | 'logDose' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [adherenceReport, setAdherenceReport] = useState<any>(null);
  const [medsForLogging, setMedsForLogging] = useState<any[]>([]);
  const [loggingDose, setLoggingDose] = useState(false);
  // Coming-soon roadmap item #9: lives in auth-service, not Profile
  // (user-profile-service) — this is a credential/security setting, not
  // account data — so it's loaded and toggled separately from `profile`.
  const [twoFactorEnabled, setTwoFactorEnabledState] = useState(false);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const data = await getProfile(user.userId);
      setProfile(data);
      const appts = await getAppointments(user.userId);
      setAppointments(appts);
    } catch { /* offline */ }
    // Separate try/catch: a medications failure must not blank the profile
    // data already fetched above it.
    try {
      setMeds(await getUserMedications(user.userId));
    } catch { /* offline */ }
    getTwoFactorStatus().then(setTwoFactorEnabledState);
  }, [user?.userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const initials = profile?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'PL';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await clearSession(); router.replace('/login'); },
      },
    ]);
  };

  const handleLogDose = async () => {
    if (!user?.userId) return;
    try {
      const meds = await getUserMedications(user.userId);
      if (!meds.length) return Alert.alert('No Medications', 'Add a medication first.');
      if (meds.length === 1) {
        await handleLogDoseFor(meds[0].id);
        return;
      }
      setMedsForLogging(meds);
      setEditModal('logDose');
    } catch {
      Alert.alert('Something went wrong', "Couldn't load your medications. Please try again.");
    }
  };

  const handleLogDoseFor = async (medicationId: string) => {
    if (!user?.userId || loggingDose) return;
    setLoggingDose(true);
    try {
      await logDose(user.userId, medicationId);
      setEditModal(null);
      await loadProfile();
      Alert.alert('Logged!', 'Dose recorded. Streak updated!');
    } catch {
      Alert.alert('Something went wrong', "Couldn't log the dose. Please try again.");
    } finally {
      setLoggingDose(false);
    }
  };

  const handleReport = async () => {
    if (!user?.userId) return;
    try {
      const report = await getAdherenceReport(user.userId);
      setAdherenceReport(report);
    } catch {
      setAdherenceReport({ adherenceRate: 0, dayStreak: 0, totalDosesLogged: 0 });
    }
    setEditModal('report');
  };

  const saveEdit = async () => {
    if (!user?.userId) return;
    if (editModal === 'book') {
      // Backend parses these with strict ISO formats (LocalDate.parse /
      // LocalTime.parse) — validate up front so the user gets an immediate,
      // specific message instead of a request that fails on the server.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
        Alert.alert('Invalid date', 'Please enter the date as YYYY-MM-DD, e.g. 2026-08-05.');
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time.trim())) {
        Alert.alert('Invalid time', 'Please enter the time as HH:MM in 24-hour format, e.g. 14:30.');
        return;
      }
    }
    try {
      if (editModal === 'profile') await updateProfile(user.userId, { fullName: form.fullName, phoneNumber: form.phone });
      if (editModal === 'health') await updateHealthInfo(user.userId, { bloodGroup: form.bloodGroup, allergies: form.allergies, conditions: form.conditions });
      if (editModal === 'book') await bookAppointment(user.userId, { professionalName: form.profName, specialty: form.specialty, appointmentDate: form.date.trim(), appointmentTime: form.time.trim() });
      setEditModal(null);
      loadProfile();
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message || "Couldn't save your changes. Please try again.");
    }
  };

  const handleToggleSetting = async (key: string, current: boolean) => {
    if (!user?.userId) return;
    try {
      await updateSettings(user.userId, { [key]: !current });
      loadProfile();
    } catch {
      Alert.alert('Something went wrong', "Couldn't update that setting. Please try again.");
    }
  };

  const handleToggleTwoFactor = async () => {
    if (savingTwoFactor) return;
    setSavingTwoFactor(true);
    try {
      const result = await setTwoFactorEnabled(!twoFactorEnabled);
      setTwoFactorEnabledState(result);
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message || "Couldn't update that setting. Please try again.");
    } finally {
      setSavingTwoFactor(false);
    }
  };
  // ── Adherence ────────────────────────────────────────────────────────
  // This read a flat 0% for basically everyone, and the cause was that the
  // app tracks doses in TWO places that never talk to each other:
  //
  //   • profile-service's logDose()      — what `profile.adherenceRate` is
  //                                        computed from. Only ever called
  //                                        by this screen's "Log Dose"
  //                                        button.
  //   • medication-service's updateDoseStatus() — what the Meds tab's
  //                                        "Take Now" button calls.
  //
  // So a user who had been marking every dose Taken in the Meds tab still
  // saw 0% here, because none of that reached profile-service. Rather than
  // show a number that contradicts what the rest of the app displays, fall
  // back to deriving today's rate from the same medication records the Meds
  // tab renders. The backend figure still wins whenever it actually has
  // logged history, so real data is never discarded.
  const takenToday = meds.filter((m) => m.doseStatus === 'TAKEN').length;
  const localAdherence = meds.length > 0 ? (takenToday / meds.length) * 100 : 0;
  const backendAdherence = profile?.adherenceRate ?? 0;
  const adherenceRate = backendAdherence > 0 ? backendAdherence : localAdherence;
  // Same idea — the live list is authoritative over a denormalized count.
  const medicationCount = meds.length > 0 ? meds.length : (profile?.medicationCount ?? 0);
  const cartItems = getCartItems();
  const cartTotal = getCartTotal();
  const cartCount = getCartItemsCount();
  const cartPharmacy = getCartPharmacy();
  const handleClearCart = () => {
    Alert.alert('Clear cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearCart() },
    ]);
  };

  const stats = [
    { id: 'meds', label: 'Medications', value: String(medicationCount), icon: 'medkit-outline' as const, color: GlassTheme.colors.primary, bg: GlassTheme.colors.primaryLight },
    { id: 'adherence', label: 'Adherence', value: `${Math.round(adherenceRate)}%`, percent: adherenceRate, color: GlassTheme.colors.accent, bg: GlassTheme.colors.accentLight },
    { id: 'streak', label: 'Day Streak', value: String(profile?.dayStreak ?? 0), icon: 'flame-outline' as const, color: GlassTheme.colors.amber, bg: GlassTheme.colors.amberLight },
    { id: 'appts', label: 'Appointments', value: String(profile?.appointmentCount ?? 0), icon: 'calendar-outline' as const, color: GlassTheme.colors.violet, bg: GlassTheme.colors.violetLight },
  ];

  const settingsItems = [
    { label: 'Edit Profile', icon: 'person-outline' as const, action: () => { setForm({ fullName: profile?.fullName ?? '', phone: profile?.phoneNumber ?? '' }); setEditModal('profile'); } },
    { label: 'Notifications', icon: 'notifications-outline' as const, action: () => setEditModal('notifications') },
    { label: 'Privacy & Security', icon: 'shield-checkmark-outline' as const, action: () => setEditModal('privacy') },
    { label: 'Log Out', icon: 'log-out-outline' as const, action: handleLogout, danger: true },
  ];

  return (
    <GlassBackground>
      {/* light-content: the ink header runs edge-to-edge under the status
          bar (no 'top' safe-area edge below), so dark icons would be
          invisible against it. Matches every other screen's title bar. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView
            keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Profile Header ── */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.profileName}>{profile?.fullName ?? user?.fullName}</Text>
              <Text style={styles.profileEmail}>{profile?.email ?? user?.email}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.roleText}>{user?.role ?? 'Patient'}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Stats Grid ── */}
          <Text style={styles.sectionLabel}>Health Summary</Text>
          <View style={styles.statsGrid}>
            {stats.map((s, i) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(i * 60).duration(300)} style={styles.statCell}>
                <GlassCard style={styles.statCard}>
                  {'percent' in s && s.percent !== undefined ? (
                    <View style={styles.statRingWrap}>
                      <AdherenceRing percent={s.percent} />
                    </View>
                  ) : (
                    <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                      <Ionicons name={(s as any).icon} size={18} color={s.color} />
                    </View>
                  )}
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>

          {/* ── Quick Actions ── */}
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {[
              { label: 'Log Dose', icon: 'add-circle-outline' as const, color: GlassTheme.colors.primary, bg: GlassTheme.colors.primaryLight, action: handleLogDose },
              { label: 'Book Appt', icon: 'calendar-outline' as const, color: GlassTheme.colors.accent, bg: GlassTheme.colors.accentLight, action: () => setEditModal('book') },
              { label: 'Report', icon: 'bar-chart-outline' as const, color: GlassTheme.colors.violet, bg: GlassTheme.colors.violetLight, action: handleReport },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.quickBtn} onPress={item.action} activeOpacity={0.8}>
                <View style={[styles.quickIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={[styles.quickLabel, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* ── Cart ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Your Cart</Text>
            {cartCount > 0 && (
              <TouchableOpacity onPress={handleClearCart} hitSlop={8}>
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {cartItems.length === 0 ? (
            <GlassCard style={styles.cartEmpty}>
              <Ionicons name="bag-outline" size={28} color={GlassTheme.colors.textDim} />
              <Text style={styles.cartEmptyTitle}>Your cart is empty</Text>
              <Text style={styles.cartEmptyHint}>Search medications to compare prices and start an order.</Text>
              <TouchableOpacity style={styles.cartCta} onPress={() => router.push('/order')} activeOpacity={0.85}>
                <Text style={styles.cartCtaText}>Browse medications</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <GlassCard style={styles.cartCard}>
              {!!cartPharmacy && (
                <View style={styles.cartPharmacyRow}>
                  <Ionicons name="storefront-outline" size={14} color={GlassTheme.colors.primary} />
                  <Text style={styles.cartPharmacyText} numberOfLines={1}>
                    From {cartPharmacy.pharmacyName}
                  </Text>
                </View>
              )}
              {cartItems.map((item, i) => (
                <View key={item.id} style={[styles.cartRow, i > 0 && styles.cartRowDivider]}>
                  <View style={styles.cartThumb}>
                    <Ionicons name="medical" size={16} color={GlassTheme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cartMeta}>₵{item.price.toFixed(2)} each</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        style={styles.qtyBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="remove" size={13} color={GlassTheme.colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        style={styles.qtyBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="add" size={13} color={GlassTheme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.cartLineTotal}>₵{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.cartDivider} />
              <View style={styles.cartTotalRow}>
                <Text style={styles.cartTotalLabel}>
                  Subtotal · {cartCount} item{cartCount === 1 ? '' : 's'}
                </Text>
                <Text style={styles.cartTotalValue}>₵{cartTotal.toFixed(2)}</Text>
              </View>
              <Text style={styles.cartNote}>Pickup or delivery fee is decided at checkout.</Text>
              <TouchableOpacity
                style={styles.cartCta}
                onPress={() => router.push('/delivery' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.cartCtaText}>Checkout · ₵{cartTotal.toFixed(2)}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* ── Health Info ── */}
          <Text style={styles.sectionLabel}>Health Info</Text>
          <GlassCard style={styles.infoCard}>
            {[
              { label: 'Blood Group', value: profile?.bloodGroup ?? '—', icon: 'water-outline' as const },
              { label: 'Allergies', value: profile?.allergies ?? 'None', icon: 'alert-circle-outline' as const },
              { label: 'Conditions', value: profile?.conditions ?? 'None', icon: 'heart-outline' as const },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.infoRow}>
                  <Ionicons name={item.icon} size={16} color={GlassTheme.colors.textDim} />
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{item.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
            <View style={{ marginTop: 12 }}>
              <GlassButton
                label="Edit Health Info"
                variant="outline"
                size="sm"
                onPress={() => {
                  setForm({ bloodGroup: profile?.bloodGroup ?? '', allergies: profile?.allergies ?? '', conditions: profile?.conditions ?? '' });
                  setEditModal('health');
                }}
              />
            </View>
          </GlassCard>

          {/* ── Appointments ── */}
          {appointments.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Upcoming Appointments</Text>
              {appointments.map((a) => (
                <GlassCard key={a.id} style={styles.apptCard}>
                  <View style={styles.apptIconWrap}>
                    <Ionicons name="calendar" size={20} color={GlassTheme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptName}>{a.professionalName}</Text>
                    <Text style={styles.apptMeta}>{a.specialty} · {a.appointmentDate} at {a.appointmentTime}</Text>
                  </View>
                </GlassCard>
              ))}
            </>
          )}

          {/* ── Settings ── */}
          <Text style={styles.sectionLabel}>Settings</Text>
          <GlassCard style={{ paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>
            {settingsItems.map((item, i, arr) => (
              <View key={item.label}>
                <Pressable
                  style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
                  onPress={item.action}
                >
                  <View style={[styles.settingsIcon, item.danger && { backgroundColor: GlassTheme.colors.dangerLight }]}>
                    <Ionicons name={item.icon} size={17} color={item.danger ? GlassTheme.colors.danger : GlassTheme.colors.primary} />
                  </View>
                  <Text style={[styles.settingsLabel, item.danger && { color: GlassTheme.colors.danger }]}>
                    {item.label}
                  </Text>
                  {!item.danger && <Ionicons name="chevron-forward" size={15} color={GlassTheme.colors.textDim} />}
                </Pressable>
                {i < arr.length - 1 && <View style={styles.settingsDivider} />}
              </View>
            ))}
          </GlassCard>

          <Text style={styles.footer}>PharmaLink v1.0.0</Text>
        </ScrollView>

        {/* ── Edit Modal ── */}
        <Modal visible={!!editModal} transparent animationType="slide">
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior="padding"
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {editModal === 'profile' ? 'Edit Profile'
                  : editModal === 'health' ? 'Health Info'
                  : editModal === 'book' ? 'Book Appointment'
                  : editModal === 'notifications' ? 'Notifications'
                  : editModal === 'privacy' ? 'Privacy & Security'
                  : editModal === 'logDose' ? 'Log a Dose'
                  : 'Adherence Report'}
              </Text>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={{ gap: 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {editModal === 'profile' && (
                  <>
                    <GlassInput label="Full Name" icon="person-outline" placeholder="Your name" value={form.fullName} onChangeText={(t) => setForm({ ...form, fullName: t })} />
                    <GlassInput label="Phone" icon="call-outline" placeholder="Phone number" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
                  </>
                )}
                {editModal === 'health' && (
                  <>
                    <GlassInput label="Blood Group" icon="water-outline" placeholder="e.g. O+" value={form.bloodGroup} onChangeText={(t) => setForm({ ...form, bloodGroup: t })} />
                    <GlassInput label="Allergies" icon="alert-circle-outline" placeholder="e.g. Penicillin" value={form.allergies} onChangeText={(t) => setForm({ ...form, allergies: t })} />
                    <GlassInput label="Conditions" icon="heart-outline" placeholder="e.g. Diabetes" value={form.conditions} onChangeText={(t) => setForm({ ...form, conditions: t })} />
                  </>
                )}
                {editModal === 'book' && (
                  <>
                    <GlassInput label="Professional Name" icon="person-outline" placeholder="Dr. / Pharm." value={form.profName} onChangeText={(t) => setForm({ ...form, profName: t })} />
                    <GlassInput label="Specialty" icon="medkit-outline" placeholder="e.g. Cardiology" value={form.specialty} onChangeText={(t) => setForm({ ...form, specialty: t })} />
                    <GlassInput label="Date" icon="calendar-outline" placeholder="YYYY-MM-DD" value={form.date} onChangeText={(t) => setForm({ ...form, date: t })} />
                    <GlassInput label="Time" icon="alarm-outline" placeholder="HH:MM" value={form.time} onChangeText={(t) => setForm({ ...form, time: t })} />
                  </>
                )}
                {editModal === 'notifications' && (
                  <View style={{ gap: 0 }}>
                    {[
                      { key: 'notificationsEnabled', label: 'Dose Reminders', sub: 'Alert when it\'s time to take a dose', icon: 'alarm-outline', supported: true },
                      { key: 'emailNotifications', label: 'Email Notifications', sub: 'Order updates and appointment reminders by email', icon: 'mail-outline', supported: true },
                      { key: 'communityAlerts', label: 'Community Activity', sub: 'Get notified when someone comments on your posts', icon: 'chatbubbles-outline', supported: true },
                      { key: 'appointmentReminders', label: 'Appointment Reminders', sub: 'Reminder 24 hrs before appointments', icon: 'calendar-outline', supported: true },
                    ].map((item, i, arr) => (
                      <View key={item.key}>
                        <TouchableOpacity
                          style={[styles.toggleRow, !item.supported && styles.toggleRowDisabled]}
                          activeOpacity={item.supported ? 0.7 : 1}
                          disabled={!item.supported}
                          onPress={() => handleToggleSetting(item.key, !!(profile as any)?.[item.key])}
                        >
                          <View style={styles.toggleIcon}>
                            <Ionicons name={item.icon as any} size={16} color={item.supported ? GlassTheme.colors.primary : GlassTheme.colors.textDim} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>{item.label}</Text>
                            <Text style={styles.toggleSub}>{item.supported ? item.sub : 'Coming soon'}</Text>
                          </View>
                          {item.supported ? (
                            <View style={[styles.togglePill, (profile as any)?.[item.key] && styles.togglePillOn]}>
                              <View style={[styles.toggleThumb, (profile as any)?.[item.key] && styles.toggleThumbOn]} />
                            </View>
                          ) : (
                            <View style={styles.togglePill} />
                          )}
                        </TouchableOpacity>
                        {i < arr.length - 1 && <View style={styles.settingsDivider} />}
                      </View>
                    ))}
                  </View>
                )}
                {editModal === 'privacy' && (
                  <View style={{ gap: 0 }}>
                    {[
                      { key: 'privacyMode', label: 'Private Profile', sub: 'Hide your profile from other users', icon: 'eye-off-outline', supported: true },
                      { key: 'shareHealthData', label: 'Share Health Data', sub: 'Allow anonymised data for research', icon: 'analytics-outline', supported: false },
                      {
                        key: 'twoFactorEnabled',
                        label: 'Two-Factor Auth',
                        sub: 'Email a code at login for extra security',
                        icon: 'shield-outline',
                        supported: true,
                        // Coming-soon roadmap item #9: this one lives in
                        // auth-service, not Profile — value/handler are
                        // sourced differently from every other row here.
                        value: twoFactorEnabled,
                        onToggle: handleToggleTwoFactor,
                      },
                    ].map((item: any, i, arr) => (
                      <View key={item.key}>
                        <TouchableOpacity
                          style={[styles.toggleRow, !item.supported && styles.toggleRowDisabled]}
                          activeOpacity={item.supported ? 0.7 : 1}
                          disabled={!item.supported}
                          onPress={() => item.onToggle ? item.onToggle() : handleToggleSetting(item.key, !!(profile as any)?.[item.key])}
                        >
                          <View style={styles.toggleIcon}>
                            <Ionicons name={item.icon as any} size={16} color={item.supported ? GlassTheme.colors.primary : GlassTheme.colors.textDim} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>{item.label}</Text>
                            <Text style={styles.toggleSub}>{item.supported ? item.sub : 'Coming soon'}</Text>
                          </View>
                          {item.supported ? (
                            <View style={[styles.togglePill, (item.value ?? (profile as any)?.[item.key]) && styles.togglePillOn]}>
                              <View style={[styles.toggleThumb, (item.value ?? (profile as any)?.[item.key]) && styles.toggleThumbOn]} />
                            </View>
                          ) : (
                            <View style={styles.togglePill} />
                          )}
                        </TouchableOpacity>
                        {i < arr.length - 1 && <View style={styles.settingsDivider} />}
                      </View>
                    ))}
                    <View style={styles.dangerZone}>
                      <Text style={styles.dangerTitle}>Danger Zone</Text>
                      <TouchableOpacity style={styles.dangerBtn} onPress={() => Alert.alert('Delete Account', 'Contact support to delete your account.')}>
                        <Ionicons name="trash-outline" size={15} color={GlassTheme.colors.danger} />
                        <Text style={styles.dangerBtnText}>Delete Account</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {editModal === 'logDose' && (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.pickerHint}>Which medication did you take?</Text>
                    {medsForLogging.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.medPickRow}
                        activeOpacity={0.75}
                        disabled={loggingDose}
                        onPress={() => handleLogDoseFor(m.id)}
                      >
                        <View style={styles.medPickIcon}>
                          <Ionicons name="medkit-outline" size={18} color={GlassTheme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medPickName}>{m.name}</Text>
                          {!!m.dosage && <Text style={styles.medPickSub}>{m.dosage}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={GlassTheme.colors.textDim} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {editModal === 'report' && adherenceReport && (
                  <View style={{ gap: 12 }}>
                    <View style={styles.reportBanner}>
                      <Text style={styles.reportBigNum}>{Math.round(adherenceReport.adherenceRate ?? 0)}%</Text>
                      <Text style={styles.reportBigLabel}>Adherence Rate</Text>
                    </View>
                    {[
                      { icon: 'flame-outline', label: 'Day Streak', value: `${adherenceReport.dayStreak ?? 0} days`, color: GlassTheme.colors.amber },
                      { icon: 'checkmark-circle-outline', label: 'Doses Logged', value: String(adherenceReport.totalDosesLogged ?? 0), color: GlassTheme.colors.success },
                      { icon: 'close-circle-outline', label: 'Doses Missed', value: String(adherenceReport.missedDoses ?? 0), color: GlassTheme.colors.danger },
                    ].map((item) => (
                      <View key={item.label} style={styles.reportRow}>
                        <View style={[styles.reportIcon, { backgroundColor: `${item.color}18` }]}>
                          <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <Text style={styles.reportRowLabel}>{item.label}</Text>
                        <Text style={[styles.reportRowValue, { color: item.color }]}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
              <View style={styles.modalActions}>
                <GlassButton label="Close" variant="ghost" onPress={() => setEditModal(null)} style={{ flex: 1 }} />
                {(editModal === 'profile' || editModal === 'health' || editModal === 'book') && (
                  <GlassButton label="Save" onPress={saveEdit} style={{ flex: 1 }} />
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120, gap: 4 },

  profileHeader: {
    paddingTop: 40,
    paddingBottom: 36,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: GlassTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 5,
    marginTop: 6,
  },
  roleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 24, marginBottom: 12, paddingHorizontal: 20,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 },
  clearLink: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.danger, marginTop: 12 },
  // ── Cart ──
  cartCard: { marginHorizontal: 20, gap: 0 },
  cartEmpty: { marginHorizontal: 20, alignItems: 'center', gap: 6, paddingVertical: 26 },
  cartEmptyTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 4 },
  cartEmptyHint: {
    fontSize: 12, color: GlassTheme.colors.textDim,
    textAlign: 'center', lineHeight: 17, paddingHorizontal: 16,
  },
  cartPharmacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.sm,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
  },
  cartPharmacyText: { flex: 1, fontSize: 12, fontWeight: '700', color: GlassTheme.colors.primary },
  cartRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11 },
  cartRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: GlassTheme.colors.divider },
  cartThumb: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cartName: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  cartMeta: { fontSize: 11, color: GlassTheme.colors.textMuted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text, minWidth: 16, textAlign: 'center' },
  cartLineTotal: { fontSize: 13, fontWeight: '800', color: GlassTheme.colors.text },
  cartDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: GlassTheme.colors.divider,
    marginTop: 6, marginBottom: 12,
  },
  cartTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartTotalLabel: { fontSize: 13, color: GlassTheme.colors.textMuted },
  cartTotalValue: { fontSize: 17, fontWeight: '800', color: GlassTheme.colors.text },
  cartNote: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 4 },
  cartCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GlassTheme.colors.primary,
    borderRadius: GlassTheme.radius.sm,
    paddingVertical: 13, marginTop: 14,
  },
  cartCtaText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  statCell: { width: '47%', flexGrow: 1 },
  statCard: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statRingWrap: { marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: GlassTheme.colors.textMuted, textAlign: 'center' },

  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16,
    backgroundColor: '#FFFFFF', borderRadius: GlassTheme.radius.lg,
    borderWidth: 1, borderColor: GlassTheme.colors.divider,
    ...GlassTheme.shadow.sm,
  },
  quickIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '700' },

  infoCard: { marginHorizontal: 20, gap: 0, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  infoLabel: { flex: 1, color: GlassTheme.colors.textMuted, fontSize: 14 },
  infoValue: { color: GlassTheme.colors.text, fontWeight: '600', fontSize: 14, maxWidth: '45%' },
  divider: { height: 1, backgroundColor: GlassTheme.colors.divider },

  apptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 8 },
  apptIconWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: GlassTheme.colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  apptName: { color: GlassTheme.colors.text, fontWeight: '600' },
  apptMeta: { color: GlassTheme.colors.textMuted, fontSize: 12, marginTop: 3 },

  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  settingsRowPressed: { backgroundColor: GlassTheme.colors.surfaceAlt },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { flex: 1, color: GlassTheme.colors.text, fontSize: 15, fontWeight: '500' },
  settingsDivider: { height: 1, backgroundColor: GlassTheme.colors.divider, marginLeft: 64 },

  footer: { textAlign: 'center', color: GlassTheme.colors.textDim, fontSize: 11, marginTop: 24, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, gap: 16, maxHeight: '85%',
  },
  modalScroll: { flexGrow: 0 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: GlassTheme.colors.divider, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: GlassTheme.colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },

  // ── Toggle rows (Notifications / Privacy) ──
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  toggleIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: GlassTheme.colors.text },
  toggleSub: { fontSize: 11, color: GlassTheme.colors.textDim, marginTop: 2 },
  togglePill: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: GlassTheme.colors.divider,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  togglePillOn: { backgroundColor: GlassTheme.colors.primary },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    ...GlassTheme.shadow.sm,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleRowDisabled: { opacity: 0.5 },

  // ── Log Dose picker ──
  pickerHint: { fontSize: 13, color: GlassTheme.colors.textMuted, marginBottom: 4 },
  medPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: GlassTheme.radius.md,
    borderWidth: 1, borderColor: GlassTheme.colors.divider,
  },
  medPickIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  medPickName: { fontSize: 14, fontWeight: '600', color: GlassTheme.colors.text },
  medPickSub: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },

  // ── Danger zone ──
  dangerZone: {
    marginTop: 16, borderTopWidth: 1,
    borderTopColor: GlassTheme.colors.divider, paddingTop: 16,
  },
  dangerTitle: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.textDim, marginBottom: 10, letterSpacing: 0.8 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: GlassTheme.radius.md,
    borderWidth: 1, borderColor: GlassTheme.colors.dangerLight,
    backgroundColor: GlassTheme.colors.dangerLight,
  },
  dangerBtnText: { color: GlassTheme.colors.danger, fontSize: 13, fontWeight: '600' },

  // ── Report modal ──
  reportBanner: {
    alignItems: 'center', paddingVertical: 20,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.lg,
  },
  reportBigNum: { fontSize: 48, fontWeight: '800', color: GlassTheme.colors.primary },
  reportBigLabel: { fontSize: 13, color: GlassTheme.colors.textMuted, fontWeight: '600', marginTop: 4 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportRowLabel: { flex: 1, fontSize: 14, color: GlassTheme.colors.textMuted },
  reportRowValue: { fontSize: 16, fontWeight: '800' },
});