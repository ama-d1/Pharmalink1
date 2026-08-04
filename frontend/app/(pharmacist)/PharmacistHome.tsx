import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassTheme } from '@/constants/glassTheme';
import { ScreenRoot, DarkHeader, SheetBody } from '@/components/ui/ScreenShell';
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
//
// Layout rebuilt onto the shared ink-header + white-sheet shell so the
// pharmacist portal reads as the same product as the patient app.
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
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <ScreenRoot>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DarkHeader
        eyebrow={pharmacyId ? (pharmacyName ?? 'PHARMACIST PORTAL') : 'PHARMACIST PORTAL'}
        heading={`Hi, ${firstName}`}
        rightIcon="log-out-outline"
        onRightPress={handleLogout}
      >
        {!!pharmacyId && (
          <>
            {!!pharmacyRole && (
              <View style={styles.roleChip}>
                <Ionicons name={pharmacyRole === 'OWNER' ? 'ribbon-outline' : 'person-outline'} size={12} color="#FFFFFF" />
                <Text style={styles.roleChipText}>{pharmacyRole === 'OWNER' ? 'Owner' : 'Manager'}</Text>
              </View>
            )}
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
          </>
        )}
      </DarkHeader>

      <SheetBody>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={GlassTheme.colors.primary} />
        ) : !pharmacyId ? (
          <View style={styles.stateCard}>
            <Ionicons name="storefront-outline" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.stateTitle}>No pharmacy assigned</Text>
            <Text style={styles.stateHint}>
              You haven&apos;t been assigned to a pharmacy yet — ask an admin to assign you one.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassTheme.colors.primary} />}
          >
            {/* ── Stock overview ── */}
            <Text style={styles.sectionTitle}>Stock overview</Text>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{totalItems}</Text>
                <Text style={styles.tileLabel}>Items stocked</Text>
              </View>
              <View style={[styles.tile, lowStock > 0 && styles.tileWarning]}>
                <Text style={[styles.tileValue, lowStock > 0 && { color: GlassTheme.colors.warning }]}>{lowStock}</Text>
                <Text style={styles.tileLabel}>Low stock</Text>
              </View>
              <View style={[styles.tile, outOfStock > 0 && styles.tileDanger]}>
                <Text style={[styles.tileValue, outOfStock > 0 && { color: GlassTheme.colors.danger }]}>{outOfStock}</Text>
                <Text style={styles.tileLabel}>Out of stock</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(pharmacist)/stock' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="pricetags-outline" size={21} color={GlassTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Manage stock &amp; pricing</Text>
                <Text style={styles.actionDesc}>Add, update, or remove medications your pharmacy stocks</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={GlassTheme.colors.textDim} />
            </TouchableOpacity>

            {/* Owner-only — payout account setup (real Paystack payment
                splitting, see PayoutController's backend javadoc). A
                MANAGER can run day-to-day stock/orders but must not be able
                to redirect where the pharmacy's money goes. */}
            {pharmacyRole === 'OWNER' && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(pharmacist)/payout-settings' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="card-outline" size={21} color={GlassTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.actionTitleRow}>
                    <Text style={styles.actionTitle}>Payout settings</Text>
                    {payoutActive === false && <View style={styles.warningDot} />}
                  </View>
                  <Text style={styles.actionDesc}>
                    {payoutActive === false
                      ? 'Not set up — link a bank account to receive automatic payouts'
                      : 'Manage the bank account that receives your 90% share'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={GlassTheme.colors.textDim} />
              </TouchableOpacity>
            )}

            {/* ── Orders & revenue ── */}
            <Text style={styles.sectionTitle}>Orders &amp; revenue</Text>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{orderSummary.totalOrders}</Text>
                <Text style={styles.tileLabel}>Total orders</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{orderSummary.paidOrders}</Text>
                <Text style={styles.tileLabel}>Paid orders</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>GHS {orderSummary.revenue.toFixed(2)}</Text>
                <Text style={styles.tileLabel}>Revenue</Text>
              </View>
            </View>

            {/* ── Owner-only staff list ── */}
            {pharmacyRole === 'OWNER' && (
              <>
                <Text style={styles.sectionTitle}>Staff at this pharmacy</Text>
                {staff.length === 0 ? (
                  <View style={styles.noteCard}>
                    <Ionicons name="information-circle-outline" size={17} color={GlassTheme.colors.textMuted} />
                    <Text style={styles.noteText}>
                      Just you so far — an admin can assign managers to this pharmacy.
                    </Text>
                  </View>
                ) : (
                  staff.map((member) => (
                    <View key={member.userId} style={styles.staffCard}>
                      <View style={styles.staffIcon}>
                        <Ionicons name="person-outline" size={18} color={GlassTheme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{member.fullName}</Text>
                        <Text style={styles.actionDesc}>{member.email}</Text>
                      </View>
                      <View style={[styles.roleBadge, member.pharmacyRole === 'OWNER' && styles.roleBadgeOwner]}>
                        <Text style={styles.roleBadgeText}>{member.pharmacyRole === 'OWNER' ? 'Owner' : 'Manager'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        )}
      </SheetBody>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 2 },

  // ── Header extras ──
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: GlassTheme.radius.pill,
  },
  roleChipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  heroStatRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: GlassTheme.radius.md,
    paddingVertical: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  // ── Sections ──
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text,
    marginTop: 20, marginBottom: 10,
  },

  tileRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  tileWarning: { backgroundColor: GlassTheme.colors.amberLight, borderColor: GlassTheme.colors.amberLight },
  tileDanger: { backgroundColor: GlassTheme.colors.dangerLight, borderColor: GlassTheme.colors.dangerLight },
  tileValue: { fontSize: 17, fontWeight: '800', color: GlassTheme.colors.text },
  tileLabel: { fontSize: 10, color: GlassTheme.colors.textMuted, textAlign: 'center' },

  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginTop: 10,
  },
  actionIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  actionDesc: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2, lineHeight: 17 },
  warningDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GlassTheme.colors.warning },

  staffCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
    padding: 14, marginBottom: 9,
  },
  staffIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: GlassTheme.colors.accentLight,
  },
  roleBadgeOwner: { backgroundColor: GlassTheme.colors.violetLight },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: GlassTheme.colors.text },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, padding: 13,
  },
  noteText: { flex: 1, fontSize: 12, color: GlassTheme.colors.textMuted, lineHeight: 18 },

  stateCard: {
    alignItems: 'center', gap: 6, paddingVertical: 44, paddingHorizontal: 28, margin: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: GlassTheme.colors.divider,
    borderRadius: GlassTheme.radius.md, backgroundColor: GlassTheme.colors.surface,
  },
  stateTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginTop: 6 },
  stateHint: { fontSize: 12, color: GlassTheme.colors.textDim, textAlign: 'center', lineHeight: 18 },
});
