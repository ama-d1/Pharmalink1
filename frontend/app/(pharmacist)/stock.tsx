import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { getProfile } from '@/services/profileService';
import { DrugSearchResult, searchDrugs } from '@/services/medicationService';
import { deleteStock, getStock, PharmacyStock, upsertStock } from '@/services/pharmacyStockService';

// Pharmacist-facing stock/pricing management — added 2026-07-23. See
// pharmacy-service's PharmacyStock entity javadoc (backend) for the full
// feature context: this is what actually populates the data behind the
// Home screen's rebuilt Order Meds price-comparison flow.
export default function PharmacistStockScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [stock, setStock] = useState<PharmacyStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PharmacyStock | null>(null);
  const [drugQuery, setDrugQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DrugSearchResult[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugSearchResult | null>(null);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  // undefined = "leave whatever photo's already there" (only meaningful when
  // editing); '' = "remove the photo"; a data: URI = a newly picked photo.
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.userId) return;
    const profile = await getProfile(user.userId);
    if (!profile.pharmacyId) {
      setLoading(false);
      return;
    }
    setPharmacyId(profile.pharmacyId);
    setStock(await getStock(profile.pharmacyId));
    setLoading(false);
  }, [user?.userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAddModal = () => {
    setEditingItem(null);
    setDrugQuery('');
    setSuggestions([]);
    setSelectedDrug(null);
    setPrice('');
    setQuantity('');
    setImageBase64(undefined);
    setModalVisible(true);
  };

  // Added 2026-07-23 — tapping an existing row now opens the same modal
  // pre-filled, mainly so a pharmacist can attach/change a photo on
  // something they already added without deleting and re-adding it.
  const openEditModal = (item: PharmacyStock) => {
    setEditingItem(item);
    setDrugQuery(item.drugName);
    setSuggestions([]);
    setSelectedDrug({ id: item.drugId, name: item.drugName } as DrugSearchResult);
    setPrice(String(item.price));
    setQuantity(String(item.quantity));
    setImageBase64(undefined); // leave existing photo alone unless changed below
    setModalVisible(true);
  };

  const onDrugQueryChange = async (text: string) => {
    setDrugQuery(text);
    setSelectedDrug(null);
    setSuggestions(text.trim().length >= 2 ? await searchDrugs(text, 6) : []);
  };

  // Compressed at the source (quality 0.4, capped to a square crop) so the
  // base64 payload stays small — this is stored directly in Postgres as
  // TEXT (see PharmacyStock.imageBase64 javadoc), there's no CDN doing this
  // for us.
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const mime = result.assets[0].mimeType ?? 'image/jpeg';
    setImageBase64(`data:${mime};base64,${result.assets[0].base64}`);
  };

  const removeImage = () => setImageBase64('');

  const handleSave = async () => {
    if (!pharmacyId || !selectedDrug) {
      Alert.alert('Select a medication', 'Search for and select a medication first.');
      return;
    }
    const priceNum = parseFloat(price);
    const quantityNum = parseInt(quantity, 10);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum < 0) {
      Alert.alert('Invalid quantity', 'Enter a valid quantity.');
      return;
    }

    setSaving(true);
    const saved = await upsertStock(pharmacyId, selectedDrug.id, selectedDrug.name, priceNum, quantityNum, imageBase64);
    setSaving(false);

    if (!saved) {
      Alert.alert('Could not save', 'Please try again.');
      return;
    }
    setModalVisible(false);
    load();
  };

  const handleDelete = (item: PharmacyStock) => {
    Alert.alert('Remove medication', `Remove ${item.drugName} from your stock?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!pharmacyId) return;
          const ok = await deleteStock(pharmacyId, item.id);
          if (ok) setStock((prev) => prev.filter((s) => s.id !== item.id));
          else Alert.alert('Could not remove', 'Please try again.');
        },
      },
    ]);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stock & Pricing</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : !pharmacyId ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={32} color={GlassTheme.colors.textDim} />
            <Text style={styles.emptyText}>
              Your account isn&apos;t assigned to a pharmacy yet — ask an admin to assign you one before you can manage stock.
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={stock}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="pricetags-outline" size={32} color={GlassTheme.colors.textDim} />
                  <Text style={styles.emptyText}>No medications added yet. Tap + to add your first one.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <GlassCard style={styles.stockCard} onPress={() => openEditModal(item)}>
                  {item.imageBase64 ? (
                    <Image source={{ uri: item.imageBase64 }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="image-outline" size={20} color={GlassTheme.colors.textDim} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drugName}>{item.drugName}</Text>
                    <Text style={styles.drugMeta}>₵{item.price.toFixed(2)} · {item.quantity} in stock</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color={GlassTheme.colors.danger} />
                  </TouchableOpacity>
                </GlassCard>
              )}
            />
            <View style={styles.fabWrap}>
              <TouchableOpacity onPress={openAddModal} style={styles.fab}>
                <Ionicons name="add" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <GlassCard style={styles.modalCard}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.pickerTitle}>{editingItem ? 'Update Medication' : 'Add Medication'}</Text>

                <TouchableOpacity onPress={pickImage} style={styles.imagePickerWrap}>
                  {imageBase64 === '' ? (
                    <View style={[styles.imagePicker, styles.thumbPlaceholder]}>
                      <Ionicons name="camera-outline" size={26} color={GlassTheme.colors.textDim} />
                      <Text style={styles.imagePickerLabel}>Add photo</Text>
                    </View>
                  ) : imageBase64 ? (
                    <Image source={{ uri: imageBase64 }} style={styles.imagePicker} />
                  ) : editingItem?.imageBase64 ? (
                    <Image source={{ uri: editingItem.imageBase64 }} style={styles.imagePicker} />
                  ) : (
                    <View style={[styles.imagePicker, styles.thumbPlaceholder]}>
                      <Ionicons name="camera-outline" size={26} color={GlassTheme.colors.textDim} />
                      <Text style={styles.imagePickerLabel}>Add photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {(imageBase64 || (editingItem?.imageBase64 && imageBase64 !== '')) && (
                  <TouchableOpacity onPress={removeImage} style={{ alignSelf: 'center', marginBottom: 8 }}>
                    <Text style={styles.pickerCancelText}>Remove photo</Text>
                  </TouchableOpacity>
                )}

                <GlassInput
                  label="Medication name"
                  placeholder="Search medication..."
                  value={drugQuery}
                  onChangeText={onDrugQueryChange}
                  icon="search"
                />
                {suggestions.length > 0 && !selectedDrug && (
                  <View style={styles.suggestionBox}>
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.suggestionRow}
                        onPress={() => { setSelectedDrug(s); setDrugQuery(s.name); setSuggestions([]); }}
                      >
                        <Text style={styles.suggestionText}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <GlassInput
                  label="Price (GHS)"
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  icon="cash-outline"
                />
                <GlassInput
                  label="Quantity in stock"
                  placeholder="0"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  icon="cube-outline"
                />

                <GlassButton label="Save" onPress={handleSave} loading={saving} />
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GlassTheme.colors.text },
  list: { padding: 16, gap: 12, paddingTop: 4, paddingBottom: 100 },
  stockCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  drugName: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text },
  drugMeta: { fontSize: 12, color: GlassTheme.colors.textMuted, marginTop: 2 },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 30 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  fabWrap: { position: 'absolute', bottom: 30, right: 24 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...GlassTheme.shadow.sm,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '85%', gap: 12 },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: GlassTheme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  imagePickerWrap: { alignSelf: 'center', marginBottom: 4 },
  imagePicker: { width: 96, height: 96, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4 },
  imagePickerLabel: { fontSize: 11, color: GlassTheme.colors.textDim, fontWeight: '600' },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: GlassTheme.colors.text, marginBottom: 4 },
  suggestionBox: { borderWidth: 1, borderColor: GlassTheme.colors.divider, borderRadius: 8, marginTop: -8 },
  suggestionRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: GlassTheme.colors.divider },
  suggestionText: { fontSize: 13, color: GlassTheme.colors.text },
  pickerCancel: { alignItems: 'center', paddingVertical: 10 },
  pickerCancelText: { color: GlassTheme.colors.danger, fontWeight: '600' },
});
