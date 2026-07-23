import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const PHARMACIES = [
  { id: '1', name: 'HealthPlus Pharmacy', address: 'Adum, Kumasi', distance: '0.5 km', rating: 4.8, open: true, phone: '+233244000001' },
  { id: '2', name: 'Welcare Pharmacy', address: 'Bantama, Kumasi', distance: '1.2 km', rating: 4.5, open: true, phone: '+233244000002' },
  { id: '3', name: 'Medix Pharmacy', address: 'Nhyiaeso, Kumasi', distance: '2.1 km', rating: 4.2, open: false, phone: '+233244000003' },
  { id: '4', name: 'Medicare Pharmacy', address: 'Asokwa, Kumasi', distance: '2.8 km', rating: 4.6, open: true, phone: '+233244000004' },
  { id: '5', name: 'City Pharmacy', address: 'Suame, Kumasi', distance: '3.4 km', rating: 4.0, open: false, phone: '+233244000005' },
];

export default function PharmacyScreen() {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open'>('all');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'open'
    ? PHARMACIES.filter(p => p.open)
    : PHARMACIES;

  const callPharmacy = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Pharmacies</Text>
        <Text style={styles.headerSubtitle}>
          {location ? 'Based on your current location' : 'Kumasi, Ghana'}
        </Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({PHARMACIES.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'open' && styles.filterBtnActive]}
          onPress={() => setFilter('open')}>
          <Text style={[styles.filterText, filter === 'open' && styles.filterTextActive]}>
            Open Now ({PHARMACIES.filter(p => p.open).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Status */}
      {loading ? (
        <ActivityIndicator size="large" color="#1A6EBD" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.locationBanner}>
          <Ionicons
            name={location ? 'location' : 'location-outline'}
            size={16}
            color={location ? '#1A6EBD' : '#aaa'}
          />
          <Text style={styles.locationText}>
            {location
              ? `Location found · ${filtered.length} pharmacies nearby`
              : 'Location unavailable · Showing default results'}
          </Text>
        </View>
      )}

      {/* Pharmacy List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {filtered.map(pharmacy => (
          <View key={pharmacy.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons name="medical" size={22} color="#1A6EBD" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                <Text style={styles.pharmacyAddress}>
                  <Ionicons name="location-outline" size={12} color="#888" /> {pharmacy.address}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.distance}>{pharmacy.distance}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <Text style={styles.rating}> {pharmacy.rating}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={[styles.status, pharmacy.open ? styles.open : styles.closed]}>
                    {pharmacy.open ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => callPharmacy(pharmacy.phone)}>
              <Ionicons name="call-outline" size={16} color="#1A6EBD" />
              <Text style={styles.callText}>Call Pharmacy</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: {
    backgroundColor: '#1A6EBD',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#cce0f5', marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A6EBD',
  },
  filterBtnActive: { backgroundColor: '#1A6EBD' },
  filterText: { color: '#1A6EBD', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  locationText: { fontSize: 13, color: '#666' },
  list: { paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EAF2FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  pharmacyName: { fontSize: 15, fontWeight: '700', color: '#0B2545' },
  pharmacyAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  distance: { fontSize: 12, color: '#555' },
  dot: { color: '#ccc', fontSize: 12 },
  rating: { fontSize: 12, color: '#555' },
  status: { fontSize: 12, fontWeight: '600' },
  open: { color: '#27AE60' },
  closed: { color: '#E74C3C' },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1A6EBD',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
  },
  callText: { color: '#1A6EBD', fontWeight: '600', fontSize: 13 },
});