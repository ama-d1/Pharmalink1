import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { AdminPharmacy, AdminUser, getAllPharmaciesAdmin, getAllUsers, setUserRole, setUserStatus } from '@/services/adminService';

// DRIVER added 2026-07-23 for the delivery system — admin-provisioned the
// same way PHARMACIST is (see admin-service's setUserRoleWithPharmacy
// pattern), just without a pharmacy/tier picker since a driver isn't
// attached to a pharmacy.
const ROLE_CYCLE: AdminUser['role'][] = ['PATIENT', 'PHARMACIST', 'ADMIN', 'DRIVER'];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pharmacy-picker modal state — added 2026-07-23 for pharmacist
  // provisioning. Only opens when cycling a user's role TO PHARMACIST; every
  // other role transition still goes through the plain setUserRole() call
  // exactly as before.
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [pickerUser, setPickerUser] = useState<AdminUser | null>(null);

  // Owner/Manager tier picker — added 2026-07-23. Opens right after a
  // pharmacy is picked above (pendingPharmacy holds that choice while this
  // second, smaller picker is open); the actual setUserRole() call only
  // happens once both a pharmacy AND a tier are chosen.
  const [pendingPharmacy, setPendingPharmacy] = useState<AdminPharmacy | null>(null);

  const load = useCallback(async () => {
    const [userData, pharmacyData] = await Promise.all([getAllUsers(), getAllPharmaciesAdmin()]);
    setUsers(userData);
    setPharmacies(pharmacyData);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = users.filter((u) =>
    !query.trim() ||
    u.fullName?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase())
  );

  const toggleStatus = async (u: AdminUser) => {
    const next = u.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    const ok = await setUserStatus(u.id, next);
    if (!ok) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)));
      Alert.alert('Not saved', 'Could not reach the admin users endpoint yet — this will work once the backend route is built.');
    }
  };

  const cycleRole = async (u: AdminUser) => {
    const next = ROLE_CYCLE[(ROLE_CYCLE.indexOf(u.role) + 1) % ROLE_CYCLE.length];

    // Promoting to PHARMACIST needs a pharmacy assignment — open the picker
    // instead of applying the role change immediately. The actual API call
    // happens in assignPharmacy() once the admin picks one.
    if (next === 'PHARMACIST') {
      setPickerUser(u);
      return;
    }

    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)));
    const ok = await setUserRole(u.id, next);
    if (!ok) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: u.role } : x)));
      Alert.alert('Not saved', 'Could not reach the admin users endpoint yet — this will work once the backend route is built.');
    }
  };

  // Closes the (single) picker modal and resets BOTH step states together,
  // so it can never be left half-open on one step's state.
  const closePicker = () => {
    setPickerUser(null);
    setPendingPharmacy(null);
  };

  const assignPharmacy = (pharmacy: AdminPharmacy) => {
    // Don't call the API yet — hold the pharmacy choice, which flips the
    // single modal to its Owner/Manager step; assignPharmacyRole() below
    // finishes the job once a tier is picked.
    setPendingPharmacy(pharmacy);
  };

  const assignPharmacyRole = async (pharmacyRole: 'OWNER' | 'MANAGER') => {
    const u = pickerUser;
    const pharmacy = pendingPharmacy;
    if (!u || !pharmacy) return;
    setPickerUser(null);
    setPendingPharmacy(null);

    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: 'PHARMACIST', pharmacyName: pharmacy.name, pharmacyRole } : x)));
    const ok = await setUserRole(u.id, 'PHARMACIST', pharmacy.id, pharmacy.name, pharmacyRole);
    if (!ok) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: u.role, pharmacyName: undefined, pharmacyRole: undefined } : x)));
      Alert.alert('Not saved', 'Could not assign this pharmacy — please try again.');
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="people" size={20} color={GlassTheme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>Search, disable, or promote accounts</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <GlassInput
            icon="search-outline"
            placeholder="Search by name or email"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={32} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyText}>No users to show yet. This screen is wired to
                  GET /api/admin/users — it'll populate once the backend endpoint exists.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <GlassCard style={styles.userCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.fullName}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <View style={styles.badgeRow}>
                    <TouchableOpacity onPress={() => cycleRole(item)} style={[styles.badge, styles.roleBadge]}>
                      <Text style={styles.roleBadgeText}>{item.role}</Text>
                    </TouchableOpacity>
                    <View style={[styles.badge, item.status === 'DISABLED' ? styles.statusBadgeOff : styles.statusBadgeOn]}>
                      <Text style={item.status === 'DISABLED' ? styles.statusTextOff : styles.statusTextOn}>
                        {item.status === 'DISABLED' ? 'Disabled' : 'Active'}
                      </Text>
                    </View>
                  </View>
                  {item.role === 'PHARMACIST' && item.pharmacyName && (
                    <Text style={styles.pharmacyLabel}>
                      {item.pharmacyName}{item.pharmacyRole ? ` · ${item.pharmacyRole === 'OWNER' ? 'Owner' : 'Manager'}` : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => toggleStatus(item)} style={styles.actionBtn}>
                  <Ionicons
                    name={item.status === 'DISABLED' ? 'checkmark-circle-outline' : 'ban-outline'}
                    size={22}
                    color={item.status === 'DISABLED' ? GlassTheme.colors.success : GlassTheme.colors.danger}
                  />
                </TouchableOpacity>
              </GlassCard>
            )}
          />
        )}

        {/* FIXED — this used to be TWO separate <Modal> components: one for
            picking a pharmacy, a second for picking Owner/Manager. Picking a
            pharmacy set pendingPharmacy WITHOUT closing the first modal, so
            for a moment both modals were `visible` at once. Presenting two
            native modals simultaneously is a known iOS React Native deadlock
            — the whole screen locks up and stops responding to touches,
            which is exactly the "screen freezes when changing a role" report.
            Collapsed into a SINGLE modal that switches between the two steps
            internally (pharmacy list when no pendingPharmacy, tier picker
            once one is chosen), so only one native modal is ever mounted. */}
        <Modal visible={!!pickerUser} transparent animationType="fade" onRequestClose={closePicker}>
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.pickerCard}>
              {!pendingPharmacy ? (
                <>
                  <Text style={styles.pickerTitle}>Assign a pharmacy for {pickerUser?.fullName}</Text>
                  <FlatList
                    data={pharmacies}
                    keyExtractor={(p) => p.id}
                    style={{ maxHeight: 320 }}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No pharmacies found — add one under Pharmacies first.</Text>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.pickerRow} onPress={() => assignPharmacy(item)}>
                        <Text style={styles.pickerRowName}>{item.name}</Text>
                        {!!item.address && <Text style={styles.pickerRowAddress}>{item.address}</Text>}
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity style={styles.pickerCancel} onPress={closePicker}>
                    <Text style={styles.pickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.pickerTitle}>
                    Is {pickerUser?.fullName} the owner or a manager at {pendingPharmacy?.name}?
                  </Text>
                  <TouchableOpacity style={styles.pickerRow} onPress={() => assignPharmacyRole('OWNER')}>
                    <Text style={styles.pickerRowName}>Owner</Text>
                    <Text style={styles.pickerRowAddress}>Runs this pharmacy's account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pickerRow, { borderBottomWidth: 0 }]} onPress={() => assignPharmacyRole('MANAGER')}>
                    <Text style={styles.pickerRowName}>Manager</Text>
                    <Text style={styles.pickerRowAddress}>Staff account under the owner</Text>
                  </TouchableOpacity>
                  {/* Back to the pharmacy list rather than cancelling outright,
                      in case the admin picked the wrong pharmacy. */}
                  <TouchableOpacity style={styles.pickerCancel} onPress={() => setPendingPharmacy(null)}>
                    <Text style={styles.pickerCancelText}>Back</Text>
                  </TouchableOpacity>
                </>
              )}
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  headerIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: GlassTheme.colors.text },
  headerSubtitle: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  searchWrap: { paddingHorizontal: 16 },
  list: { padding: 16, gap: 12, paddingTop: 4, paddingBottom: 100 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  userEmail: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: GlassTheme.radius.pill },
  roleBadge: { backgroundColor: GlassTheme.colors.primaryLight },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.primary },
  statusBadgeOn: { backgroundColor: GlassTheme.colors.successLight },
  statusBadgeOff: { backgroundColor: GlassTheme.colors.dangerLight },
  statusTextOn: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.success },
  statusTextOff: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.danger },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  pharmacyLabel: { fontSize: 12, color: GlassTheme.colors.primary, marginTop: 6, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  pickerCard: { width: '100%', maxWidth: 420, gap: 12 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text, marginBottom: 4 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: GlassTheme.colors.divider },
  pickerRowName: { fontSize: 14, fontWeight: '600', color: GlassTheme.colors.text },
  pickerRowAddress: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  pickerCancel: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  pickerCancelText: { color: GlassTheme.colors.danger, fontWeight: '600' },
});
