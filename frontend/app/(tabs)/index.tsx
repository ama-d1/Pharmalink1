import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useGreeting } from '@/hooks/useGreeting';
import { useHealthTip } from '@/hooks/useHealthTip';
import { getActiveMedicationCount, getPendingMedications } from '@/services/medicationService';
import { getUnreadNotificationCount } from '@/services/notificationService';

export default function HomeScreen() {
  const router = useRouter();
  const { user, getFirstName } = useAuth();
  const greeting = useGreeting();
  const healthTip = useHealthTip();
  const [medicationCount, setMedicationCount] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.userId;

  const fetchHomeData = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await getActiveMedicationCount(userId);
      setMedicationCount(typeof count === 'number' ? count : 0);
      const meds = await getPendingMedications(userId);
      setReminders(meds.slice(0, 3));
      setUnreadNotifications(await getUnreadNotificationCount(userId));
    } catch { /* offline */ }
  }, [userId]);

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  };

  const actions = [
    { id: 'order', label: 'Order Meds', icon: 'cart-outline' as const, color: GlassTheme.colors.primary, bg: GlassTheme.colors.primaryLight, route: '/order' },
    { id: 'pharmacy', label: 'Find Pharmacy', icon: 'location-outline' as const, color: GlassTheme.colors.amber, bg: GlassTheme.colors.amberLight, route: '/pharmacy' },
  ];

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GlassTheme.colors.primary}
              colors={[GlassTheme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Header ── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{getFirstName()}</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={22} color={GlassTheme.colors.primary} />
              {(reminders.length > 0 || unreadNotifications > 0) && <View style={styles.notifDot} />}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Hero Banner ── */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={styles.heroBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* decorative circles */}
              <View style={styles.heroBubble1} />
              <View style={styles.heroBubble2} />

              <View style={{ flex: 1, zIndex: 1 }}>
                <Text style={styles.heroLabel}>Today's Medications</Text>
                <Text style={styles.heroValue}>{medicationCount}</Text>
                <Text style={styles.heroUnit}>doses scheduled</Text>
                <View style={styles.heroBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
                  <Text style={styles.heroBadgeText}>Stay on track</Text>
                </View>
              </View>

              <View style={styles.heroIconWrap}>
                <Ionicons name="medkit" size={52} color="rgba(255,255,255,0.35)" />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Quick Actions ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionCard, { borderColor: `${action.color}30` }]}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={action.color} style={{ marginTop: 2 }} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ── Upcoming Reminders ── */}
          <Animated.View entering={FadeInDown.delay(240).duration(400)}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/medications')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <GlassCard variant="flat">
                <View style={styles.emptyState}>
                  <Ionicons name="alarm-outline" size={32} color={GlassTheme.colors.textDim} />
                  <Text style={styles.emptyText}>No upcoming reminders</Text>
                  <Text style={styles.emptyHint}>Add medications to get started</Text>
                </View>
              </GlassCard>
            ) : (
              reminders.map((med: any, index: number) => (
                <GlassCard key={med.id} style={styles.reminderCard}>
                  <View style={[styles.reminderDot, { backgroundColor: index === 0 ? GlassTheme.colors.primary : index === 1 ? GlassTheme.colors.accent : GlassTheme.colors.violet }]} />
                  <View style={[styles.reminderIconWrap, { backgroundColor: GlassTheme.colors.primaryLight }]}>
                    <Ionicons name="time-outline" size={18} color={GlassTheme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderName}>{med.name} {med.dosage}</Text>
                    <Text style={styles.reminderTime}>{med.reminderTime} · {med.frequency}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                </GlassCard>
              ))
            )}
          </Animated.View>

          {/* ── Health Tip ── */}
          <Animated.View entering={FadeInDown.delay(320).duration(400)}>
            <GlassCard gradient style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <View style={styles.tipIconWrap}>
                  <Ionicons name="bulb-outline" size={18} color={GlassTheme.colors.amber} />
                </View>
                <View>
                  <Text style={styles.tipCategory}>{healthTip.category}</Text>
                  <Text style={styles.tipTitle}>Health Tip</Text>
                </View>
              </View>
              <Text style={styles.tipText}>{healthTip.content}</Text>
            </GlassCard>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 110, gap: 4 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: GlassTheme.colors.textMuted, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: GlassTheme.colors.rose,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },

  heroBanner: {
    borderRadius: GlassTheme.radius.xl,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    minHeight: 140,
  },
  heroBubble1: {
    position: 'absolute', top: -40, right: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBubble2: {
    position: 'absolute', bottom: -30, right: 60,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  heroValue: { fontSize: 48, fontWeight: '800', color: '#FFFFFF', lineHeight: 54, marginTop: 4 },
  heroUnit: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: GlassTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginTop: 10,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  heroIconWrap: { marginLeft: 'auto' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, marginBottom: 12,
  },
  seeAll: { fontSize: 13, color: GlassTheme.colors.primary, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, borderRadius: GlassTheme.radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'flex-start',
    gap: 10,
    ...GlassTheme.shadow.sm,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '700', flex: 1 },

  reminderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8, position: 'relative',
  },
  reminderDot: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, borderRadius: 3,
  },
  reminderIconWrap: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  reminderName: { color: GlassTheme.colors.text, fontWeight: '600', fontSize: 14 },
  reminderTime: { color: GlassTheme.colors.textMuted, fontSize: 12, marginTop: 2 },
  pendingBadge: {
    backgroundColor: GlassTheme.colors.amberLight,
    borderRadius: GlassTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  pendingText: { color: GlassTheme.colors.amber, fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  emptyText: { color: GlassTheme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  emptyHint: { color: GlassTheme.colors.textDim, fontSize: 12 },

  tipCard: { marginTop: 8, marginBottom: 20 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: GlassTheme.colors.amberLight,
    alignItems: 'center', justifyContent: 'center',
  },
  tipCategory: { fontSize: 10, fontWeight: '700', color: GlassTheme.colors.amber, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  tipText: { fontSize: 14, color: GlassTheme.colors.textMuted, lineHeight: 22 },
});
