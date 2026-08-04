import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useGreeting } from '@/hooks/useGreeting';
import { useHealthTip } from '@/hooks/useHealthTip';
import { getActiveMedicationCount, getPendingMedications } from '@/services/medicationService';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { getUserOrders, Order } from '@/services/orderService';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';

// Rebuilt to the ui_ref layout: the dark ink header carries the greeting and
// today's dose count, and everything else lives in the white rounded sheet
// below it. Data loading is unchanged from before the redesign.
export default function HomeScreen() {
  const router = useRouter();
  const { user, getFirstName } = useAuth();
  const greeting = useGreeting();
  const healthTip = useHealthTip();
  const [medicationCount, setMedicationCount] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
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

      // Recent orders, newest first. Wrapped separately so an orders failure
      // can't blank out the medication/reminder data fetched above it.
      try {
        const orders = await getUserOrders(userId);
        const sorted = (Array.isArray(orders) ? orders : []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentOrders(sorted.slice(0, 3));
      } catch { /* orders unavailable */ }
    } catch { /* offline */ }
  }, [userId]);

  // FIXED: this was a plain useEffect, which only runs on mount. After placing
  // an order the user navigates BACK to an already-mounted home screen, so the
  // effect never re-ran and the new order didn't show up until a manual
  // pull-to-refresh or app restart — the exact "I ordered but can't see it on
  // the home page" problem. useFocusEffect re-fetches every time the screen
  // regains focus, so a freshly placed order is visible immediately on return.
  useFocusEffect(useCallback(() => { fetchHomeData(); }, [fetchHomeData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  };

  const actions = [
    { id: 'order', label: 'Order Meds', sub: 'Compare pharmacy prices', icon: 'cart-outline' as const, route: '/order' },
    { id: 'pharmacy', label: 'Find Pharmacy', sub: 'Nearby and open now', icon: 'location-outline' as const, route: '/pharmacy' },
  ];

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        eyebrow={greeting}
        heading={getFirstName()}
        rightIcon="notifications-outline"
        onRightPress={() => router.push('/notifications' as any)}
        rightBadge={unreadNotifications}
      >
        {/* Today's doses — kept in the dark area so the sheet below opens
            straight into content rather than repeating a hero card. */}
        <View style={styles.heroStat}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="medkit-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Today&apos;s medications</Text>
            <Text style={styles.heroValue}>
              {medicationCount} <Text style={styles.heroUnit}>doses scheduled</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/medications')} hitSlop={8}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </DarkHeader>

      <SheetBody>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />
          }
        >
          {/* ── Quick Actions ── */}
          <Animated.View entering={FadeInDown.duration(320)}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.actionsRow}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionCard}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name={action.icon} size={20} color={GlassTheme.colors.primary} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionSub}>{action.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ── Recent Orders ── */}
          {recentOrders.length > 0 && (
            <Animated.View entering={FadeInDown.delay(60).duration(320)}>
              <Text style={styles.sectionTitle}>Recent orders</Text>
              {recentOrders.map((order) => {
                const status = (order.orderStatus || 'PENDING').toUpperCase();
                const isDone = status === 'DELIVERED' || status === 'COMPLETED';
                const isCancelled = status === 'CANCELLED';
                const statusColor = isCancelled
                  ? GlassTheme.colors.rose
                  : isDone
                    ? GlassTheme.colors.success
                    : GlassTheme.colors.amber;
                const statusBg = isCancelled
                  ? GlassTheme.colors.dangerLight
                  : isDone
                    ? GlassTheme.colors.successLight
                    : GlassTheme.colors.amberLight;

                const itemCount = order.items?.length ?? 0;
                const summary =
                  itemCount === 0
                    ? 'Order'
                    : itemCount === 1
                      ? order.items[0].drugName
                      : `${order.items[0].drugName} +${itemCount - 1} more`;

                return (
                  <View key={order.id} style={styles.listRow}>
                    <View style={[styles.listIcon, { backgroundColor: statusBg }]}>
                      <Ionicons
                        name={isCancelled ? 'close-circle-outline' : isDone ? 'checkmark-circle-outline' : 'cube-outline'}
                        size={17}
                        color={statusColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle} numberOfLines={1}>{summary}</Text>
                      <Text style={styles.listSub}>
                        GHS {Number(order.totalAmount ?? 0).toFixed(2)}
                        {order.fulfillmentType ? ` · ${order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* ── Upcoming Reminders ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(320)}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Upcoming reminders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/medications')} hitSlop={8}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alarm-outline" size={30} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyTitle}>No upcoming reminders</Text>
                <Text style={styles.emptyHint}>Add medications to get started</Text>
              </View>
            ) : (
              reminders.map((med: any) => (
                <View key={med.id} style={styles.listRow}>
                  <View style={styles.listIconPrimary}>
                    <Ionicons name="time-outline" size={17} color={GlassTheme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{med.name} {med.dosage}</Text>
                    <Text style={styles.listSub}>{med.reminderTime} · {med.frequency}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: GlassTheme.colors.amberLight }]}>
                    <Text style={[styles.badgeText, { color: GlassTheme.colors.amber }]}>Pending</Text>
                  </View>
                </View>
              ))
            )}
          </Animated.View>

          {/* ── Health Tip ── */}
          <Animated.View entering={FadeInDown.delay(180).duration(320)}>
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <View style={styles.tipIcon}>
                  <Ionicons name="bulb-outline" size={16} color={GlassTheme.colors.amber} />
                </View>
                <View>
                  <Text style={styles.tipCategory}>{healthTip.category}</Text>
                  <Text style={styles.tipTitle}>Health tip</Text>
                </View>
              </View>
              <Text style={styles.tipText}>{healthTip.content}</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SheetBody>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 2 },

  // ── Dark-header stat ──
  heroStat: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: GlassTheme.radius.md, padding: 14,
  },
  heroIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  heroValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  heroUnit: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },

  // ── Sections ──
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 12,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLink: { fontSize: 13, fontWeight: '600', color: GlassTheme.colors.accent, marginTop: 8 },

  // ── Quick actions ──
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, gap: 4,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  actionSub: { fontSize: 11, color: GlassTheme.colors.textMuted, lineHeight: 15 },

  // ── List rows ──
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 13, marginBottom: 9,
  },
  listIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listIconPrimary: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  listTitle: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  listSub: { fontSize: 11, color: GlassTheme.colors.textMuted, marginTop: 2 },
  badge: { borderRadius: GlassTheme.radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: '700' },

  // ── Empty ──
  emptyCard: {
    alignItems: 'center', gap: 5, paddingVertical: 30,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  emptyTitle: { color: GlassTheme.colors.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  emptyHint: { color: GlassTheme.colors.textDim, fontSize: 12 },

  // ── Health tip ──
  tipCard: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, padding: 15, marginTop: 20, marginBottom: 10,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tipIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: GlassTheme.colors.amberLight,
    alignItems: 'center', justifyContent: 'center',
  },
  tipCategory: {
    fontSize: 9, fontWeight: '700', color: GlassTheme.colors.amber,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 1 },
  tipText: { fontSize: 13, color: GlassTheme.colors.textMuted, lineHeight: 20 },
});
