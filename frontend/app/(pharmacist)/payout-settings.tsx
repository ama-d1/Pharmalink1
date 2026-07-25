import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { getProfile } from '@/services/profileService';
import { Bank, BankAccountStatus, getBankAccountStatus, listBanks, resolveAccount, saveBankAccount } from '@/services/payoutService';

// Added 2026-07-24 — OWNER-only bank-account / Paystack subaccount
// onboarding, backing real payment splitting (90% pharmacy / 10% platform,
// applied by payment-service at checkout). See PayoutController (backend)
// for the full feature context.
//
// The route itself doesn't re-check pharmacyRole (PharmacistHome only links
// here for OWNERs), but a MANAGER who somehow lands here (deep link, back
// button after a role change, etc.) gets a clean access-denied state instead
// of a 403 crash — the backend enforces the real restriction regardless.
export default function PayoutSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState<BankAccountStatus | null>(null);

  // Bank picker modal
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const profile = await getProfile(user.userId);
      const owner = profile.pharmacyRole === 'OWNER';
      setIsOwner(owner);
      if (!profile.pharmacyId || !owner) {
        setLoading(false);
        return;
      }
      setPharmacyId(profile.pharmacyId);
      const s = await getBankAccountStatus(profile.pharmacyId);
      setStatus(s);
    } catch (e: any) {
      Alert.alert('Could not load payout settings', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openBankPicker = async () => {
    setBankPickerVisible(true);
    if (banks.length > 0) return;
    setBanksLoading(true);
    try {
      setBanks(await listBanks());
    } catch (e: any) {
      Alert.alert('Could not load banks', e?.message ?? 'Please try again.');
    } finally {
      setBanksLoading(false);
    }
  };

  const pickBank = (bank: Bank) => {
    setSelectedBank(bank);
    setResolvedName(null);
    setBankPickerVisible(false);
  };

  const handleVerify = async () => {
    if (!pharmacyId || !selectedBank || !accountNumber.trim()) {
      Alert.alert('Missing details', 'Select a bank and enter an account number first.');
      return;
    }
    setVerifying(true);
    setResolvedName(null);
    try {
      const name = await resolveAccount(pharmacyId, accountNumber.trim(), selectedBank.code);
      setResolvedName(name);
    } catch (e: any) {
      Alert.alert('Could not verify account', e?.message ?? 'Double-check the details and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!pharmacyId || !selectedBank || !accountNumber.trim() || !resolvedName) {
      Alert.alert('Verify first', 'Verify the account before saving.');
      return;
    }
    setSaving(true);
    try {
      const s = await saveBankAccount(pharmacyId, accountNumber.trim(), selectedBank.code, resolvedName);
      setStatus(s);
      setSelectedBank(null);
      setAccountNumber('');
      setResolvedName(null);
      Alert.alert('Payout account linked', 'Your pharmacy will now receive 90% of every order automatically at checkout.');
    } catch (e: any) {
      Alert.alert('Could not save bank account', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredBanks = bankSearch.trim()
    ? banks.filter((b) => b.name.toLowerCase().includes(bankSearch.trim().toLowerCase()))
    : banks;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payout Settings</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : !isOwner ? (
          <View style={styles.empty}>
            <Ionicons name="lock-closed-outline" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.emptyText}>Only this pharmacy's owner can manage payout settings.</Text>
          </View>
        ) : !pharmacyId ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.emptyText}>Your account isn&apos;t assigned to a pharmacy yet.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={styles.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="card-outline" size={26} color="#FFFFFF" />
              <Text style={styles.heroTitle}>Get paid automatically</Text>
              <Text style={styles.heroDesc}>
                Link your bank account so Paystack sends your 90% share straight to your bank the moment a customer pays — no manual payouts.
              </Text>
            </LinearGradient>

            {status?.subaccountActive ? (
              <GlassCard style={styles.statusCard} variant="flat">
                <View style={styles.statusIconOk}>
                  <Ionicons name="checkmark-circle" size={22} color={GlassTheme.colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>Payout account linked</Text>
                  <Text style={styles.statusDesc}>
                    {status.bankAccountName} · {status.bankCode ? bankNameFor(status.bankCode, banks) : ''} ····{status.lastFourDigits}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Active</Text>
                </View>
              </GlassCard>
            ) : (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={18} color={GlassTheme.colors.warning} />
                <Text style={styles.warningText}>
                  Not set up yet — your pharmacy won&apos;t receive automatic payouts until you link a bank account below.
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>{status?.subaccountActive ? 'Update bank account' : 'Link bank account'}</Text>

            <TouchableOpacity onPress={openBankPicker} style={styles.selectRow}>
              <Ionicons name="business-outline" size={18} color={GlassTheme.colors.textDim} style={{ marginRight: 10 }} />
              <Text style={selectedBank ? styles.selectValue : styles.selectPlaceholder}>
                {selectedBank ? selectedBank.name : 'Select your bank'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={GlassTheme.colors.textDim} />
            </TouchableOpacity>

            <GlassInput
              label="Account number"
              placeholder="0000000000"
              value={accountNumber}
              onChangeText={(t) => { setAccountNumber(t); setResolvedName(null); }}
              keyboardType="number-pad"
              icon="keypad-outline"
            />

            {resolvedName && (
              <View style={styles.resolvedBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color={GlassTheme.colors.success} />
                <Text style={styles.resolvedText}>{resolvedName}</Text>
              </View>
            )}

            <GlassButton
              label="Verify"
              variant="outline"
              onPress={handleVerify}
              loading={verifying}
              disabled={!selectedBank || !accountNumber.trim()}
              style={{ marginBottom: 10 }}
            />
            <GlassButton
              label="Save payout account"
              onPress={handleSave}
              loading={saving}
              disabled={!resolvedName}
            />
          </ScrollView>
        )}

        <Modal visible={bankPickerVisible} transparent animationType="slide" onRequestClose={() => setBankPickerVisible(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <GlassCard style={styles.modalCard}>
              <Text style={styles.pickerTitle}>Select your bank</Text>
              <GlassInput
                placeholder="Search banks..."
                value={bankSearch}
                onChangeText={setBankSearch}
                icon="search"
              />
              {banksLoading ? (
                <ActivityIndicator style={{ marginVertical: 20 }} color={GlassTheme.colors.primary} />
              ) : (
                <FlatList
                  data={filteredBanks}
                  keyExtractor={(item) => item.code}
                  style={{ maxHeight: 320 }}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={<Text style={styles.emptyText}>No banks found.</Text>}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.suggestionRow} onPress={() => pickBank(item)}>
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setBankPickerVisible(false)}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

function bankNameFor(code: string, banks: Bank[]): string {
  return banks.find((b) => b.code === code)?.name ?? '';
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  hero: {
    marginHorizontal: -20, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 22, gap: 8, marginBottom: 8,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  heroDesc: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconOk: { width: 36, height: 36, borderRadius: 18, backgroundColor: GlassTheme.colors.successLight, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 14, fontWeight: '700', color: GlassTheme.colors.text },
  statusDesc: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: GlassTheme.radius.pill, backgroundColor: GlassTheme.colors.successLight },
  badgeText: { fontSize: 11, fontWeight: '700', color: GlassTheme.colors.success },
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GlassTheme.colors.amberLight, borderRadius: GlassTheme.radius.md, padding: 14 },
  warningText: { flex: 1, fontSize: 12.5, color: GlassTheme.colors.text, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: GlassTheme.colors.text, marginTop: 6 },
  selectRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GlassTheme.colors.surfaceAlt, borderRadius: GlassTheme.radius.sm,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  selectValue: { flex: 1, fontSize: 15, color: GlassTheme.colors.text },
  selectPlaceholder: { flex: 1, fontSize: 15, color: GlassTheme.colors.textDim },
  resolvedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 4 },
  resolvedText: { fontSize: 13, fontWeight: '600', color: GlassTheme.colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '80%', gap: 10 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text, marginBottom: 4 },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: GlassTheme.colors.divider },
  suggestionText: { fontSize: 14, color: GlassTheme.colors.text },
  pickerCancel: { alignItems: 'center', paddingVertical: 10 },
  pickerCancelText: { color: GlassTheme.colors.danger, fontWeight: '600' },
});
