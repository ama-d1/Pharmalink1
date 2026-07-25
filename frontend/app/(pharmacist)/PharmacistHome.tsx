import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { getProfile, getPharmacyStaff, PharmacyStaffMember } from '@/services/profileService';
import { getStock, PharmacyStock } from '@/services/pharmacyStockService';
import { getPharmacyOrderSummary, PharmacyOrderSummary } from '@/services/orderService';
import { getBankAccountStatus } from '@/services/payoutService';

// Quantity at or below this counts as "low stock" for the alert tile.
// Matches no existing backend constant — purely a dashboard display
// threshold, doesn't affect stock.tsx's own behavior.
const LOW_STOCK_THRESHOLD = 5;

// Real dashboard — replaces the previous single-link landing screen
// (2026-07-23). Both OWNER and MANAGER see the same stock + orders/revenue
// overview; OWNER additionally sees the pharmacy's staff list (who else is
// assigned there), since only an owner-tier account has any reason to know
// that today. No owner-only actions are gated yet (see Profile.pharmacyRole
// javadoc) — this is purely a visibility difference.
export default function PharmacistHome() {
  const router = useRouter();
  const { user, clearSession } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState<string | null>(null);
  const [pharmacyRole, setPharmacyRole] = useState<string | null>(null);
  const [stock, setStock] = useState<PharmacyStock[]>([]);
  const [orderSummary, setOrderSummary] = useState<PharmacyOrderSummary>({ totalOrders: 0, paidOrders: 0, revenue: 0 });
  const [staff, setStaff] = useState<PharmacyStaffMember[]>([]);
  // Added 2026-07-24 — drives the OWNER-only Payout Settings action card's
  // warning badge (pharmacies without a subaccount don't receive automatic
  // payouts). null while unknown/not-yet-loaded, so the badge stays hidden
  // until we actually know, rather than flashing a false warning.
  const [payoutActive, setPayoutActive] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!user?.userId) return;
    const profile = await getProfile(user.userId);
    setPharmacyRole(profile.pharmacyRole ?? null);
    if (!profile.pharmacyId) {
      setLoading(false);
      return;
    }
    setPharmacyId(profile.pharmacyId);
    setPharmacyName(profile.pharmacyName ?? null);

    const isOwner = profile.pharmacyRole === 'OWNER';
    const [stockData, summaryData, staffData] = await Promise.all([
      getStock(profile.pharmacyId),
      getPharmacyOrderSummary(profile.pharmacyId),
      isOwner ? getPharmacyStaff(profile.pharmacyId) : Promise.resolve([]),
    ]);
    setStock(stockData);
    setOrderSummary(summaryData);
    setStaff(staffData);

    if (isOwner) {
      try {
        const payoutStatus = await getBankAccountStatus(profile.pharmacyId);
        setPayoutActive(payoutStatus.subaccountActive);
      } catch {
        // Best-effort — the action card just won't show a badge either way
        // if this fails; it's not worth blocking the rest of the dashboard.
        setPayoutActive(null);
      }
    }
    setLoading(false);
  }, [user?.userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await clearSession(); router.replace('/login'); } },
    ]);
  };

  const totalItems = stock.length;
  const outOfStock = stock.filter((s) => s.quantity <= 0).length;
  const lowStock = stock.filter((s) => s.quantity > 0 && s.quantity <= LOW_STOCK_THRESHOLD).length;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 80 }} color={GlassTheme.colors.primary} />
        ) : !pharmacyId ? (
          <>
            <View style={styles.plainHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>Pharmacist Portal</Text>
                <Text style={styles.title}>Hi, {user?.fullName?.split(' ')[0] ?? 'there'}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtnPlain}>
                <Ionicons name="log-out-outline" size={20} color={GlassTheme.colors.danger} />
              </TouchableOpacity>
            </View>
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={32} color={GlassTheme.colors.textDim} />
              <Text style={styles.emptyText}>You haven't been assigned to a pharmacy yet — ask an admin to assign you one.</Text>
            </View>
          </>
        ) : (
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
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrowLight}>{pharmacyName ?? 'Pharmacist Portal'}</Text>
                  <Text style={styles.titleLight}>Hi, {user?.fullName?.split(' ')[0] ?? 'there'}</Text>
                  {!!pharmacyRole && (
                    <View style={styles.roleChip}>
                      <Ionicons name={pharmacyRole === 'OWNER' ? 'ribbon-outline' : 'person-outline'} size={12} color="#FFFFFF" />
                      <Text style={styles.roleChipText}>{pharmacyRole === 'OWNER' ? 'Owner' : 'Manager'}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                  <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.heroStatRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>GHS {orderSummary.revenue.toFixed(0)}</Text>
                  <Text style={styles.heroStatLabel}>Revenue</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{orderSummary.totalOrders}</Text>
                  <Text style={styles.heroStatLabel}>Orders</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{totalItems}</Text>
                  <Text style={styles.heroStatLabel}>Items</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Stock overview */}
            <Text style={styles.sectionTitle}>Stock overview</Text>
            <View style={styles.tileRow}>
              <GlassCard style={styles.tile} variant="flat">
                <Text style={styles.tileValue}>{totalItems}</Text>
                <Text style={styles.tileLabel}>Items stocked</Text>
              </GlassCard>
              <GlassCard style={[styles.tile, lowStock > 0 && styles.tileWarning]} variant="flat">
                <Text style={[styles.tileValue, lowStock > 0 && { color: GlassTheme.colors.warning }]}>{lowStock}</Text>
                <Text style={styles.tileLabel}>Low stock</Text>
              </GlassCard>
              <GlassCard style={[styles.tile, outOfStock > 0 && styles.tileDanger]} variant="flat">
                <Text style={[styles.tileValue, outOfStock > 0 && { color: GlassTheme.colors.danger }]}>{outOfStock}</Text>
                <Text style={styles.tileLabel}>Out of stock</Text>
              </GlassCard>
            </View>

            <GlassCard style={styles.actionCard} onPress={() => router.push('/(pharmacist)/stock' as any)}>
              <View style={styles.actionIcon}>
                <Ionicons name="pricetags-outline" size={24} color={GlassTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Manage Stock & Pricing</Text>
                <Text style={styles.actionDesc}>Add, update, or remove medications your pharmacy stocks</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={GlassTheme.colors.textMuted} />
            </GlassCard>

            {/* Owner-only — payout account setup (real Paystack payment
                splitting, see PayoutController's backend javadoc). A
                MANAGER can run day-to-day stock/orders but must not be able
                to redirect where the pharmacy's money goes. */}
            {pharmacyRole === 'OWNER' && (
              <GlassCard style={styles.actionCard} onPress={() => router.push('/(pharmacist)/payout-settings' as any)}>
                <View style={styles.actionIcon}>
                  <Ionicons name="card-outline" size={24} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.actionTitle}>Payout Settings</Text>
                    {payoutActive === false && <View style={styles.warningDot} />}
                  </View>
                  <Text style={styles.actionDesc}>
                    {payoutActive === false
                      ? 'Not set up — link a bank account to receive automatic payouts'
                      : 'Manage the bank account that receives your 90% share'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={GlassTheme.colors.textMuted} />
              </GlassCard>
            )}

            {/* Orders & revenue */}
            <Text style={styles.sectionTitle}>Orders & revenue</Text>
            <View style={styles.tileRow}>
              <GlassCard style={styles.tile} variant="flat">
                <Text style={styles.tileValue}>{orderSummary.totalOrders}</Text>
                <Text style={styles.tileLabel}>Total orders</Text>
              </GlassCard>
              <GlassCard style={styles.tile} variant="flat">
                <Text style={styles.tileValue}>{orderSummary.paidOrders}</Text>
                <Text style={styles.tileLabel}>Paid orders</Text>
              </GlassCard>
              <GlassCard style={styles.tile} variant="flat">
                <Text style={styles.tileValue}>GHS {orderSummary.revenue.toFixed(2)}</Text>
                <Text style={styles.tileLabel}>Revenue</Text>
              </GlassCard>
            </View>

            {/* Owner-only staff list */}
            {pharmacyRole === 'OWNER' && (
              <>
                <Text style={styles.sectionTitle}>Staff at this pharmacy</Text>
                {staff.length === 0 ? (
                  <GlassCard style={{ padding: 16 }} variant="flat">
                    <Text style={styles.emptyText}>Just you so far — an admin can assign managers to this pharmacy.</Text>
                  </GlassCard>
                ) : (
                  staff.map((member) => (
                    <GlassCard key={member.userId} style={styles.staffCard} variant="flat">
                      <View style={styles.staffIcon}>
                        <Ionicons name="person-outline" size={20} color={GlassTheme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{member.fullName}</Text>
                        <Text style={styles.actionDesc}>{member.email}</Text>
                      </View>
                      <View style={[styles.roleBadge, member.pharmacyRole === 'OWNER' && styles.roleBadgeOwner]}>
                        <Text style={styles.roleBadgeText}>{member.pharmacyRole === 'OWNER' ? 'Owner' : 'Manager'}</Text>
                      </View>
                    </GlassCard>
                  ))
                )}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  plainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: GlassTheme.colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 4 },
  logoutBtnPlain: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  hero: {
    marginHorizontal: -20, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 22, gap: 18, marginBottom: 8,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrowLight: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  titleLight: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: GlassTheme.radius.pill, marginTop: 8 },
  roleChipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: GlassTheme.radius.lg, paddingVertical: 14 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 6 },
  tileRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  tileWarning: { backgroundColor: GlassTheme.colors.amberLight },
  tileDanger: { backgroundColor: GlassTheme.colors.dangerLight },
  tileValue: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text },
  tileLabel: { fontSize: 11, color: GlassTheme.colors.textMuted, textAlign: 'center' },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  actionDesc: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  warningDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GlassTheme.colors.warning },
  staffCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: GlassTheme.radius.pill, backgroundColor: GlassTheme.colors.accentLight },
  roleBadgeOwner: { backgroundColor: GlassTheme.colors.violetLight },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.text },
});
