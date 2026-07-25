import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  AdminOrder,
  AdminPharmacy,
  getAllOrdersAdmin,
  getAllPharmaciesAdmin,
  getAllUsers,
  getReportedPosts,
} from '@/services/adminService';

// Added 2026-07-23 — revenue only counts PAID orders (same convention as
// order-service's own getPharmacyOrderSummary), not every order ever placed.
function computeAnalytics(orders: AdminOrder[], pharmacies: AdminPharmacy[]) {
  const revenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const ordersByStatus: Record<string, number> = {};
  orders.forEach((o) => {
    const key = o.orderStatus || 'UNKNOWN';
    ordersByStatus[key] = (ordersByStatus[key] || 0) + 1;
  });

  const verifiedPharmacies = pharmacies.filter((p) => p.verified).length;
  const unverifiedPharmacies = pharmacies.length - verifiedPharmacies;

  return { revenue, verifiedPharmacies, unverifiedPharmacies, ordersByStatus };
}

export default function AdminHome() {
  const { clearSession, getFirstName } = useAuth();
  const [counts, setCounts] = useState({ users: 0, pharmacies: 0, orders: 0, reports: 0 });
  const [refreshing, setRefreshing] = useState(false);

  // Added 2026-07-23 — real analytics computed client-side from the same
  // full lists already fetched above (admin-service only exposes full
  // lists, no dedicated summary endpoints yet — see BACKEND_TODO.md).
  const [analytics, setAnalytics] = useState({
    revenue: 0,
    verifiedPharmacies: 0,
    unverifiedPharmacies: 0,
    ordersByStatus: {} as Record<string, number>,
  });

  const load = useCallback(async () => {
    const [users, pharmacies, ordersResult, reports] = await Promise.all([
      getAllUsers(),
      getAllPharmaciesAdmin(),
      getAllOrdersAdmin(),
      getReportedPosts(),
    ]);
    const orders = ordersResult.orders;
    setCounts({
      users: users.length,
      pharmacies: pharmacies.length,
      orders: orders.length,
      reports: reports.length,
    });
    setAnalytics(computeAnalytics(orders, pharmacies));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out of the admin dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        // FIXED — this used to call router.replace('/admin-login') itself
        // right after clearSession(). But clearSession() sets `user` to null
        // synchronously, and (admin)/_layout.tsx's own guard useEffect
        // ALSO watches `user` and redirects to /admin-login the moment it
        // goes null — so tapping "Log out" fired two competing navigations
        // to the same screen back to back, which is what made it feel like
        // it "didn't work well" (a visible stutter/flash, sometimes
        // appearing to not respond at all on slower devices). Only clearing
        // the session here and letting the layout's guard be the single
        // place that actually navigates fixes that — one clear cause, one
        // clear effect.
        onPress: () => { clearSession(); },
      },
    ]);
  };

  const totalOrdersForBars = Object.values(analytics.ordersByStatus).reduce((a, b) => a + b, 0) || 1;
  const STATUS_COLOR: Record<string, string> = {
    PENDING: GlassTheme.colors.warning,
    CONFIRMED: GlassTheme.colors.primary,
    OUT_FOR_DELIVERY: GlassTheme.colors.accent,
    DELIVERED: GlassTheme.colors.success,
    CANCELLED: GlassTheme.colors.danger,
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* ── Top Header (fixed, outside the ScrollView) ── */}
        {/* Pulled out of the scroll content so it's always on-screen the
            instant the tab opens — no scrolling required to see "Admin
            Portal / Hi, {name}" or reach the logout button. Same visual
            treatment as before (plain row matching the patient home
            dashboard's header), just pinned above the scrollable analytics
            instead of being the first item inside them. */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Admin Portal</Text>
            <Text style={styles.title}>Hi, {getFirstName()}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={GlassTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />}
        >
          <LinearGradient
            colors={GlassTheme.gradients.headerBg}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroStatRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>GHS {analytics.revenue.toFixed(0)}</Text>
                <Text style={styles.heroStatLabel}>Total revenue</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{counts.orders}</Text>
                <Text style={styles.heroStatLabel}>Total orders</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{counts.users}</Text>
                <Text style={styles.heroStatLabel}>Users</Text>
              </View>
            </View>
          </LinearGradient>

          <Text style={styles.sectionHeading}>Pharmacy verification</Text>
          <View style={styles.tileRow}>
            <GlassCard style={styles.analyticsTile} variant="flat">
              <View style={[styles.tileIcon, { backgroundColor: GlassTheme.colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={18} color={GlassTheme.colors.success} />
              </View>
              <Text style={[styles.analyticsValue, { color: GlassTheme.colors.success }]}>{analytics.verifiedPharmacies}</Text>
              <Text style={styles.analyticsLabel}>Verified</Text>
            </GlassCard>
            <GlassCard style={styles.analyticsTile} variant="flat">
              <View style={[styles.tileIcon, { backgroundColor: GlassTheme.colors.amberLight }]}>
                <Ionicons name="time" size={18} color={GlassTheme.colors.warning} />
              </View>
              <Text style={[styles.analyticsValue, { color: GlassTheme.colors.warning }]}>{analytics.unverifiedPharmacies}</Text>
              <Text style={styles.analyticsLabel}>Unverified</Text>
            </GlassCard>
          </View>

          <GlassCard style={styles.breakdownCard} variant="flat">
            <Text style={styles.breakdownTitle}>Orders by status</Text>
            {Object.keys(analytics.ordersByStatus).length === 0 ? (
              <View style={styles.noteRow}>
                <Ionicons name="cart-outline" size={16} color={GlassTheme.colors.textDim} />
                <Text style={styles.noteText}>No orders yet.</Text>
              </View>
            ) : (
              Object.entries(analytics.ordersByStatus).map(([status, count]) => (
                <View key={status} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] ?? GlassTheme.colors.textDim }]} />
                    <Text style={styles.breakdownStatus}>{status.replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        { width: `${(count / totalOrdersForBars) * 100}%`, backgroundColor: STATUS_COLOR[status] ?? GlassTheme.colors.textDim },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownCount}>{count}</Text>
                </View>
              ))
            )}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 110, gap: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  eyebrow: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 2 },
  logoutBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: {
    marginHorizontal: -20, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 22, gap: 18,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: GlassTheme.radius.lg, paddingVertical: 14 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 2 },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8 },
  noteText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 17 },
  tileRow: { flexDirection: 'row', gap: 12, marginTop: -8 },
  analyticsTile: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  tileIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  analyticsValue: { fontSize: 18, fontWeight: '800', color: GlassTheme.colors.text },
  analyticsLabel: { fontSize: 11, color: GlassTheme.colors.textMuted, textAlign: 'center' },
  breakdownCard: { gap: 10, marginTop: -8 },
  breakdownTitle: { fontSize: 14, fontWeight: '800', color: GlassTheme.colors.text, marginBottom: 2 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  breakdownLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 116 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  breakdownStatus: { fontSize: 11, color: GlassTheme.colors.text, fontWeight: '600', flexShrink: 1 },
  breakdownBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: GlassTheme.colors.surfaceAlt, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 3 },
  breakdownCount: { fontSize: 12, color: GlassTheme.colors.textMuted, fontWeight: '700', width: 22, textAlign: 'right' },
});
