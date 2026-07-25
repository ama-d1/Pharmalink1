import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import {
  AdminPharmacy, createPharmacyAdmin, getAllPharmaciesAdmin, setPharmacyVerified,
} from '@/services/adminService';

export default function AdminPharmaciesScreen() {
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getAllPharmaciesAdmin();
    setPharmacies(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleVerify = async (p: AdminPharmacy) => {
    const next = !p.verified;
    setPharmacies((prev) => prev.map((x) => (x.id === p.id ? { ...x, verified: next } : x)));
    const ok = await setPharmacyVerified(p.id, next);
    if (!ok) {
      setPharmacies((prev) => prev.map((x) => (x.id === p.id ? { ...x, verified: p.verified } : x)));
      Alert.alert('Not saved', 'Could not reach the admin pharmacies endpoint yet — this will work once the backend route is built.');
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      Alert.alert('Missing fields', 'Name and address are required.');
      return;
    }
    setSaving(true);
    const created = await createPharmacyAdmin(form);
    setSaving(false);
    if (created) {
      setPharmacies((prev) => [created, ...prev]);
      setForm({ name: '', address: '', city: '', phone: '' });
      setShowAdd(false);
    } else {
      Alert.alert('Not saved', 'Could not reach the admin pharmacies endpoint yet — this will work once the backend route is built.');
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="medkit" size={20} color={GlassTheme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Pharmacy Management</Text>
            <Text style={styles.headerSubtitle}>Add, verify, and manage listings</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAdd((s) => !s)} style={styles.addBtn}>
            <Ionicons name={showAdd ? 'close' : 'add'} size={22} color={GlassTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <FlatList
              data={pharmacies}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListHeaderComponent={
                showAdd ? (
                  <GlassCard style={styles.addCard}>
                    <Text style={styles.addTitle}>New pharmacy</Text>
                    <GlassInput placeholder="Name" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
                    <GlassInput placeholder="Address" value={form.address} onChangeText={(t) => setForm((f) => ({ ...f, address: t }))} />
                    <GlassInput placeholder="City" value={form.city} onChangeText={(t) => setForm((f) => ({ ...f, city: t }))} />
                    <GlassInput placeholder="Phone" value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} keyboardType="phone-pad" />
                    <GlassButton label="Save pharmacy" onPress={handleAdd} loading={saving} />
                  </GlassCard>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="medkit-outline" size={32} color={GlassTheme.colors.textDim} />
                  <Text style={styles.emptyText}>No pharmacies yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <GlassCard style={styles.pharmacyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pharmacyName}>{item.name}</Text>
                    <Text style={styles.pharmacyAddress}>{item.address}</Text>
                    <View style={[styles.badge, item.verified ? styles.verifiedBadge : styles.unverifiedBadge]}>
                      <Text style={item.verified ? styles.verifiedText : styles.unverifiedText}>
                        {item.verified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => toggleVerify(item)} style={styles.actionBtn}>
                    <Ionicons
                      name={item.verified ? 'close-circle-outline' : 'checkmark-circle-outline'}
                      size={22}
                      color={item.verified ? GlassTheme.colors.danger : GlassTheme.colors.success}
                    />
                  </TouchableOpacity>
                </GlassCard>
              )}
            />
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  headerIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: GlassTheme.colors.text },
  headerSubtitle: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  addCard: { marginHorizontal: 16, marginBottom: 12, gap: 10 },
  addTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text, marginBottom: 4 },
  list: { padding: 16, gap: 12, paddingTop: 4, paddingBottom: 100 },
  pharmacyCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pharmacyName: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  pharmacyAddress: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: GlassTheme.radius.pill, marginTop: 8 },
  verifiedBadge: { backgroundColor: GlassTheme.colors.successLight },
  unverifiedBadge: { backgroundColor: GlassTheme.colors.amberLight },
  verifiedText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.success },
  unverifiedText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.warning },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
});
