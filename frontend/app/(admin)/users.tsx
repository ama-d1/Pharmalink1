import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
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
  const router = useRouter();
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

  const assignPharmacy = (pharmacy: AdminPharmacy) => {
    // Don't call the API yet — hold the pharmacy choice and open the
    // Owner/Manager tier picker next; assignPharmacyRole() below finishes
    // the job once a tier is picked.
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
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

        <Modal visible={!!pickerUser} transparent animationType="fade" onRequestClose={() => setPickerUser(null)}>
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.pickerCard}>
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
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerUser(null)}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        <Modal visible={!!pendingPharmacy} transparent animationType="fade" onRequestClose={() => setPendingPharmacy(null)}>
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.pickerCard}>
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
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setPendingPharmacy(null)}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text },
  searchWrap: { paddingHorizontal: 16 },
  list: { padding: 16, gap: 12, paddingTop: 4 },
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
